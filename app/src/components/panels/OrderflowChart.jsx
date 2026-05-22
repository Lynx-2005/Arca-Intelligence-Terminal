import React, { useEffect, useRef, useState } from 'react';
import Panel from '../Panel';
import { useOrderflowData } from '../../hooks/useOrderflowData';
import { OrderflowRenderer } from './OrderflowRenderer';

const TIMEFRAMES = ['1m', '5m', '15m'];

const OrderflowChart = ({ ticker }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1m');

  const { dataRef, domRef, status, tradeCount } = useOrderflowData(ticker, timeframe);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (rendererRef.current) {
      rendererRef.current.stop();
      rendererRef.current.unbindEvents();
      rendererRef.current = null;
    }

    const renderer = new OrderflowRenderer(canvas, dataRef, domRef);
    rendererRef.current = renderer;
    renderer.start();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.stop();
        rendererRef.current.unbindEvents();
        rendererRef.current = null;
      }
    };
  }, [ticker, timeframe, dataRef, domRef]);

  const statusColor = status === 'live'
    ? 'var(--status-up)'
    : status === 'error'
      ? 'var(--status-down)'
      : 'var(--accent-amber)';

  const statusLabel = {
    connecting: '◌ CONNECTING',
    live: '● LIVE',
    error: '✕ ERROR',
    disconnected: '○ DISCONNECTED',
  }[status] || '◌ INIT';

  return (
    <Panel title={`${ticker || '—'} ORDERFLOW + DOM`} className="h-full">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{
          padding: '3px 8px',
          background: 'var(--panel-header-bg)',
          borderBottom: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '8px', color: 'var(--text-secondary)', marginRight: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            TF
          </span>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                background: timeframe === tf ? 'var(--accent-amber)' : 'rgba(255,255,255,0.03)',
                color: timeframe === tf ? '#000' : 'var(--text-secondary)',
                border: timeframe === tf ? '1px solid var(--accent-amber)' : '1px solid #1a1a1a',
                padding: '1px 7px',
                fontSize: '9px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: '2px',
                transition: 'all 0.15s ease',
              }}
            >
              {tf.toUpperCase()}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '7px', color: '#444', letterSpacing: '0.3px' }}>
              DRAG AXIS: ZOOM · SCROLL: ZOOM · DBLCLICK: RESET
            </span>
            {tradeCount > 0 && (
              <span style={{ fontSize: '8px', color: '#555', fontFamily: 'monospace' }}>
                {tradeCount.toLocaleString()} TICKS
              </span>
            )}
            <span style={{
              fontSize: '9px',
              fontWeight: 'bold',
              color: statusColor,
              letterSpacing: '0.5px',
            }}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'crosshair',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </Panel>
  );
};

export default OrderflowChart;
