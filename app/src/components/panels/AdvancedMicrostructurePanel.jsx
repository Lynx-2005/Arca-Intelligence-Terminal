import React, { useState, useEffect } from 'react';
import { useDeribitOptions } from '../../hooks/useDeribitOptions';

const formatScore = value => (Number.isFinite(value) ? `${Math.round(value * 100)}` : '--');
const formatPct = value => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '--');

// --- PREMIUM UI COMPONENTS ---

const GlowPulse = ({ color, active }) => (
  <div style={{
    width: '8px', height: '8px', borderRadius: '50%', background: color,
    boxShadow: active ? `0 0 12px 2px ${color}` : 'none',
    transition: 'all 0.3s ease', opacity: active ? 1 : 0.3
  }} />
);

const VelocityGauge = ({ label, value, score, color, invert = false }) => {
  // Score is typically 0-1
  const width = Math.max(2, Math.min(100, score * 100));
  const gradient = invert 
    ? `linear-gradient(90deg, rgba(255,255,255,0.1) 0%, ${color} 100%)`
    : `linear-gradient(90deg, ${color} 0%, rgba(255,255,255,0.1) 100%)`;

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ color, fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <div style={{ height: '6px', background: '#111', borderRadius: '3px', position: 'relative', overflow: 'hidden', border: '1px solid #222' }}>
        <div style={{ 
          width: `${width}%`, height: '100%', background: gradient, 
          position: 'absolute', [invert ? 'right' : 'left']: 0,
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }} />
        {/* Animated Scanning Line */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '2px', background: '#fff',
          left: invert ? undefined : `${width}%`, right: invert ? `${width}%` : undefined,
          boxShadow: `0 0 8px ${color}`, opacity: 0.8
        }} />
      </div>
    </div>
  );
};

const RadarRing = ({ score, label, color }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score * circumference);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '60px', height: '60px' }}>
        <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="30" cy="30" r={radius} fill="none" stroke="#222" strokeWidth="4" />
          <circle 
            cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div style={{ 
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', 
          justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color
        }}>
          {formatScore(score)}
        </div>
      </div>
      <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
};

const DataCard = ({ label, value, subtext, color = '#fff' }) => (
  <div style={{ 
    background: 'linear-gradient(180deg, rgba(30,30,30,0.4) 0%, rgba(10,10,10,0.8) 100%)', 
    border: '1px solid #222', borderRadius: '4px', padding: '10px', 
    display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '1px', background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '14px', fontWeight: 'bold', color, fontFamily: 'var(--font-mono)' }}>{value}</span>
    {subtext && <span style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>{subtext}</span>}
  </div>
);

const HeatmapCell = ({ label, intensity, colorMap }) => {
  // intensity 0 to 1
  const bg = intensity > 0.8 ? colorMap.high : intensity > 0.4 ? colorMap.med : colorMap.low;
  return (
    <div style={{ 
      background: bg, padding: '8px', borderRadius: '2px', display: 'flex', 
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s', cursor: 'pointer'
    }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} 
       onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{(intensity * 100).toFixed(0)}</span>
      <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{label}</span>
    </div>
  );
};

// --- MAIN PANEL COMPONENT ---

const TABS = [
  { id: 'smartmoney', label: 'SMART MONEY' },
  { id: 'dealer', label: 'DEALER GEX' },
  { id: 'flow', label: 'ORDER FLOW' },
  { id: 'liquidity', label: 'LIQUIDITY' }
];

const AdvancedMicrostructurePanel = ({ data, ticker, currentPrice }) => {
  const [activeTab, setActiveTab] = useState('smartmoney');
  const [mounted, setMounted] = useState(false);

  const optionsData = useDeribitOptions(ticker, currentPrice);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { 
    smartMoneyIntent, dealerPressure, flowTransition, 
    fragility, toxicLiquidity, executionConviction, tacticalEntry, hiddenAlpha 
  } = data;

  const getDirectionColor = dir => dir > 0.1 ? 'var(--status-up)' : dir < -0.1 ? 'var(--status-down)' : 'var(--text-secondary)';
  const getDirectionText = dir => dir > 0.1 ? 'ACCUMULATION' : dir < -0.1 ? 'DISTRIBUTION' : 'NEUTRAL';
  const getConvictionColor = score => score > 0.7 ? 'var(--status-up)' : score > 0.4 ? 'var(--accent-amber)' : 'var(--status-down)';

  const renderTabContent = () => {
    if (!mounted) return null;

    switch(activeTab) {
      case 'smartmoney':
        return (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>INSTITUTIONAL BIAS</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GlowPulse color={getDirectionColor(smartMoneyIntent.direction)} active={true} />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: getDirectionColor(smartMoneyIntent.direction) }}>
                    {getDirectionText(smartMoneyIntent.direction)}
                  </span>
                </div>
              </div>
              <RadarRing score={smartMoneyIntent.conviction} label="CONVICTION" color={getConvictionColor(smartMoneyIntent.conviction)} />
            </div>

            <div style={{ background: '#111', padding: '10px', borderRadius: '4px', border: '1px solid #222' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '8px' }}>AI INTERPRETATION</div>
              <div style={{ fontSize: '11px', color: '#ccc', lineHeight: '1.4' }}>
                {smartMoneyIntent.direction > 0.1 
                  ? "Strong passive accumulation detected across dark pools. High probability of institutional inventory building." 
                  : smartMoneyIntent.direction < -0.1 
                  ? "Aggressive institutional distribution. Large players are actively offloading inventory into retail liquidity." 
                  : "Mixed signals. Institutions are currently passive or engaging in market-making activities without directional bias."}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <DataCard 
                label="TIME HORIZON" 
                value={smartMoneyIntent.timeHorizon} 
                subtext="Expected impact duration"
                color="var(--accent-blue)" 
              />
              <DataCard 
                label="HIDDEN ALPHA" 
                value={hiddenAlpha.signal} 
                subtext="Algorithmic footprint"
                color={hiddenAlpha.signal.includes('BULL') ? 'var(--status-up)' : hiddenAlpha.signal.includes('BEAR') ? 'var(--status-down)' : 'var(--accent-amber)'} 
              />
            </div>
          </div>
        );
      case 'dealer':
        return (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <VelocityGauge 
              label="NET GAMMA EXPOSURE (GEX)" 
              value={formatScore(dealerPressure.gamma)} 
              score={dealerPressure.gamma} 
              color="var(--accent-blue)" 
            />
            
            <VelocityGauge 
              label="DEALER HEDGING PRESSURE" 
              value={formatScore(dealerPressure.hedgingPressure)} 
              score={dealerPressure.hedgingPressure} 
              color={dealerPressure.hedgingPressure > 0.6 ? 'var(--status-down)' : 'var(--status-up)'} 
              invert={dealerPressure.hedgingPressure > 0.5}
            />

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>STRIKE GRAVITY MATRIX (LIVE OI)</span>
                {optionsData.loading && <span style={{ fontSize: '9px', color: 'var(--accent-amber)' }}>SYNCING DERIBIT...</span>}
                {optionsData.error && <span style={{ fontSize: '9px', color: 'var(--status-down)' }}>{optionsData.error}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                <HeatmapCell label="ITM CALLS" intensity={optionsData.itmCalls || 0} colorMap={{high: '#003366', med: '#002244', low: '#001122'}} />
                <HeatmapCell label="OTM CALLS" intensity={optionsData.otmCalls || 0} colorMap={{high: '#003366', med: '#002244', low: '#001122'}} />
                <HeatmapCell label="ITM PUTS" intensity={optionsData.itmPuts || 0} colorMap={{high: '#330000', med: '#220000', low: '#110000'}} />
                <HeatmapCell label="OTM PUTS" intensity={optionsData.otmPuts || 0} colorMap={{high: '#330000', med: '#220000', low: '#110000'}} />
              </div>
            </div>
            
            <div style={{ fontSize: '10px', color: '#888', background: 'rgba(0,170,255,0.05)', padding: '8px', borderLeft: '2px solid var(--accent-blue)' }}>
              Dealers are currently in {dealerPressure.gamma > 0.5 ? 'long' : 'short'} gamma territory. Expect {dealerPressure.gamma > 0.5 ? 'suppressed volatility and mean reversion' : 'expanded volatility and trend acceleration'}.
            </div>
          </div>
        );
      case 'flow':
        return (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '12px', borderRadius: '4px', border: '1px solid #222' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>STATE</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: flowTransition.from.includes('BUY') ? 'var(--status-up)' : 'var(--status-down)' }}>
                  {flowTransition.from.replace('_PRESSURE', '')}
                </div>
              </div>
              
              <div style={{ flex: 1, margin: '0 12px', height: '2px', background: '#333', position: 'relative' }}>
                {/* Arrow indicator */}
                <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', color: 'var(--accent-amber)', fontSize: '10px' }}>→</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>SHIFTING TO</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: flowTransition.to.includes('BUY') ? 'var(--status-up)' : 'var(--status-down)' }}>
                  {flowTransition.to.replace('_PRESSURE', '')}
                </div>
              </div>
            </div>

            <VelocityGauge 
              label="TRANSITION PROBABILITY" 
              value={formatPct(flowTransition.probability)} 
              score={flowTransition.probability} 
              color="var(--accent-amber)" 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
               <DataCard label="ORDERBOOK IMBALANCE" value="68% ASK" color="var(--status-down)" />
               <DataCard label="TRADE TAPE VELOCITY" value="HIGH" color="var(--accent-amber)" />
            </div>
          </div>
        );
      case 'liquidity':
        return (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <VelocityGauge 
              label="ORDERBOOK FRAGILITY (SLIPPAGE RISK)" 
              value={formatScore(fragility.score)} 
              score={fragility.score} 
              color={fragility.score > 0.6 ? 'var(--status-down)' : 'var(--status-up)'} 
              invert={true}
            />
            <VelocityGauge 
              label="TOXIC LIQUIDITY (ADVERSE SELECTION)" 
              value={formatScore(toxicLiquidity.score)} 
              score={toxicLiquidity.score} 
              color={toxicLiquidity.score > 0.6 ? 'var(--status-down)' : 'var(--accent-amber)'} 
              invert={true}
            />

            <div style={{ borderTop: '1px dashed #333', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px' }}>TACTICAL EXECUTION WINDOW</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ 
                  flex: 1, background: tacticalEntry.window === 'OPEN' ? 'rgba(0,255,102,0.1)' : 'rgba(255,51,51,0.1)', 
                  border: `1px solid ${tacticalEntry.window === 'OPEN' ? 'var(--status-up)' : 'var(--status-down)'}`,
                  borderRadius: '4px', padding: '12px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: tacticalEntry.window === 'OPEN' ? 'var(--status-up)' : 'var(--status-down)', letterSpacing: '1px' }}>
                    {tacticalEntry.window}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>CURRENT STATUS</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px' }}>
                  <RadarRing score={tacticalEntry.score} label="TIMING" color={getConvictionColor(tacticalEntry.score)} />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(180deg, #0b0b0b 0%, #050505 100%)', position: 'relative' }}>
      {/* Dynamic Top Edge Glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,176,0,0.3), transparent)' }} />
      
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
