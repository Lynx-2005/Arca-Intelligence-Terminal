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
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

    const { messages, activeTicker, model } = req.body;
    const selectedModel = model || 'google/gemini-2.5-flash';

    let systemContext = "You are ARCA AI, an advanced institutional trading assistant on the ARCA Terminal. You have access to real-time market data, macroeconomic indicators, and news feeds. Help the user analyze tickers, trends, and macroeconomic events. Be concise, direct, and professional (like a Bloomberg terminal assistant). If the user asks about a ticker, use the current active ticker context. Avoid pleasantries and conversational filler.";

    if (activeTicker) {
      try {
        const quote = await yahooFinance.quote(activeTicker).catch(() => null);
        const newsSearch = await yahooFinance.search(activeTicker, { newsCount: 3, quotesCount: 0 }).catch(() => null);

        if (quote) {
          const changePct = quote.regularMarketChangePercent?.toFixed(2) || '0.00';
          const price = quote.regularMarketPrice?.toFixed(2) || 'N/A';
          const companyName = quote.shortName || quote.longName || activeTicker;

          let newsStr = '';
          if (newsSearch && Array.isArray(newsSearch.news)) {
            newsStr = newsSearch.news.slice(0, 3).map(n => `* ${n.title} (${n.publisher || 'Finance Feed'})`).join('\n');
          }

          systemContext += `\n\n[Active Ticker Context]\n- Symbol: ${activeTicker}\n- Company: ${companyName}\n- Price: $${price} (${changePct}% change)\n- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B\n- 52W High/Low: $${quote.fiftyTwoWeekHigh?.toFixed(2)} / $${quote.fiftyTwoWeekLow?.toFixed(2)}`;
          if (newsStr) {
            systemContext += `\n- Recent News:\n${newsStr}`;
          }
        }
      } catch (err) {
        console.warn('Could not inject active ticker context into chat:', err.message);
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
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (data && data.choices?.[0]?.message) {
      res.json({ message: data.choices[0].message });
    } else {
      throw new Error('Invalid response structure from OpenRouter');
    }
  } catch (error) {
    console.error('Chat AI agent error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch global indices
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
