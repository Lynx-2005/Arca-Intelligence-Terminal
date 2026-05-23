require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const protobuf = require('protobufjs');
const WebSocket = require('ws');
const YF = require('yahoo-finance2').default;
const { ProviderManager } = require('./providers');

// Load PricingData.proto schema
let PricingData;
protobuf.load(path.join(__dirname, 'PricingData.proto'), (err, root) => {
  if (err) {
    console.error('Failed to load PricingData.proto:', err);
    return;
  }
  PricingData = root.lookupType('PricingData');
  console.log('PricingData Protobuf schema loaded successfully');
});

// Initialize yahoo-finance2 instance with custom validation configurations
const yahooFinance = new YF();
const { getOptionsLevels } = require('./optionsEngine');

const app = express();
const PORT = 3001;
const SESSION_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const SESSION_STARTED_AT = new Date().toISOString();

const isCryptoTicker = (ticker) => {
  if (!ticker) return false;
  const symbol = ticker.trim().toUpperCase();
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

const toBinanceSymbol = (ticker) => {
  const symbol = (ticker || '').trim().toUpperCase();
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

const mapBinanceInterval = (interval) => {
  const safe = (interval || '').toLowerCase();
  if (safe === '1wk') return '1w';
  return safe || '1m';
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════
// SERVER-SIDE FOOTPRINT DATA STORE
// Accumulates orderflow candle data in memory so it persists
// across browser refreshes. Only clears on server restart.
// ═══════════════════════════════════════════════════════════════

const footprintStore = {
  // ticker -> { timeframe -> { candles: [], tickCount: number, lastUpdate: number } }
  data: new Map(),
  // ticker -> WebSocket (persistent Binance connection)
  cryptoSockets: new Map(),
  MAX_CANDLES: 500,

  getTickSize(price) {
    if (price >= 10000) return 10;
    if (price >= 1000) return 1;
    if (price >= 100) return 0.5;
    if (price >= 10) return 0.1;
    return 0.01;
  },

  aggregateCandles(sourceCandles, targetBucketMs) {
    if (!sourceCandles || sourceCandles.length === 0) return [];
    
    const aggregated = [];
    let currentAgg = null;

    for (const c of sourceCandles) {
      const aggTime = Math.floor(c.time / targetBucketMs) * targetBucketMs;
      
      if (!currentAgg || currentAgg.time !== aggTime) {
        currentAgg = {
          time: aggTime,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          buyVolume: c.buyVolume || 0,
          sellVolume: c.sellVolume || 0,
          delta: c.delta || 0,
          tradeCount: c.tradeCount || 0,
          tickSize: c.tickSize,
          footprint: JSON.parse(JSON.stringify(c.footprint || {})),
          maxLevelVol: c.maxLevelVol || 0
        };
        aggregated.push(currentAgg);
      } else {
        currentAgg.high = Math.max(currentAgg.high, c.high);
        currentAgg.low = Math.min(currentAgg.low, c.low);
        currentAgg.close = c.close;
        currentAgg.volume += c.volume;
        currentAgg.buyVolume += (c.buyVolume || 0);
        currentAgg.sellVolume += (c.sellVolume || 0);
        currentAgg.delta += (c.delta || 0);
        currentAgg.tradeCount += (c.tradeCount || 0);
        
        if (c.footprint) {
          for (const [price, fp] of Object.entries(c.footprint)) {
            if (!currentAgg.footprint[price]) {
              currentAgg.footprint[price] = { bid: 0, ask: 0, delta: 0, total: 0 };
            }
            currentAgg.footprint[price].bid += fp.bid;
            currentAgg.footprint[price].ask += fp.ask;
            currentAgg.footprint[price].delta += fp.delta;
            currentAgg.footprint[price].total += fp.total;
            if (currentAgg.footprint[price].total > currentAgg.maxLevelVol) {
              currentAgg.maxLevelVol = currentAgg.footprint[price].total;
            }
          }
        }
      }
    }
    return aggregated;
  },

  bucketPrice(price, tickSz) {
    return Math.floor(price / tickSz) * tickSz;
  },

  getStore(ticker, timeframe) {
    const key = `${ticker}__${timeframe}`;
    if (!this.data.has(key)) {
      this.data.set(key, { candles: [], tickCount: 0, lastUpdate: Date.now() });
    }
    return this.data.get(key);
  },

  processTick(ticker, timeframe, price, vol, tradeTime, isBuyerMaker) {
    const TF_MAP = { '1m': 60000, '5m': 300000, '15m': 900000 };
    const bucketMs = TF_MAP[timeframe] || 60000;
    const store = this.getStore(ticker, timeframe);
    const candles = store.candles;
    const candleStart = Math.floor(tradeTime / bucketMs) * bucketMs;
    const tickSz = this.getTickSize(price);
    const bucket = this.bucketPrice(price, tickSz);
    const priceKey = bucket.toFixed(2);
    const isBuy = !isBuyerMaker;
    const deltaVol = isBuy ? vol : -vol;

    let candle;
    if (candles.length === 0 || candles[candles.length - 1].time !== candleStart) {
      candle = {
        time: candleStart,
        open: price, high: price, low: price, close: price,
        volume: 0, buyVolume: 0, sellVolume: 0, delta: 0,
        tradeCount: 0, tickSize: tickSz, footprint: {}, maxLevelVol: 0
      };
      candles.push(candle);
      if (candles.length > this.MAX_CANDLES) candles.shift();
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

    store.tickCount++;
    store.lastUpdate = Date.now();
  },

  // Start a persistent Binance WebSocket for a crypto ticker
  ensureCryptoStream(ticker) {
    const upperTicker = ticker.toUpperCase().trim();
    if (this.cryptoSockets.has(upperTicker)) return; // already connected

    if (!isCryptoTicker(upperTicker)) return;

    const binanceSymbol = toBinanceSymbol(upperTicker).toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${binanceSymbol}@trade`;

    console.log(`[FootprintStore] Starting persistent Binance stream for ${upperTicker}`);
    let ws;
    const connect = () => {
      ws = new (require('ws'))(wsUrl);
      this.cryptoSockets.set(upperTicker, ws);

      ws.on('message', (raw) => {
        try {
          const payload = JSON.parse(raw);
          const data = payload.data || payload;
          if (data.e === 'trade') {
            const price = parseFloat(data.p);
            const vol = parseFloat(data.q);
            const tradeTime = data.T;
            const isBuyerMaker = data.m;
            if (price > 0 && vol > 0 && tradeTime > 0) {
              // Accumulate into all timeframes
              ['1m', '5m', '15m'].forEach(tf => {
                this.processTick(upperTicker, tf, price, vol, tradeTime, isBuyerMaker);
              });
            }
          }
        } catch (_) {}
      });

      ws.on('close', () => {
        console.log(`[FootprintStore] Binance stream closed for ${upperTicker}, reconnecting in 3s...`);
        this.cryptoSockets.delete(upperTicker);
        setTimeout(() => {
          if (!this.cryptoSockets.has(upperTicker)) {
            connect();
          }
        }, 3000);
      });

      ws.on('error', (err) => {
        console.warn(`[FootprintStore] Binance stream error for ${upperTicker}:`, err.message);
      });
    };

    connect();
  }
};

// REST endpoint to retrieve accumulated footprint data
app.get('/api/footprint/:ticker', (req, res) => {
  const { ticker } = req.params;
  const timeframe = req.query.timeframe || '1m';
  const upperTicker = ticker.toUpperCase().trim();

  // Ensure persistent stream is running for this crypto ticker
  if (isCryptoTicker(upperTicker)) {
    footprintStore.ensureCryptoStream(upperTicker);
  }

  const store = footprintStore.getStore(upperTicker, timeframe);

  // Aggregate from 1m if requesting higher timeframe
  if (timeframe !== '1m') {
    const TF_MAP = { '1m': 60000, '5m': 300000, '15m': 900000 };
    const targetMs = TF_MAP[timeframe];
    const store1m = footprintStore.getStore(upperTicker, '1m');
    
    if (store1m.candles.length > 0 && targetMs) {
      const aggregated = footprintStore.aggregateCandles(store1m.candles, targetMs);
      const existingTimes = new Set(store.candles.map(c => c.time));
      
      for (const agg of aggregated) {
        if (!existingTimes.has(agg.time)) {
          store.candles.push(agg);
          existingTimes.add(agg.time);
        } else {
          // Update if aggregated has more volume (e.g. from historical local data)
          const idx = store.candles.findIndex(c => c.time === agg.time);
          if (agg.volume > store.candles[idx].volume) {
            store.candles[idx] = agg;
          }
        }
      }
      store.candles.sort((a, b) => a.time - b.time);
    }
  }

  res.json({
    candles: store.candles,
    tickCount: store.tickCount,
    lastUpdate: store.lastUpdate,
    sessionId: SESSION_ID
  });
});

// POST endpoint to allow client to push footprint data back to server (for non-crypto tickers)
app.post('/api/footprint/:ticker', (req, res) => {
  const { ticker } = req.params;
  const timeframe = req.query.timeframe || '1m';
  const upperTicker = ticker.toUpperCase().trim();
  const { candles, tickCount } = req.body;

  if (candles && Array.isArray(candles)) {
    const store = footprintStore.getStore(upperTicker, timeframe);
    // Merge: keep candles with newer timestamps, append new ones
    const existingTimes = new Set(store.candles.map(c => c.time));
    for (const candle of candles) {
      if (!existingTimes.has(candle.time)) {
        store.candles.push(candle);
        existingTimes.add(candle.time);
      } else {
        // Update existing candle with latest data
        const idx = store.candles.findIndex(c => c.time === candle.time);
        if (idx >= 0) store.candles[idx] = candle;
      }
    }
    // Sort and trim
    store.candles.sort((a, b) => a.time - b.time);
    if (store.candles.length > footprintStore.MAX_CANDLES) {
      store.candles.splice(0, store.candles.length - footprintStore.MAX_CANDLES);
    }
    if (tickCount) store.tickCount = Math.max(store.tickCount, tickCount);
    store.lastUpdate = Date.now();
  }
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  res.json({ id: SESSION_ID, startedAt: SESSION_STARTED_AT });
});

// Fetch crypto historical candles directly from Binance for parity with live feed
app.get('/api/crypto/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    if (!isCryptoTicker(ticker)) {
      return res.status(400).json({ error: 'Not a crypto ticker' });
    }

    const interval = mapBinanceInterval(req.query.interval || '1m');
    const limitMap = { '1m': 1000, '5m': 1000, '15m': 1000, '1h': 1000, '1d': 365, '1w': 260 };
    const limit = Number(req.query.limit) || limitMap[interval] || 500;
    const symbol = toBinanceSymbol(ticker);

    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Binance history error' });
    }
    const data = await response.json();
    const formatted = Array.isArray(data)
      ? data.map(row => ({
          time: Math.floor(Number(row[0]) / 1000),
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5])
        }))
      : [];

    res.json(formatted);
  } catch (error) {
    console.error('Crypto history error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch current quote
app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const quote = await yahooFinance.quote(ticker);
    res.json(quote);
  } catch (error) {
    console.error(`Quote error for ${req.params.ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch bulk quotes for multiple tickers (comma-separated symbols)
app.get('/api/quotes', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
    if (symbols.length === 0) {
      return res.json([]);
    }
    const quotes = await yahooFinance.quote(symbols);
    res.json(Array.isArray(quotes) ? quotes : [quotes]);
  } catch (error) {
    console.error(`Bulk quotes error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch historical data (intraday or daily candles)
app.get('/api/history/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const interval = req.query.interval || '1d';
    
    // Choose lookback window depending on interval (1h has smaller limit window)
    let lookbackDays = 180;
    if (interval === '1h') {
      lookbackDays = 45; // 45 days of hourly candles
    } else if (interval === '1m' || interval === '5m') {
      lookbackDays = 7;
    }

    const queryOptions = { 
      period1: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000), 
      interval: interval 
    };
    
    const result = await yahooFinance.chart(ticker, queryOptions);
    res.json(result.quotes || []);
  } catch (error) {
    console.error(`History error for ${req.params.ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch company profile
app.get('/api/profile/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const result = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile', 'price', 'summaryProfile'] });
    res.json(result);
  } catch (error) {
    console.error(`Profile error for ${req.params.ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch comprehensive company intelligence (fundamentals, multiples, transactions, holders, filings, statements)
app.get('/api/company-intel/:ticker', async (req, res) => { console.log('RECEIVED DOSSIER REQUEST FOR:', req.params.ticker);
  try {
    const { ticker } = req.params;
    const model = req.query.model || 'google/gemini-2.5-flash';
    
    // Fetch all core modules in a single request
    const allModules = [
      'assetProfile',
      'price',
      'summaryDetail',
      'financialData',
      'defaultKeyStatistics',
      'incomeStatementHistory',
      'balanceSheetHistory',
      'cashflowStatementHistory',
      'insiderTransactions',
      'insiderHolders',
      'institutionOwnership',
      'fundOwnership',
      'majorHoldersBreakdown',
      'netSharePurchaseActivity',
      'secFilings',
      'recommendationTrend',
      'upgradeDowngradeHistory',
      'earningsHistory',
      'earningsTrend'
    ];

    const withTimeout = (promise, ms) => {
      promise.catch(() => {});
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
      ]);
    };

    const result = await withTimeout(yahooFinance.quoteSummary(ticker, { modules: allModules }), 5000).catch(err => {
      console.warn(`Company intel error for ${ticker}:`, err.message);
      return {};
    });

    // Fetch competitors dynamically from sector/industry (blocking)
    try {
      const profile = result.assetProfile || result.summaryProfile || {};
      const sector = profile.sector;
      const industry = profile.industry;
      
      if (sector && industry) {
        const industrySearch = await withTimeout(yahooFinance.search(industry, { quotesCount: 8, newsCount: 0 }), 3000).catch(() => null);
        if (industrySearch && industrySearch.quotes) {
          const peers = industrySearch.quotes
            .filter(q => q.quoteType === 'EQUITY' && q.symbol !== ticker)
            .slice(0, 4)
            .map(q => q.symbol);
          
          if (peers.length > 0) {
            const peerQuotes = await Promise.all(
              peers.map(p => withTimeout(yahooFinance.quote(p), 3000).catch(() => null))
            );
            result.competitors = peerQuotes.filter(Boolean);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch competitors:', err.message);
    }
    
    // Call OpenRouter to populate dynamic qualitative analysis if API key is present
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      try {
        const profile = result.assetProfile || result.summaryProfile || {};
        const priceMod = result.price || {};
        const companyName = priceMod.shortName || priceMod.longName || ticker;
        const description = profile.longBusinessSummary || '';
        const sector = profile.sector || 'N/A';
        const industry = profile.industry || 'N/A';

        // Single combined prompt to reduce latency
        const combinedPrompt = `Analyze ${ticker} (${companyName}) in ${sector}/${industry}.

Description: ${description.substring(0, 600)}

Return EXACTLY this JSON structure:
{
  "aiDossier": {
    "bullCase": "1-2 sentence bull thesis",
    "bearCase": "1-2 sentence bear risks",
    "moat": "1 sentence competitive advantage",
    "supplyChainRisk": "1 sentence supply chain exposure",
    "geographicExposure": "1 sentence geographic revenue breakdown"
  },
  "supplyChainAI": {
    "suppliers": [{"name": "Name", "country": "Country", "risk": 0-100, "description": "1 sentence"}],
    "geographicRevenue": [{"name": "Region", "value": percentage}]
  },
  "threatsAI": [{"title": "Title", "risk": "CRITICAL|HIGH|MEDIUM", "desc": "1-2 sentences"}]
}

Max 3 suppliers. Max 3 threats. Output ONLY valid JSON.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'ARCA Terminal'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 400,
            messages: [
              { role: 'system', content: 'You are an institutional equity research analyst. Output ONLY valid raw JSON, no markdown wrappers, no other text.' },
              { role: 'user', content: combinedPrompt }
            ]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.aiDossier) result.aiDossier = parsed.aiDossier;
            if (parsed.supplyChainAI) result.supplyChainAI = parsed.supplyChainAI;
            if (parsed.threatsAI) result.threatsAI = parsed.threatsAI;
          }
        }
      } catch (err) {
        console.warn('AI analysis failed:', err.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error(`Company Intel error for ${ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cache for OpenRouter models list
let modelsCache = null;
let modelsCacheTime = 0;

// Fetch all available models from OpenRouter
app.get('/api/models', async (req, res) => {
  try {
    // Cache list for 1 hour to prevent API rate limiting
    if (modelsCache && (Date.now() - modelsCacheTime < 3600000)) {
      return res.json(modelsCache);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://openrouter.ai/api/v1/models', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`OpenRouter models status ${response.status}`);
    }
    const data = await response.json();
    if (data && Array.isArray(data.data)) {
      const formatted = data.data.map(m => ({
        id: m.id,
        name: m.name || m.id,
        contextLength: m.context_length,
        pricing: m.pricing
      }));
      modelsCache = formatted;
      modelsCacheTime = Date.now();
      return res.json(formatted);
    }
    res.json([]);
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error.message);
    // Return standard popular models fallback list if request fails
    res.json([
      { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', contextLength: 1048576 },
      { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Meta: Llama 3 8B Instruct (Free)', contextLength: 8192 },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral: Mistral 7B Instruct (Free)', contextLength: 32768 },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini', contextLength: 128000 },
      { id: 'anthropic/claude-3-haiku', name: 'Anthropic: Claude 3 Haiku', contextLength: 200000 }
    ]);
  }
});

// Interactive AI chat agent endpoint with active ticker grounding
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'OpenRouter API Key is missing on the server. Please add it to your server/.env file.' 
      });
    }

    const { messages, activeTicker, model, activeCountry, watchlist } = req.body;
    const selectedModel = model || 'google/gemini-2.5-flash';

    let systemContext = "You are ARCA AI, an advanced institutional trading assistant on the ARCA Terminal. You have access to real-time market data, macroeconomic indicators, and news feeds. Help the user analyze tickers, trends, and macroeconomic events. Be concise, direct, and professional (like a Bloomberg terminal assistant). If the user asks about a ticker, use the current active ticker context. Avoid pleasantries and conversational filler.";

    if (watchlist && Array.isArray(watchlist) && watchlist.length > 0) {
      systemContext += `\n\n[User Watchlist]\n${watchlist.join(', ')}`;
    }

    // Parallel fetch for activeTicker and activeCountry to save time
    const promises = [];
    let quoteData = null, newsSearch = null, profile = null;
    let indexQuote = null, macroData = null;

    if (activeTicker) {
      promises.push(
        yahooFinance.quoteSummary(activeTicker, { modules: ['price', 'summaryProfile', 'defaultKeyStatistics'] })
          .then(data => profile = data)
          .catch(() => null)
      );
      promises.push(
        yahooFinance.search(activeTicker, { newsCount: 3, quotesCount: 0 })
          .then(data => newsSearch = data)
          .catch(() => null)
      );
    }

    if (activeCountry) {
      const INDEX_MAPPINGS = {
        'USA': '^GSPC', 'CHN': '000001.SS', 'DEU': '^GDAXI', 'FRA': '^FCHI',
        'ITA': 'FTSEMIB.MI', 'ESP': '^IBEX', 'CAN': '^GSPTSE', 'BRA': '^BVSP',
        'RUS': 'IMOEX.ME', 'AUS': '^AXJO', 'KOR': '^KS11', 'IND': '^NSEI',
        'GBR': '^FTSE', 'JPN': '^N225', 'SAU': '^TASI.SR', 'SGP': '^STI',
        'ZAF': '^J203.JO', 'PAK': '^KSE'
      };
      const cUpper = activeCountry.toUpperCase();
      const indexTicker = INDEX_MAPPINGS[cUpper];
      if (indexTicker) {
        promises.push(
          yahooFinance.quote(indexTicker).then(data => indexQuote = data).catch(() => null)
        );
      }
      promises.push(
        fetch(`https://api.worldbank.org/v2/country/${cUpper}/indicator/NY.GDP.MKTP.CD?date=2022:2026&format=json`)
          .then(r => r.json())
          .then(json => {
            if (Array.isArray(json) && json[1]) {
              const latest = json[1].find(item => item.value !== null);
              if (latest) macroData = { ...macroData, gdp: `$${(latest.value / 1e12).toFixed(2)}T USD (${latest.date})` };
            }
          }).catch(() => null)
      );
    }

    // Wait for all external context fetches
    await Promise.all(promises);

    if (profile && profile.price) {
      const priceMod = profile.price;
      const statMod = profile.defaultKeyStatistics || {};
      const summaryMod = profile.summaryProfile || {};
      
      const changePct = (priceMod.regularMarketChangePercent * 100)?.toFixed(2) || '0.00';
      const price = priceMod.regularMarketPrice?.toFixed(2) || 'N/A';
      const companyName = priceMod.shortName || priceMod.longName || activeTicker;
      
      let newsStr = '';
      if (newsSearch && Array.isArray(newsSearch.news)) {
        newsStr = newsSearch.news.slice(0, 3).map(n => `* ${n.title} (${n.publisher || 'Finance Feed'})`).join('\n');
      }

      systemContext += `\n\n[Active Ticker Context: ${activeTicker}]\n- Company: ${companyName}\n- Price: $${price} (${changePct}% change)\n- Market Cap: $${(priceMod.marketCap / 1e9).toFixed(2)}B\n- Sector/Industry: ${summaryMod.sector || 'N/A'} / ${summaryMod.industry || 'N/A'}`;
      if (statMod.forwardPE) systemContext += `\n- Forward P/E: ${statMod.forwardPE.toFixed(2)}`;
      if (summaryMod.longBusinessSummary) systemContext += `\n- Business Summary: ${summaryMod.longBusinessSummary.substring(0, 400)}...`;
      if (newsStr) {
        systemContext += `\n- Recent News:\n${newsStr}`;
      }
    } else if (activeTicker) { // Fallback if quoteSummary fails
        systemContext += `\n\n[Active Ticker Context]\n- Symbol: ${activeTicker} (Data temporarily unavailable)`;
    }

    if (activeCountry) {
      systemContext += `\n\n[Active Macro Region: ${activeCountry.toUpperCase()}]`;
      if (indexQuote) {
        systemContext += `\n- Regional Index (${indexQuote.symbol}): ${indexQuote.regularMarketPrice} (${indexQuote.regularMarketChangePercent?.toFixed(2)}%)`;
      }
      if (macroData && macroData.gdp) {
        systemContext += `\n- GDP: ${macroData.gdp}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'ARCA Terminal'
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemContext },
          ...messages
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `OpenRouter API error: ${response.status} - ${errText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (data && data.choices?.[0]?.message) {
      res.json({ message: data.choices[0].message });
    } else if (data && data.error) {
      throw new Error(data.error.message || 'OpenRouter returned an error payload');
    } else {
      throw new Error('Invalid response structure from OpenRouter');
    }
  } catch (error) {
    console.error('Chat AI agent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Deribit Options Cache
const optionsCache = new Map();

// Fetch Deribit Options Support/Resistance
app.get('/api/options-levels', async (req, res) => {
  try {
    const ticker = req.query.ticker;
    if (!ticker) {
      return res.json([]);
    }

    if (!isCryptoTicker(ticker)) {
      // Use optionsEngine for US/Indian equities
      const levels = await getOptionsLevels(ticker);
      return res.json(levels || []);
    }

    const currency = ticker.toUpperCase().includes('BTC') ? 'BTC' : ticker.toUpperCase().includes('ETH') ? 'ETH' : null;
    if (!currency) return res.json([]);

    // Check cache
    const cached = optionsCache.get(currency);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return res.json(cached.data);
    }

    const response = await fetch(`https://deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`);
    if (!response.ok) throw new Error(`Deribit API Error: ${response.status}`);
    const data = await response.json();
    if (!data || !data.result) return res.json([]);

    const expiries = new Set();
    const parsedOptions = [];

    data.result.forEach(opt => {
      const parts = opt.instrument_name.split('-');
      if (parts.length !== 4) return;
      const [_, expStr, strikeStr, type] = parts;
      
      const strike = parseFloat(strikeStr);
      const oi = parseFloat(opt.open_interest);
      
      if (oi > 0) {
        expiries.add(expStr);
        parsedOptions.push({ expStr, strike, type, oi });
      }
    });

    const parseExpDate = (expStr) => {
      const day = parseInt(expStr.slice(0, 2), 10);
      const monthStr = expStr.slice(2, 5);
      const year = 2000 + parseInt(expStr.slice(5, 7), 10);
      const months = { 'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11 };
      return new Date(Date.UTC(year, months[monthStr], day, 8, 0, 0));
    };

    const uniqueExpiries = Array.from(expiries).map(expStr => ({
      expStr,
      date: parseExpDate(expStr)
    })).sort((a, b) => a.date - b.date);

    if (uniqueExpiries.length === 0) return res.json([]);

    const daily = uniqueExpiries[0];
    
    let weekly = null;
    for (let i = 1; i < uniqueExpiries.length; i++) {
      if (uniqueExpiries[i].date.getUTCDay() === 5) {
        weekly = uniqueExpiries[i];
        break;
      }
    }

    let monthly = null;
    for (let i = 0; i < uniqueExpiries.length; i++) {
      const d = uniqueExpiries[i].date;
      if (d.getUTCDay() === 5) {
        const nextWeek = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (nextWeek.getUTCMonth() !== d.getUTCMonth()) {
          monthly = uniqueExpiries[i];
          break;
        }
      }
    }

    const selected = [
      { exp: daily, label: 'Daily' },
      { exp: weekly, label: 'Weekly' },
      { exp: monthly, label: 'Monthly' }
    ].filter(s => s.exp);

    const levels = [];

    const calculateMaxPain = (callsAndPuts) => {
      const strikes = Array.from(new Set(callsAndPuts.map(o => o.strike))).sort((a,b) => a - b);
      let minPain = Infinity;
      let maxPainStrike = null;
      for (const s of strikes) {
        let pain = 0;
        for (const opt of callsAndPuts) {
          if (opt.type === 'C' && s > opt.strike) pain += (s - opt.strike) * opt.oi;
          else if (opt.type === 'P' && s < opt.strike) pain += (opt.strike - s) * opt.oi;
        }
        if (pain < minPain) {
          minPain = pain;
          maxPainStrike = s;
        }
      }
      return maxPainStrike;
    };

    for (const sel of selected) {
      const optsForExp = parsedOptions.filter(o => o.expStr === sel.exp.expStr);
      const calls = optsForExp.filter(o => o.type === 'C');
      const puts = optsForExp.filter(o => o.type === 'P');

      if (calls.length > 0) {
        const maxCall = calls.reduce((max, curr) => curr.oi > max.oi ? curr : max);
        levels.push({
          type: 'resistance',
          strike: maxCall.strike,
          oi: maxCall.oi,
          expirationLabel: sel.label,
          expStr: sel.exp.expStr,
          source: 'Deribit'
        });
      }

      if (puts.length > 0) {
        const maxPut = puts.reduce((max, curr) => curr.oi > max.oi ? curr : max);
        levels.push({
          type: 'support',
          strike: maxPut.strike,
          oi: maxPut.oi,
          expirationLabel: sel.label,
          expStr: sel.exp.expStr,
          source: 'Deribit'
        });
      }

      if (optsForExp.length > 0 && sel.label === 'Daily') {
        const painStrike = calculateMaxPain(optsForExp);
        if (painStrike !== null) {
          levels.push({
            type: 'maxpain',
            strike: painStrike,
            oi: 0,
            expirationLabel: sel.label,
            expStr: sel.exp.expStr,
            source: 'Deribit'
          });
        }
      }
    }

    optionsCache.set(currency, { timestamp: Date.now(), data: levels });
    res.json(levels);

  } catch (err) {
    console.error('Options Levels Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/indices', async (req, res) => {
  try {
    const tickers = ['^GSPC', '^IXIC', '^DJI', '^FTSE', '^N225', '^NSEI', '000001.SS'];
    const quotes = await Promise.all(
      tickers.map(ticker => 
        yahooFinance.quote(ticker).catch(err => {
          console.warn(`Failed to fetch index ${ticker}:`, err.message);
          return null;
        })
      )
    );
    res.json(quotes.filter(Boolean));
  } catch (error) {
    console.error('Indices error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch exchange rates
app.get('/api/currencies', async (req, res) => {
  try {
    const tickers = ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDINR=X', 'USDCNY=X', 'AUDUSD=X'];
    const quotes = await Promise.all(
      tickers.map(ticker => 
        yahooFinance.quote(ticker).catch(err => {
          console.warn(`Failed to fetch currency ${ticker}:`, err.message);
          return null;
        })
      )
    );
    res.json(quotes.filter(Boolean));
  } catch (error) {
    console.error('Currencies error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch commodity futures
app.get('/api/commodities', async (req, res) => {
  try {
    const tickers = ['GC=F', 'SI=F', 'CL=F', 'NG=F', 'HG=F', 'ZC=F']; // Gold, Silver, Crude Oil (WTI), Nat Gas, Copper, Corn
    const quotes = await Promise.all(
      tickers.map(ticker => 
        yahooFinance.quote(ticker).catch(err => {
          console.warn(`Failed to fetch commodity ${ticker}:`, err.message);
          return null;
        })
      )
    );
    res.json(quotes.filter(Boolean));
  } catch (error) {
    console.error('Commodities error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch stock specific news
app.get('/api/news/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const result = await yahooFinance.search(ticker, { newsCount: 15, quotesCount: 0 });
    res.json(result.news || []);
  } catch (error) {
    console.error(`News error for ${req.params.ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search symbols with optional asset type filter
app.get('/api/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }
    const result = await yahooFinance.search(q.trim(), { quotesCount: 10, newsCount: 0 });
    let quotes = result.quotes || [];
    if (type && type !== 'ALL') {
      const typeMap = {
        'EQUITY': 'EQUITY',
        'ETF': 'ETF',
        'INDEX': 'INDEX',
        'CURRENCY': 'CURRENCY',
        'CRYPTO': 'CRYPTOCURRENCY',
        'COMMODITY': 'COMMODITY',
        'FUND': 'MUTUALFUND'
      };
      const mappedType = typeMap[type];
      if (mappedType) {
        quotes = quotes.filter(q => q.quoteType === mappedType);
      }
    }
    const formatted = quotes.slice(0, 5).map(q => ({
      symbol: q.symbol,
      shortname: q.shortname || '',
      longname: q.longname || '',
      quoteType: q.quoteType || '',
      exchange: q.exchDisp || q.exchange || '',
      score: q.score || 0
    }));
    res.json(formatted);
  } catch (error) {
    console.error(`Search error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch macro data dynamically from World Bank and Yahoo Finance index quotes
app.get('/api/macro/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;
    const countryCodeUpper = countryCode.toUpperCase();

    // Mapping from country codes to their major index tickers
    const INDEX_MAPPINGS = {
      'USA': '^GSPC',      // S&P 500
      'CHN': '000001.SS',  // Shanghai Composite
      'DEU': '^GDAXI',     // DAX
      'FRA': '^FCHI',      // CAC 40
      'ITA': 'FTSEMIB.MI', // FTSE MIB
      'ESP': '^IBEX',      // IBEX 35
      'CAN': '^GSPTSE',    // S&P/TSX
      'BRA': '^BVSP',      // Bovespa
      'RUS': 'IMOEX.ME',   // MOEX
      'AUS': '^AXJO',      // ASX 200
      'KOR': '^KS11',      // KOSPI
      'IND': '^NSEI',      // Nifty 50
      'GBR': '^FTSE',      // FTSE 100
      'JPN': '^N225',      // Nikkei 225
      'SAU': '^TASI.SR',   // TASI
      'SGP': '^STI',       // Straits Times
      'ZAF': '^J203.JO',   // JSE FTSE
      'PAK': '^KSE'        // KSE-100
    };

    const indexTicker = INDEX_MAPPINGS[countryCodeUpper];
    let indexQuote = null;

    if (indexTicker) {
      try {
        indexQuote = await yahooFinance.quote(indexTicker);
      } catch (err) {
        console.warn(`Could not fetch index quote for ${indexTicker}:`, err.message);
      }
    }

    // Dynamic fetch from World Bank API
    let gdpValue = null;
    let inflationValue = null;

    try {
      const gdpUrl = `https://api.worldbank.org/v2/country/${countryCodeUpper}/indicator/NY.GDP.MKTP.CD?date=2022:2026&format=json`;
      const gdpRes = await fetch(gdpUrl);
      const gdpJson = await gdpRes.json();
      if (Array.isArray(gdpJson) && gdpJson[1]) {
        const latestGdp = gdpJson[1].find(item => item.value !== null);
        if (latestGdp) {
          const valTrillion = (latestGdp.value / 1e12).toFixed(2);
          gdpValue = `$${valTrillion}T USD (${latestGdp.date})`;
        }
      }
    } catch (err) {
      console.warn(`Could not fetch GDP from World Bank for ${countryCodeUpper}:`, err.message);
    }

    try {
      const infUrl = `https://api.worldbank.org/v2/country/${countryCodeUpper}/indicator/FP.CPI.TOTL.ZG?date=2022:2026&format=json`;
      const infRes = await fetch(infUrl);
      const infJson = await infRes.json();
      if (Array.isArray(infJson) && infJson[1]) {
        const latestInf = infJson[1].find(item => item.value !== null);
        if (latestInf) {
          inflationValue = `${latestInf.value.toFixed(1)}% (${latestInf.date})`;
        }
      }
    } catch (err) {
      console.warn(`Could not fetch inflation from World Bank for ${countryCodeUpper}:`, err.message);
    }

    res.json({
      gdp: gdpValue,
      inflation: inflationValue,
      index: (indexQuote && indexQuote.regularMarketPrice) ? {
        symbol: indexQuote.symbol,
        price: indexQuote.regularMarketPrice,
        change: indexQuote.regularMarketChange,
        changePercent: indexQuote.regularMarketChangePercent,
        name: indexQuote.shortName || indexQuote.longName
      } : null
    });
  } catch (error) {
    console.error(`Macro error for ${req.params.countryCode}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`ARCA Terminal Proxy Server running on http://localhost:${PORT}`);
  
  // Auto-start persistent Binance streams for popular crypto tickers
  // so footprint data accumulates from server boot, not from first client request
  console.log('[FootprintStore] Auto-starting persistent crypto streams...');
  footprintStore.ensureCryptoStream('BTC-USD');
  footprintStore.ensureCryptoStream('ETH-USD');
});

const wss = new WebSocket.Server({ server });
const providerManager = new ProviderManager();

wss.on('connection', (ws) => {
  console.log('Client connected to Stock WS Proxy');
  let activeTicker = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'subscribe' && data.ticker) {
        const rawTicker = data.ticker.toUpperCase().trim();
        if (activeTicker === rawTicker) return;

        console.log(`[Proxy] Client subscribing to ${rawTicker}`);
        activeTicker = rawTicker;

        // Route through the new ProviderManager
        providerManager.handleSubscribe(
          ws,
          rawTicker,
          (depthData) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(depthData));
            }
          },
          (tradeData) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                p: tradeData.p,
                q: tradeData.q,
                T: tradeData.T,
                e: 'trade'
              }));
            }
          },
          (errorData) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(errorData));
            }
          },
          (statusData) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(statusData));
            }
          }
        );
      }
    } catch (err) {
      console.warn('Error handling client message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from Stock WS Proxy');
    providerManager.handleDisconnect(ws);
  });
});
