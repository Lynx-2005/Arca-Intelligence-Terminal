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

export const useOrderflowData = (ticker, timeframe) => {
  const dataRef = useRef([]);
  const domRef = useRef({ bids: [], asks: [], bestBid: 0, bestAsk: 0 });
  const [status, setStatus] = useState('connecting');
  const [tradeCount, setTradeCount] = useState(0);
  const wsRef = useRef(null);
  const tickCountRef = useRef(0);

  useEffect(() => {
    if (!ticker) return;

    dataRef.current = [];
    domRef.current = { bids: [], asks: [], bestBid: 0, bestAsk: 0 };
    tickCountRef.current = 0;
    setTradeCount(0);
    setStatus('connecting');

    const bucketMs = TF_MAP[timeframe] || 60000;

    const initData = async () => {
      try {
        const history = await ApiService.getHistoricalData(ticker, timeframe);
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
              const lastHistTime = historyCandles[historyCandles.length - 1].time;
              const liveFiltered = liveCandles.filter(c => c.time > lastHistTime);
              dataRef.current = [...historyCandles, ...liveFiltered];
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

    const isCrypto = (t) => {
      const s = (t || '').toUpperCase();
      return s.includes('-') || s.endsWith('USDT') || s.endsWith('USD') || s.endsWith('BTC') || s.endsWith('ETH');
    };

    const toBinanceSymbol = (t) => {
      const s = (t || '').toUpperCase();
      if (s.includes('-')) {
        const [base, quote] = s.split('-');
        return quote === 'USD' ? `${base}USDT` : `${base}${quote}`;
      }
      if (s.endsWith('USD') && !s.endsWith('USDT') && s.length > 3) return `${s.slice(0, -3)}USDT`;
      return s;
    };

    const crypto = isCrypto(ticker);
    let wsUrl = '';
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
        .slice(0, 20);

      const asks = asksRaw
        .map(([p, s]) => ({ price: parseFloat(p), size: parseFloat(s) }))
        .filter(r => r.size > 0)
        .sort((a, b) => a.price - b.price)
        .slice(0, 20);

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
      } catch (_) {}
    };

    ws.onerror = () => setStatus('error');
    ws.onclose = () => {
      if (status !== 'error') setStatus('disconnected');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [ticker, timeframe]);

  return { dataRef, domRef, status, tradeCount };
};
