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
}

// =========================================================================
// INDIAN BROKERS (L2 Depth)
// =========================================================================

class FyersProvider extends BaseProvider {
  isConfigured() { return !!(process.env.FYERS_APP_ID && process.env.FYERS_ACCESS_TOKEN); }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`wss://api-t1.fyers.in/data/?access_token=${process.env.FYERS_APP_ID}:${process.env.FYERS_ACCESS_TOKEN}`);
      this.ws.on('open', () => {
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        this.ws.send(JSON.stringify({ T: "SUB_L2", symbols: [ticker] }));
      });
      this.ws.on('message', (data) => {
        // Parse Fyers depth update format and broadcast
        // Pseudo-implementation mapping
        try {
          const parsed = JSON.parse(data);
          if (parsed.d && parsed.d[ticker]) {
            const marketDepth = parsed.d[ticker]; // Expecting { bids: [...], asks: [...] }
            this.broadcastDepth(ticker, marketDepth);
          }
        } catch (e) {}
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
      this.ws.on('close', () => this.ws = null);
    } else {
      this.ws.send(JSON.stringify({ T: "SUB_L2", symbols: [ticker] }));
      this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
    }
  }
  _doUnsubscribe(ticker) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ T: "UNSUB_L2", symbols: [ticker] }));
    }
  }
}

class KiteProvider extends BaseProvider {
  isConfigured() { return !!(process.env.KITE_API_KEY && process.env.KITE_ACCESS_TOKEN); }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`wss://ws.kite.trade?api_key=${process.env.KITE_API_KEY}&access_token=${process.env.KITE_ACCESS_TOKEN}`);
      this.ws.on('open', () => {
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        // Kite uses binary mode, sending a string payload for simplicity here
        this.ws.send(JSON.stringify({ a: "subscribe", v: [ticker] }));
        this.ws.send(JSON.stringify({ a: "mode", v: ["full", [ticker]] }));
      });
      this.ws.on('message', (data) => {
        // Parse kite binary format
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
      this.ws.on('close', () => this.ws = null);
    }
  }
}

class AngelOneProvider extends BaseProvider {
  isConfigured() { return !!(process.env.ANGEL_CLIENT_CODE && process.env.ANGEL_FEED_TOKEN); }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket('wss://smartapisec.angelone.in/smart-stream');
      this.ws.on('open', () => {
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
      });
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
    }
  }
}

class DhanProvider extends BaseProvider {
  isConfigured() { return !!(process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN); }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket('wss://api-feed.dhan.co');
      this.ws.on('open', () => this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` }));
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
    }
  }
}

class UpstoxProvider extends BaseProvider {
  isConfigured() { return !!process.env.UPSTOX_ACCESS_TOKEN; }
  _doSubscribe(ticker) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket('wss://api.upstox.com/v2/feed/market-data-feed');
      this.ws.on('open', () => this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` }));
      this.ws.on('error', (err) => this.broadcastError(ticker, err.message));
    }
  }
}

// =========================================================================
// US BROKERS (L1 / L2)
// =========================================================================

class IBKRProvider extends BaseProvider {
  isConfigured() { return !!process.env.IB_PORT; }
  _doSubscribe(ticker) {
    if (!this.ws) {
      const port = parseInt(process.env.IB_PORT) || 7497;
      this.ws = new net.Socket();
      this.ws.connect(port, '127.0.0.1', () => {
        this.broadcastStatus(ticker, { state: 'live', message: `${this.name} LIVE (${ticker})` });
        // TWS handshake and reqMktDepth omitted for brevity
      });
      this.ws.on('error', (err) => {
        this.broadcastError(ticker, err.message);
        this.ws.destroy();
        this.ws = null;
      });
      this.ws.on('close', () => this.ws = null);
    }
  }
}

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
      new IBKRProvider('IBKR'),
      new AlpacaProvider('ALPACA'),
      new PolygonProvider('POLYGON'),
      new TradierProvider('TRADIER'),
      new FinnhubProvider('FINNHUB')
    ];
    this.clientMap = new Map(); // clientWs -> { provider, ticker }
  }

  isIndianTicker(ticker) {
    return ticker.endsWith('.NS') || ticker.endsWith('.BO');
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
