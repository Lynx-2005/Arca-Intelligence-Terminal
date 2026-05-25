const WebSocket = require('ws');
const net = require('net');
const https = require('https');

class BaseProvider {
  constructor(name) {
    this.name = name;
    this.ws = null;
    this.subscribers = new Map(); // ticker -> Set of clientWs
    this.marketState = new Map(); // ticker -> { bestBid, bestAsk, lastPrice, lastIsSeller }
  }

  getMarketState(ticker) {
    if (!this.marketState.has(ticker)) {
      this.marketState.set(ticker, { bestBid: 0, bestAsk: Infinity, lastPrice: 0, lastIsSeller: true });
    }
    return this.marketState.get(ticker);
  }

  updateQuote(ticker, bid, ask) {
    const state = this.getMarketState(ticker);
    if (bid > 0) state.bestBid = bid;
    if (ask > 0) state.bestAsk = ask;
  }

  inferAggressor(ticker, price) {
    const state = this.getMarketState(ticker);
    let isSeller = state.lastIsSeller;
    
    if (price >= state.bestAsk) {
      isSeller = false; // Aggressive Buy -> m: false
    } else if (price <= state.bestBid) {
      isSeller = true;  // Aggressive Sell -> m: true
    } else {
      // Inside spread, use tick rule
      if (price > state.lastPrice) isSeller = false;
      else if (price < state.lastPrice) isSeller = true;
    }
    
    state.lastPrice = price;
    state.lastIsSeller = isSeller;
    return isSeller;
  }

  isConfigured() {
    return false;
  }

  // Derived classes should override this to handle the actual connection and subscription
  _doSubscribe(ticker) { }
  _doUnsubscribe(ticker) { }

  subscribe(clientWs, ticker, onDepth, onTrade, onError, onStatus) {
    if (!this.subscribers.has(ticker)) {
      this.subscribers.set(ticker, new Set());
      this._doSubscribe(ticker);
    }
    this.subscribers.get(ticker).add({ ws: clientWs, onDepth, onTrade, onError, onStatus });
    
    // Notify immediate connecting status
    onStatus({ state: 'connecting', message: `CONNECTING TO ${this.name} (${ticker})` });
  }

  unsubscribe(clientWs, ticker) {
    if (this.subscribers.has(ticker)) {
      const subs = this.subscribers.get(ticker);
      for (const sub of subs) {
        if (sub.ws === clientWs) subs.delete(sub);
      }
      if (subs.size === 0) {
        this.subscribers.delete(ticker);
        this._doUnsubscribe(ticker);
      }
    }
  }

  broadcastDepth(ticker, depthData) {
    const subs = this.subscribers.get(ticker);
    if (subs) {
      subs.forEach(s => s.onDepth(depthData));
    }
  }

  broadcastTrade(ticker, tradeData) {
    const subs = this.subscribers.get(ticker);
    if (subs) {
      subs.forEach(s => s.onTrade(tradeData));
    }
  }

  broadcastStatus(ticker, statusData) {
    const subs = this.subscribers.get(ticker);
    if (subs) {
      subs.forEach(s => s.onStatus(statusData));
    }
  }

  broadcastError(ticker, message) {
    const subs = this.subscribers.get(ticker);
    if (subs) {
      subs.forEach(s => s.onError({ state: 'error', message: `${this.name} ERROR: ${message}` }));
    }
  }

  _scheduleReconnect(ticker, connectFn) {
    if (!this._reconnectCount) this._reconnectCount = 0;
    if (!this._maxReconnect) this._maxReconnect = 10;
    if (this._reconnectCount >= this._maxReconnect) {
      this.broadcastError(ticker, `${this.name} CONNECTION LOST — MAX RETRIES EXCEEDED`);
      return;
    }
    this._reconnectCount++;
    const delay = Math.min(30000, 1000 * Math.pow(2, this._reconnectCount - 1));
    this.broadcastStatus(ticker, { state: 'connecting', message: `${this.name} RECONNECTING (${this._reconnectCount}/${this._maxReconnect})` });
    setTimeout(connectFn, delay);
  }

  _cancelReconnect() {
    this._reconnectCount = this._maxReconnect || 10;
  }
}

// Shared token cache for NFO instruments (Kite format)
// Lazy-loads from the configured broker's instruments list
let _nfoTokenCache = null;
async function getNfoToken(ticker) {
  if (!_nfoTokenCache) {
    _nfoTokenCache = {};
    try {
      // Try Kite instruments CSV first (most complete)
      if (process.env.KITE_API_KEY && process.env.KITE_ACCESS_TOKEN) {
        const axios = require('axios');
        const res = await axios.get('https://api.kite.trade/instruments/NFO', {
          headers: { 'Authorization': `token ${process.env.KITE_API_KEY}:${process.env.KITE_ACCESS_TOKEN}`, 'X-Kite-Version': '3' },
          timeout: 10000,
          responseType: 'text'
        });
        const lines = res.data.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 3) {
            const ts = cols[2].replace(/"/g, '').trim();
            const tok = cols[0].replace(/"/g, '').trim();
            _nfoTokenCache[ts] = tok;
          }
        }
      } else {
        // Fallback to Angel One scrip master
        const axios = require('axios');
        const res = await axios.get('https://margincalculator.angelbroking.com/OpenAPI_ScripMaster.json', { timeout: 10000 });
        if (Array.isArray(res.data)) {
          res.data.forEach(item => {
            if (item.token && (item.symbol || item.tradingsymbol)) {
              _nfoTokenCache[item.symbol || item.tradingsymbol] = item.token;
            }
          });
        }
      }
    } catch (err) {
      console.warn('[TokenCache] Failed to load NFO instruments:', err.message);
    }
  }
  const u = ticker.toUpperCase().replace(/\.NS$|\.BO$/g, '');
  return _nfoTokenCache[u] || _nfoTokenCache[ticker] || ticker;
}

// Normalize ticker for Upstox: RELIANCE.NS → NSE_EQ|RELIANCE
function normalizeUpstoxTicker(ticker) {
  const u = ticker.toUpperCase().replace(/\.NS$|\.BO$/g, '');
  const UPSTOX_INDEX_MAP = {
    '^NSEI': 'NSE_INDEX|Nifty 50',
    'NIFTY': 'NSE_INDEX|Nifty 50',
    'NIFTY50': 'NSE_INDEX|Nifty 50',
    '^NSEBANK': 'NSE_INDEX|Nifty Bank',
    'BANKNIFTY': 'NSE_INDEX|Nifty Bank',
    '^BSESN': 'BSE_INDEX|SENSEX',
    'SENSEX': 'BSE_INDEX|SENSEX',
  };
  return UPSTOX_INDEX_MAP[u] || `NSE_EQ|${u}`;
}

const FYERS_SYMBOL_MAP = {
  '^NSEI': 'NSE:NIFTY50-INDEX',
  'NIFTY': 'NSE:NIFTY50-INDEX',
  'NIFTY50': 'NSE:NIFTY50-INDEX',
  '^NSEBANK': 'NSE:NIFTYBANK-INDEX',
  'BANKNIFTY': 'NSE:NIFTYBANK-INDEX',
  '^BSESN': 'BSE:SENSEX-INDEX',
  'SENSEX': 'BSE:SENSEX-INDEX',
  'MIDCPNIFTY': 'NSE:MIDCPNIFTY-INDEX',
  'FINNIFTY': 'NSE:FINNIFTY-INDEX',
};

function normalizeFyersTicker(u) {
  const ticker = u.replace(/\.NS$|\.BO$/g, '');
  if (FYERS_SYMBOL_MAP[ticker]) return FYERS_SYMBOL_MAP[ticker];
  return `NSE:${ticker}-EQ`;
}

// =========================================================================
// INDIAN BROKERS (L2 Depth)
// =========================================================================

// Normalize Indian ticker to broker-specific format
// RELIANCE.NS → NSE:RELIANCE-EQ,  ^NSEI → NSE:NIFTY50-INDEX, etc.
const BROKER_TICKER_MAP = {
  '^NSEI': 'NSE:NIFTY50-INDEX',
  'NIFTY': 'NSE:NIFTY50-INDEX',
  'NIFTY50': 'NSE:NIFTY50-INDEX',
  '^NSEBANK': 'NSE:NIFTYBANK-INDEX',
  'BANKNIFTY': 'NSE:NIFTYBANK-INDEX',
  '^BSESN': 'BSE:SENSEX-INDEX',
  'SENSEX': 'BSE:SENSEX-INDEX',
  'MIDCPNIFTY': 'NSE:MIDCPNIFTY-INDEX',
  'FINNIFTY': 'NSE:FINNIFTY-INDEX',
};

function normalizeTicker(rawTicker) {
  const u = rawTicker.toUpperCase().replace(/\.NS$|\.BO$/g, '');
  if (BROKER_TICKER_MAP[u]) return BROKER_TICKER_MAP[u];
  return `NSE:${u}-EQ`;
}

class FyersProvider extends BaseProvider {
  isConfigured() { return !!(process.env.FYERS_APP_ID && process.env.FYERS_ACCESS_TOKEN); }
  _doSubscribe(ticker) {
    const fyersSym = normalizeFyersTicker(ticker);
    const connect = () => {
      if (this.ws) { try { this.ws.close(); } catch(e) {} this.ws = null; }
      try {
        const { fyersDataSocket } = require('fyers-api-v3');
        const token = `${process.env.FYERS_APP_ID}:${process.env.FYERS_ACCESS_TOKEN}`;
        this.ws = new fyersDataSocket(token, ''); 
        
        this.ws.on('connect', () => {
          this._reconnectCount = 0;
          this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
          this.ws.subscribe([fyersSym], 'SymbolUpdate');
          this.ws.subscribe([fyersSym], 'DepthUpdate');
        });

        this.ws.on('message', (msg) => {
          try {
            const dataArr = Array.isArray(msg) ? msg : [msg];
            dataArr.forEach(tickData => {
              if (tickData.symbol && tickData.symbol !== fyersSym) return;
              if (tickData.bids || tickData.asks) {
                const formattedDepth = { bids: [], asks: [] };
                if (tickData.bids) formattedDepth.bids = tickData.bids.map(b => [b.price, b.volume]);
                if (tickData.asks) formattedDepth.asks = tickData.asks.map(a => [a.price, a.volume]);
                this.broadcastDepth(ticker, formattedDepth);
              }
              if (tickData.ltp > 0) {
                const isBuyerMaker = this.inferAggressor(ticker, tickData.ltp);
                this.broadcastTrade(ticker, { 
                  p: tickData.ltp, 
                  q: tickData.last_traded_qty || tickData.vtt || 0, 
                  T: tickData.exchange_time || tickData.ltt || Date.now(), 
                  m: isBuyerMaker 
                });
                this.getMarketState(ticker).lastPrice = tickData.ltp;
              }
            });
          } catch(e) {}
        });

        this.ws.on('error', (err) => this.broadcastError(ticker, err.message || 'Fyers Socket Error'));
        this.ws.on('close', () => {
          this.broadcastStatus(ticker, { state: 'disconnected', message: `${this.name} DISCONNECTED` });
          this.ws = null;
          this._scheduleReconnect(ticker, connect);
        });

        this.ws.connect();
      } catch (err) {
        this.broadcastError(ticker, `Fyers SDK Error: ${err.message}`);
      }
    };
    connect();
  }
  
  _doUnsubscribe(ticker) {
    const fyersSym = normalizeFyersTicker(ticker);
    if (this.ws && typeof this.ws.unsubscribe === 'function') {
      try {
        this.ws.unsubscribe([fyersSym], 'SymbolUpdate');
        this.ws.unsubscribe([fyersSym], 'DepthUpdate');
      } catch(e) {}
    }
    this._cancelReconnect();
  }
}

class KiteProvider extends BaseProvider {
  isConfigured() { return !!(process.env.KITE_API_KEY && process.env.KITE_ACCESS_TOKEN); }
  _doSubscribe(ticker) {
    const connect = async () => {
      if (this.ws) { try { this.ws.close(); } catch(e) {} this.ws = null; }
      const token = await getNfoToken(ticker);
      this.ws = new WebSocket(`wss://ws.kite.trade?api_key=${process.env.KITE_API_KEY}&access_token=${process.env.KITE_ACCESS_TOKEN}`);
      this.ws.binaryType = 'arraybuffer';
      this.ws.on('open', () => {
        this._reconnectCount = 0;
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        this.ws.send(JSON.stringify({ a: "subscribe", v: [token] }));
        this.ws.send(JSON.stringify({ a: "mode", v: ["full", [token]] }));
      });
      this.ws.on('message', (data) => {
        try {
          if (!(data instanceof ArrayBuffer || Buffer.isBuffer(data))) return;
          const buf = Buffer.from(data);
          let offset = 0;
          while (offset + 4 < buf.length) {
            const packetLen = buf.readUInt32BE(offset);
            offset += 4;
            if (offset + packetLen > buf.length) break;
            if (packetLen >= 60) {
              const lastPrice = buf.readInt32BE(offset + 8) / 100;
              const bidPrice = buf.readInt32BE(offset + 40) / 100;
              const bidQty = buf.readInt32BE(offset + 44);
              const askPrice = buf.readInt32BE(offset + 48) / 100;
              const askQty = buf.readInt32BE(offset + 52);
              const lastQty = buf.readInt32BE(offset + 56);
              if (bidPrice > 0 || askPrice > 0) {
                this.updateQuote(ticker, bidPrice, askPrice);
                this.broadcastDepth(ticker, { bids: [[bidPrice, bidQty]], asks: [[askPrice, askQty]] });
              }
              if (lastPrice > 0) {
                const isBuyerMaker = this.inferAggressor(ticker, lastPrice);
                this.broadcastTrade(ticker, { p: lastPrice, q: lastQty, T: Date.now(), m: isBuyerMaker });
              }
            }
            offset += packetLen;
          }
        } catch (e) { console.error('Kite parse error:', e.message); }
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
      this.ws.on('close', () => { this.ws = null; this._scheduleReconnect(ticker, connect); });
    };
    connect();
  }
  _doUnsubscribe(ticker) {
    this._cancelReconnect();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      getNfoToken(ticker).then(token => {
        this.ws.send(JSON.stringify({ a: "unsubscribe", v: [token] }));
      });
    }
  }
}

class AngelOneProvider extends BaseProvider {
  isConfigured() { return !!(process.env.ANGEL_CLIENT_CODE && process.env.ANGEL_FEED_TOKEN); }
  _doSubscribe(ticker) {
    const connect = async () => {
      if (this.ws) { try { this.ws.close(); } catch(e) {} this.ws = null; }
      const token = await getNfoToken(ticker);
      this.ws = new WebSocket('wss://smartapisec.angelone.in/smart-stream');
      this.ws.on('open', () => {
        this._reconnectCount = 0;
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        this.ws.send(JSON.stringify({
          action: 1,
          params: { mode: 3, tokenList: [{ exchangeType: 2, tokens: [token] }] }
        }));
      });
      this.ws.on('message', (data) => {
        try {
          const buf = Buffer.from(data);
          if (buf.length < 4) return;
          const ltp = Number(buf.readBigUInt64BE(32)) / 100;
          const ltt = buf.readBigUInt64BE(58);
          const ltq = buf.readBigUInt64BE(66);
          const bid = Number(buf.readBigUInt64BE(82)) / 100;
          const bidQty = Number(buf.readBigUInt64BE(90));
          const ask = Number(buf.readBigUInt64BE(98)) / 100;
          const askQty = Number(buf.readBigUInt64BE(106));
          if (bid > 0 || ask > 0) {
            this.updateQuote(ticker, bid, ask);
            this.broadcastDepth(ticker, { bids: [[bid, bidQty]], asks: [[ask, askQty]] });
          }
          if (ltp > 0) {
            const isBuyerMaker = this.inferAggressor(ticker, ltp);
            this.broadcastTrade(ticker, { p: ltp, q: ltq, T: Number(ltt), m: isBuyerMaker });
          }
        } catch (e) {}
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
      this.ws.on('close', () => { this.ws = null; this._scheduleReconnect(ticker, connect); });
    };
    connect();
  }
  _doUnsubscribe(ticker) {
    this._cancelReconnect();
  }
}

class DhanProvider extends BaseProvider {
  isConfigured() { return !!(process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN); }
  _doSubscribe(ticker) {
    const connect = async () => {
      if (this.ws) { try { this.ws.close(); } catch(e) {} this.ws = null; }
      const token = await getNfoToken(ticker);
      this.ws = new WebSocket('wss://api-feed.dhan.co');
      this.ws.on('open', () => {
        this._reconnectCount = 0;
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        this.ws.send(JSON.stringify({
          RequestCode: 1,
          ClientId: process.env.DHAN_CLIENT_ID,
          Token: process.env.DHAN_ACCESS_TOKEN,
          MarketFeedData: [{ ExchangeSegment: 2, SecurityID: token }]
        }));
      });
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.Type === 'MarketFeed' && msg.Data) {
            const d = msg.Data;
            const lastPrice = d.LastTradedPrice || 0;
            const bid = d.BestBidPrice || 0;
            const ask = d.BestAskPrice || 0;
            const lastQty = d.LastTradedQuantity || 0;
            if (bid > 0 || ask > 0) {
              this.updateQuote(ticker, bid, ask);
              this.broadcastDepth(ticker, { bids: [[bid, d.BestBidQty || 0]], asks: [[ask, d.BestAskQty || 0]] });
            }
            if (lastPrice > 0) {
              const isBuyerMaker = this.inferAggressor(ticker, lastPrice);
              this.broadcastTrade(ticker, { p: lastPrice, q: lastQty, T: d.LastTradedTime || Date.now(), m: isBuyerMaker });
            }
          }
        } catch (e) {}
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
      this.ws.on('close', () => { this.ws = null; this._scheduleReconnect(ticker, connect); });
    };
    connect();
  }
  _doUnsubscribe(ticker) {
    this._cancelReconnect();
  }
}

class UpstoxProvider extends BaseProvider {
  isConfigured() { return !!process.env.UPSTOX_ACCESS_TOKEN; }
  _doSubscribe(ticker) {
    const upstoxSym = normalizeUpstoxTicker(ticker);
    const connect = () => {
      if (this.ws) { try { this.ws.close(); } catch(e) {} this.ws = null; }
      this.ws = new WebSocket('wss://api.upstox.com/v2/feed/market-data-feed');
      this.ws.on('open', () => {
        this._reconnectCount = 0;
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        this.ws.send(JSON.stringify({ guid: '', method: 'sub', data: { mode: 'Full', instrumentKeys: [upstoxSym] } }));
      });
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'initial_connection') {
            this.ws.send(JSON.stringify({ guid: msg.guid, method: 'auth_request', data: { token: process.env.UPSTOX_ACCESS_TOKEN } }));
          } else if (msg.type === 'auth_success') {
            this.ws.send(JSON.stringify({ guid: msg.guid, method: 'sub', data: { mode: 'Full', instrumentKeys: [upstoxSym] } }));
          } else if (msg.type === 'ltpc' || msg.type === 'full') {
            const d = msg.data || msg;
            const bid = d.bp || d.buy_price || 0;
            const ask = d.sp || d.sell_price || 0;
            const lastPrice = d.ltp || d.last_price || 0;
            if (bid > 0 || ask > 0) {
              this.updateQuote(ticker, bid, ask);
              this.broadcastDepth(ticker, { bids: [[bid, d.bq || d.buy_qty || 0]], asks: [[ask, d.sq || d.sell_qty || 0]] });
            }
            if (lastPrice > 0) {
              const isBuyerMaker = this.inferAggressor(ticker, lastPrice);
              this.broadcastTrade(ticker, { p: lastPrice, q: d.v || d.volume || 0, T: Date.now(), m: isBuyerMaker });
            }
          }
        } catch (e) {}
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
      this.ws.on('close', () => { this.ws = null; this._scheduleReconnect(ticker, connect); });
    };
    connect();
  }
  _doUnsubscribe(ticker) {
    this._cancelReconnect();
  }
}

// =========================================================================
// US BROKERS (L1 / L2)
// =========================================================================

class AlpacaProvider extends BaseProvider {
  isConfigured() { return !!(process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY); }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const feed = process.env.ALPACA_FEED || 'sip';
      this.ws = new WebSocket(`wss://stream.data.alpaca.markets/v2/${feed}`);
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({
          action: "auth",
          key: process.env.ALPACA_API_KEY,
          secret: process.env.ALPACA_SECRET_KEY
        }));
      });
      this.ws.on('message', (msg) => {
        const payload = JSON.parse(msg);
        for (const data of payload) {
          if (data.T === 'success' && data.msg === 'authenticated') {
            this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
            this.ws.send(JSON.stringify({ action: "subscribe", quotes: [ticker], trades: [ticker] }));
          } else if (data.T === 'q') {
            this.updateQuote(ticker, data.bp, data.ap);
            this.broadcastDepth(ticker, {
              bids: [[data.bp, data.bs]],
              asks: [[data.ap, data.as]]
            });
          } else if (data.T === 't') {
            const isBuyerMaker = this.inferAggressor(ticker, data.p);
            this.broadcastTrade(ticker, { p: data.p, q: data.s, T: Date.now(), m: isBuyerMaker });
          }
        }
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
    } else {
      this.ws.send(JSON.stringify({ action: "subscribe", quotes: [ticker], trades: [ticker] }));
      this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
    }
  }
  _doUnsubscribe(ticker) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "unsubscribe", quotes: [ticker], trades: [ticker] }));
    }
  }
}

class PolygonProvider extends BaseProvider {
  isConfigured() { return !!process.env.POLYGON_API_KEY; }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket('wss://socket.polygon.io/stocks');
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({ action: "auth", params: process.env.POLYGON_API_KEY }));
      });
      this.ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        for (const ev of data) {
          if (ev.ev === 'status' && ev.status === 'auth_success') {
            this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
            this.ws.send(JSON.stringify({ action: "subscribe", params: `Q.${ticker},T.${ticker}` }));
          } else if (ev.ev === 'Q') {
            this.updateQuote(ticker, ev.bp, ev.ap);
            this.broadcastDepth(ticker, { bids: [[ev.bp, ev.bs]], asks: [[ev.ap, ev.as]] });
          } else if (ev.ev === 'T') {
            const isBuyerMaker = this.inferAggressor(ticker, ev.p);
            this.broadcastTrade(ticker, { p: ev.p, q: ev.s, T: ev.t, m: isBuyerMaker });
          }
        }
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
    } else {
      this.ws.send(JSON.stringify({ action: "subscribe", params: `Q.${ticker},T.${ticker}` }));
    }
  }
  _doUnsubscribe(ticker) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "unsubscribe", params: `Q.${ticker},T.${ticker}` }));
    }
  }
}

class TradierProvider extends BaseProvider {
  isConfigured() { return !!process.env.TRADIER_ACCESS_TOKEN; }
  _doSubscribe(ticker) {
    // Requires REST call to get session token, then WebSocket connect
    // Omitted for brevity, assuming standard error stream fallback if misconfigured
    this.broadcastError(ticker, "Tradier integration requires session token");
  }
}

class FinnhubProvider extends BaseProvider {
  isConfigured() { return !!process.env.FINNHUB_API_KEY; }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`);
      this.ws.on('open', () => {
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        this.ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
      });
      this.ws.on('message', (msg) => {
        const parsed = JSON.parse(msg);
        if (parsed.type === 'trade') {
          for (const t of parsed.data) {
            this.broadcastTrade(ticker, { p: t.p, q: t.v, T: t.t });
          }
        }
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
    } else {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
    }
  }
  _doUnsubscribe(ticker) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: ticker }));
    }
  }
}

class ProviderManager {
  constructor() {
    this.indianProviders = [
      new FyersProvider('FYERS'),
      new KiteProvider('ZERODHA'),
      new AngelOneProvider('ANGELONE'),
      new DhanProvider('DHAN'),
      new UpstoxProvider('UPSTOX')
    ];
    this.usProviders = [
      new AlpacaProvider('ALPACA'),
      new PolygonProvider('POLYGON'),
      new TradierProvider('TRADIER'),
      new FinnhubProvider('FINNHUB')
    ];
    this.clientMap = new Map(); // clientWs -> { provider, ticker }
  }

  isIndianTicker(ticker) {
    const u = ticker.toUpperCase();
    return ticker.endsWith('.NS') || ticker.endsWith('.BO') || !!BROKER_TICKER_MAP[u];
  }

  handleSubscribe(clientWs, ticker, onDepth, onTrade, onError, onStatus) {
    const isIndian = this.isIndianTicker(ticker);
    const availableProviders = isIndian ? this.indianProviders : this.usProviders;
    
    let selectedProvider = null;
    for (const p of availableProviders) {
      if (p.isConfigured()) {
        selectedProvider = p;
        break;
      }
    }

    if (!selectedProvider) {
      // Fallback: As requested by user, DO NOT use yfinance synthetic data. Error out.
      const marketDesc = isIndian ? 'Indian' : 'US';
      const msg = `DATA NOT FOUND: No active credentials configured for ${marketDesc} Market providers. Please add API keys to server/.env.`;
      console.warn(`[ProviderManager] ${msg}`);
      
      // Simulate an error to the client
      onStatus({ state: 'error', message: 'DATA NOT FOUND: NO ACTIVE PROVIDER' });
      onError({ state: 'error', message: msg });
      return;
    }

    // Unsubscribe from previous if exists
    if (this.clientMap.has(clientWs)) {
      const prev = this.clientMap.get(clientWs);
      prev.provider.unsubscribe(clientWs, prev.ticker);
    }

    console.log(`[ProviderManager] Routing subscription for ${ticker} to ${selectedProvider.name}`);
    this.clientMap.set(clientWs, { provider: selectedProvider, ticker });
    selectedProvider.subscribe(clientWs, ticker, onDepth, onTrade, onError, onStatus);
  }

  handleDisconnect(clientWs) {
    if (this.clientMap.has(clientWs)) {
      const sub = this.clientMap.get(clientWs);
      sub.provider.unsubscribe(clientWs, sub.ticker);
      this.clientMap.delete(clientWs);
    }
  }
}

module.exports = { ProviderManager };
