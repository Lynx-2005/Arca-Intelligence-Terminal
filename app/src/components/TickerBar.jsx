import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { useStore } from '../store';
import SymbolSearchInput from './SymbolSearchInput';

const TickerBar = () => {
  const [items, setItems] = useState([]);
  const setContext = useStore((state) => state.setContext);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const targetSymbols = [
          '^GSPC', '^IXIC', 'DX-Y.NYB', '^TNX', 'GC=F', 'BTC-USD', 'ETH-USD',
          'TSLA', 'NVDA', 'AAPL', 'MSFT', 'AMD', 'COIN', 'BABA', 'META', 'AMZN', 'GOOGL'
        ];
        
        const quotes = await ApiService.getBulkQuotes(targetSymbols);
        
        const indicesMap = {
          '^GSPC': 'S&P 500',
          '^IXIC': 'NASDAQ',
          'DX-Y.NYB': 'DXY',
          '^TNX': '10Y YIELD',
          'GC=F': 'GOLD',
          'BTC-USD': 'BTC/USD',
          'ETH-USD': 'ETH/USD'
        };

        const catalysts = {
          TSLA: 'FSD EXPANSION / RATE ACCELERATION',
          NVDA: 'AI DATA CENTER DEMAND',
          AAPL: 'AI DEVICE INTEGRATION ROADMAP',
          MSFT: 'AZURE CLOUD GROWTH CAPEX',
          AMD: 'MI300 GPU ACCELERATORS',
          COIN: 'SPOT ETF VOLUME FLOWS',
          BABA: 'CROSS-BORDER SUPPLY LOGISTICS',
          META: 'Llama-3 AD PLATFORM ROI',
          AMZN: 'AWS CLOUD INFLOW RATES',
          GOOGL: 'GEMINI BROWSER MONETIZATION'
        };

        const parsedIndices = [];
        const parsedEquities = [];

        quotes.forEach(q => {
          if (indicesMap[q.ticker]) {
            parsedIndices.push({
              type: 'index',
              ticker: indicesMap[q.ticker],
              price: q.price,
              changeRaw: q.change,
              changePct: q.changePct
            });
          } else {
            parsedEquities.push(q);
          }
        });

        // 1. Sort equities by absolute change percent to find Shock Movers
        const sortedMovers = [...parsedEquities]
          .sort((a, b) => {
            const pctA = Math.abs(parseFloat(a.changePct) || 0);
            const pctB = Math.abs(parseFloat(b.changePct) || 0);
            return pctB - pctA;
          })
          .slice(0, 4) // top 4 movers
          .map(q => ({
            type: 'mover',
            ticker: q.ticker,
            price: q.price,
            changeRaw: q.change,
            changePct: q.changePct,
            desc: catalysts[q.ticker] || 'VOLATILITY SPIKE DETECTED'
          }));

        // 2. Filter equities with high volume to average volume ratio for Volume Alerts
        const sortedVolume = [...parsedEquities]
          .map(q => {
            const ratio = q.volume && q.avgVolume ? (q.volume / q.avgVolume) : 1.0;
            return { ...q, ratio };
          })
          .sort((a, b) => b.ratio - a.ratio)
          .slice(0, 4) // top 4 volume ratio stocks
          .map(q => {
            const volM = (q.volume / 1000000).toFixed(1) + 'M';
            return {
              type: 'volume',
              ticker: q.ticker,
              vol: volM,
              ratio: q.ratio.toFixed(1) + 'x',
              desc: catalysts[q.ticker] || 'INSTITUTIONAL LIQUIDITY EVENT'
            };
          });

        setItems([...parsedIndices, ...sortedMovers, ...sortedVolume]);
      } catch (error) {
        console.warn("TickerBar real-time load failed, falling back to static ticker config:", error);
        const fallbackIndices = [
          { type: 'index', ticker: 'S&P 500', price: 5200.50, changeRaw: 12.5, changePct: '+0.24%' },
          { type: 'index', ticker: 'NASDAQ', price: 16400.20, changeRaw: -45.3, changePct: '-0.28%' },
          { type: 'index', ticker: 'DXY', price: 104.20, changeRaw: 0.10, changePct: '+0.10%' },
          { type: 'index', ticker: '10Y YIELD', price: 4.25, changeRaw: 0.05, changePct: '+1.19%' },
          { type: 'index', ticker: 'GOLD', price: 2350.80, changeRaw: 15.2, changePct: '+0.65%' }
        ];
        setItems(fallbackIndices);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 45000); // fetch every 45s
    return () => clearInterval(interval);
  }, []);

  // Setup Binance WebSocket for real crypto data
  useEffect(() => {
    if (items.length === 0) return;
    
    // Check if we have crypto in the items
    const hasCrypto = items.some(i => i.ticker === 'BTC/USD' || i.ticker === 'ETH/USD');
    if (!hasCrypto) return;

    const wsUrl = import.meta.env.VITE_BINANCE_WS_BASE || 'wss://stream.binance.com:9443/ws';
    // Connect to multi-stream for btc and eth tickers
    const ws = new WebSocket(`${wsUrl}/btcusdt@ticker/ethusdt@ticker`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const symbol = data.s; // e.g. "BTCUSDT"
        const price = parseFloat(data.c); // current close price
        const changeRaw = parseFloat(data.p); // price change
        const changePct = parseFloat(data.P); // price change percent

        let targetTicker = '';
        if (symbol === 'BTCUSDT') targetTicker = 'BTC/USD';
        if (symbol === 'ETHUSDT') targetTicker = 'ETH/USD';

        if (targetTicker) {
          setItems(prevItems => 
            prevItems.map(item => {
              if (item.ticker === targetTicker) {
                return {
                  ...item,
                  price: price,
                  changeRaw: changeRaw,
                  changePct: `${changeRaw >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
                };
              }
              return item;
            })
          );
        }
      } catch (e) {
        console.error('Binance WS error in TickerBar:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [items.length]);

  return (
    <div style={{
      height: 'var(--ticker-height)',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderBottom: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      color: 'var(--text-primary)',
      fontSize: '11px',
      fontWeight: '600'
    }}>
      {/* Live Badge */}
      <div style={{ 
        padding: '0 12px', 
        backgroundColor: 'var(--accent-amber)', 
        color: '#000', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center',
        fontWeight: 'bold',
        letterSpacing: '1px',
        zIndex: 10,
        boxShadow: '4px 0 10px rgba(0,0,0,0.5)'
      }}>
        LIVE
      </div>

      {/* Marquee Container */}
      <div className="ticker-wrap">
        <div className="ticker-content">
          {[...items, ...items].map((item, i) => {
            if (item.type === 'mover') {
              return (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 24px', borderRight: '1px solid #222' }}>
                  <span style={{ fontSize: '8px', padding: '1px 4px', background: 'rgba(255, 176, 0, 0.15)', color: 'var(--accent-amber)', borderRadius: '2px', marginRight: '8px', border: '1px solid var(--accent-amber)' }}>SHOCK MOVER</span>
                  <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{item.ticker}</span>
                  <span style={{ marginRight: '6px', fontFamily: 'var(--font-mono)' }}>${item.price.toFixed(2)}</span>
                  <span className={item.changeRaw >= 0 ? 'text-up' : 'text-down'}>
                    {item.changeRaw >= 0 ? '▲' : '▼'} {item.changePct}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '9px', fontWeight: 'normal' }}>({item.desc})</span>
                </div>
              );
            } else if (item.type === 'volume') {
              return (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 24px', borderRight: '1px solid #222' }}>
                  <span style={{ fontSize: '8px', padding: '1px 4px', background: 'rgba(0, 170, 255, 0.15)', color: 'var(--accent-blue)', borderRadius: '2px', marginRight: '8px', border: '1px solid var(--accent-blue)' }}>VOL ALERT</span>
                  <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{item.ticker}</span>
                  <span style={{ color: 'var(--text-primary)', marginRight: '6px', fontFamily: 'var(--font-mono)' }}>{item.vol} shrs</span>
                  <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{item.ratio} avg</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '9px', fontWeight: 'normal' }}>({item.desc})</span>
                </div>
              );
            } else {
              // Standard index rate
              const isUp = item.changeRaw >= 0;
              return (
                <div key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 24px', borderRight: '1px solid #222' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>{item.ticker}</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                    {typeof item.price === 'number' ? item.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : item.price}
                  </span>
                  <span className={isUp ? 'text-up' : 'text-down'} style={{ marginLeft: '8px' }}>
                    {isUp ? '▲' : '▼'} {item.changePct}
                  </span>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Ticker Search Option */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        height: '100%', 
        borderLeft: '1px solid var(--panel-border)', 
        paddingLeft: '12px', 
        paddingRight: '16px', 
        background: '#080808',
        zIndex: 10,
        gap: '6px'
      }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '9px', fontFamily: 'var(--font-mono)' }}>CMD:</span>
        <SymbolSearchInput
          onSelect={(symbol) => { setContext(symbol); }}
          placeholder="SEARCH TICKER (e.g. TSLA)"
          width="160px"
          dropdownAlign="right"
        />
      </div>
    </div>
  );
};

export default TickerBar;
