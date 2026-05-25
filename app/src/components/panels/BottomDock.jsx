import React, { useState, useEffect } from 'react';
import Panel from '../Panel';
import Watchlist from './Watchlist';
import { ApiService } from '../../services/api';

const BottomDock = () => {
  const [activeTab, setActiveTab] = useState('watchlist'); // default to watchlist for immediate value
  const [indices, setIndices] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [commodities, setCommodities] = useState([]);

  const [correlationData, setCorrelationData] = useState([]);
  const [macroAlerts, setMacroAlerts] = useState([]);

  // Fetch dock data
  useEffect(() => {
    let isMounted = true;
    const fetchDockData = async () => {

      try {
        const [indData, curData, comData] = await Promise.all([
          ApiService.getGlobalIndices(),
          ApiService.getCurrencies(),
          ApiService.getCommodities()
        ]);
        if (isMounted) {
          setIndices(indData);
          setCurrencies(curData);
          setCommodities(comData);
        }
      } catch (err) {
        console.error("Failed to load dock data", err);
      }
    };

    fetchDockData();
    const interval = setInterval(fetchDockData, 45000); // refresh every 45s
    
    // Fetch Correlation and Alerts
    const fetchExtraData = async () => {
      try {
        const alerts = await ApiService.getNews('macro');
        if (isMounted) setMacroAlerts(alerts.slice(0, 5));
        
        // Fetch history for correlation matrix
        const assets = ['^GSPC', '^IXIC', 'GC=F', 'DX-Y.NYB', 'BTC-USD', 'CL=F'];
        const histories = await Promise.all(assets.map(a => ApiService.getHistoricalData(a, '1d').catch(() => [])));
        
        if (isMounted) {
          // Compute correlation matrix based on last 30 daily returns
          const returns = histories.map(hist => {
            const recent = hist.slice(-31);
            const ret = [];
            for (let i = 1; i < recent.length; i++) {
               ret.push((recent[i].close - recent[i-1].close) / recent[i-1].close);
            }
            return ret;
          });
          
          const calcCorr = (arr1, arr2) => {
             if (arr1.length === 0 || arr2.length === 0) return 0;
             const len = Math.min(arr1.length, arr2.length);
             const a1 = arr1.slice(-len);
             const a2 = arr2.slice(-len);
             const mean1 = a1.reduce((s, v) => s + v, 0) / len;
             const mean2 = a2.reduce((s, v) => s + v, 0) / len;
             let num = 0, den1 = 0, den2 = 0;
             for (let i = 0; i < len; i++) {
                num += (a1[i] - mean1) * (a2[i] - mean2);
                den1 += Math.pow(a1[i] - mean1, 2);
                den2 += Math.pow(a2[i] - mean2, 2);
             }
             if (den1 === 0 || den2 === 0) return 0;
             return num / Math.sqrt(den1 * den2);
          };
          
          const matrix = [];
          for (let i = 0; i < 6; i++) {
             const row = [];
             for (let j = 0; j < 6; j++) {
                if (i === j) row.push(1);
                else row.push(calcCorr(returns[i], returns[j]));
             }
             matrix.push(row);
          }
          setCorrelationData(matrix);
        }
      } catch (err) {
        console.error("Failed to load extra dock data", err);
      }
    };
    fetchExtraData();
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Correlation Matrix assets
  const correlationAssets = ['SPX', 'NDX', 'GOLD', 'DXY', 'BTC', 'OIL'];

  // Helper for correlation color density
  const getCorrelationColor = (val) => {
    if (val === 1) return 'rgba(255, 176, 0, 0.25)'; // Amber for perfect self-correlation
    if (val > 0) return `rgba(0, 255, 102, ${val * 0.4})`; // Translucent Green
    return `rgba(255, 51, 51, ${Math.abs(val) * 0.4})`; // Translucent Red
  };

  return (
    <Panel title="GLOBAL MARKET MONITOR" disablePadding>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Tabs Headers */}
        <div className="dock-tabs">
          <button 
            className={`dock-tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            WATCHLIST
          </button>
          <button 
            className={`dock-tab-btn ${activeTab === 'indices' ? 'active' : ''}`}
            onClick={() => setActiveTab('indices')}
          >
            GLOBAL INDICES
          </button>
          <button 
            className={`dock-tab-btn ${activeTab === 'commodities' ? 'active' : ''}`}
            onClick={() => setActiveTab('commodities')}
          >
            COMMODITIES
          </button>
          <button 
            className={`dock-tab-btn ${activeTab === 'currencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('currencies')}
          >
            FOREX MATRIX
          </button>
          <button 
            className={`dock-tab-btn ${activeTab === 'correlation' ? 'active' : ''}`}
            onClick={() => setActiveTab('correlation')}
          >
            CROSS-ASSET CORR
          </button>
          <button 
            className={`dock-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            MACRO CALENDAR
          </button>
          <button 
            className={`dock-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            MACRO ALERTS
          </button>
        </div>

        {/* Tab Content Panel */}
        <div style={{ flex: 1, padding: '8px', overflowY: 'auto', minHeight: 0 }}>
          {activeTab === 'watchlist' && (
            <Watchlist />
          )}

          {activeTab === 'indices' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Index</th>
                  <th>Symbol</th>
                  <th>Last Price</th>
                  <th>Net Chg</th>
                  <th>Chg %</th>
                </tr>
              </thead>
              <tbody>
                {indices.map((idx, index) => {
                  const isUp = !idx.changePct.includes('-');
                  return (
                    <tr key={index}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }} className="text-amber">{idx.ticker}</td>
                      <td className="text-muted">{idx.symbol}</td>
                      <td style={{ fontWeight: '600' }}>{typeof idx.price === 'number' ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : idx.price}</td>
                      <td className={isUp ? 'text-up' : 'text-down'}>{typeof idx.changeRaw === 'number' && idx.changeRaw > 0 ? `+${idx.changeRaw.toFixed(2)}` : idx.changeRaw?.toFixed(2)}</td>
                      <td className={isUp ? 'text-up' : 'text-down'} style={{ fontWeight: '600' }}>{idx.changePct}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'commodities' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Commodity</th>
                  <th>Contract Symbol</th>
                  <th>Last Quote</th>
                  <th>Net Chg</th>
                  <th>Chg %</th>
                </tr>
              </thead>
              <tbody>
                {commodities.map((comm, index) => {
                  const isUp = !comm.changePct.includes('-');
                  return (
                    <tr key={index}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }} className="text-amber">{comm.ticker}</td>
                      <td className="text-muted">{comm.symbol}</td>
                      <td style={{ fontWeight: '600' }}>${typeof comm.price === 'number' ? comm.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : comm.price}</td>
                      <td className={isUp ? 'text-up' : 'text-down'}>{typeof comm.changeRaw === 'number' && comm.changeRaw > 0 ? `+${comm.changeRaw.toFixed(2)}` : comm.changeRaw?.toFixed(2)}</td>
                      <td className={isUp ? 'text-up' : 'text-down'} style={{ fontWeight: '600' }}>{comm.changePct}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'currencies' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Currency Pair</th>
                  <th>Ticker</th>
                  <th>Exchange Rate</th>
                  <th>Net Chg</th>
                  <th>Chg %</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((cur, index) => {
                  const isUp = !cur.changePct.includes('-');
                  return (
                    <tr key={index}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }} className="text-amber">{cur.ticker}</td>
                      <td className="text-muted">{cur.symbol}</td>
                      <td style={{ fontWeight: '600' }}>{typeof cur.price === 'number' ? cur.price.toFixed(4) : cur.price}</td>
                      <td className={isUp ? 'text-up' : 'text-down'}>{typeof cur.changeRaw === 'number' && cur.changeRaw > 0 ? `+${cur.changeRaw.toFixed(4)}` : cur.changeRaw?.toFixed(4)}</td>
                      <td className={isUp ? 'text-up' : 'text-down'} style={{ fontWeight: '600' }}>{cur.changePct}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'correlation' && (
            <div>
              <div style={{ fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Cross-Asset 30-Day Pearson Correlation Coefficients Matrix
              </div>
              {correlationData.length > 0 ? (
                <div className="correlation-matrix">
                  {/* Upper Left Blank Cell */}
                  <div className="correlation-header-cell">Asset</div>
                  {correlationAssets.map((asset, i) => (
                    <div key={`header-${i}`} className="correlation-header-cell">{asset}</div>
                  ))}

                  {correlationAssets.map((rowAsset, rowIdx) => (
                    <React.Fragment key={`row-${rowIdx}`}>
                      <div style={{ textAlign: 'left', fontWeight: 'bold', color: 'var(--accent-amber)', padding: '4px 0' }}>
                        {rowAsset}
                      </div>
                      {correlationData[rowIdx].map((val, colIdx) => (
                        <div 
                          key={`cell-${rowIdx}-${colIdx}`} 
                          className="correlation-cell"
                          style={{ 
                            backgroundColor: getCorrelationColor(val),
                            color: Math.abs(val) > 0.4 || val === 1 ? '#ffffff' : '#888888',
                            borderRadius: '2px'
                          }}
                        >
                          {val === 1 ? '1.00' : val.toFixed(2)}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="flex-center text-muted" style={{ height: '100px' }}>CALCULATING REAL-TIME CORRELATIONS...</div>
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="flex-center text-muted" style={{ height: '100px' }}>
              CALENDAR DATA COMING SOON
            </div>
          )}

          {activeTab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {macroAlerts.length > 0 ? (
                macroAlerts.map((alert, idx) => {
                  let borderColor = 'var(--text-secondary)';
                  let bgColor = 'rgba(255, 255, 255, 0.03)';
                  let titleColor = 'var(--text-primary)';
                  
                  if (alert.sentiment === 'Bearish') {
                    borderColor = 'var(--accent-red)';
                    bgColor = 'rgba(255, 51, 51, 0.03)';
                    titleColor = 'var(--accent-red)';
                  } else if (alert.sentiment === 'Bullish') {
                    borderColor = 'var(--accent-green)';
                    bgColor = 'rgba(0, 255, 102, 0.03)';
                    titleColor = 'var(--accent-green)';
                  }

                  return (
                    <div key={idx} style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: '6px', background: bgColor, padding: '4px' }}>
                      <span style={{ color: titleColor, fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase' }}>
                        [{new Date(alert.time).toLocaleTimeString()}] {alert.source}: 
                      </span>
                      <span> {alert.title}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-center text-muted" style={{ height: '100px' }}>LOADING LIVE ALERTS...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default BottomDock;
