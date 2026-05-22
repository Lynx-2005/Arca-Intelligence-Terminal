import React, { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { Zap, AlertTriangle, Play, Pause } from 'lucide-react';

const NewsTicker = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchNews = async () => {
      try {
        const [marketsNews, financeNews, economyNews] = await Promise.all([
          ApiService.getNews('markets').catch(() => []),
          ApiService.getNews('finance').catch(() => []),
          ApiService.getNews('economy').catch(() => [])
        ]);
        
        if (!active) return;
        
        // Combine all news sources
        const combined = [...marketsNews, ...financeNews, ...economyNews];
        
        // Remove duplicates by title
        const uniqueMap = {};
        const uniqueNews = [];
        combined.forEach(item => {
          const cleanTitle = item.title.trim().toLowerCase();
          if (!uniqueMap[cleanTitle]) {
            uniqueMap[cleanTitle] = true;
            uniqueNews.push(item);
          }
        });
        
        // Sort by time (most recent first)
        uniqueNews.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        setNewsItems(uniqueNews);
      } catch (err) {
        console.warn("Failed to fetch news ticker items:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchNews();
    const interval = setInterval(fetchNews, 60000); // refresh every 60s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'Bullish') return '#00ff66';
    if (sentiment === 'Bearish') return '#ff3333';
    return '#999999';
  };

  const getImpactColor = (impact) => {
    if (impact === 'HIGH') return 'var(--accent-red)';
    if (impact === 'MED') return 'var(--accent-amber)';
    return 'var(--accent-blue)';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{
      height: 'var(--command-height)',
      background: 'rgba(5, 5, 5, 0.95)',
      borderTop: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      backdropFilter: 'blur(12px)',
      position: 'relative',
      zIndex: 100,
      overflow: 'hidden'
    }}>
      {/* Red Pulse Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ff1111',
        color: '#fff',
        padding: '0 16px',
        height: '100%',
        fontWeight: '900',
        fontSize: '10.5px',
        letterSpacing: '1.5px',
        boxShadow: '6px 0 15px rgba(0,0,0,0.6)',
        zIndex: 10,
        whiteSpace: 'nowrap',
        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <span className="pulse-indicator" style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          display: 'inline-block'
        }} />
        GLOBAL MACRO TAPE
      </div>

      {/* Marquee Container */}
      <div 
        className="ticker-wrap" 
        style={{ background: 'transparent' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {loading ? (
          <div style={{ 
            color: 'var(--text-secondary)', 
            paddingLeft: '24px', 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="loading-shimmer" style={{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', background: 'var(--accent-amber)' }} />
            INITIALIZING LIVE HIGH-IMPACT NEWS TAPE...
          </div>
        ) : newsItems.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', paddingLeft: '24px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            NO MACRO NEWS HEADLINES RECEIVED - RECONNECTING FEED
          </div>
        ) : (
          <div 
            className="ticker-content" 
            style={{ 
              animation: 'ticker-slide 180s linear infinite',
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          >
            {[...newsItems, ...newsItems].map((item, idx) => {
              const isUp = item.sentiment === 'Bullish';
              const isDown = item.sentiment === 'Bearish';
              
              return (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    padding: '0 28px',
                    borderRight: '1px solid #1a1a1a',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Icon */}
                  <Zap 
                    size={11} 
                    color={item.impactScore === 'HIGH' ? 'var(--accent-red)' : 'var(--accent-amber)'} 
                    style={{ marginRight: '10px', filter: 'drop-shadow(0 0 2px rgba(255,0,0,0.3))' }} 
                  />

                  {/* Publisher Badge */}
                  <span style={{
                    fontSize: '8.5px',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(0, 170, 255, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '2px',
                    marginRight: '12px',
                    backgroundColor: 'rgba(0, 170, 255, 0.04)',
                    letterSpacing: '0.5px'
                  }}>
                    {item.source.toUpperCase()}
                  </span>

                  {/* Headline Title */}
                  <span style={{
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: '500',
                    marginRight: '12px',
                    letterSpacing: '0.2px'
                  }}>
                    {item.title}
                  </span>

                  {/* Sentiment Badge */}
                  <span style={{
                    fontSize: '8px',
                    fontWeight: '900',
                    color: getSentimentColor(item.sentiment),
                    backgroundColor: isUp ? 'rgba(0, 255, 102, 0.08)' : (isDown ? 'rgba(255, 51, 51, 0.08)' : 'rgba(255,255,255,0.04)'),
                    padding: '2px 6px',
                    borderRadius: '2px',
                    marginRight: '8px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.5px',
                    border: `1px solid ${isUp ? 'rgba(0, 255, 102, 0.2)' : (isDown ? 'rgba(255, 51, 51, 0.2)' : 'rgba(255,255,255,0.1)')}`
                  }}>
                    {isUp ? '▲' : (isDown ? '▼' : '■')} {item.sentiment?.toUpperCase() || 'NEUTRAL'}
                  </span>

                  {/* Impact Score Badge */}
                  <span style={{
                    fontSize: '8px',
                    fontWeight: '900',
                    color: getImpactColor(item.impactScore),
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: `1px solid ${getImpactColor(item.impactScore)}`,
                    padding: '1px 5px',
                    borderRadius: '2px',
                    marginRight: '12px',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.5px'
                  }}>
                    {item.impactScore || 'LOW'} IMPACT
                  </span>

                  {/* Timestamp */}
                  {item.time && (
                    <span style={{
                      color: 'var(--text-secondary)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {formatTime(item.time)}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsTicker;
