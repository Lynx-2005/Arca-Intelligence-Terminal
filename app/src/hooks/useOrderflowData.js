import { useEffect, useRef, useState } from 'react';
import { ApiService } from '../services/api';

const TF_MAP = {
  '1m': 60000,
  '5m': 300000,
  '15m': 900000
};

const getTickSize = (price) => {
  if (price >= 10000) return 10;
  if (price >= 1000) return 1;
  if (price >= 100) return 0.5;
  if (price >= 10) return 0.1;
  return 0.01;
};

const bucketPrice = (price, tickSz) => {
  return Math.floor(price / tickSz) * tickSz;
};

const createCandle = (startTime, firstPrice, tickSz) => ({
  time: startTime,
  open: firstPrice,
  high: firstPrice,
  low: firstPrice,
  close: firstPrice,
  volume: 0,
  buyVolume: 0,
  sellVolume: 0,
  delta: 0,
  tradeCount: 0,
  tickSize: tickSz,
  footprint: {},
  ticks: [],
  maxLevelVol: 0
});

const isCryptoTicker = (t) => {
  const s = (t || '').toUpperCase();
  return s.includes('-') || s.endsWith('USDT') || s.endsWith('USD') || s.endsWith('BTC') || s.endsWith('ETH');
};

export const useOrderflowData = (ticker, timeframe) => {
  const dataRef = useRef([]);
  const domRef = useRef({ bids: [], asks: [], bestBid: 0, bestAsk: 0 });
  const [status, setStatus] = useState('connecting');
  const [tradeCount, setTradeCount] = useState(0);
  const wsRef = useRef(null);
  const tickCountRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const optionsIntervalRef = useRef(null);
  const [optionsLevels, setOptionsLevels] = useState([]);

  useEffect(() => {
    if (!ticker) return;

    let active = true;

    // Clear data so we don't mix symbols
    dataRef.current = [];
    domRef.current = { bids: [], asks: [], bestBid: 0, bestAsk: 0 };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('connecting');
    setTradeCount(0);
    tickCountRef.current = 0;

    const bucketMs = TF_MAP[timeframe] || 60000;

    // Load persisted footprint data from server (survives browser refresh)
    const loadPersistedData = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/footprint/${encodeURIComponent(ticker)}?timeframe=${timeframe}`);
        if (!active) return;
        if (res.ok) {
          const result = await res.json();
          if (result.candles && result.candles.length > 0) {
            // Merge server candles with any live candles already accumulated
            const existingTimes = new Set(dataRef.current.map(c => c.time));
            const serverCandles = result.candles.filter(c => !existingTimes.has(c.time));
            
            // Add ticks array to server candles (they don't have it)
            serverCandles.forEach(c => {
              if (!c.ticks) c.ticks = [];
            });

            if (dataRef.current.length === 0) {
              dataRef.current = [...serverCandles];
            } else {
              // Merge: server candles first, then live candles
              const mergedTimes = new Set();
              const merged = [];
              for (const c of [...serverCandles, ...dataRef.current]) {
                if (!mergedTimes.has(c.time)) {
                  merged.push(c);
                  mergedTimes.add(c.time);
                }
              }
              merged.sort((a, b) => a.time - b.time);
              dataRef.current = merged;
            }

            tickCountRef.current = Math.max(tickCountRef.current, result.tickCount || 0);
            setTradeCount(tickCountRef.current);
            console.log(`[Orderflow] Loaded ${result.candles.length} persisted candles for ${ticker} (${timeframe})`);
          }
        }
      } catch (err) {
        console.warn('[Orderflow] Failed to load persisted footprint data:', err.message);
      }
    };
    loadPersistedData();

    // Also load historical candle data (without footprint) as a fallback
    const initData = async () => {
      try {
        const history = await ApiService.getHistoricalData(ticker, timeframe);
        if (!active) return;
        if (history && history.length > 0) {
          const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);
          const historyCandles = history
            .filter(bar => bar && isFiniteNumber(bar.close) && (bar.time || bar.date))
            .map(bar => {
              const ts = bar.time || bar.date;
              const timeMs = typeof ts === 'string' ? new Date(ts).getTime() : 
                             (ts > 1e10 ? ts : ts * 1000);
              const p = Number(bar.close);
              return {
                time: Math.floor(timeMs / bucketMs) * bucketMs,
                open: Number(bar.open),
                high: Number(bar.high),
                low: Number(bar.low),
                close: p,
                volume: Number(bar.volume || 0),
                buyVolume: 0,
                sellVolume: 0,
                delta: 0,
                tradeCount: 0,
                tickSize: getTickSize(p),
                footprint: {},
                ticks: [],
                maxLevelVol: 0
              };
            })
            .sort((a, b) => a.time - b.time);

          if (historyCandles.length > 0) {
            const liveCandles = dataRef.current;
            if (liveCandles.length > 0) {
              // History is the base, overlay with live/persisted candles that have footprint data
              const liveTimesMap = new Map(liveCandles.map(c => [c.time, c]));
              const merged = [];
              const seenTimes = new Set();

              for (const hc of historyCandles) {
                if (liveTimesMap.has(hc.time)) {
                  // Prefer the live/persisted candle (has footprint)
                  merged.push(liveTimesMap.get(hc.time));
                } else {
                  merged.push(hc);
                }
                seenTimes.add(hc.time);
              }
              // Append any live candles newer than history
              for (const lc of liveCandles) {
                if (!seenTimes.has(lc.time)) {
                  merged.push(lc);
                }
              }
              merged.sort((a, b) => a.time - b.time);
              dataRef.current = merged;
            } else {
              dataRef.current = historyCandles;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load history for orderflow chart', err);
      }
    };
    initData();

    const toBinanceSymbol = (t) => {
      const s = (t || '').toUpperCase();
      if (s.includes('-')) {
        const [base, quote] = s.split('-');
        return quote === 'USD' ? `${base}USDT` : `${base}${quote}`;
      }
      if (s.endsWith('USD') && !s.endsWith('USDT') && s.length > 3) return `${s.slice(0, -3)}USDT`;
      return s;
    };

    const crypto = isCryptoTicker(ticker);
    let wsUrl;
    if (crypto) {
      const binanceSymbol = toBinanceSymbol(ticker).toLowerCase();
      // Subscribe to BOTH trade stream AND depth (order book) stream
      wsUrl = `wss://stream.binance.com:9443/stream?streams=${binanceSymbol}@trade/${binanceSymbol}@depth20@100ms`;
    } else {
      wsUrl = import.meta.env.VITE_STOCK_ORDERBOOK_WS_URL || 'ws://localhost:3001';
    }

    const handleTick = (price, vol, tradeTime, isBuyerMaker) => {
      const candles = dataRef.current;
      const candleStart = Math.floor(tradeTime / bucketMs) * bucketMs;
      const tickSz = getTickSize(price);
      const bucket = bucketPrice(price, tickSz);
      const priceKey = bucket.toFixed(2);

      const isBuy = !isBuyerMaker;
      const deltaVol = isBuy ? vol : -vol;

      let candle;
      if (candles.length === 0 || candles[candles.length - 1].time !== candleStart) {
        candle = createCandle(candleStart, price, tickSz);
        candles.push(candle);
        if (candles.length > 500) candles.shift();
      } else {
        candle = candles[candles.length - 1];
      }

      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += vol;
      candle.delta += deltaVol;
      candle.tradeCount++;
      if (isBuy) candle.buyVolume += vol;
      else candle.sellVolume += vol;

      if (!candle.footprint[priceKey]) {
        candle.footprint[priceKey] = { bid: 0, ask: 0, delta: 0, total: 0 };
      }
      const fp = candle.footprint[priceKey];
      if (isBuy) fp.ask += vol;
      else fp.bid += vol;
      fp.delta += deltaVol;
      fp.total += vol;

      if (fp.total > candle.maxLevelVol) {
        candle.maxLevelVol = fp.total;
      }

      if (candle.ticks.length < 3000) {
        candle.ticks.push({ price, vol, time: tradeTime, isBuy });
      }

      tickCountRef.current++;
      if (tickCountRef.current % 50 === 0) {
        setTradeCount(tickCountRef.current);
      }
    };

    const handleDepth = (data) => {
      const bidsRaw = data?.bids || data?.b || [];
      const asksRaw = data?.asks || data?.a || [];
      if (!Array.isArray(bidsRaw) || !Array.isArray(asksRaw)) return;

      const bids = bidsRaw
        .map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) }))
        .filter(r => r.size > 0)
        .sort((a, b) => b.price - a.price)
        .slice(0, 10);

      const asks = asksRaw
        .map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) }))
        .filter(r => r.size > 0)
        .sort((a, b) => a.price - b.price)
        .slice(0, 10);

      // Add cumulative
      let cumBid = 0;
      bids.forEach(b => { cumBid += b.size; b.cumulative = cumBid; });
      let cumAsk = 0;
      asks.forEach(a => { cumAsk += a.size; a.cumulative = cumAsk; });

      domRef.current = {
        bids,
        asks,
        bestBid: bids[0]?.price || 0,
        bestAsk: asks[0]?.price || 0,
        totalBid: cumBid,
        totalAsk: cumAsk,
      };
    };

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('live');
      if (!crypto) {
        ws.send(JSON.stringify({ type: 'subscribe', ticker: ticker.toUpperCase() }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;

        // Depth update
        if (data?.bids || data?.asks || data?.b || data?.a) {
          handleDepth(data);
          return;
        }

        // Trade
        if (data.e === 'trade') {
          const price = parseFloat(data.p);
          const vol = parseFloat(data.q);
          const tradeTime = data.T;
          const isBuyerMaker = data.m;
          if (price > 0 && vol > 0 && tradeTime > 0) {
            handleTick(price, vol, tradeTime, isBuyerMaker);
          }
        }
      } catch {
        // ignore parsing errors
      }
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      if (status !== 'error') setStatus('disconnected');
    };

    // Periodically sync footprint data back to server (every 30s)
    // This ensures non-crypto tickers also persist their data
    syncIntervalRef.current = setInterval(() => {
      if (dataRef.current.length > 0) {
        // Only sync candles that have footprint data (trade-by-trade built)
        const candlesWithFootprint = dataRef.current.filter(c => 
          Object.keys(c.footprint).length > 0
        );
        if (candlesWithFootprint.length > 0) {
          // Strip ticks array to reduce payload size
          const stripped = candlesWithFootprint.map(c => ({
            ...c,
            ticks: undefined
          }));
          fetch(`http://localhost:3001/api/footprint/${encodeURIComponent(ticker)}?timeframe=${timeframe}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candles: stripped, tickCount: tickCountRef.current })
          }).catch(() => {});
        }
      }
    }, 30000);

    const fetchOptionsLevels = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/options-levels?ticker=${encodeURIComponent(ticker)}`);
        if (!active) return;
        if (res.ok) {
          const levels = await res.json();
          setOptionsLevels(levels || []);
        }
      } catch (err) {
        console.warn('Failed to fetch options levels:', err);
      }
    };
    
    // Initial fetch and poll every 60s
    fetchOptionsLevels();
    optionsIntervalRef.current = setInterval(fetchOptionsLevels, 60000);

    return () => {
      active = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (optionsIntervalRef.current) {
        clearInterval(optionsIntervalRef.current);
        optionsIntervalRef.current = null;
      }
      // Final sync on cleanup
      if (dataRef.current.length > 0) {
        const candlesWithFootprint = dataRef.current.filter(c => 
          Object.keys(c.footprint).length > 0
        );
        if (candlesWithFootprint.length > 0) {
          const stripped = candlesWithFootprint.map(c => ({
            ...c,
            ticks: undefined
          }));
          fetch(`http://localhost:3001/api/footprint/${encodeURIComponent(ticker)}?timeframe=${timeframe}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candles: stripped, tickCount: tickCountRef.current })
          }).catch(() => {});
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, timeframe]);

  return { dataRef, domRef, status, tradeCount, optionsLevels };
};
