import React, { useState, useRef, useEffect } from 'react';
import Panel from '../Panel';
import { ApiService } from '../../services/api';
import { useStore } from '../../store';

const Chat = () => {
  const selectedModel = useStore(state => state.selectedModel);
  const setSelectedModel = useStore(state => state.setSelectedModel);
  const activeTicker = useStore(state => state.activeTicker);
  const activeCountry = useStore(state => state.activeCountry);
  const watchlist = useStore(state => state.watchlist);
  
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'ARCA Intelligence Layer initialized. I have access to live market data, macro indicators, and news feeds. How can I assist with your analysis today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [models, setModels] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch available models on load
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const list = await ApiService.getAvailableModels();
        setModels(list);
      } catch (e) {
        console.error('Failed to load OpenRouter models', e);
      }
    };
    fetchModels();
  }, []);

  // Handle auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userContent = input;
    const newMsg = { role: 'user', content: userContent };
    const updatedMessages = [...messages, newMsg];
    
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Fetch latest 10 messages for context window
      const history = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const reply = await ApiService.postChatMessage(
        history,
        activeTicker,
        selectedModel,
        activeCountry,
        watchlist
      );
      
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      console.error('Chat completions request failed:', err);
      let errMsg = err.message || 'Error connecting to intelligence layer. Please verify that the backend is running and that OPENROUTER_API_KEY is configured in your server/.env file.';
      if (errMsg.includes('API Key is missing')) {
        errMsg = 'OpenRouter API Key is missing. Please add your key to server/.env and restart the server.';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, isError: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Panel title="ARCA AI AGENT (MSG)">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        
        {/* Model selector bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--panel-border)', marginBottom: '12px', fontSize: '11px', position: 'relative', zIndex: 10 }}>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>LLM MODEL:</span>
          <div ref={dropdownRef} style={{ position: 'relative', width: '220px' }}>
            <button 
              type="button" 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
              style={{
                width: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: '1px solid var(--panel-border)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {models.find(m => m.id === selectedModel)?.name || selectedModel}
              </span>
              <span style={{ fontSize: '8px', marginLeft: '6px', color: 'var(--text-secondary)' }}>▼</span>
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                width: '100%',
                backgroundColor: '#0a0a0c',
                border: '1px solid var(--panel-border)',
                borderRadius: '0 0 4px 4px',
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
                marginTop: '2px',
                maxHeight: '220px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: 'none',
                    borderBottom: '1px solid var(--panel-border)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    outline: 'none',
                    width: 'calc(100% - 16px)',
                    margin: '8px'
                  }}
                />
                <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '4px' }}>
                  {models
                    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(m => {
                      const isSelected = m.id === selectedModel;
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleModelSelect(m.id)}
                          style={{
                            padding: '6px 12px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(0, 136, 255, 0.2)' : 'transparent',
                            color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                            borderLeft: isSelected ? '2px solid var(--accent-blue)' : '2px solid transparent',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = isSelected ? 'rgba(0, 136, 255, 0.2)' : 'rgba(255,255,255,0.05)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = isSelected ? 'rgba(0, 136, 255, 0.2)' : 'transparent'}
                        >
                          <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.id}</div>
                        </div>
                      );
                    })}
                  {models.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>No models found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat message history container */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', marginBottom: '12px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: msg.isError ? 'rgba(255, 0, 0, 0.08)' : msg.role === 'assistant' ? 'rgba(0, 136, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              borderLeft: msg.isError ? '2px solid var(--accent-red)' : msg.role === 'assistant' ? '2px solid var(--accent-blue)' : '2px solid var(--text-secondary)',
              borderRadius: '0 4px 4px 0'
            }}>
              <div style={{ fontSize: '9px', color: msg.isError ? 'var(--accent-red)' : 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                {msg.role === 'assistant' ? 'ARCA AI' : 'USER'}
              </div>
              <div style={{ lineHeight: '1.4', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', fontFamily: 'var(--font-mono)' }}>
              ARCA AI is thinking...
            </div>
          )}
        </div>
        
        {/* Chat input form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTyping ? "Waiting for response..." : `Ask about ${activeTicker || 'markets'}...`}
            disabled={isTyping}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid var(--panel-border)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <button type="submit" disabled={isTyping || !input.trim()} style={{
            backgroundColor: isTyping || !input.trim() ? 'rgba(255,255,255,0.05)' : 'var(--accent-blue)',
            color: isTyping || !input.trim() ? 'var(--text-secondary)' : '#fff',
            border: 'none',
            padding: '0 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: isTyping || !input.trim() ? 'not-allowed' : 'pointer'
          }}>
            SEND
          </button>
        </form>
      </div>
    </Panel>
  );
};

export default Chat;
