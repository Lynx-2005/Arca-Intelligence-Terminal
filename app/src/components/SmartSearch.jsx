import React, { useState, useRef, useEffect } from 'react';
import { Search, Command } from 'lucide-react';
import { useStore } from '../store';

const SmartSearch = () => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  
  const setContext = useStore(state => state.setContext);
  const setQuery = useStore(state => state.setQuery);
  const setPanel = useStore(state => state.setPanel);
  const setCountry = useStore(state => state.setCountry);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      executeCommand(input.trim());
      setInput('');
    }
  };
  
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Focus on '/' press
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const executeCommand = (cmd) => {
    const text = cmd.toLowerCase();
    
    // Natural Language Parsing Simulation
    if (text.includes('map') || text.includes('world') || text.includes('macro')) {
       setPanel('MAP');
       if (text.includes('china')) setCountry('CHN');
       else if (text.includes('us ') || text.includes('usa') || text.includes('america')) setCountry('USA');
       else if (text.includes('india')) setCountry('IND');
       setQuery(cmd);
    } 
    else if (text.match(/^[a-z]{1,5}$/i)) {
       // Just a ticker
       setContext(cmd.toUpperCase());
    }
    else {
       // Search for news or company
       // If it contains a known ticker format, extract it
       const words = text.split(' ');
       const potentialTicker = words.find(w => w.length <= 5 && !['the', 'and', 'vs', 'on'].includes(w));
       
       if (potentialTicker && (text.includes('earnings') || text.includes('stock'))) {
          setContext(potentialTicker.toUpperCase());
       } else {
          setQuery(cmd);
       }
    }
  };

  return (
    <div style={{
      height: 'var(--command-height)',
      background: 'rgba(10, 10, 10, 0.95)',
      borderTop: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '16px',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      zIndex: 100
    }}>
      <div className="text-amber flex-center" style={{ gap: '8px' }}>
        <Command size={16} />
        <span style={{ fontWeight: '600', fontSize: '11px', letterSpacing: '1px' }}>OMNI</span>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#141414', borderRadius: '4px', border: '1px solid #222', padding: '0 12px', height: '32px' }}>
        <Search size={14} color="#666" style={{ marginRight: '12px' }} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tickers, ask questions, or type commands (e.g., 'AAPL earnings', 'US recession probability')... press '/' to focus"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px'
          }}
        />
      </div>
    </div>
  );
};

export default SmartSearch;
