import { useEffect, useRef, useState } from 'react';

const MAX_LEVELS = 10;
const OFI_WINDOW = 50;
const ANOMALY_WINDOW_MS = 8000;
const SPOOF_WINDOW_MS = 1500;
const RENDER_THROTTLE_MS = 60;
const QUEUE_TRACK_WINDOW = 30;
const VPIN_BUCKET_SIZE = 50;
const VPIN_BUCKETS = 20;
const RESILIENCY_WINDOW = 40;
const SIZE_DIST_BINS = { retail: 0.1, mid: 1.0, whale: 10.0 };
const RHYTHM_WINDOW = 100;
const FRAGILITY_LEVELS = 5;
const STORAGE_PREFIX = 'arca:microstructure';
const STORAGE_SESSION_KEY = `${STORAGE_PREFIX}:session`;
const STORAGE_DATA_PREFIX = `${STORAGE_PREFIX}:data:`;
const STORAGE_VERSION = 1;
const PERSIST_INTERVAL_MS = 2000;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeDiv = (a, b) => (b ? a / b : 0);
const ema = (prev, value, alpha) => (prev == null ? value : prev + alpha * (value - prev));
const getStorage = () => (typeof window !== 'undefined' ? window.sessionStorage : null);
const buildStorageKey = (sessionId, symbol) => `${STORAGE_DATA_PREFIX}${sessionId}:${symbol}`;
const clearStoredSession = (storage, sessionId) => {
  if (!storage || !sessionId) return;
  const prefix = `${STORAGE_DATA_PREFIX}${sessionId}:`;
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) {
      storage.removeItem(key);
    }
  }
};
const restorePersistedFootprint = (engine, storage, sessionId, symbol) => {
  if (!storage || !sessionId || !symbol) return false;
  const raw = storage.getItem(buildStorageKey(sessionId, symbol));
  if (!raw) return false;
  try {
    const payload = JSON.parse(raw);
    if (!payload || payload.version !== STORAGE_VERSION) return false;

    if (Array.isArray(payload.volumeMap)) {
      engine.footprint.volumeMap = new Map(
        payload.volumeMap.map(([price, val]) => [price, { buyVol: Number(val.buyVol) || 0, sellVol: Number(val.sellVol) || 0 }])
      );
      engine.footprint.lastDecay = Date.now();
    }
    if (Array.isArray(payload.midHistory)) {
      engine.midHistory = payload.midHistory.slice(-120);
    }
    if (Array.isArray(payload.ofiSeries)) {
      engine.ofiSeries = payload.ofiSeries.slice(-OFI_WINDOW);
    }
    if (payload.footprint && Array.isArray(payload.footprint.buckets)) {
      engine.footprint.buckets = payload.footprint.buckets;
      engine.snapshot.footprint = {
        buckets: payload.footprint.buckets,
        maxAbs: payload.footprint.maxAbs || 1,
        maxVol: payload.footprint.maxVol || 1
      };
    }
    return true;
  } catch {
    return false;
  }
};
const persistFootprint = (engine, storage, sessionId, symbol, now) => {
  if (!storage || !sessionId || !symbol) return;
  const buckets = engine.footprint.buckets || [];
  const maxAbs = Math.max(1, ...buckets.map(b => Math.abs(b.delta || 0)));
  const maxVol = Math.max(1, ...buckets.map(b => Math.max(b.buyVol || 0, b.sellVol || 0)));
  const volumeMap = engine.footprint.volumeMap || new Map();

  const payload = {
    version: STORAGE_VERSION,
    ts: now,
    footprint: { buckets, maxAbs, maxVol },
    volumeMap: Array.from(volumeMap.entries())
      .filter(([, val]) => (val.buyVol || 0) + (val.sellVol || 0) > 0.001)
      .slice(-400),
    midHistory: engine.midHistory.slice(-120),
    ofiSeries: engine.ofiSeries.slice(-OFI_WINDOW)
  };

  try {
    storage.setItem(buildStorageKey(sessionId, symbol), JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
};
const directionFromValue = (value, threshold = 0.02) => (value > threshold ? 'UP' : value < -threshold ? 'DOWN' : 'NEUTRAL');
const resolveMoveProb = (direction, upProb) => {
  if (direction === 'UP') return upProb;
  if (direction === 'DOWN') return 1 - upProb;
  return 0.5;
};
const calcHorizonSec = (base, volScore) => {
  const regimeScale = volScore > 0.7 ? 0.6 : volScore < 0.3 ? 1.4 : 1;
  return clamp(Math.round(base * regimeScale), 3, 90);
};
const computeEntropy = values => {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (!total || values.length < 2) return 1;
  const entropy = -values.reduce((sum, v) => {
    const p = v / total;
    return p > 0 ? sum + p * Math.log(p) : sum;
  }, 0);
  return clamp(entropy / Math.log(values.length), 0, 1);
};
const computeDepthGradient = (bids, asks, mid, tickSize) => {
  if (!Number.isFinite(mid) || !Number.isFinite(tickSize) || tickSize === 0) {
    return { bidWeighted: 0, askWeighted: 0, imbalance: 0 };
  }
  const weight = level => 1 / (1 + Math.abs(level.price - mid) / tickSize);
  const bidWeighted = bids.reduce((sum, level) => sum + level.size * weight(level), 0);
  const askWeighted = asks.reduce((sum, level) => sum + level.size * weight(level), 0);
  const imbalance = safeDiv(bidWeighted - askWeighted, bidWeighted + askWeighted);
  return { bidWeighted, askWeighted, imbalance };
};

const normalizeTicker = ticker => (ticker || '').trim().toUpperCase();

const isCryptoTicker = ticker => {
  if (!ticker) return false;
  const symbol = normalizeTicker(ticker);
  if (symbol.includes('-')) {
    const parts = symbol.split('-');
    if (parts.length !== 2) return false;
    const quote = parts[1];
    return ['USD', 'USDT', 'USDC', 'BUSD', 'EUR', 'BTC', 'ETH'].includes(quote);
  }
  if (symbol.endsWith('USDT') || symbol.endsWith('USDC')) return true;
  if (symbol.endsWith('USD') && symbol.length > 3) return true;
  return false;
};

const toBinanceSymbol = ticker => {
  const symbol = normalizeTicker(ticker);
  if (symbol.includes('-')) {
    const [base, quote] = symbol.split('-');
    if (quote === 'USD') return `${base}USDT`;
    return `${base}${quote}`;
  }
  if (symbol.endsWith('USD') && symbol.length > 3) {
    return `${symbol.slice(0, -3)}USDT`;
  }
  return symbol;
};

const pickTickSize = price => {
  if (!Number.isFinite(price)) return 0.01;
  if (price >= 100000) return 10;
  if (price >= 10000) return 5;
  if (price >= 1000) return 1;
  if (price >= 100) return 0.1;
  if (price >= 10) return 0.01;
  if (price >= 1) return 0.001;
  return 0.0001;
};

const buildLevels = (levels, direction) => {
  const rows = (levels || [])
    .map(([price, size]) => ({ price: Number(price), size: Number(size) }))
    .filter(row => Number.isFinite(row.price) && Number.isFinite(row.size) && row.size > 0);

  rows.sort((a, b) => (direction === 'desc' ? b.price - a.price : a.price - b.price));
  const trimmed = rows.slice(0, MAX_LEVELS);

  let cumulative = 0;
  return trimmed.map(row => {
    cumulative += row.size;
    return { ...row, cumulative };
  });
};

const defaultSnapshot = {
  status: { state: 'idle', message: 'SELECT A TICKER', source: '' },
  symbol: '',
  metrics: {
    feedDelayMs: null,
    computeMs: null,
    updateRateHz: null,
    renderRateHz: null,
    jitterMs: null
  },
  book: {
    bids: [],
    asks: [],
    mid: null,
    spread: null,
    spreadPct: null,
    pressure: 0.5,
    bestBid: null,
    bestAsk: null
  },
  ofi: { value: 0, trend: 0, series: [] },
  liquidity: { total: 0, voidScore: 0, thinScore: 0 },
  aggression: { buy: 0, sell: 0, index: 0, tradeRate: 0 },
  absorption: { score: 0 },
  spoofing: { score: 0, confidence: 0 },
  smartMoney: { score: 0, bias: 0 },
  hiddenLiquidity: { score: 0 },
  sweep: { score: 0, last: null },
  compression: { score: 0, expansionProb: 0 },
  footprint: { buckets: [], maxAbs: 1, maxVol: 1 },
  regime: [],
  alpha: [],
  anomalies: [],
  execution: { quality: 0, mode: 'NEUTRAL', confidence: 0 },
  dealer: { gamma: null, note: 'OPTIONS FEED REQUIRED' },
  // Elite Orderbook Intelligence
  queue: { stabilityMap: [] },
  resiliency: { score: 0, curve: [] },
  replenishment: { velocity: 0, history: [] },
  priceImpact: { drift: 0, confidence: 0, sensitivity: 0 },
  adverseSelection: { score: 0, toxicFlowProb: 0, mmStress: 0 },
  vpin: { score: 0, informedProb: 0, volSpikeRisk: 0 },
  iceberg: { probability: 0, stealthScore: 0, zones: [] },
  consumption: { rate: 0, acceleration: 0, breakoutProb: 0 },
  flowRatio: { passive: 0, aggressive: 0, state: 'BALANCED' },
  fragility: { score: 0, weakZones: [] },
  // Elite Time & Sales Intelligence
  sequencing: { pattern: 'RANDOM', algoProb: 0, participantType: 'MIXED' },
  flowVelocity: { buyAccel: 0, sellAccel: 0, exhaustion: 0 },
  tradeToxicity: { smartMoneyProb: 0, retailChase: 0, toxicProb: 0 },
  sweepPattern: { type: 'NONE', confidence: 0, multiLevel: false, levelsCrossed: 0 },
  fragmentation: { sliceCount: 0, stealthScore: 0, accumulation: 0 },
  momentumDiv: { divergence: 0, fakeout: false, priceMove: 0 },
  absorptionPersist: { duration: 0, defenseScore: 0, trapProb: 0 },
  sizeDist: { retail: 0, mid: 0, whale: 0, dominant: 'RETAIL' },
  rhythm: { hftProb: 0, structured: false, latencyArb: 0 },
  sweepExhaustion: { score: 0, reversalProb: 0 },
  // Elite Extra Modules
  stressRadar: { score: 0, zones: [] },
  smartMoneyIntent: { direction: 0, conviction: 0, timeHorizon: 'LONG' },
  executionConviction: { score: 0, confidence: 0 },
  flowTransition: { from: 'NEUTRAL', to: 'NEUTRAL', probability: 0 },
  dealerPressure: { gamma: 0, hedgingPressure: 0, zones: [] },
  hiddenAlpha: { score: 0, signal: 'NONE' },
  mmDefense: { zones: [], strength: 0 },
  toxicLiquidity: { score: 0, levels: [] },
  tacticalEntry: { timing: 0, score: 0, window: 'CLOSED' },
  predictive: {
    meta: { volRegime: 'MID', volScore: 0.5 },
    kinematics: { signals: [] },
    gradients: { signals: [] },
    probability: { signals: [] },
    regime: { signals: [] }
  }
};

const initEngine = () => ({
  snapshot: { ...defaultSnapshot },
  prevBook: {
    bids: new Map(),
    asks: new Map(),
    bestBid: null,
    bestAsk: null
  },
  lastDepthTs: 0,
  lastTradeTs: 0,
  ofiSeries: [],
  ofiValue: 0,
  ofiTrend: 0,
  liquidityEma: null,
  aggBuyEma: 0,
  aggSellEma: 0,
  tradeRateEma: 0,
  avgTradeSizeEma: 0,
  priceImpactEma: 0,
  midHistory: [],
  footprint: {
    buckets: [],
    tickSize: 0.01,
    lastDecay: 0,
    volumeMap: new Map()
  },
  spoof: {
    largeOrders: new Map(),
    addEvents: [],
    pullEvents: []
  },
  anomalies: [],
  lastAnomaly: {},
  metrics: {
    feedDelayMs: null,
    computeMs: null,
    updateRateHz: null,
    jitterMs: null,
    renderRateHz: null
  },
  dirty: false,
  version: 0,
  persistence: { sessionId: null, restored: false, lastSaved: 0 },
  // Queue Intelligence
  queue: {
    levelHistory: [],
    decayRates: new Map(),
    replenishmentTimes: new Map(),
    stabilityMap: []
  },
  // Resiliency
  resiliency: {
    consumptionEvents: [],
    refillTimes: [],
    score: 0,
    curve: []
  },
  // Replenishment Velocity
  replenishment: {
    velocity: 0,
    velocityHistory: [],
    lastLiquidity: 0
  },
  // Price Impact Model
  priceImpactModel: {
    immediateDrift: 0,
    confidence: 0,
    sensitivity: 0
  },
  // Adverse Selection
  adverseSelection: {
    score: 0,
    toxicFlowProb: 0,
    mmStress: 0
  },
  // VPIN Toxicity
  vpin: {
    buckets: [],
    currentBucket: { buyVol: 0, sellVol: 0 },
    score: 0,
    informedProb: 0,
    volSpikeRisk: 0
  },
  // Iceberg Detection
  iceberg: {
    refreshingLevels: new Map(),
    probability: 0,
    stealthScore: 0,
    detectedZones: []
  },
  // Consumption Rate
  consumption: {
    rate: 0,
    acceleration: 0,
    breakoutProb: 0,
    lastLiquidity: 0
  },
  // Flow Ratio
  flowRatio: {
    passive: 0,
    aggressive: 0,
    state: 'BALANCED'
  },
  // Fragility Model
  fragility: {
    score: 0,
    riskMap: [],
    weakZones: []
  },
  // Trade Sequencing
  sequencing: {
    tradeIntervals: [],
    pattern: 'RANDOM',
    algoProb: 0,
    participantType: 'MIXED'
  },
  // Flow Velocity
  flowVelocity: {
    buyAccel: 0,
    sellAccel: 0,
    exhaustion: 0,
    lastBuyVol: 0,
    lastSellVol: 0
  },
  // Trade Toxicity
  tradeToxicity: {
    smartMoneyProb: 0,
    retailChase: 0,
    toxicProb: 0
  },
  // Sweep Pattern
  sweepPattern: {
    type: 'NONE',
    confidence: 0,
    multiLevel: false,
    levelsCrossed: 0
  },
  // Fragmentation
  fragmentation: {
    sliceCount: 0,
    stealthScore: 0,
    accumulation: 0,
    recentSizes: []
  },
  // Momentum Divergence
  momentumDiv: {
    priceMove: 0,
    buyAggression: 0,
    divergence: 0,
    fakeout: false
  },
  // Absorption Persistence
  absorptionPersist: {
    duration: 0,
    defenseScore: 0,
    trapProb: 0,
    startTime: 0
  },
  // Size Distribution
  sizeDist: {
    retail: 0,
    mid: 0,
    whale: 0,
    dominant: 'RETAIL',
    history: []
  },
  // Execution Rhythm
  rhythm: {
    intervals: [],
    hftProb: 0,
    structured: false,
    latencyArb: 0
  },
  // Sweep Exhaustion
  sweepExhaustion: {
    score: 0,
    reversalProb: 0,
    failedSweeps: 0
  },
  // Elite Extras
  stressRadar: {
    score: 0,
    zones: []
  },
  smartMoneyIntent: {
    direction: 0,
    conviction: 0,
    timeHorizon: 'SHORT'
  },
  executionConviction: {
    score: 0,
    confidence: 0
  },
  flowTransition: {
    from: 'NEUTRAL',
    to: 'NEUTRAL',
    probability: 0
  },
  dealerPressure: {
    gamma: 0,
    hedgingPressure: 0,
    zones: []
  },
  hiddenAlpha: {
    score: 0,
    signal: 'NONE'
  },
  mmDefense: {
    zones: [],
    strength: 0
  },
  toxicLiquidity: {
    score: 0,
    levels: []
  },
  tacticalEntry: {
    timing: 0,
    score: 0,
    window: 'CLOSED'
  },
  predictive: {
    meta: { volRegime: 'MID', volScore: 0.5 },
    kinematics: { signals: [] },
    gradients: { signals: [] },
    probability: { signals: [] },
    regime: { signals: [] }
  },
  pressure: { value: 0.5, velocity: 0, acceleration: 0 },
  ofiKinematics: { velocity: 0, acceleration: 0 },
  gradientState: { value: 0, velocity: 0, acceleration: 0 },
  decayEdge: { bias: 0 },
  bayes: { priorUp: 0.5, posteriorUp: 0.5 },
  markov: { lastState: 'NEUTRAL', transitions: {} },
  entropy: { score: 1, inefficiency: 0 },
  micropriceModel: { value: 0, drift: 0, diffusion: 0, forecast: 0 }
});

const pushSeries = (series, value, maxLen) => {
  const next = [...series, value];
  if (next.length > maxLen) return next.slice(next.length - maxLen);
  return next;
};

const normalizeScores = entries => {
  const sum = entries.reduce((acc, item) => acc + item.value, 0) || 1;
  return entries.map(item => ({ ...item, value: item.value / sum }));
};

const pushAnomaly = (engine, label, severity) => {
  const now = Date.now();
  const last = engine.lastAnomaly[label] || 0;
  if (now - last < ANOMALY_WINDOW_MS) return;
  engine.lastAnomaly[label] = now;
  engine.anomalies.unshift({
    id: `${now}-${label}`,
    time: new Date(now).toISOString().slice(11, 19),
    label,
    severity
  });
  engine.anomalies = engine.anomalies.slice(0, 6);
};

const updateFootprintBuckets = (engine, mid, price, size, isBuy, now) => {
  if (!Number.isFinite(price)) return;
  const referencePrice = mid || price;
  const tickSize = pickTickSize(referencePrice);

  if (!engine.footprint.volumeMap) {
    engine.footprint.volumeMap = new Map();
  }

  // Removed volume decay to allow endless accumulation until app close
  if (now - engine.footprint.lastDecay > 500) {
    engine.footprint.lastDecay = now;
  }

  const roundedPrice = Math.round(price / tickSize) * tickSize;
  const key = roundedPrice.toFixed(8);

  let entry = engine.footprint.volumeMap.get(key);
  if (!entry) {
    entry = { buyVol: 0, sellVol: 0 };
    engine.footprint.volumeMap.set(key, entry);
  }

  if (isBuy) {
    entry.buyVol += size;
  } else {
    entry.sellVol += size;
  }
};

const rebuildFootprintBuckets = (engine, mid, bids = [], asks = []) => {
  if (!Number.isFinite(mid)) return;
  const tickSize = pickTickSize(mid);
  engine.footprint.tickSize = tickSize;

  if (!engine.footprint.volumeMap) {
    engine.footprint.volumeMap = new Map();
  }

  const allPrices = new Set();
  
  // Collect all historical prices that have traded or had liquidity
  if (engine.footprint.volumeMap) {
    for (const key of engine.footprint.volumeMap.keys()) {
      allPrices.add(parseFloat(key));
    }
  }

  // Collect current book prices
  bids.forEach(b => allPrices.add(Math.round(b.price / tickSize) * tickSize));
  asks.forEach(a => allPrices.add(Math.round(a.price / tickSize) * tickSize));

  // Ensure a minimum visible window around the current mid price
  const windowHalf = 20;
  for (let i = -windowHalf; i <= windowHalf; i++) {
    allPrices.add(Math.round((mid + i * tickSize) / tickSize) * tickSize);
  }

  // Sort prices descending (highest price at the top)
  const sortedPrices = Array.from(allPrices).sort((a, b) => b - a);

  const buckets = sortedPrices.map(price => {
    const key = price.toFixed(8);
    const stored = engine.footprint.volumeMap.get(key) || { buyVol: 0, sellVol: 0, prevBid: 0, prevAsk: 0 };

    let currentBid = 0;
    bids.forEach(b => {
      if (Math.abs(Math.round(b.price / tickSize) * tickSize - price) < 1e-6) currentBid += b.size;
    });

    let currentAsk = 0;
    asks.forEach(a => {
      if (Math.abs(Math.round(a.price / tickSize) * tickSize - price) < 1e-6) currentAsk += a.size;
    });

    const liqChangeBid = currentBid - (stored.prevBid || 0);
    const liqChangeAsk = currentAsk - (stored.prevAsk || 0);
    const liqChange = (Math.abs(currentBid) > 0 ? liqChangeBid : 0) + (Math.abs(currentAsk) > 0 ? liqChangeAsk : 0);

    stored.prevBid = currentBid;
    stored.prevAsk = currentAsk;
    engine.footprint.volumeMap.set(key, stored);

    return {
      price,
      buyVol: stored.buyVol,
      sellVol: stored.sellVol,
      delta: stored.buyVol - stored.sellVol,
      volume: stored.buyVol + stored.sellVol,
      bidSize: currentBid,
      askSize: currentAsk,
      liqChange
    };
  });

  engine.footprint.buckets = buckets;
};

const computeVariance = values => {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
};

const computeStdDev = values => Math.sqrt(computeVariance(values));

// Queue Position Intelligence
const updateQueueIntelligence = (engine, bids, asks, now) => {
  const q = engine.queue;
  const levelData = { bids: bids.map(b => ({ p: b.price, s: b.size })), asks: asks.map(a => ({ p: a.price, s: a.size })), ts: now };
  q.levelHistory.push(levelData);
  if (q.levelHistory.length > QUEUE_TRACK_WINDOW) q.levelHistory.shift();

  if (q.levelHistory.length < 3) return;
  const prev = q.levelHistory[q.levelHistory.length - 2];
  const curr = q.levelHistory[q.levelHistory.length - 1];

  const stabilityMap = [];
  const allLevels = [...curr.bids, ...curr.asks];

  allLevels.forEach(level => {
    const prevLevel = [...prev.bids, ...prev.asks].find(l => Math.abs(l.p - level.p) < 0.0001);
    if (!prevLevel) {
      stabilityMap.push({ price: level.p, side: curr.bids.includes(level) ? 'BID' : 'ASK', stability: 0.1, type: 'NEW' });
      return;
    }
    const sizeChange = level.s - prevLevel.s;
    const decayRate = prevLevel.s > 0 ? Math.max(0, -sizeChange / prevLevel.s) : 0;
    const isReplenishing = sizeChange > 0 && prevLevel.s > 0;
    const stability = isReplenishing ? Math.min(1, sizeChange / (prevLevel.s * 0.5)) : Math.max(0, 1 - decayRate);
    stabilityMap.push({
      price: level.p,
      side: curr.bids.includes(level) ? 'BID' : 'ASK',
      stability: clamp(stability, 0, 1),
      type: decayRate > 0.5 ? 'FRAGILE' : decayRate > 0.2 ? 'WEAK' : isReplenishing ? 'REPLENISHING' : 'STABLE'
    });
  });

  q.stabilityMap = stabilityMap;
};

// Orderbook Resiliency Score
const updateResiliency = (engine, bids, asks, liquidityTotal, now) => {
  const r = engine.resiliency;
  const prevLiq = r.lastLiquidity || liquidityTotal;
  const liqChange = liquidityTotal - prevLiq;

  if (liqChange < -prevLiq * 0.1) {
    r.consumptionEvents.push({ ts: now, liq: liquidityTotal });
    if (r.consumptionEvents.length > 20) r.consumptionEvents.shift();
  }

  if (liqChange > 0 && r.consumptionEvents.length > 0) {
    const lastConsumption = r.consumptionEvents[r.consumptionEvents.length - 1];
    const refillTime = (now - lastConsumption.ts) / 1000;
    r.refillTimes.push(refillTime);
    if (r.refillTimes.length > RESILIENCY_WINDOW) r.refillTimes.shift();
    r.consumptionEvents.pop();
  }

  r.lastLiquidity = liquidityTotal;
  const avgRefill = r.refillTimes.length ? r.refillTimes.reduce((a, b) => a + b, 0) / r.refillTimes.length : 5;
  r.score = clamp(1 - avgRefill / 10, 0, 1);

  r.curve = r.refillTimes.slice(-10).map((t, i) => ({ x: i, y: clamp(1 - t / 10, 0, 1) }));
};

// Liquidity Replenishment Velocity
const updateReplenishmentVelocity = (engine, liquidityTotal) => {
  const r = engine.replenishment;
  const delta = liquidityTotal - (r.lastLiquidity || liquidityTotal);
  r.lastLiquidity = liquidityTotal;

  if (delta > 0) {
    r.velocity = ema(r.velocity, delta / 1000, 0.3);
    r.velocityHistory = pushSeries(r.velocityHistory, r.velocity, 30);
  }
};

// Micro Price Impact Model
const updatePriceImpactModel = (engine, mid, bids, asks, aggressionIndex, tradeRate) => {
  const m = engine.priceImpactModel;
  const bidDepth = bids.slice(0, 3).reduce((s, b) => s + b.size, 0);
  const askDepth = asks.slice(0, 3).reduce((s, a) => s + a.size, 0);
  const totalDepth = bidDepth + askDepth || 1;

  const depthImbalance = Math.abs(bidDepth - askDepth) / totalDepth;
  const aggressionFactor = Math.abs(aggressionIndex) * clamp(tradeRate / 50, 0, 1);
  const sensitivity = clamp(aggressionFactor / (totalDepth * 0.001 + 1), 0, 1);

  m.immediateDrift = aggressionIndex * sensitivity * 0.5;
  m.confidence = clamp(sensitivity * (1 - depthImbalance * 0.5), 0, 1);
  m.sensitivity = sensitivity;
};

// Adverse Selection Detector
const updateAdverseSelection = (engine, priceImpact, ofiValue, aggressionIndex, voidScore) => {
  const a = engine.adverseSelection;
  const toxicFlow = clamp(priceImpact * 10000 + Math.abs(ofiValue) * 0.3, 0, 1);
  const mmStress = clamp(voidScore * 0.5 + Math.abs(aggressionIndex) * 0.3 + toxicFlow * 0.2, 0, 1);
  a.toxicFlowProb = toxicFlow;
  a.mmStress = mmStress;
  a.score = clamp(toxicFlow * 0.5 + mmStress * 0.5, 0, 1);
};

// VPIN-style Toxicity
const updateVPIN = (engine, size, isBuy) => {
  const v = engine.vpin;
  if (isBuy) v.currentBucket.buyVol += size;
  else v.currentBucket.sellVol += size;

  const bucketVol = v.currentBucket.buyVol + v.currentBucket.sellVol;
  if (bucketVol >= VPIN_BUCKET_SIZE || v.buckets.length === 0) {
    const imbalance = Math.abs(v.currentBucket.buyVol - v.currentBucket.sellVol) / (bucketVol || 1);
    v.buckets.push(imbalance);
    if (v.buckets.length > VPIN_BUCKETS) v.buckets.shift();
    v.currentBucket = { buyVol: 0, sellVol: 0 };
  }

  v.score = v.buckets.length ? v.buckets.reduce((a, b) => a + b, 0) / v.buckets.length : 0;
  v.informedProb = clamp(v.score * 1.2, 0, 1);
  v.volSpikeRisk = clamp(v.score * Math.abs(v.score - 0.5) * 4, 0, 1);
};

// Iceberg Detection
const updateIceberg = (engine, bids, asks, now) => {
  const i = engine.iceberg;
  const allLevels = [...bids.map(b => ({ p: b.price, s: b.size })), ...asks.map(a => ({ p: a.price, s: a.size }))];

  allLevels.forEach(level => {
    const key = `${level.p}`;
    const existing = i.refreshingLevels.get(key);
    if (existing) {
      const age = now - existing.firstSeen;
      const refreshes = existing.refreshes + (Math.abs(level.s - existing.lastSize) < existing.lastSize * 0.1 && level.s >= existing.lastSize ? 1 : 0);
      i.refreshingLevels.set(key, { ...existing, lastSize: level.s, refreshes, age });
    } else {
      i.refreshingLevels.set(key, { price: level.p, size: level.s, firstSeen: now, lastSize: level.s, refreshes: 0, age: 0 });
    }
  });

  i.refreshingLevels.forEach((entry, key) => {
    if (!allLevels.find(l => Math.abs(l.p - entry.price) < 0.0001)) {
      i.refreshingLevels.delete(key);
    }
  });

  const refreshingCount = Array.from(i.refreshingLevels.values()).filter(e => e.refreshes >= 2 && e.age > 3000).length;
  i.probability = clamp(refreshingCount / 5, 0, 1);
  i.stealthScore = clamp(refreshingCount * 0.15 + i.probability * 0.3, 0, 1);
  i.detectedZones = Array.from(i.refreshingLevels.values()).filter(e => e.refreshes >= 2).map(e => ({ price: e.price, refreshes: e.refreshes }));
};

// Liquidity Consumption Rate
const updateConsumption = (engine, liquidityTotal) => {
  const c = engine.consumption;
  const prevLiq = c.lastLiquidity || liquidityTotal;
  const rate = Math.max(0, prevLiq - liquidityTotal) / 1000;
  c.rate = ema(c.rate, rate, 0.3);
  c.acceleration = c.rate - (c.lastRate || 0);
  c.lastRate = c.rate;
  c.lastLiquidity = liquidityTotal;
  c.breakoutProb = clamp(c.rate * 0.01 + c.acceleration * 0.5, 0, 1);
};

// Passive vs Aggressive Flow Ratio
const updateFlowRatio = (engine) => {
  const f = engine.flowRatio;
  const passiveScore = clamp(1 - Math.abs(engine.ofiValue), 0, 1);
  const aggressiveScore = clamp(Math.abs(engine.aggBuyEma - engine.aggSellEma) / (engine.aggBuyEma + engine.aggSellEma + 1), 0, 1);
  f.passive = passiveScore;
  f.aggressive = aggressiveScore;
  f.state = aggressiveScore > passiveScore * 1.3 ? 'AGGRESSIVE_DOMINANT' : passiveScore > aggressiveScore * 1.3 ? 'PASSIVE_DOMINANT' : 'TRANSITION';
};

// Liquidity Fragility Model
const updateFragility = (engine, bids, asks, mid) => {
  const f = engine.fragility;
  const tickSize = pickTickSize(mid);
  const riskMap = [];

  const allLevels = [
    ...bids.map(b => ({ price: b.price, size: b.size, side: 'BID' })),
    ...asks.map(a => ({ price: a.price, size: a.size, side: 'ASK' }))
  ];

  const avgSize = allLevels.reduce((s, l) => s + l.size, 0) / Math.max(1, allLevels.length);

  allLevels.forEach(level => {
    const fragility = clamp(1 - level.size / (avgSize * 2), 0, 1);
    const distFromMid = Math.abs(level.price - mid) / (tickSize * 10);
    riskMap.push({ price: level.price, side: level.side, fragility, distance: distFromMid });
  });

  f.riskMap = riskMap;
  f.weakZones = riskMap.filter(r => r.fragility > 0.6).slice(0, FRAGILITY_LEVELS);
  f.score = clamp(riskMap.reduce((s, r) => s + r.fragility, 0) / Math.max(1, riskMap.length), 0, 1);
};

// Trade Sequencing Intelligence
const updateSequencing = (engine, now) => {
  const s = engine.sequencing;
  if (engine.lastTradeTs) {
    const interval = now - engine.lastTradeTs;
    s.tradeIntervals.push(interval);
    if (s.tradeIntervals.length > RHYTHM_WINDOW) s.tradeIntervals.shift();
  }

  if (s.tradeIntervals.length < 10) return;
  const meanInterval = s.tradeIntervals.reduce((a, b) => a + b, 0) / s.tradeIntervals.length;
  const stdInterval = computeStdDev(s.tradeIntervals);
  const cv = stdInterval / (meanInterval || 1);

  if (cv < 0.15) {
    s.pattern = 'STRUCTURED';
    s.algoProb = clamp(1 - cv * 5, 0, 1);
    s.participantType = 'ALGO';
  } else if (cv < 0.4) {
    s.pattern = 'SEMI_STRUCTURED';
    s.algoProb = clamp(0.5 + (0.4 - cv) * 2, 0, 1);
    s.participantType = 'MIXED';
  } else {
    s.pattern = 'RANDOM';
    s.algoProb = clamp(0.3 - cv * 0.3, 0, 1);
    s.participantType = 'RETAIL';
  }
};

// Aggressive Flow Velocity
const updateFlowVelocity = (engine, size, isBuy) => {
  const v = engine.flowVelocity;
  const currentVol = isBuy ? size : 0;
  const currentSell = isBuy ? 0 : size;

  v.buyAccel = ema(v.buyAccel, (currentVol - v.lastBuyVol) / 100, 0.3);
  v.sellAccel = ema(v.sellAccel, (currentSell - v.lastSellVol) / 100, 0.3);
  v.lastBuyVol = currentVol;
  v.lastSellVol = currentSell;

  const totalAccel = Math.abs(v.buyAccel) + Math.abs(v.sellAccel);
  v.exhaustion = clamp(totalAccel > 2 ? 1 - totalAccel / 10 : 0, 0, 1);
};

// Trade Toxicity Model
const updateTradeToxicity = (engine, size, isBuy, avgTradeSize, ofiValue) => {
  const t = engine.tradeToxicity;
  const isLarge = size > avgTradeSize * 2;
  const isConsistent = (isBuy && ofiValue > 0.2) || (!isBuy && ofiValue < -0.2);

  t.smartMoneyProb = clamp((isLarge ? 0.4 : 0.1) + (isConsistent ? 0.3 : 0) + Math.abs(ofiValue) * 0.3, 0, 1);
  t.retailChase = clamp((size < avgTradeSize * 0.5 ? 0.5 : 0) + (Math.abs(ofiValue) > 0.5 ? 0.3 : 0), 0, 1);
  t.toxicProb = clamp(t.smartMoneyProb * 0.6 + t.retailChase * 0.2 + engine.vpin.score * 0.2, 0, 1);
};

// Sweep Pattern Recognition
const updateSweepPattern = (engine, bestBid, bestAsk, prevBestBid, prevBestAsk, tickSize) => {
  const s = engine.sweepPattern;
  let levelsCrossed = 0;
  let direction = 0;

  if (prevBestBid && bestBid && bestBid < prevBestBid) {
    const move = (prevBestBid - bestBid) / tickSize;
    levelsCrossed = Math.floor(move);
    direction = -1;
  }
  if (prevBestAsk && bestAsk && bestAsk > prevBestAsk) {
    const move = (bestAsk - prevBestAsk) / tickSize;
    levelsCrossed = Math.max(levelsCrossed, Math.floor(move));
    direction = 1;
  }

  s.levelsCrossed = levelsCrossed;
  s.multiLevel = levelsCrossed >= 3;

  if (levelsCrossed >= 5) {
    s.type = direction > 0 ? 'INSTITUTIONAL_SWEEP_UP' : 'INSTITUTIONAL_SWEEP_DOWN';
    s.confidence = clamp(levelsCrossed / 8, 0, 1);
  } else if (levelsCrossed >= 3) {
    s.type = direction > 0 ? 'MOMENTUM_IGNITION_UP' : 'MOMENTUM_IGNITION_DOWN';
    s.confidence = clamp(levelsCrossed / 6, 0, 1);
  } else if (levelsCrossed >= 1) {
    s.type = direction > 0 ? 'STOP_HUNT_UP' : 'STOP_HUNT_DOWN';
    s.confidence = clamp(levelsCrossed / 4, 0, 1);
  } else {
    s.type = 'NONE';
    s.confidence = 0;
  }
};

// Execution Fragmentation
const updateFragmentation = (engine, size, now) => {
  const f = engine.fragmentation;
  f.recentSizes.push({ size, ts: now });
  f.recentSizes = f.recentSizes.filter(t => now - t.ts < 5000);

  if (f.recentSizes.length >= 5) {
    const sizes = f.recentSizes.map(t => t.size);
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const std = computeStdDev(sizes);
    const cv = std / (mean || 1);

    f.sliceCount = f.recentSizes.length;
    f.stealthScore = clamp(cv < 0.2 && mean < engine.avgTradeSizeEma * 0.5 ? 0.8 : 0, 0, 1);
    f.accumulation = clamp(f.recentSizes.filter(t => t.size < engine.avgTradeSizeEma * 0.3).length / f.recentSizes.length, 0, 1);
  }
};

// Momentum Divergence
const updateMomentumDivergence = (engine, mid, aggressionIndex, ofiValue) => {
  const m = engine.momentumDiv;
  const prevMid = m.lastMid || mid;
  m.priceMove = mid && prevMid ? (mid - prevMid) / prevMid : 0;
  m.lastMid = mid;

  m.buyAggression = clamp((aggressionIndex + 1) / 2, 0, 1);
  const expectedDirection = ofiValue > 0.2 ? 1 : ofiValue < -0.2 ? -1 : 0;
  const actualDirection = m.priceMove > 0.0001 ? 1 : m.priceMove < -0.0001 ? -1 : 0;

  m.divergence = expectedDirection !== 0 && actualDirection !== 0 && expectedDirection !== actualDirection ? 1 : 0;
  m.fakeout = m.divergence > 0 && Math.abs(m.priceMove) > 0.0005;
};

// Absorption Persistence
const updateAbsorptionPersistence = (engine, absorptionScore, now) => {
  const a = engine.absorptionPersist;
  if (absorptionScore > 0.5) {
    if (a.startTime === 0) a.startTime = now;
    a.duration = (now - a.startTime) / 1000;
    a.defenseScore = clamp(absorptionScore * Math.min(1, a.duration / 10), 0, 1);
    a.trapProb = clamp(a.duration > 15 ? 1 - a.defenseScore : 0, 0, 1);
  } else {
    a.startTime = 0;
    a.duration = 0;
    a.defenseScore = 0;
    a.trapProb = 0;
  }
};

// Trade Size Distribution
const updateSizeDistribution = (engine, size) => {
  const s = engine.sizeDist;
  if (size < SIZE_DIST_BINS.retail) s.retail++;
  else if (size < SIZE_DIST_BINS.whale) s.mid++;
  else s.whale++;

  const total = s.retail + s.mid + s.whale || 1;
  s.history = pushSeries(s.history, { retail: s.retail / total, mid: s.mid / total, whale: s.whale / total }, 30);

  const max = Math.max(s.retail, s.mid, s.whale);
  s.dominant = max === s.whale ? 'WHALE' : max === s.mid ? 'MID_SIZE' : 'RETAIL';
};

// Execution Rhythm
const updateRhythm = (engine, now) => {
  const r = engine.rhythm;
  if (engine.lastTradeTs) {
    const interval = now - engine.lastTradeTs;
    r.intervals.push(interval);
    if (r.intervals.length > RHYTHM_WINDOW) r.intervals.shift();
  }

  if (r.intervals.length < 20) return;
  const mean = r.intervals.reduce((a, b) => a + b, 0) / r.intervals.length;
  const std = computeStdDev(r.intervals);
  const cv = std / (mean || 1);

  r.hftProb = clamp(mean < 100 && cv < 0.1 ? 0.9 : mean < 500 && cv < 0.2 ? 0.5 : 0.1, 0, 1);
  r.structured = cv < 0.25;
  r.latencyArb = clamp(r.hftProb * (1 - cv) * 0.5, 0, 1);
};

// Sweep Exhaustion
const updateSweepExhaustion = (engine, sweepScore, aggressionIndex) => {
  const s = engine.sweepExhaustion;
  if (sweepScore > 0.7 && Math.abs(aggressionIndex) < 0.3) {
    s.failedSweeps++;
  } else if (sweepScore < 0.3) {
    s.failedSweeps = Math.max(0, s.failedSweeps - 1);
  }

  s.score = clamp(s.failedSweeps / 5, 0, 1);
  s.reversalProb = clamp(s.score * (1 - Math.abs(aggressionIndex)) * 0.8, 0, 1);
};

// Elite: Liquidity Stress Radar
const updateStressRadar = (engine, voidScore, thinScore, fragilityScore, vpinScore) => {
  const s = engine.stressRadar;
  s.score = clamp(voidScore * 0.25 + thinScore * 0.25 + fragilityScore * 0.25 + vpinScore * 0.25, 0, 1);
  s.zones = [
    { label: 'VOID', value: voidScore },
    { label: 'THIN', value: thinScore },
    { label: 'FRAGILE', value: fragilityScore },
    { label: 'TOXIC', value: vpinScore }
  ];
};

// Elite: Smart Money Intent
const updateSmartMoneyIntent = (engine, ofiValue, absorptionScore, smartMoneyScore, fragmentation) => {
  const s = engine.smartMoneyIntent;
  s.direction = ofiValue;
  s.conviction = clamp(absorptionScore * 0.4 + Math.abs(ofiValue) * 0.3 + smartMoneyScore * 0.3, 0, 1);
  s.timeHorizon = fragmentation.stealthScore > 0.5 ? 'MEDIUM' : s.conviction > 0.7 ? 'SHORT' : 'LONG';
};

// Elite: Execution Conviction
const updateExecutionConviction = (engine, executionQuality, absorptionScore, ofiValue) => {
  const e = engine.executionConviction;
  e.score = clamp(executionQuality * 0.4 + absorptionScore * 0.3 + Math.abs(ofiValue) * 0.3, 0, 1);
  e.confidence = clamp(e.score * (1 - engine.vpin.score * 0.5), 0, 1);
};

// Elite: Flow Transition
const updateFlowTransition = (engine, aggressionIndex, ofiValue, prevAggression) => {
  const f = engine.flowTransition;
  const current = aggressionIndex > 0.3 ? 'BUY_PRESSURE' : aggressionIndex < -0.3 ? 'SELL_PRESSURE' : 'NEUTRAL';
  const prev = prevAggression > 0.3 ? 'BUY_PRESSURE' : prevAggression < -0.3 ? 'SELL_PRESSURE' : 'NEUTRAL';

  f.from = prev;
  f.to = current;
  f.probability = current !== prev ? clamp(Math.abs(aggressionIndex - prevAggression) * 2, 0, 1) : 0;
};

// Elite: Dealer Pressure
const updateDealerPressure = (engine, mid, compressionScore, regime) => {
  const d = engine.dealerPressure;
  const panicRegime = regime.find(r => r.id === 'PANIC');
  d.gamma = compressionScore * 0.5;
  d.hedgingPressure = clamp((panicRegime ? panicRegime.value : 0) * 0.7 + compressionScore * 0.3, 0, 1);
  d.zones = [
    { level: mid * 0.99, strength: d.hedgingPressure },
    { level: mid * 1.01, strength: d.hedgingPressure }
  ];
};

// Elite: Hidden Alpha
const updateHiddenAlpha = (engine, ofiValue, absorptionScore, fragmentation, vpinScore) => {
  const h = engine.hiddenAlpha;
  const signal = ofiValue > 0.3 && absorptionScore > 0.4 ? 'BULLISH_HIDDEN' :
    ofiValue < -0.3 && absorptionScore > 0.4 ? 'BEARISH_HIDDEN' :
    fragmentation.stealthScore > 0.5 ? 'ACCUMULATION' : 'NONE';
  h.signal = signal;
  h.score = clamp(Math.abs(ofiValue) * absorptionScore * (1 - vpinScore) * 2, 0, 1);
};

// Elite: MM Defense Zones
const updateMMDefense = (engine, bids, asks, absorptionScore) => {
  const m = engine.mmDefense;
  const strongBids = bids.filter(b => b.intensity > 0.7).map(b => ({ price: b.price, strength: b.intensity }));
  const strongAsks = asks.filter(a => a.intensity > 0.7).map(a => ({ price: a.price, strength: a.intensity }));
  m.zones = [...strongBids, ...strongAsks];
  m.strength = clamp(absorptionScore * 0.5 + m.zones.length / 10, 0, 1);
};

// Elite: Toxic Liquidity
const updateToxicLiquidity = (engine, vpinScore, adverseSelection, fragilityScore) => {
  const t = engine.toxicLiquidity;
  t.score = clamp(vpinScore * 0.4 + adverseSelection.score * 0.3 + fragilityScore * 0.3, 0, 1);
  t.levels = engine.fragility.weakZones.map(z => ({ price: z.price, toxicity: z.fragility * t.score }));
};

// Elite: Tactical Entry Timing
const updateTacticalEntry = (engine, sweepExhaustion, momentumDiv, executionConviction, vpinScore) => {
  const t = engine.tacticalEntry;
  const reversalSignal = sweepExhaustion.reversalProb * 0.4 + (momentumDiv.fakeout ? 0.3 : 0) + executionConviction.confidence * 0.3;
  t.score = clamp(reversalSignal * (1 - vpinScore * 0.5), 0, 1);
  t.timing = t.score;
  t.window = t.score > 0.6 ? 'OPEN' : t.score > 0.3 ? 'PARTIAL' : 'CLOSED';
};

const buildPredictiveSignals = (engine, context) => {
  const { bids, asks, mid, pressure, tickSize, now, compressionScore, shortVar, longVar, regime, aggressionIndex } = context;
  const dtSec = engine.lastDepthTs ? Math.max(0.05, (now - engine.lastDepthTs) / 1000) : 0.1;
  const volRatio = safeDiv(shortVar, longVar || shortVar || 1);
  const volScore = clamp(volRatio, 0, 2) / 2;
  const volRegime = volScore > 0.7 ? 'HIGH' : volScore < 0.3 ? 'LOW' : 'MID';
  const adaptiveWeight = volRegime === 'HIGH' ? 0.85 : volRegime === 'LOW' ? 1.1 : 1;

  const prevPressure = engine.pressure.value ?? pressure;
  const prevPressureVelocity = engine.pressure.velocity || 0;
  const pressureVelocity = (pressure - prevPressure) / dtSec;
  const pressureAcceleration = (pressureVelocity - prevPressureVelocity) / dtSec;
  engine.pressure = { value: pressure, velocity: pressureVelocity, acceleration: pressureAcceleration };

  const ofiVelocity = engine.ofiTrend;
  const prevOfiVelocity = engine.ofiKinematics.velocity || 0;
  const ofiAcceleration = (ofiVelocity - prevOfiVelocity) / dtSec;
  engine.ofiKinematics = { velocity: ofiVelocity, acceleration: ofiAcceleration };

  const gradient = computeDepthGradient(bids, asks, mid, tickSize);
  const prevGradient = Number.isFinite(engine.gradientState.value) ? engine.gradientState.value : gradient.imbalance;
  const gradientVelocity = (gradient.imbalance - prevGradient) / dtSec;
  const gradientAcceleration = (gradientVelocity - (engine.gradientState.velocity || 0)) / dtSec;
  engine.gradientState = { value: gradient.imbalance, velocity: gradientVelocity, acceleration: gradientAcceleration };

  const entropy = computeEntropy([...bids.slice(0, 5), ...asks.slice(0, 5)].map(level => level.size));
  engine.entropy.score = entropy;
  engine.entropy.inefficiency = 1 - entropy;

  const decayAlpha = 0.12 + volScore * 0.35;
  const decayInput = (engine.ofiValue + gradient.imbalance + (pressure - 0.5) * 2) / 3;
  engine.decayEdge.bias = ema(engine.decayEdge.bias, decayInput, decayAlpha);

  const midSeries = engine.midHistory;
  const returnSeries = [];
  for (let i = Math.max(1, midSeries.length - 26); i < midSeries.length; i++) {
    const prev = midSeries[i - 1];
    const curr = midSeries[i];
    if (prev && curr) {
      returnSeries.push((curr - prev) / prev);
    }
  }
  const meanReturn = returnSeries.length ? returnSeries.reduce((a, b) => a + b, 0) / returnSeries.length : 0;
  const stdReturn = returnSeries.length ? computeStdDev(returnSeries) : 0;
  const meanZ = meanReturn / (stdReturn + 1e-6);
  const pdfUpProb = clamp(0.5 + 0.45 * Math.tanh(meanZ * 1.4) + engine.ofiValue * 0.1, 0, 1);
  const pdfConfidence = clamp(0.35 + Math.min(1, returnSeries.length / 20) * 0.3 + engine.entropy.inefficiency * 0.3, 0, 1);

  const evidence = clamp(0.5 + 0.5 * (engine.ofiValue * 0.6 + gradient.imbalance * 0.3 + pressureVelocity * 0.1), 0, 1);
  const likelihoodUp = clamp(evidence, 0.05, 0.95);
  const priorUp = engine.bayes.priorUp ?? 0.5;
  const posteriorUp = safeDiv(likelihoodUp * priorUp, likelihoodUp * priorUp + (1 - likelihoodUp) * (1 - priorUp));
  engine.bayes.posteriorUp = posteriorUp;
  engine.bayes.priorUp = ema(priorUp, posteriorUp, 0.3);

  const currentState = regime && regime.length ? [...regime].sort((a, b) => b.value - a.value)[0].id : 'NEUTRAL';
  if (!engine.markov.transitions[currentState]) engine.markov.transitions[currentState] = {};
  if (engine.markov.lastState) {
    if (!engine.markov.transitions[engine.markov.lastState]) engine.markov.transitions[engine.markov.lastState] = {};
    engine.markov.transitions[engine.markov.lastState][currentState] = (engine.markov.transitions[engine.markov.lastState][currentState] || 0) + 1;
  }
  engine.markov.lastState = currentState;
  const transitionRow = engine.markov.transitions[currentState] || {};
  const transitionTotal = Object.values(transitionRow).reduce((a, b) => a + b, 0);
  const markovProbs = transitionTotal
    ? Object.entries(transitionRow).map(([state, count]) => ({ state, prob: count / transitionTotal }))
    : (regime || []).map(r => ({ state: r.id, prob: r.value }));
  const nextState = markovProbs.reduce((best, item) => (item.prob > best.prob ? item : best), { state: currentState, prob: 0 });

  const topBid = bids[0];
  const topAsk = asks[0];
  const microprice = topBid && topAsk
    ? (topAsk.price * topBid.size + topBid.price * topAsk.size) / (topBid.size + topAsk.size || 1)
    : mid || 0;
  const drift = (engine.ofiValue * 0.0008 + gradient.imbalance * 0.0006 + pressureVelocity * 0.0004) * (mid || microprice || 1);
  const microHorizon = calcHorizonSec(10, volScore);
  const diffusion = (stdReturn * (mid || microprice || 1)) * Math.sqrt(microHorizon || 1);
  const forecast = microprice + drift * microHorizon;
  engine.micropriceModel = { value: microprice, drift, diffusion, forecast };

  const microUpProb = clamp(0.5 + 0.5 * Math.tanh((forecast - (mid || microprice || 0)) / (diffusion + 1e-6)), 0, 1);
  const microConfidence = clamp(0.35 + Math.min(1, Math.abs(forecast - (mid || microprice || 0)) / (diffusion + 1e-6)) * 0.5 + engine.entropy.inefficiency * 0.2, 0, 1);

  const recent = engine.midHistory.slice(-15);
  let extremaDirection = 'NEUTRAL';
  let extremaScore = 0;
  if (recent.length >= 5) {
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    const range = max - min || 1;
    const position = (mid - min) / range;
    const slope = recent[recent.length - 1] - recent[recent.length - 2];
    const prevSlope = recent[recent.length - 2] - recent[recent.length - 3];
    const accel = slope - prevSlope;
    const nearHigh = position > 0.85;
    const nearLow = position < 0.15;
    if (nearHigh) extremaDirection = 'DOWN';
    if (nearLow) extremaDirection = 'UP';
    if (nearHigh || nearLow) {
      extremaScore = clamp(Math.abs(accel) * 150 + (1 - compressionScore) * 0.2, 0, 1);
    }
  }

  const edgeInefficiency = engine.entropy.inefficiency;
  const makeSignal = signal => ({
    ...signal,
    score: clamp(signal.score, 0, 1),
    moveProb: clamp(signal.moveProb, 0, 1),
    confidence: clamp(signal.confidence * adaptiveWeight, 0, 1),
    horizonSec: calcHorizonSec(signal.horizonSec, volScore)
  });

  const kinematicsSignals = [
    (() => {
      const direction = directionFromValue(pressureVelocity, 0.015);
      const upProb = clamp(0.5 + pressureVelocity * 1.8 + engine.ofiTrend * 0.15, 0, 1);
      return makeSignal({
        id: 'book-velocity',
        label: 'ORDERBOOK VELOCITY',
        direction,
        score: Math.abs(pressureVelocity) * 2,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: Math.abs(pressureVelocity) * 0.6 + Math.abs(pressureAcceleration) * 0.3 + edgeInefficiency * 0.2,
        horizonSec: 8,
        invalidation: 'Velocity flips or pressure returns to neutral (+/-2%).'
      });
    })(),
    (() => {
      const direction = directionFromValue(pressureAcceleration, 0.02);
      const upProb = clamp(0.5 + pressureAcceleration * 0.8 + pressureVelocity * 0.2, 0, 1);
      return makeSignal({
        id: 'book-acceleration',
        label: 'ORDERBOOK ACCELERATION',
        direction,
        score: Math.abs(pressureAcceleration) * 2,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: Math.abs(pressureAcceleration) * 0.7 + edgeInefficiency * 0.15,
        horizonSec: 6,
        invalidation: 'Acceleration decays below 0.02 for 2 updates.'
      });
    })(),
    (() => {
      const direction = directionFromValue(ofiAcceleration, 0.02);
      const upProb = clamp(0.5 + ofiAcceleration * 0.7 + engine.ofiTrend * 0.2, 0, 1);
      return makeSignal({
        id: 'ofi-acceleration',
        label: 'OFI ACCELERATION',
        direction,
        score: Math.abs(ofiAcceleration) * 1.5,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: Math.abs(ofiAcceleration) * 0.6 + Math.abs(engine.ofiTrend) * 0.3,
        horizonSec: 7,
        invalidation: 'OFI acceleration neutralizes or flips against trend.'
      });
    })()
  ];

  const gradientSignals = [
    (() => {
      const direction = directionFromValue(gradient.imbalance, 0.04);
      const upProb = clamp(0.5 + gradient.imbalance * 0.6 + pressureVelocity * 0.1, 0, 1);
      return makeSignal({
        id: 'depth-gradient',
        label: 'DEPTH GRADIENT SHIFT',
        direction,
        score: Math.abs(gradient.imbalance) * 1.2,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: Math.abs(gradient.imbalance) * 0.7 + edgeInefficiency * 0.2,
        horizonSec: 9,
        invalidation: 'Gradient imbalance compresses below 0.05.'
      });
    })(),
    (() => {
      const direction = directionFromValue(gradientAcceleration, 0.03);
      const upProb = clamp(0.5 + gradientAcceleration * 0.7, 0, 1);
      return makeSignal({
        id: 'gradient-accel',
        label: 'GRADIENT ACCELERATION',
        direction,
        score: Math.abs(gradientAcceleration) * 1.5,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: Math.abs(gradientAcceleration) * 0.6 + edgeInefficiency * 0.2,
        horizonSec: 6,
        invalidation: 'Gradient acceleration returns to flat or spread widens.'
      });
    })(),
    (() => {
      const direction = directionFromValue(forecast - (mid || microprice || 0), 0.0001);
      return makeSignal({
        id: 'stochastic-microprice',
        label: 'STOCHASTIC MICROPRICE',
        direction,
        score: Math.abs(forecast - (mid || microprice || 0)) / ((mid || microprice || 1) * 0.002),
        moveProb: resolveMoveProb(direction, microUpProb),
        confidence: microConfidence,
        horizonSec: 10,
        invalidation: 'Forecast crosses mid against drift or spread expands 2x.'
      });
    })()
  ];

  const probabilitySignals = [
    (() => {
      const direction = directionFromValue(pdfUpProb - 0.5, 0.04);
      return makeSignal({
        id: 'pdf-move',
        label: 'PDF MOVE DENSITY',
        direction,
        score: Math.abs(pdfUpProb - 0.5) * 2,
        moveProb: resolveMoveProb(direction, pdfUpProb),
        confidence: pdfConfidence,
        horizonSec: 12,
        invalidation: 'Mean return crosses 0 or volatility regime shifts.'
      });
    })(),
    (() => {
      const direction = directionFromValue(posteriorUp - 0.5, 0.03);
      return makeSignal({
        id: 'bayes-update',
        label: 'BAYESIAN DIRECTION UPDATE',
        direction,
        score: Math.abs(posteriorUp - 0.5) * 2,
        moveProb: resolveMoveProb(direction, posteriorUp),
        confidence: clamp(Math.abs(posteriorUp - priorUp) * 2 + edgeInefficiency * 0.2, 0, 1),
        horizonSec: 11,
        invalidation: 'Posterior reverts inside 0.48 to 0.52 band.'
      });
    })(),
    (() => {
      const decayDirection = directionFromValue(engine.decayEdge.bias, 0.03);
      const upProb = clamp(0.5 + engine.decayEdge.bias * 0.6 + aggressionIndex * 0.1, 0, 1);
      return makeSignal({
        id: 'time-decay',
        label: 'TIME-DECAY EDGE',
        direction: decayDirection,
        score: Math.abs(engine.decayEdge.bias) * 1.4,
        moveProb: resolveMoveProb(decayDirection, upProb),
        confidence: Math.abs(engine.decayEdge.bias) * 0.7 + edgeInefficiency * 0.2,
        horizonSec: 14,
        invalidation: 'Decay bias crosses 0 or regime flips to HIGH vol.'
      });
    })()
  ];

  const regimeSignals = [
    (() => {
      const direction = directionFromValue(engine.ofiValue, 0.05);
      return makeSignal({
        id: 'markov-transition',
        label: `MARKOV TRANSITION (${nextState.state})`,
        direction,
        score: nextState.prob,
        moveProb: resolveMoveProb(direction, clamp(0.5 + nextState.prob * 0.3 + engine.ofiValue * 0.1, 0, 1)),
        confidence: clamp(nextState.prob + edgeInefficiency * 0.2, 0, 1),
        horizonSec: 18,
        invalidation: 'Current regime reclassifies or transition prob drops.'
      });
    })(),
    (() => {
      const inefficiency = engine.entropy.inefficiency;
      const direction = inefficiency > 0.3 ? directionFromValue(engine.ofiValue, 0.04) : 'NEUTRAL';
      const upProb = clamp(0.5 + engine.ofiValue * 0.2 + inefficiency * 0.3, 0, 1);
      return makeSignal({
        id: 'entropy-efficiency',
        label: 'ENTROPY EFFICIENCY',
        direction,
        score: inefficiency,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: clamp(inefficiency * 0.8 + (1 - entropy) * 0.1, 0, 1),
        horizonSec: 16,
        invalidation: 'Entropy > 0.8 (high efficiency) or OFI neutralizes.'
      });
    })(),
    (() => {
      const direction = extremaDirection;
      const upProb = clamp(0.5 + extremaScore * 0.4, 0, 1);
      return makeSignal({
        id: 'local-extrema',
        label: 'LOCAL EXTREMA EXHAUSTION',
        direction,
        score: extremaScore,
        moveProb: resolveMoveProb(direction, upProb),
        confidence: clamp(extremaScore * 0.8 + edgeInefficiency * 0.2, 0, 1),
        horizonSec: 10,
        invalidation: 'Breaks recent extreme by more than 1 tick.'
      });
    })()
  ];

  return {
    meta: { volRegime, volScore },
    kinematics: { signals: kinematicsSignals },
    gradients: { signals: gradientSignals },
    probability: { signals: probabilitySignals },
    regime: { signals: regimeSignals }
  };
};

export const useMicrostructureEngine = (ticker, enabled = true) => {
  const [snapshot, setSnapshot] = useState(defaultSnapshot);
  const engineRef = useRef(initEngine());
  const rafRef = useRef(null);
  const lastRenderRef = useRef(0);

  const publishSnapshot = () => {
    const engine = engineRef.current;
    engine.dirty = false;
    engine.version += 1;
    const now = performance.now();
    const lastRender = lastRenderRef.current || now;
    const renderRate = 1000 / Math.max(16, now - lastRender);
    lastRenderRef.current = now;
    engine.metrics.renderRateHz = ema(engine.metrics.renderRateHz, renderRate, 0.3);

    setSnapshot({
      ...engine.snapshot,
      metrics: {
        ...engine.snapshot.metrics,
        renderRateHz: engine.metrics.renderRateHz
      },
      version: engine.version
    });
  };

  const schedulePublish = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const now = performance.now();
      if (now - lastRenderRef.current < RENDER_THROTTLE_MS) {
        schedulePublish();
        return;
      }
      if (engineRef.current.dirty) publishSnapshot();
    });
  };

  useEffect(() => {
    engineRef.current = initEngine();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(defaultSnapshot);
  }, [ticker]);

  useEffect(() => {
    if (!enabled) return;
    const symbol = normalizeTicker(ticker);
    const engine = engineRef.current;
    const storage = getStorage();

    if (!symbol) {
      engine.snapshot = { ...defaultSnapshot, status: { state: 'idle', message: 'SELECT A TICKER', source: '' } };
      engine.dirty = true;
      schedulePublish();
      return;
    }

    const crypto = isCryptoTicker(symbol);
    const stockProvider = (import.meta.env.VITE_STOCK_ORDERBOOK_PROVIDER || '').trim();
    const stockWsUrl = (import.meta.env.VITE_STOCK_ORDERBOOK_WS_URL || '').trim();

    let streamUrl;
    let sourceLabel;
    let connectingMessage;

    if (crypto) {
      const wsBase = import.meta.env.VITE_BINANCE_WS_BASE || 'wss://stream.binance.com:9443/stream';
      const binanceSymbol = toBinanceSymbol(symbol);
      const streamSymbol = binanceSymbol.toLowerCase();
      streamUrl = `${wsBase}?streams=${streamSymbol}@depth20@100ms/${streamSymbol}@trade`;
      sourceLabel = 'BINANCE';
      connectingMessage = `CONNECTING ${binanceSymbol}`;
    } else {
      if (!stockWsUrl) {
        engine.snapshot = {
          ...defaultSnapshot,
          status: { state: 'idle', message: 'EQUITY L2 FEED NOT CONFIGURED', source: '' },
          symbol
        };
        engine.dirty = true;
        schedulePublish();
        return;
      }
      streamUrl = stockWsUrl;
      sourceLabel = stockProvider || 'STOCK PROXY';
      connectingMessage = `CONNECTING TO ${sourceLabel} (${symbol})`;
    }

    engine.snapshot = {
      ...defaultSnapshot,
      status: { state: 'connecting', message: connectingMessage, source: sourceLabel },
      symbol
    };
    engine.dirty = true;
    schedulePublish();

    const initPersistence = async () => {
      if (!storage || !symbol) return;

      const storedSession = storage.getItem(STORAGE_SESSION_KEY);
      if (storedSession && !engine.persistence.restored) {
        engine.persistence.sessionId = storedSession;
        const restored = restorePersistedFootprint(engine, storage, storedSession, symbol);
        engine.persistence.restored = true;
        if (restored) {
          engine.dirty = true;
          schedulePublish();
        }
      }

      try {
        const res = await fetch('http://localhost:3001/api/session');
        if (!res.ok) return;
        const data = await res.json();
        const sessionId = data?.id;
        if (!sessionId) return;

        if (storedSession && storedSession !== sessionId) {
          clearStoredSession(storage, storedSession);
          engine.footprint.volumeMap = new Map();
          engine.midHistory = [];
          engine.ofiSeries = [];
          engine.persistence.restored = false;
        }

        engine.persistence.sessionId = sessionId;
        storage.setItem(STORAGE_SESSION_KEY, sessionId);

        if (!engine.persistence.restored) {
          const restored = restorePersistedFootprint(engine, storage, sessionId, symbol);
          engine.persistence.restored = true;
          if (restored) {
            engine.dirty = true;
            schedulePublish();
          }
        }
      } catch {
        // ignore session init failures
      }
    };

    initPersistence();

    let active = true;
    const ws = new WebSocket(streamUrl);

    ws.onopen = () => {
      if (!crypto && active) {
        ws.send(JSON.stringify({ type: 'subscribe', ticker: symbol }));
      }
    };

    const updateMetrics = (eventTime, computeStart) => {
      const now = Date.now();
      if (eventTime) {
        const delay = Math.max(0, now - eventTime);
        engine.metrics.feedDelayMs = ema(engine.metrics.feedDelayMs, delay, 0.2);
      }

      if (engine.lastDepthTs) {
        const interval = now - engine.lastDepthTs;
        if (interval > 0) {
          const rate = 1000 / interval;
          engine.metrics.updateRateHz = ema(engine.metrics.updateRateHz, rate, 0.2);
          const jitter = Math.abs(interval - (1000 / (engine.metrics.updateRateHz || rate)));
          engine.metrics.jitterMs = ema(engine.metrics.jitterMs, jitter, 0.2);
        }
      }

      if (computeStart != null) {
        const computeMs = performance.now() - computeStart;
        engine.metrics.computeMs = ema(engine.metrics.computeMs, computeMs, 0.3);
      }
    };

    const handleDepth = data => {
      if (!active) return;
      const computeStart = performance.now();
      const eventTime = data?.E || data?.eventTime || Date.now();
      const bidsRaw = data?.bids || data?.b || [];
      const asksRaw = data?.asks || data?.a || [];

      const bids = buildLevels(bidsRaw, 'desc');
      const asksAsc = buildLevels(asksRaw, 'asc');
      const asks = asksAsc.slice().reverse();

      const bestBid = bids[0]?.price || null;
      const bestAsk = asksAsc[0]?.price || null;
      const mid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : null;
      const spread = bestBid && bestAsk ? bestAsk - bestBid : null;
      const spreadPct = spread && mid ? (spread / mid) * 100 : null;

      const bidTotal = bids.reduce((sum, row) => sum + row.size, 0);
      const askTotal = asksAsc.reduce((sum, row) => sum + row.size, 0);
      const pressure = bidTotal + askTotal > 0 ? bidTotal / (bidTotal + askTotal) : 0.5;

      const prevBids = engine.prevBook.bids;
      const prevAsks = engine.prevBook.asks;
      const nextBids = new Map();
      const nextAsks = new Map();

      let deltaBid = 0;
      let deltaAsk = 0;

      bids.forEach(row => {
        const prev = prevBids.get(row.price) || 0;
        deltaBid += row.size - prev;
        nextBids.set(row.price, row.size);
      });
      prevBids.forEach((size, price) => {
        if (!nextBids.has(price)) deltaBid -= size;
      });

      asksAsc.forEach(row => {
        const prev = prevAsks.get(row.price) || 0;
        deltaAsk += row.size - prev;
        nextAsks.set(row.price, row.size);
      });
      prevAsks.forEach((size, price) => {
        if (!nextAsks.has(price)) deltaAsk -= size;
      });

      engine.prevBook.bids = nextBids;
      engine.prevBook.asks = nextAsks;

      const ofiRaw = safeDiv(deltaBid - deltaAsk, Math.abs(deltaBid) + Math.abs(deltaAsk) + 1e-6);
      const prevOfi = engine.ofiValue;
      engine.ofiValue = ema(engine.ofiValue, ofiRaw, 0.3);
      engine.ofiTrend = ema(engine.ofiTrend, engine.ofiValue - prevOfi, 0.3);
      engine.ofiSeries = pushSeries(engine.ofiSeries, engine.ofiValue, OFI_WINDOW);

      const liquidityTotal = bidTotal + askTotal;
      engine.liquidityEma = ema(engine.liquidityEma, liquidityTotal, 0.1);
      const voidScore = engine.liquidityEma ? clamp((engine.liquidityEma - liquidityTotal) / engine.liquidityEma, 0, 1) : 0;

      const avgLevelSize = (bidTotal + askTotal) / Math.max(1, bids.length + asksAsc.length);
      const thinThreshold = avgLevelSize * 0.25;
      const thinCount = bids.filter(row => row.size < thinThreshold).length + asksAsc.filter(row => row.size < thinThreshold).length;
      const thinScore = clamp(thinCount / Math.max(1, bids.length + asksAsc.length), 0, 1);

      const maxBidSize = bids.reduce((max, row) => Math.max(max, row.size), 0) || 1;
      const maxAskSize = asksAsc.reduce((max, row) => Math.max(max, row.size), 0) || 1;
      const bidsWithIntensity = bids.map(row => ({
        ...row,
        intensity: clamp(row.size / maxBidSize, 0, 1)
      }));
      const asksWithIntensity = asks.map(row => ({
        ...row,
        intensity: clamp(row.size / maxAskSize, 0, 1)
      }));

      const now = Date.now();
      const largeThreshold = avgLevelSize * 3;
      const nextLarge = new Map();
      const trackLarge = (levels, side) => {
        levels.forEach(row => {
          if (row.size >= largeThreshold) {
            nextLarge.set(`${side}:${row.price}`, { size: row.size, time: now });
          }
        });
      };
      trackLarge(bids, 'B');
      trackLarge(asksAsc, 'A');

      engine.spoof.largeOrders.forEach((entry, key) => {
        if (!nextLarge.has(key)) {
          const pullAge = now - entry.time;
          if (pullAge < SPOOF_WINDOW_MS) {
            engine.spoof.pullEvents.push(now);
          }
        }
      });
      nextLarge.forEach((entry, key) => {
        if (!engine.spoof.largeOrders.has(key)) {
          engine.spoof.addEvents.push(now);
        }
      });
      engine.spoof.largeOrders = nextLarge;
      engine.spoof.addEvents = engine.spoof.addEvents.filter(ts => now - ts < 20000);
      engine.spoof.pullEvents = engine.spoof.pullEvents.filter(ts => now - ts < 20000);
      const spoofScore = clamp(safeDiv(engine.spoof.pullEvents.length, engine.spoof.addEvents.length + 1), 0, 1);

      if (voidScore > 0.6) pushAnomaly(engine, 'LIQUIDITY VOID SPIKE', 'HIGH');
      if (spoofScore > 0.6) pushAnomaly(engine, 'SPOOFING BURST', 'HIGH');

      const tickSize = pickTickSize(mid || bestBid || bestAsk);
      const prevBestBid = engine.prevBook.bestBid;
      const prevBestAsk = engine.prevBook.bestAsk;
      let sweepScore = 0;
      if (prevBestBid && bestBid) {
        const bidMove = Math.abs(bestBid - prevBestBid);
        sweepScore = Math.max(sweepScore, safeDiv(bidMove, tickSize * 3));
      }
      if (prevBestAsk && bestAsk) {
        const askMove = Math.abs(bestAsk - prevBestAsk);
        sweepScore = Math.max(sweepScore, safeDiv(askMove, tickSize * 3));
      }
      sweepScore = clamp(sweepScore * clamp(engine.tradeRateEma / 8, 0, 1), 0, 1);
      if (sweepScore > 0.7) pushAnomaly(engine, 'LIQUIDITY SWEEP DETECTED', 'HIGH');

      engine.prevBook.bestBid = bestBid;
      engine.prevBook.bestAsk = bestAsk;

      const midHistory = engine.midHistory;
      if (Number.isFinite(mid)) {
        midHistory.push(mid);
        if (midHistory.length > 60) midHistory.shift();
      }
      const shortSlice = midHistory.slice(-10);
      const longSlice = midHistory.slice(-50);
      const shortVar = computeVariance(shortSlice);
      const longVar = computeVariance(longSlice);
      const compressionScore = clamp(1 - safeDiv(shortVar, longVar || shortVar || 1), 0, 1);
      const expansionProb = clamp(1 - compressionScore, 0, 1);

      const aggressionIndex = safeDiv(engine.aggBuyEma - engine.aggSellEma, engine.aggBuyEma + engine.aggSellEma + 1e-6);
      if (Math.abs(aggressionIndex) > 0.6) pushAnomaly(engine, 'AGGRESSION FLIP', 'MED');

      const priceImpact = mid && engine.prevBook.bestBid && engine.prevBook.bestAsk ? Math.abs(mid - (engine.prevBook.bestBid + engine.prevBook.bestAsk) / 2) / mid : 0;
      engine.priceImpactEma = ema(engine.priceImpactEma, priceImpact, 0.2);

      const aggrTotal = engine.aggBuyEma + engine.aggSellEma;
      const absorptionScore = clamp((aggrTotal / (liquidityTotal + 1)) * (1 - clamp(engine.priceImpactEma * 5000, 0, 1)), 0, 1);
      const fragmentation = safeDiv(engine.tradeRateEma, engine.avgTradeSizeEma + 1);
      const smartMoneyScore = clamp(absorptionScore * 0.6 + Math.max(0, engine.ofiValue) * 0.2 + clamp(fragmentation * 0.1, 0, 0.2), 0, 1);
      const hiddenLiquidityScore = clamp(absorptionScore * 0.6 + spoofScore * 0.2 + clamp(fragmentation * 0.2, 0, 0.2), 0, 1);

      const executionQuality = clamp(1 - clamp(engine.priceImpactEma * 4000, 0, 1) + clamp(fragmentation * 0.12, 0, 0.3), 0, 1);
      let executionMode = 'BALANCED';
      if (executionQuality > 0.75 && absorptionScore > 0.5) executionMode = 'STEALTH';
      else if (aggressionIndex > 0.35) executionMode = 'AGGRESSIVE BUY';
      else if (aggressionIndex < -0.35) executionMode = 'AGGRESSIVE SELL';

      const regime = normalizeScores([
        { id: 'TREND', label: 'TREND CONTINUATION', value: clamp(0.4 + engine.ofiValue * 0.5 + aggressionIndex * 0.3, 0, 1) },
        { id: 'MEAN', label: 'MEAN REVERSION', value: clamp(0.3 + (1 - Math.abs(engine.ofiValue)) * 0.4 + (liquidityTotal > (engine.liquidityEma || liquidityTotal) ? 0.2 : 0), 0, 1) },
        { id: 'COMP', label: 'LIQUIDITY COMPRESSION', value: compressionScore },
        { id: 'PANIC', label: 'PANIC / SWEEP', value: clamp(voidScore * 0.7 + sweepScore * 0.3, 0, 1) },
        { id: 'MANIP', label: 'MANIPULATION RISK', value: clamp(spoofScore * 0.6 + thinScore * 0.3, 0, 1) }
      ]);

      const alpha = normalizeScores([
        { id: 'CONT', label: 'CONTINUATION', value: clamp(0.4 + engine.ofiValue * 0.5 + aggressionIndex * 0.2, 0, 1) },
        { id: 'REV', label: 'REVERSAL', value: clamp(0.25 + absorptionScore * 0.5 + (1 - Math.abs(engine.ofiValue)) * 0.2, 0, 1) },
        { id: 'BRK', label: 'BREAKOUT', value: clamp(0.2 + compressionScore * 0.5 + voidScore * 0.3, 0, 1) },
        { id: 'FAKE', label: 'FAKEOUT', value: clamp(0.2 + spoofScore * 0.5 + sweepScore * 0.3, 0, 1) }
      ]);

      // Elite indicator calculations
      updateQueueIntelligence(engine, bids, asksAsc, now);
      updateResiliency(engine, bids, asksAsc, liquidityTotal, now);
      updateReplenishmentVelocity(engine, liquidityTotal);
      updatePriceImpactModel(engine, mid, bids, asksAsc, aggressionIndex, engine.tradeRateEma);
      updateAdverseSelection(engine, engine.priceImpactEma, engine.ofiValue, aggressionIndex, voidScore);
      updateIceberg(engine, bids, asksAsc, now);
      updateConsumption(engine, liquidityTotal);
      updateFlowRatio(engine);
      updateFragility(engine, bids, asksAsc, mid);
      updateSweepPattern(engine, bestBid, bestAsk, prevBestBid, prevBestAsk, tickSize);
      updateMomentumDivergence(engine, mid, aggressionIndex, engine.ofiValue);
      updateAbsorptionPersistence(engine, absorptionScore, now);
      updateMMDefense(engine, bidsWithIntensity, asksWithIntensity, absorptionScore);
      updateDealerPressure(engine, mid, compressionScore, regime);
      updateStressRadar(engine, voidScore, thinScore, engine.fragility.score, engine.vpin.score);
      updateSmartMoneyIntent(engine, engine.ofiValue, absorptionScore, smartMoneyScore, engine.fragmentation);
      updateExecutionConviction(engine, executionQuality, absorptionScore, engine.ofiValue);
      updateFlowTransition(engine, aggressionIndex, engine.ofiValue, engine.prevAggressionIndex || 0);
      engine.prevAggressionIndex = aggressionIndex;
      updateHiddenAlpha(engine, engine.ofiValue, absorptionScore, engine.fragmentation, engine.vpin.score);
      updateToxicLiquidity(engine, engine.vpin.score, engine.adverseSelection, engine.fragility.score);
      updateTacticalEntry(engine, engine.sweepExhaustion, engine.momentumDiv, engine.executionConviction, engine.vpin.score);
      updateSweepExhaustion(engine, sweepScore, aggressionIndex);

      engine.predictive = buildPredictiveSignals(engine, {
        bids,
        asks: asksAsc,
        mid,
        pressure,
        tickSize,
        now,
        compressionScore,
        shortVar,
        longVar,
        regime,
        aggressionIndex
      });

      rebuildFootprintBuckets(engine, mid, bidsWithIntensity, asksWithIntensity);

      engine.snapshot = {
        ...engine.snapshot,
        status: { state: 'live', message: '', source: sourceLabel },
        symbol,
        metrics: {
          feedDelayMs: engine.metrics.feedDelayMs,
          computeMs: engine.metrics.computeMs,
          updateRateHz: engine.metrics.updateRateHz,
          jitterMs: engine.metrics.jitterMs,
          renderRateHz: engine.metrics.renderRateHz
        },
        book: {
          bids: bidsWithIntensity,
          asks: asksWithIntensity,
          mid,
          spread,
          spreadPct,
          pressure,
          bestBid,
          bestAsk
        },
        ofi: {
          value: engine.ofiValue,
          trend: engine.ofiTrend,
          series: engine.ofiSeries
        },
        liquidity: {
          total: liquidityTotal,
          voidScore,
          thinScore
        },
        aggression: {
          buy: engine.aggBuyEma,
          sell: engine.aggSellEma,
          index: aggressionIndex,
          tradeRate: engine.tradeRateEma
        },
        absorption: { score: absorptionScore },
        spoofing: { score: spoofScore, confidence: clamp(0.3 + spoofScore * 0.6, 0, 1) },
        smartMoney: { score: smartMoneyScore, bias: engine.ofiValue },
        hiddenLiquidity: { score: hiddenLiquidityScore },
        sweep: { score: sweepScore, last: sweepScore > 0.7 ? Date.now() : engine.snapshot.sweep.last },
        compression: { score: compressionScore, expansionProb },
        footprint: {
          buckets: engine.footprint.buckets,
          maxAbs: Math.max(1, ...engine.footprint.buckets.map(b => Math.abs(b.delta))),
          maxVol: Math.max(1, ...engine.footprint.buckets.map(b => Math.max(b.buyVol || 0, b.sellVol || 0)))
        },
        regime,
        alpha,
        anomalies: engine.anomalies,
        execution: { quality: executionQuality, mode: executionMode, confidence: clamp(executionQuality, 0, 1) },
        dealer: { gamma: engine.dealerPressure.gamma, note: engine.dealerPressure.hedgingPressure > 0.5 ? 'HIGH HEDGING PRESSURE' : 'NORMAL' },
        // Elite Orderbook Intelligence
        queue: { stabilityMap: engine.queue.stabilityMap },
        resiliency: { score: engine.resiliency.score, curve: engine.resiliency.curve },
        replenishment: { velocity: engine.replenishment.velocity, history: engine.replenishment.velocityHistory },
        priceImpact: { drift: engine.priceImpactModel.immediateDrift, confidence: engine.priceImpactModel.confidence, sensitivity: engine.priceImpactModel.sensitivity },
        adverseSelection: { score: engine.adverseSelection.score, toxicFlowProb: engine.adverseSelection.toxicFlowProb, mmStress: engine.adverseSelection.mmStress },
        vpin: { score: engine.vpin.score, informedProb: engine.vpin.informedProb, volSpikeRisk: engine.vpin.volSpikeRisk },
        iceberg: { probability: engine.iceberg.probability, stealthScore: engine.iceberg.stealthScore, zones: engine.iceberg.detectedZones },
        consumption: { rate: engine.consumption.rate, acceleration: engine.consumption.acceleration, breakoutProb: engine.consumption.breakoutProb },
        flowRatio: { passive: engine.flowRatio.passive, aggressive: engine.flowRatio.aggressive, state: engine.flowRatio.state },
        fragility: { score: engine.fragility.score, weakZones: engine.fragility.weakZones },
        // Elite Time & Sales Intelligence
        sequencing: { pattern: engine.sequencing.pattern, algoProb: engine.sequencing.algoProb, participantType: engine.sequencing.participantType },
        flowVelocity: { buyAccel: engine.flowVelocity.buyAccel, sellAccel: engine.flowVelocity.sellAccel, exhaustion: engine.flowVelocity.exhaustion },
        tradeToxicity: { smartMoneyProb: engine.tradeToxicity.smartMoneyProb, retailChase: engine.tradeToxicity.retailChase, toxicProb: engine.tradeToxicity.toxicProb },
        sweepPattern: { type: engine.sweepPattern.type, confidence: engine.sweepPattern.confidence, multiLevel: engine.sweepPattern.multiLevel, levelsCrossed: engine.sweepPattern.levelsCrossed },
        fragmentation: { sliceCount: engine.fragmentation.sliceCount, stealthScore: engine.fragmentation.stealthScore, accumulation: engine.fragmentation.accumulation },
        momentumDiv: { divergence: engine.momentumDiv.divergence, fakeout: engine.momentumDiv.fakeout, priceMove: engine.momentumDiv.priceMove },
        absorptionPersist: { duration: engine.absorptionPersist.duration, defenseScore: engine.absorptionPersist.defenseScore, trapProb: engine.absorptionPersist.trapProb },
        sizeDist: { retail: engine.sizeDist.retail, mid: engine.sizeDist.mid, whale: engine.sizeDist.whale, dominant: engine.sizeDist.dominant },
        rhythm: { hftProb: engine.rhythm.hftProb, structured: engine.rhythm.structured, latencyArb: engine.rhythm.latencyArb },
        sweepExhaustion: { score: engine.sweepExhaustion.score, reversalProb: engine.sweepExhaustion.reversalProb },
        // Elite Extra Modules
        stressRadar: { score: engine.stressRadar.score, zones: engine.stressRadar.zones },
        smartMoneyIntent: { direction: engine.smartMoneyIntent.direction, conviction: engine.smartMoneyIntent.conviction, timeHorizon: engine.smartMoneyIntent.timeHorizon },
        executionConviction: { score: engine.executionConviction.score, confidence: engine.executionConviction.confidence },
        flowTransition: { from: engine.flowTransition.from, to: engine.flowTransition.to, probability: engine.flowTransition.probability },
        dealerPressure: { gamma: engine.dealerPressure.gamma, hedgingPressure: engine.dealerPressure.hedgingPressure, zones: engine.dealerPressure.zones },
        hiddenAlpha: { score: engine.hiddenAlpha.score, signal: engine.hiddenAlpha.signal },
        mmDefense: { zones: engine.mmDefense.zones, strength: engine.mmDefense.strength },
        toxicLiquidity: { score: engine.toxicLiquidity.score, levels: engine.toxicLiquidity.levels },
        tacticalEntry: { timing: engine.tacticalEntry.timing, score: engine.tacticalEntry.score, window: engine.tacticalEntry.window },
        predictive: engine.predictive
      };

      if (engine.persistence.sessionId && storage && now - engine.persistence.lastSaved > PERSIST_INTERVAL_MS) {
        persistFootprint(engine, storage, engine.persistence.sessionId, symbol, now);
        engine.persistence.lastSaved = now;
      }

      engine.lastDepthTs = Date.now();
      updateMetrics(eventTime, computeStart);
      engine.dirty = true;
      schedulePublish();
    };

    const handleTrade = data => {
      if (!active) return;
      const computeStart = performance.now();
      const eventTime = data?.T || data?.E || Date.now();
      const price = Number(data?.p || data?.price);
      const size = Number(data?.q || data?.size);
      if (!Number.isFinite(price) || !Number.isFinite(size)) return;

      const now = Date.now();
      const isBuyerMaker = data?.m ?? data?.isBuyerMaker;
      const isBuy = !isBuyerMaker;
      if (isBuy) engine.aggBuyEma = ema(engine.aggBuyEma, size, 0.3);
      else engine.aggSellEma = ema(engine.aggSellEma, size, 0.3);

      if (engine.lastTradeTs) {
        const interval = now - engine.lastTradeTs;
        if (interval > 0) {
          const rate = 1000 / interval;
          engine.tradeRateEma = ema(engine.tradeRateEma, rate, 0.2);
        }
      }

      engine.avgTradeSizeEma = ema(engine.avgTradeSizeEma, size, 0.2);
      engine.lastTradeTs = now;

      const mid = engine.snapshot.book.mid;
      updateFootprintBuckets(engine, mid, price, size, isBuy, now);
      rebuildFootprintBuckets(engine, mid, engine.snapshot.book.bids, engine.snapshot.book.asks);

      // Elite trade-based indicators
      updateVPIN(engine, size, isBuy);
      updateFlowVelocity(engine, size, isBuy);
      updateTradeToxicity(engine, size, isBuy, engine.avgTradeSizeEma, engine.ofiValue);
      updateFragmentation(engine, size, now);
      updateSequencing(engine, now);
      updateSizeDistribution(engine, size);
      updateRhythm(engine, now);

      if (size > engine.avgTradeSizeEma * 3) {
        pushAnomaly(engine, isBuy ? 'BLOCK BUY DETECTED' : 'BLOCK SELL DETECTED', 'MED');
      }

      updateMetrics(eventTime, computeStart);
      engine.dirty = true;
      schedulePublish();
    };

    ws.onmessage = event => {
      if (!active) return;
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;
        
        if (data?.state === 'error') {
          engine.snapshot = {
            ...engine.snapshot,
            status: { state: 'error', message: data.message || 'DATA NOT FOUND', source: sourceLabel }
          };
          engine.dirty = true;
          schedulePublish();
          return;
        }

        if (data?.bids || data?.asks || data?.b || data?.a) {
          handleDepth(data);
          return;
        }
        if (data?.e === 'trade' || data?.T || data?.p) {
          handleTrade(data);
        }
      } catch {
        console.warn('Microstructure feed parse error');
      }
    };

    ws.onerror = () => {
      if (!active) return;
      engine.snapshot = {
        ...defaultSnapshot,
        status: { state: 'error', message: 'MICROSTRUCTURE FEED ERROR', source: sourceLabel },
        symbol
      };
      engine.dirty = true;
      schedulePublish();
    };

    ws.onclose = () => {
      if (!active) return;
      engine.snapshot = {
        ...defaultSnapshot,
        status: { state: 'idle', message: 'MICROSTRUCTURE FEED DISCONNECTED', source: sourceLabel },
        symbol
      };
      engine.dirty = true;
      schedulePublish();
    };

    return () => {
      active = false;
      ws.close(1000, 'cleanup');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, enabled]);

  return snapshot;
};
