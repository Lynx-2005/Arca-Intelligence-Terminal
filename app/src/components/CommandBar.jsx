import { useState } from 'react';

const CommandBar = ({ onCommand }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (onCommand) {
      onCommand(input.trim().toUpperCase());
    }
    setInput('');
  };

  return (
    <div style={{
      height: 'var(--command-height)',
      backgroundColor: '#000',
      borderTop: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '12px'
    }}>
      <div className="text-amber" style={{ fontWeight: 'bold' }}>&gt;</div>
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ENTER TICKER OR COMMAND (e.g., AAPL EQ <GO>)"
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            outline: 'none',
            textTransform: 'uppercase'
          }}
          autoFocus
        />
        <button type="submit" style={{
          backgroundColor: 'var(--accent-amber)',
          color: '#000',
          border: 'none',
          padding: '0 16px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 'bold',
          cursor: 'pointer',
          borderRadius: '2px'
        }}>
          GO
        </button>
      </form>
    </div>
  );
};

export default CommandBar;
