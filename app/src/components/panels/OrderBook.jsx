import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import Panel from '../Panel';
import { ApiService } from '../../services/api';

const MAX_LEVELS = 5;
const DEFAULT_WHALE_NOTIONAL = 100000;

const normalizeTicker = ticker => (ticker || '').trim().toUpperCase();

const isCryptoTicker = ticker => {
  if (!ticker) return false;
  const symbol = normalizeTicker(ticker);
  if (symbol.includes('-')) {
    const [base, quote] = symbol.split('-');
    if (!base || !quote) return false;
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

const formatPrice = value => {
  if (!Number.isFinite(value)) return '--';
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(2);
  if (abs >= 1) return value.toFixed(4);
  if (abs >= 0.01) return value.toFixed(6);
  return value.toFixed(8);
};

const formatSize = value => {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(6);
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

const OrderBook = () => {
  const ticker = useStore(state => state.activeTicker);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [tradeLog, setTradeLog] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const wsRef = useRef(null);

  const normalizedTicker = normalizeTicker(ticker);
  const crypto = isCryptoTicker(normalizedTicker);
  const binanceSymbol = crypto ? toBinanceSymbol(normalizedTicker) : '';

  const maxAskSize = asks.reduce((max, a) => Math.max(max, a.size), 0);
  const maxBidSize = bids.reduce((max, b) => Math.max(max, b.size), 0);
  const isIndian = normalizedTicker.endsWith('.NS') || normalizedTicker.endsWith('.BO');
  const curr = isIndian ? '₹' : '$';
  const stockProvider = 'ARCA SMART ROUTER';
  const stockWsUrl = (import.meta.env.VITE_STOCK_ORDERBOOK_WS_URL || '').trim();
  const whaleNotional = Number(import.meta.env.VITE_WHALE_NOTIONAL_USD) || DEFAULT_WHALE_NOTIONAL;
  const effectiveWhaleNotional = crypto ? whaleNotional : 2000;

  useEffect(() => () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'component unmount');
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!normalizedTicker || crypto) return;

    let isMounted = true;
    const fetchQuote = async () => {
      try {
        const quote = await ApiService.getStockQuote(normalizedTicker);
        if (isMounted && quote && Number.isFinite(quote.price)) {
          setCurrentPrice(quote.price);
        }
      } catch (err) {
        console.warn('Failed to fetch equity price for order book', err);
      }
    };

    fetchQuote();
    const interval = setInterval(fetchQuote, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [normalizedTicker, crypto]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'switch stream');
      wsRef.current = null;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBids([]);
    setAsks([]);
    setTradeLog([]);

    if (!normalizedTicker) {
      setStatus({ state: 'idle', message: 'SELECT A TICKER' });
      return;
    }

    let streamUrl;
    if (crypto) {
      const wsBase = import.meta.env.VITE_BINANCE_WS_BASE || 'wss://stream.binance.com:9443/stream';
      const streamSymbol = binanceSymbol.toLowerCase();
      streamUrl = `${wsBase}?streams=${streamSymbol}@depth20@100ms/${streamSymbol}@trade`;
    } else {
      if (!stockWsUrl) {
        setStatus({ state: 'idle', message: 'EQUITY L2 FEED NOT CONFIGURED' });
        return;
      }
      streamUrl = stockWsUrl;
    }

    let active = true;
    setStatus({
      state: 'connecting',
      message: crypto
        ? `CONNECTING TO BINANCE (${binanceSymbol})`
        : `CONNECTING TO ${stockProvider || 'STOCK PROXY'} (${normalizedTicker})`
    });

    const ws = new WebSocket(streamUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!crypto && active) {
        ws.send(JSON.stringify({ type: 'subscribe', ticker: normalizedTicker }));
      }
    };

    const handleDepth = data => {
      const bidsRaw = data?.bids || data?.b || [];
      const asksRaw = data?.asks || data?.a || [];

      if (!Array.isArray(bidsRaw) || !Array.isArray(asksRaw)) return;

      const bidLevels = buildLevels(bidsRaw, 'desc');
      const askLevelsAsc = buildLevels(asksRaw, 'asc');

      if (!active) return;

      setBids(bidLevels);
      setAsks(askLevelsAsc.slice().reverse());

      if (bidLevels[0] && askLevelsAsc[0]) {
        const mid = (bidLevels[0].price + askLevelsAsc[0].price) / 2;
        setCurrentPrice(mid);
      }

      setStatus(prev => (prev.state === 'live' ? prev : { state: 'live', message: crypto ? `BINANCE ${binanceSymbol}` : `${stockProvider || 'PROXY'} ${normalizedTicker}` }));
    };

    const handleTrade = data => {
      const price = Number(data?.p || data?.price);
      const size = Number(data?.q || data?.size);
      if (!Number.isFinite(price) || !Number.isFinite(size)) return;

      setCurrentPrice(price);

      const notional = price * size;
      if (notional < effectiveWhaleNotional) return;

      const isBuyerMaker = data?.m ?? data?.isBuyerMaker;
      const type = isBuyerMaker ? 'SELL' : 'BUY';
      const timeMs = data?.T || data?.E || Date.now();
      const timeStr = new Date(timeMs).toISOString().slice(11, 19);

      setTradeLog(prev => [
        {
          id: `${timeMs}-${price}-${size}`,
          time: timeStr,
          type,
          size,
          price,
          venue: crypto ? 'BINANCE' : (stockProvider || 'YFINANCE')
        },
        ...prev.slice(0, 15)
      ]);
    };

    ws.onmessage = event => {
      if (!active) return;
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;

        if (data?.bids || data?.asks || data?.b || data?.a) {
          handleDepth(data);
          return;
        }

        if (data?.e === 'trade' || data?.T || data?.p) {
          handleTrade(data);
        }
      } catch (err) {
        console.warn('Order book stream parse error', err);
      }
    };

    ws.onerror = () => {
      if (!active) return;
      setStatus({ state: 'error', message: 'ORDER BOOK CONNECTION ERROR' });
    };

    ws.onclose = () => {
      if (!active) return;
      setStatus(prev => (prev.state === 'error' ? prev : { state: 'idle', message: 'ORDER BOOK DISCONNECTED' }));
    };

    return () => {
      active = false;
      ws.close(1000, 'cleanup');
    };
  }, [normalizedTicker, crypto, binanceSymbol, stockProvider, stockWsUrl, effectiveWhaleNotional]);

  const totalBidSize = bids.reduce((acc, b) => acc + b.size, 0);
  const totalAskSize = asks.reduce((acc, a) => acc + a.size, 0);
  const bidRatio = totalBidSize + totalAskSize > 0 ? (totalBidSize / (totalBidSize + totalAskSize)) * 100 : 50;

  const bestBid = bids.length > 0 ? bids[0].price : null;
  const bestAsk = asks.length > 0 ? asks[asks.length - 1].price : null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const spreadPct = spread != null && currentPrice ? (spread / currentPrice) * 100 : null;

  const sourceLabel = crypto ? 'BINANCE' : (stockProvider ? stockProvider.toUpperCase() : 'UNAVAILABLE');
  const statusMessage = status.state === 'live' ? '' : status.message;
  const tradeThresholdLabel = `${curr}${Math.round(effectiveWhaleNotional).toLocaleString()}`;

  return (
    <Panel title={`L2 ORDER BOOK: ${normalizedTicker || '---'} (${sourceLabel})`}>
      <div className="orderbook-ladder">
        {statusMessage && (
          <div style={{
            fontSize: '9px',
            color: 'var(--text-secondary)',
            padding: '4px 8px',
            borderBottom: '1px solid var(--panel-border)'
          }}>
            {statusMessage}
          </div>
        )}
        <div className="orderbook-split">
          {asks.map((ask, idx) => (
            <div key={`ask-${idx}`} className="orderbook-row">
              <span className="text-down" style={{ fontWeight: '600' }}>{formatPrice(ask.price)}</span>
              <span className="text-muted">{formatSize(ask.size)}</span>
              <span style={{ minWidth: '45px', textAlign: 'right' }}>{formatSize(ask.cumulative)}</span>
              <div className="orderbook-row-fill bg-down" style={{ width: `${maxAskSize ? (ask.size / maxAskSize) * 100 : 0}%` }} />
            </div>
          ))}
        </div>

        <div className="orderbook-spread">
          <div className="flex-between" style={{ padding: '0 8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }} className={spread && spread > 0 ? 'text-amber' : ''}>
              {currentPrice != null ? `${curr}${formatPrice(currentPrice)}` : '--'}
            </span>
            <span className="text-muted" style={{ fontSize: '9px' }}>
              SPREAD: {spread != null ? `${formatPrice(spread)}${spreadPct != null ? ` (${spreadPct.toFixed(3)}%)` : ''}` : '--'}
            </span>
          </div>

          <div className="pressure-bar-container">
            <div className="pressure-bar-bid" style={{ width: `${bidRatio}%` }} />
          </div>
          <div className="flex-between" style={{ padding: '0 8px', fontSize: '8px', color: 'var(--text-secondary)' }}>
            <span>BUY {bidRatio.toFixed(0)}%</span>
            <span>SELL {(100 - bidRatio).toFixed(0)}%</span>
          </div>
        </div>

        <div className="orderbook-split">
          {bids.map((bid, idx) => (
            <div key={`bid-${idx}`} className="orderbook-row">
              <span className="text-up" style={{ fontWeight: '600' }}>{formatPrice(bid.price)}</span>
              <span className="text-muted">{formatSize(bid.size)}</span>
              <span style={{ minWidth: '45px', textAlign: 'right' }}>{formatSize(bid.cumulative)}</span>
              <div className="orderbook-row-fill bg-up" style={{ width: `${maxBidSize ? (bid.size / maxBidSize) * 100 : 0}%` }} />
            </div>
          ))}
        </div>

        <div className="whale-log-container">
          <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'var(--accent-amber)', paddingBottom: '3px', textTransform: 'uppercase' }}>
            Time &amp; Sales (&gt;= {tradeThresholdLabel})
          </div>
          {tradeLog.length === 0 ? (
            <div className="text-muted" style={{ fontSize: '8px' }}>
              Waiting for trades above threshold...
            </div>
          ) : tradeLog.map(alert => (
            <div key={alert.id} className="whale-alert flex-between">
              <span className="text-muted" style={{ fontSize: '8px' }}>{alert.time}</span>
              <span style={{ fontWeight: 'bold', color: alert.type === 'BUY' ? 'var(--status-up)' : 'var(--status-down)' }}>
                {alert.type}
              </span>
              <span>{formatSize(alert.size)} {crypto ? 'qty' : 'shrs'}</span>
              <span className="text-muted">@ {curr}{formatPrice(alert.price)}</span>
              <span style={{ color: 'var(--accent-blue)', fontSize: '8px' }}>{alert.venue}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default OrderBook;
