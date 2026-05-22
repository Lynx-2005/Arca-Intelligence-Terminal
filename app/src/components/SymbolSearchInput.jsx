import { useState, useRef, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';

const ASSET_TYPES = [
  { key: 'ALL', label: 'ALL' },
  { key: 'EQUITY', label: 'EQ' },
  { key: 'ETF', label: 'ETF' },
  { key: 'INDEX', label: 'IDX' },
  { key: 'CURRENCY', label: 'FX' },
  { key: 'CRYPTOCURRENCY', label: 'CRYPTO' },
  { key: 'COMMODITY', label: 'CMD' },
  { key: 'MUTUALFUND', label: 'FUND' }
];

const TYPE_BADGE_STYLES = {
  EQUITY: { bg: 'rgba(0,170,255,0.12)', color: '#00aaff', border: '#00aaff' },
  ETF: { bg: 'rgba(160,80,255,0.12)', color: '#a050ff', border: '#a050ff' },
  INDEX: { bg: 'rgba(255,176,0,0.12)', color: '#ffb000', border: '#ffb000' },
  CURRENCY: { bg: 'rgba(0,255,102,0.12)', color: '#00ff66', border: '#00ff66' },
  CRYPTOCURRENCY: { bg: 'rgba(255,100,0,0.12)', color: '#ff6400', border: '#ff6400' },
  COMMODITY: { bg: 'rgba(255,200,0,0.12)', color: '#ffc800', border: '#ffc800' },
  MUTUALFUND: { bg: 'rgba(120,120,120,0.12)', color: '#888', border: '#888' }
};

function getTypeBadgeStyle(quoteType) {
  return TYPE_BADGE_STYLES[quoteType] || { bg: 'rgba(120,120,120,0.12)', color: '#888', border: '#888' };
}

export default function SymbolSearchInput({ onSelect, placeholder = 'SEARCH SYMBOL...', initialValue = '', width = '160px', dropdownAlign = 'left' }) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeType, setActiveType] = useState('ALL');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const typeFilterRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchResults = useCallback(async (q, type) => {
    if (!q || q.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ApiService.searchSymbols(q, type === 'ALL' ? null : type);
      setResults(data);
      setShowDropdown(data.length > 0);
      setHighlightedIndex(-1);
    } catch {
      setResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, activeType);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeType, fetchResults]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (typeFilterRef.current && !typeFilterRef.current.contains(e.target)) {
        setShowTypeFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (symbol) => {
    setQuery(symbol);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    onSelect(symbol);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleSelect(query.trim().toUpperCase());
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex].symbol);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (!e.target.value) {
      setShowDropdown(false);
      setResults([]);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div ref={typeFilterRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          style={{
            background: 'rgba(255,176,0,0.08)',
            border: '1px solid var(--panel-border)',
            color: 'var(--accent-amber)',
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            fontWeight: 'bold',
            padding: '3px 6px',
            cursor: 'pointer',
            borderRadius: '2px',
            letterSpacing: '0.5px',
            lineHeight: 1
          }}
        >
          {ASSET_TYPES.find(t => t.key === activeType)?.label || 'ALL'}
        </button>
        {showTypeFilter && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '2px',
              background: '#0b0b0b',
              border: '1px solid var(--panel-border)',
              borderRadius: '2px',
              zIndex: 100,
              minWidth: '60px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
            }}
          >
            {ASSET_TYPES.map(type => (
              <button
                key={type.key}
                type="button"
                onClick={() => { setActiveType(type.key); setShowTypeFilter(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: activeType === type.key ? 'rgba(255,176,0,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #141414',
                  color: activeType === type.key ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  letterSpacing: '0.5px'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        style={{
          width,
          background: '#050505',
          border: '1px solid var(--panel-border)',
          color: 'var(--text-primary)',
          padding: '4px 8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          outline: 'none',
          borderRadius: '2px'
        }}
      />

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            [dropdownAlign]: 0,
            marginTop: '2px',
            background: '#0b0b0b',
            border: '1px solid var(--panel-border)',
            borderRadius: '2px',
            zIndex: 100,
            width: '340px',
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
          }}
        >
          {results.map((item, index) => {
            const badgeStyle = getTypeBadgeStyle(item.quoteType);
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={item.symbol}
                onClick={() => handleSelect(item.symbol)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  background: isHighlighted ? 'rgba(255,176,0,0.08)' : 'transparent',
                  borderBottom: '1px solid #141414',
                  gap: '8px'
                }}
              >
                <span
                  style={{
                    fontWeight: 'bold',
                    fontSize: '10px',
                    color: 'var(--text-primary)',
                    minWidth: '55px',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {item.symbol}
                </span>
                <span
                  style={{
                    fontSize: '7px',
                    fontWeight: 'bold',
                    padding: '1px 4px',
                    borderRadius: '2px',
                    background: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}33`,
                    letterSpacing: '0.5px',
                    minWidth: '32px',
                    textAlign: 'center'
                  }}
                >
                  {ASSET_TYPES.find(t => t.key === item.quoteType)?.label || item.quoteType}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}
                >
                  {item.shortname || item.longname || ''}
                </span>
                <span
                  style={{
                    fontSize: '8px',
                    color: '#555',
                    minWidth: '35px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {item.exchange || ''}
                </span>
              </div>
            );
          })}
          {loading && (
            <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '9px' }}>
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
