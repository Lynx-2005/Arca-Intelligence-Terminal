import { useEffect, useState } from 'react';

const formatScore = value => (Number.isFinite(value) ? `${Math.round(value * 100)}` : '--');
const formatPct = value => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '--');
const formatHorizon = value => {
  if (!Number.isFinite(value)) return '--';
  if (value >= 60) return `${Math.round(value / 60)}m`;
  return `${Math.round(value)}s`;
};

const getDirectionColor = direction => {
  if (direction === 'UP') return 'var(--status-up)';
  if (direction === 'DOWN') return 'var(--status-down)';
  return 'var(--text-secondary)';
};

const SignalCard = ({ signal }) => {
  const direction = signal?.direction || 'NEUTRAL';
  const directionColor = getDirectionColor(direction);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(30,30,30,0.4) 0%, rgba(10,10,10,0.85) 100%)',
        border: '1px solid #222',
        borderRadius: '4px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${directionColor}, transparent)`
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', letterSpacing: '0.4px' }}>
          {signal?.label || 'EDGE SIGNAL'}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 'bold', color: directionColor }}>
          {direction}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
          CONF
          <span style={{ marginLeft: '6px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {formatScore(signal?.confidence)}
          </span>
        </div>
        <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
          MOVE PROB
          <span style={{ marginLeft: '6px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {formatPct(signal?.moveProb)}
          </span>
        </div>
        <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
          HORIZON
          <span style={{ marginLeft: '6px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {formatHorizon(signal?.horizonSec)}
          </span>
        </div>
        <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>
          EDGE
          <span style={{ marginLeft: '6px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {formatScore(signal?.score)}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '8px', color: '#777', lineHeight: '1.3' }}>
        INVALID: {signal?.invalidation || 'N/A'}
      </div>
    </div>
  );
};

const TABS = [
  { id: 'kinematics', label: 'BOOK KINEMATICS' },
  { id: 'gradients', label: 'PRESSURE GRADIENT' },
  { id: 'probability', label: 'PROBABILITY EDGE' },
  { id: 'regime', label: 'REGIME / ENTROPY' }
];

const AdvancedMicrostructurePanel = ({ data }) => {
  const [activeTab, setActiveTab] = useState('kinematics');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const predictive = data?.predictive || {};
  const meta = predictive.meta || { volRegime: 'MID', volScore: 0.5 };
  const signals = predictive[activeTab]?.signals || [];

  const renderTabContent = () => {
    if (!mounted) return null;

    return (
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            fontSize: '9px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.4px',
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <span>VOL REGIME: {meta.volRegime}</span>
          <span>ADAPTIVE SCORE: {formatScore(meta.volScore)}</span>
        </div>
        {signals.length === 0 ? (
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>NO PREDICTIVE SIGNALS</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {signals.map(signal => (
              <SignalCard key={signal.id || signal.label} signal={signal} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(180deg, #0b0b0b 0%, #050505 100%)',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,176,0,0.3), transparent)'
        }}
      />

      <div style={{ padding: '8px 4px 0 4px', borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px' }} className="premium-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'rgba(255, 176, 0, 0.1)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-amber)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'var(--accent-amber)' : 'transparent',
                borderRadius: '2px',
                padding: '6px 10px',
                fontSize: '9px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 0 8px rgba(255, 176, 0, 0.15)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="premium-scrollbar" style={{ flex: 1, position: 'relative' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdvancedMicrostructurePanel;