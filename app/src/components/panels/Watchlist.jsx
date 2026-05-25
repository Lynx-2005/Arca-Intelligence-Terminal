import { useEffect, useState, useRef } from 'react';
import Panel from '../Panel';
import { ApiService } from '../../services/api';
import { useStore } from '../../store';
import { Trash2, TrendingUp, HelpCircle, CornerDownLeft } from 'lucide-react';
import SymbolSearchInput from '../SymbolSearchInput';

const Watchlist = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuTicker, setOpenMenuTicker] = useState(null);
  
  const watchlist = useStore(state => state.watchlist);
  const addToWatchlist = useStore(state => state.addToWatchlist);
  const removeFromWatchlist = useStore(state => state.removeFromWatchlist);
  const setComparedTicker = useStore(state => state.setComparedTicker);
  const activeTicker = useStore(state => state.activeTicker);
  const setContext = useStore(state => state.setContext);

  const menuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchWatchlist = async () => {
      if (!watchlist || watchlist.length === 0) {
        if (isMounted) {
          setData([]);
          setLoading(false);
        }
        return;
      }
      try {
        const results = await ApiService.getBulkQuotes(watchlist);
        if (isMounted) {
          setData(results);
        }
      } catch (e) {
        console.error("Watchlist fetch failed", e);
      }
      if (isMounted) setLoading(false);
    };

    fetchWatchlist();
    const interval = setInterval(fetchWatchlist, 15000); // 15s quick update
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [watchlist]);

  // Click outside to close context menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuTicker(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectSymbol = (symbol) => {
    const ticker = symbol.trim().toUpperCase();
    if (ticker) {
      addToWatchlist(ticker);
      setLoading(true);
    }
  };

  const toggleMenu = (e, ticker) => {
    e.stopPropagation();
    if (openMenuTicker === ticker) {
      setOpenMenuTicker(null);
    } else {
      setOpenMenuTicker(ticker);
    }
  };

  const headerActions = (
    <SymbolSearchInput
      onSelect={handleSelectSymbol}
      placeholder="ADD SYMBOL..."
      width="100px"
      dropdownAlign="right"
    />
  );

  return (
    <Panel title="EQUITY WATCHLIST (EQ)" className="h-full" headerActions={headerActions}>
      {loading && data.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '24px', width: '100%' }}></div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex-center text-muted" style={{ height: '100px', flexDirection: 'column', gap: '8px' }}>
          <span>NO TICKERS IN WATCHLIST</span>
          <span style={{ fontSize: '9px' }}>Type a ticker code above to add.</span>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>SYMBOL</th>
                <th>LAST</th>
                <th>CHG</th>
                <th>% CHG</th>
                <th>VOLUME</th>
                <th style={{ width: '25px' }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const isSelected = item.ticker === activeTicker;
                return (
                  <tr 
                    key={idx} 
                    onClick={() => setContext(item.ticker)}
                    style={{ 
                      backgroundColor: isSelected ? 'rgba(255, 176, 0, 0.08)' : 'transparent',
                      borderLeft: isSelected ? '2px solid var(--accent-amber)' : '2px solid transparent',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                    <td style={{ fontWeight: 'bold', textAlign: 'left', color: isSelected ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                      {item.ticker}
                    </td>
                    <td>{item.price?.toFixed(2) || '0.00'}</td>
                    <td className={item.change >= 0 ? 'text-up' : 'text-down'}>
                      {item.change > 0 ? '+' : ''}{item.change?.toFixed(2) || '0.00'}
                    </td>
                    <td className={item.change >= 0 ? 'text-up' : 'text-down'}>
                      {item.changePct || '0.00%'}
                    </td>
                    <td className="text-muted">
                      {item.volume ? (item.volume / 1000000).toFixed(1) + 'M' : '0.0M'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => toggleMenu(e, item.ticker)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ⋮
                      </button>

                      {/* Floating Row Actions Menu */}
                      {openMenuTicker === item.ticker && (
                        <div
                          ref={menuRef}
                          style={{
                            position: 'absolute',
                            right: '24px',
                            top: '0',
                            backgroundColor: '#0a0a0a',
                            border: '1px solid var(--accent-amber)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.9)',
                            zIndex: 100,
                            width: '140px',
                            borderRadius: '2px',
                            fontSize: '9px',
                            padding: '4px 0'
                          }}
                        >
                          <div
                            className="watchlist-menu-item"
                            onClick={() => {
                              setContext(item.ticker);
                              setOpenMenuTicker(null);
                            }}
                            style={{
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <CornerDownLeft size={10} /> Focus Symbol
                          </div>
                          
                          <div
                            className="watchlist-menu-item"
                            onClick={() => {
                              setComparedTicker(item.ticker);
                              setOpenMenuTicker(null);
                            }}
                            style={{
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--accent-blue)'
                            }}
                          >
                            <TrendingUp size={10} /> Compare on Chart
                          </div>

                          <div
                            className="watchlist-menu-item"
                            onClick={() => {
                              // Focus active ticker and trigger AI Dossier focus
                              setContext(item.ticker);
                              const chatInput = document.querySelector('.chat-input-bar');
                              if (chatInput) {
                                chatInput.value = `Perform institutional analysis on ${item.ticker}. What are the main bull/bear drivers?`;
                                chatInput.focus();
                              }
                              setOpenMenuTicker(null);
                            }}
                            style={{
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <HelpCircle size={10} /> AI Analysis
                          </div>

                          <div
                            style={{
                              height: '1px',
                              backgroundColor: 'var(--panel-border)',
                              margin: '4px 0'
                            }}
                          />

                          <div
                            className="watchlist-menu-item"
                            onClick={() => {
                              removeFromWatchlist(item.ticker);
                              setOpenMenuTicker(null);
                            }}
                            style={{
                              padding: '6px 10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--accent-red)'
                            }}
                          >
                            <Trash2 size={10} /> Remove Watchlist
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Styled Hover State for Dropdown Items */}
      <style>{`
        .watchlist-menu-item:hover {
          background-color: rgba(255, 176, 0, 0.15) !important;
          color: var(--accent-amber) !important;
        }
      `}</style>
    </Panel>
  );
};

export default Watchlist;
