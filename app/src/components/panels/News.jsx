import React, { useEffect, useState } from 'react';
import Panel from '../Panel';
import { ApiService } from '../../services/api';

const News = ({ query = 'markets' }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const data = await ApiService.getNews(query);
        setNews(data);
      } catch (e) {
        console.error("Failed to load news headlines", e);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [query]);

  const getSentimentBg = (sentiment) => {
    if (sentiment === 'Bullish') return 'rgba(0, 255, 102, 0.08)';
    if (sentiment === 'Bearish') return 'rgba(255, 51, 51, 0.08)';
    return 'rgba(255, 255, 255, 0.05)';
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'Bullish') return 'var(--status-up)';
    if (sentiment === 'Bearish') return 'var(--status-down)';
    return 'var(--text-secondary)';
  };

  const getImpactColor = (impact) => {
    if (impact === 'HIGH') return 'var(--accent-red)';
    if (impact === 'MED') return 'var(--accent-amber)';
    return 'var(--accent-blue)';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Recent';
    try {
      const date = new Date(timeStr);
      const diff = Date.now() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <Panel title={`LIVE NEWS FEED: ${query.toUpperCase()}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '100%', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ borderBottom: '1px solid #141414', paddingBottom: '6px' }}>
                <div className="skeleton" style={{ height: '8px', width: '30%', marginBottom: '4px' }}></div>
                <div className="skeleton" style={{ height: '11px', width: '95%', marginBottom: '4px' }}></div>
                <div className="skeleton" style={{ height: '9px', width: '40%' }}></div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-muted flex-center" style={{ height: '100px' }}>NO NEWS DATA AVAILABLE</div>
        ) : (
          news.map((item, idx) => (
            <a 
              key={idx} 
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                borderBottom: '1px solid #141414', 
                padding: '4px 2px', 
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'block',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Meta Header Row */}
              <div className="flex-between" style={{ fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{item.source.toUpperCase()}</span>
                <span>{formatTime(item.time)}</span>
              </div>
              
              {/* Title */}
              <div style={{ 
                color: 'var(--text-primary)', 
                fontSize: '10.5px',
                lineHeight: '1.3',
                marginBottom: '3px'
              }}>
                {item.title}
              </div>

              {/* Sentiment & Impact Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '8px' }}>
                <span style={{
                  padding: '1px 4px',
                  borderRadius: '1px',
                  fontWeight: 'bold',
                  backgroundColor: getSentimentBg(item.sentiment),
                  color: getSentimentColor(item.sentiment)
                }}>
                  {item.sentiment ? item.sentiment.toUpperCase() : 'NEUTRAL'}
                </span>
                
                <span style={{
                  padding: '1px 4px',
                  borderRadius: '1px',
                  fontWeight: 'bold',
                  border: `1px solid ${getImpactColor(item.impactScore)}`,
                  color: getImpactColor(item.impactScore)
                }}>
                  {item.impactScore || 'LOW'} IMPACT
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </Panel>
  );
};

export default News;
