import { useMemo, useState } from 'react';

const formatMs = value => (Number.isFinite(value) ? `${value.toFixed(1)}ms` : '--');
const formatHz = value => (Number.isFinite(value) ? `${value.toFixed(1)}Hz` : '--');
const formatPct = value => (Number.isFinite(value) ? `${value.toFixed(1)}%` : '--');
const formatScore = value => (Number.isFinite(value) ? `${Math.round(value * 100)}` : '--');

const formatPrice = value => {
  if (!Number.isFinite(value)) return '--';
  if (Math.abs(value) >= 1000) return value.toFixed(2);
  if (Math.abs(value) >= 1) return value.toFixed(4);
  return value.toFixed(6);
};

const formatSize = value => {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1000) return Math.round(value).toLocaleString();
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(6);
};

const Metric = ({ label, value }) => (
  <div className="micro-metric">
    <span className="micro-metric-label">{label}</span>
    <span className="micro-metric-value">{value}</span>
  </div>
);

const Sparkline = ({ data, color }) => {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';
    const width = 140;
    const height = 32;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data]);

  if (!path) return <div className="micro-sparkline-empty" />;

  return (
    <svg className="micro-sparkline" viewBox="0 0 140 32" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={path} />
    </svg>
  );
};

const SignalRow = ({ label, value, score, color }) => (
  <div className="micro-signal-row">
    <div className="micro-signal-head">
      <span className="micro-signal-label">{label}</span>
      <span className="micro-signal-value" style={{ color }}>{value}</span>
    </div>
    <div className="micro-signal-bar">
      <div className="micro-signal-fill" style={{ width: `${score * 100}%`, background: color }} />
    </div>
  </div>
);

const ProbabilityRow = ({ label, value, color }) => (
  <div className="micro-prob-row">
    <span className="micro-prob-label">{label}</span>
    <div className="micro-prob-bar">
      <div className="micro-prob-fill" style={{ width: `${value * 100}%`, background: color }} />
    </div>
    <span className="micro-prob-value">{formatPct(value * 100)}</span>
  </div>
);

const ConfidenceBadge = ({ score, label }) => {
  const color = score > 0.7 ? 'var(--status-up)' : score > 0.4 ? 'var(--accent-amber)' : 'var(--status-down)';
  return (
    <div className="micro-confidence-badge">
      <span className="micro-confidence-label">{label}</span>
      <span className="micro-confidence-value" style={{ color }}>{formatScore(score)}</span>
    </div>
  );
};

const QueueStabilityMap = ({ stabilityMap }) => {
  if (!stabilityMap || stabilityMap.length === 0) return <div className="micro-empty-state">NO QUEUE DATA</div>;
  return (
    <div className="micro-queue-map">
      {stabilityMap.slice(0, 10).map((cell, idx) => (
        <div
          key={idx}
          className={`micro-queue-cell micro-queue-${cell.type.toLowerCase()}`}
          style={{ opacity: 0.3 + cell.stability * 0.7 }}
        >
          <span className="micro-queue-price">{formatPrice(cell.price)}</span>
          <span className="micro-queue-side">{cell.side}</span>
        </div>
      ))}
    </div>
  );
};

const ResiliencyCurve = ({ curve, score }) => {
  const path = useMemo(() => {
    if (!curve || curve.length < 2) return '';
    const width = 120;
    const height = 24;
    return curve
      .map((pt, idx) => {
        const x = (idx / (curve.length - 1)) * width;
        const y = height - pt.y * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [curve]);

  return (
    <div className="micro-resiliency-block">
      <div className="micro-resiliency-score" style={{ color: score > 0.6 ? 'var(--status-up)' : score > 0.3 ? 'var(--accent-amber)' : 'var(--status-down)' }}>
        RESILIENCY {formatScore(score)}
      </div>
      {path && (
        <svg className="micro-resiliency-curve" viewBox="0 0 120 24" preserveAspectRatio="none">
          <polyline fill="none" stroke="var(--accent-amber)" strokeWidth="1.5" points={path} />
        </svg>
      )}
    </div>
  );
};

const ToxicityHeatmap = ({ vpin, adverseSelection, tradeToxicity }) => (
  <div className="micro-toxicity-grid">
    <div className="micro-toxicity-cell" style={{ background: `rgba(255, 51, 51, ${vpin.score * 0.6})` }}>
      <span className="micro-toxicity-label">VPIN</span>
      <span className="micro-toxicity-value">{formatScore(vpin.score)}</span>
    </div>
    <div className="micro-toxicity-cell" style={{ background: `rgba(255, 51, 51, ${adverseSelection.score * 0.6})` }}>
      <span className="micro-toxicity-label">ADVERSE</span>
      <span className="micro-toxicity-value">{formatScore(adverseSelection.score)}</span>
    </div>
    <div className="micro-toxicity-cell" style={{ background: `rgba(255, 51, 51, ${tradeToxicity.toxicProb * 0.6})` }}>
      <span className="micro-toxicity-label">TOXIC</span>
      <span className="micro-toxicity-value">{formatScore(tradeToxicity.toxicProb)}</span>
    </div>
    <div className="micro-toxicity-cell" style={{ background: `rgba(255, 176, 0, ${vpin.volSpikeRisk * 0.6})` }}>
      <span className="micro-toxicity-label">SPIKE RISK</span>
      <span className="micro-toxicity-value">{formatScore(vpin.volSpikeRisk)}</span>
    </div>
  </div>
);

const FlowMatrix = ({ flowRatio, flowVelocity, consumption }) => (
  <div className="micro-flow-matrix">
    <div className="micro-flow-row">
      <span className="micro-flow-label">PASSIVE</span>
      <div className="micro-flow-bar">
        <div className="micro-flow-fill" style={{ width: `${flowRatio.passive * 100}%`, background: 'var(--accent-blue)' }} />
      </div>
      <span className="micro-flow-value">{formatScore(flowRatio.passive)}</span>
    </div>
    <div className="micro-flow-row">
      <span className="micro-flow-label">AGGRESSIVE</span>
      <div className="micro-flow-bar">
        <div className="micro-flow-fill" style={{ width: `${flowRatio.aggressive * 100}%`, background: 'var(--accent-amber)' }} />
      </div>
      <span className="micro-flow-value">{formatScore(flowRatio.aggressive)}</span>
    </div>
    <div className="micro-flow-row">
      <span className="micro-flow-label">BUY ACCEL</span>
      <div className="micro-flow-bar">
        <div className="micro-flow-fill" style={{ width: `${Math.min(1, Math.abs(flowVelocity.buyAccel)) * 100}%`, background: 'var(--status-up)' }} />
      </div>
      <span className="micro-flow-value">{flowVelocity.buyAccel.toFixed(2)}</span>
    </div>
    <div className="micro-flow-row">
      <span className="micro-flow-label">SELL ACCEL</span>
      <div className="micro-flow-bar">
        <div className="micro-flow-fill" style={{ width: `${Math.min(1, Math.abs(flowVelocity.sellAccel)) * 100}%`, background: 'var(--status-down)' }} />
      </div>
      <span className="micro-flow-value">{flowVelocity.sellAccel.toFixed(2)}</span>
    </div>
    <div className="micro-flow-row">
      <span className="micro-flow-label">CONSUMPTION</span>
      <div className="micro-flow-bar">
        <div className="micro-flow-fill" style={{ width: `${consumption.rate * 10}%`, background: 'var(--status-down)' }} />
      </div>
      <span className="micro-flow-value">{consumption.rate.toFixed(1)}/s</span>
    </div>
  </div>
);

const IcebergDisplay = ({ iceberg }) => (
  <div className="micro-iceberg-block">
    <div className="micro-iceberg-header">
      <ConfidenceBadge score={iceberg.probability} label="ICEBERG PROB" />
      <ConfidenceBadge score={iceberg.stealthScore} label="STEALTH" />
    </div>
    <div className="micro-iceberg-zones">
      {iceberg.zones && iceberg.zones.length > 0 ? (
        iceberg.zones.slice(0, 4).map((zone, idx) => (
          <div key={idx} className="micro-iceberg-zone">
            <span className="micro-iceberg-price">{formatPrice(zone.price)}</span>
            <span className="micro-iceberg-refreshes">{zone.refreshes}x</span>
          </div>
        ))
      ) : (
        <div className="micro-empty-state">NO ICEBERGS</div>
      )}
    </div>
  </div>
);

const SweepDisplay = ({ sweepPattern, sweepExhaustion }) => (
  <div className="micro-sweep-block">
    <div className="micro-sweep-type" style={{ color: sweepPattern.confidence > 0.5 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
      {sweepPattern.type || 'NO SWEEP'}
    </div>
    <div className="micro-sweep-metrics">
      <span>LEVELS: {sweepPattern.levelsCrossed}</span>
      <span>MULTI: {sweepPattern.multiLevel ? 'YES' : 'NO'}</span>
      <span>EXHAUST: {formatScore(sweepExhaustion.score)}</span>
      <span>REVERSAL: {formatScore(sweepExhaustion.reversalProb)}</span>
    </div>
  </div>
);

const FragmentationDisplay = ({ fragmentation, sequencing, rhythm }) => (
  <div className="micro-fragmentation-block">
    <div className="micro-frag-row">
      <span className="micro-frag-label">SLICES</span>
      <span className="micro-frag-value">{fragmentation.sliceCount}</span>
    </div>
    <div className="micro-frag-row">
      <span className="micro-frag-label">STEALTH</span>
      <span className="micro-frag-value" style={{ color: fragmentation.stealthScore > 0.5 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
        {formatScore(fragmentation.stealthScore)}
      </span>
    </div>
    <div className="micro-frag-row">
      <span className="micro-frag-label">PATTERN</span>
      <span className="micro-frag-value">{sequencing.pattern}</span>
    </div>
    <div className="micro-frag-row">
      <span className="micro-frag-label">ALGO</span>
      <span className="micro-frag-value">{formatScore(sequencing.algoProb)}</span>
    </div>
    <div className="micro-frag-row">
      <span className="micro-frag-label">HFT</span>
      <span className="micro-frag-value" style={{ color: rhythm.hftProb > 0.5 ? 'var(--status-down)' : 'var(--text-secondary)' }}>
        {formatScore(rhythm.hftProb)}
      </span>
    </div>
    <div className="micro-frag-row">
      <span className="micro-frag-label">ARB</span>
      <span className="micro-frag-value">{formatScore(rhythm.latencyArb)}</span>
    </div>
  </div>
);

const SizeDistribution = ({ sizeDist }) => (
  <div className="micro-sizedist-block">
    <div className="micro-sizedist-row">
      <span className="micro-sizedist-label">RETAIL</span>
      <div className="micro-sizedist-bar">
        <div className="micro-sizedist-fill" style={{ width: `${sizeDist.retail * 100}%`, background: 'var(--accent-blue)' }} />
      </div>
      <span className="micro-sizedist-value">{(sizeDist.retail * 100).toFixed(0)}%</span>
    </div>
    <div className="micro-sizedist-row">
      <span className="micro-sizedist-label">MID</span>
      <div className="micro-sizedist-bar">
        <div className="micro-sizedist-fill" style={{ width: `${sizeDist.mid * 100}%`, background: 'var(--accent-amber)' }} />
      </div>
      <span className="micro-sizedist-value">{(sizeDist.mid * 100).toFixed(0)}%</span>
    </div>
    <div className="micro-sizedist-row">
      <span className="micro-sizedist-label">WHALE</span>
      <div className="micro-sizedist-bar">
        <div className="micro-sizedist-fill" style={{ width: `${sizeDist.whale * 100}%`, background: 'var(--status-up)' }} />
      </div>
      <span className="micro-sizedist-value">{(sizeDist.whale * 100).toFixed(0)}%</span>
    </div>
    <div className="micro-sizedist-dominant">
      DOM: <span className="micro-sizedist-type">{sizeDist.dominant}</span>
    </div>
  </div>
);

const StressRadar = ({ stressRadar, fragility, toxicLiquidity }) => (
  <div className="micro-stress-block">
    <div className="micro-stress-score" style={{ color: stressRadar.score > 0.6 ? 'var(--status-down)' : stressRadar.score > 0.3 ? 'var(--accent-amber)' : 'var(--status-up)' }}>
      STRESS {formatScore(stressRadar.score)}
    </div>
    <div className="micro-stress-zones">
      {stressRadar.zones && stressRadar.zones.map((zone, idx) => (
        <div key={idx} className="micro-stress-zone">
          <span className="micro-stress-label">{zone.label}</span>
          <div className="micro-stress-bar">
            <div className="micro-stress-fill" style={{ width: `${zone.value * 100}%`, background: zone.value > 0.6 ? 'var(--status-down)' : 'var(--accent-amber)' }} />
          </div>
          <span className="micro-stress-value">{formatScore(zone.value)}</span>
        </div>
      ))}
    </div>
    <div className="micro-stress-footer">
      <span>FRAG: {formatScore(fragility.score)}</span>
      <span>TOXIC: {formatScore(toxicLiquidity.score)}</span>
    </div>
  </div>
);

const SmartMoneyIntent = ({ smartMoneyIntent, executionConviction, hiddenAlpha }) => (
  <div className="micro-smartmoney-block">
    <div className="micro-sm-intent">
      <span className="micro-sm-direction" style={{ color: smartMoneyIntent.direction > 0 ? 'var(--status-up)' : smartMoneyIntent.direction < 0 ? 'var(--status-down)' : 'var(--text-secondary)' }}>
        {smartMoneyIntent.direction > 0.1 ? 'BULL' : smartMoneyIntent.direction < -0.1 ? 'BEAR' : 'NEUT'}
      </span>
      <span className="micro-sm-conviction">{formatScore(smartMoneyIntent.conviction)}</span>
      <span className="micro-sm-horizon">{smartMoneyIntent.timeHorizon}</span>
    </div>
    <div className="micro-sm-exec">
      <ConfidenceBadge score={executionConviction.score} label="EXEC" />
      <ConfidenceBadge score={executionConviction.confidence} label="CONF" />
    </div>
    <div className="micro-sm-alpha">
      <span className="micro-sm-alpha-label">ALPHA</span>
      <span className="micro-sm-alpha-signal" style={{ color: hiddenAlpha.signal === 'BULLISH_HIDDEN' ? 'var(--status-up)' : hiddenAlpha.signal === 'BEARISH_HIDDEN' ? 'var(--status-down)' : 'var(--accent-amber)' }}>
        {hiddenAlpha.signal}
      </span>
      <span className="micro-sm-alpha-score">{formatScore(hiddenAlpha.score)}</span>
    </div>
  </div>
);

const TacticalEntry = ({ tacticalEntry, momentumDiv, absorptionPersist }) => (
  <div className="micro-tactical-block">
    <div className="micro-tactical-window" style={{ color: tacticalEntry.window === 'OPEN' ? 'var(--status-up)' : tacticalEntry.window === 'PARTIAL' ? 'var(--accent-amber)' : 'var(--status-down)' }}>
      {tacticalEntry.window}
    </div>
    <div className="micro-tactical-score">
      <span>ENTRY</span>
      <span style={{ color: tacticalEntry.score > 0.6 ? 'var(--status-up)' : 'var(--text-secondary)' }}>{formatScore(tacticalEntry.score)}</span>
    </div>
    <div className="micro-tactical-signals">
      <span>DIV: {momentumDiv.divergence ? 'Y' : 'N'}</span>
      <span>FAKE: {momentumDiv.fakeout ? 'Y' : 'N'}</span>
      <span>ABS: {formatScore(absorptionPersist.defenseScore)}</span>
      <span>TRAP: {formatScore(absorptionPersist.trapProb)}</span>
    </div>
  </div>
);

const DealerPressure = ({ dealerPressure, mmDefense }) => (
  <div className="micro-dealer-block">
    <div className="micro-dealer-metrics">
      <span>GAMMA: {formatScore(dealerPressure.gamma)}</span>
      <span>HEDGE: {formatScore(dealerPressure.hedgingPressure)}</span>
      <span>MM: {formatScore(mmDefense.strength)}</span>
    </div>
    <div className="micro-dealer-zones">
      {mmDefense.zones && mmDefense.zones.slice(0, 4).map((zone, idx) => (
        <div key={idx} className="micro-dealer-zone">
          <span className="micro-dealer-price">{formatPrice(zone.price)}</span>
          <span className="micro-dealer-strength">{formatScore(zone.strength)}</span>
        </div>
      ))}
    </div>
  </div>
);

const FlowTransition = ({ flowTransition }) => (
  <div className="micro-transition-block">
    <div className="micro-transition-flow">
      <span className={`micro-transition-from ${flowTransition.from === 'BUY_PRESSURE' ? 'text-up' : flowTransition.from === 'SELL_PRESSURE' ? 'text-down' : 'text-muted'}`}>
        {flowTransition.from.replace('_PRESSURE', '')}
      </span>
      <span className="micro-transition-arrow">→</span>
      <span className={`micro-transition-to ${flowTransition.to === 'BUY_PRESSURE' ? 'text-up' : flowTransition.to === 'SELL_PRESSURE' ? 'text-down' : 'text-muted'}`}>
        {flowTransition.to.replace('_PRESSURE', '')}
      </span>
    </div>
    <div className="micro-transition-prob">
      P: <span style={{ color: flowTransition.probability > 0.5 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>{formatScore(flowTransition.probability)}</span>
    </div>
  </div>
);

const MomentumDivergence = ({ momentumDiv }) => (
  <div className="micro-momentum-block">
    <div className="micro-momentum-row">
      <span className="micro-momentum-label">MOVE</span>
      <span className="micro-momentum-value" style={{ color: momentumDiv.priceMove > 0 ? 'var(--status-up)' : 'var(--status-down)' }}>
        {(momentumDiv.priceMove * 100).toFixed(3)}%
      </span>
    </div>
    <div className="micro-momentum-row">
      <span className="micro-momentum-label">DIV</span>
      <span className="micro-momentum-value" style={{ color: momentumDiv.divergence ? 'var(--status-down)' : 'var(--status-up)' }}>
        {momentumDiv.divergence ? 'DET' : 'NONE'}
      </span>
    </div>
    <div className="micro-momentum-row">
      <span className="micro-momentum-label">FAKE</span>
      <span className="micro-momentum-value" style={{ color: momentumDiv.fakeout ? 'var(--status-down)' : 'var(--status-up)' }}>
        {momentumDiv.fakeout ? 'WARN' : 'OK'}
      </span>
    </div>
  </div>
);

const PriceImpactDisplay = ({ priceImpact }) => (
  <div className="micro-priceimpact-block">
    <div className="micro-pi-drift" style={{ color: priceImpact.drift > 0 ? 'var(--status-up)' : 'var(--status-down)' }}>
      DRIFT {(priceImpact.drift * 100).toFixed(2)}%
    </div>
    <div className="micro-pi-metrics">
      <span>CONF: {formatScore(priceImpact.confidence)}</span>
      <span>SENS: {formatScore(priceImpact.sensitivity)}</span>
    </div>
  </div>
);

const TABS = [
  { id: 'orderflow', label: 'ORDER FLOW' },
  { id: 'resiliency', label: 'RESILIENCY' },
  { id: 'footprint', label: 'FOOTPRINT' },
  { id: 'detection', label: 'DETECTION' },
  { id: 'regime', label: 'REGIME' },
  { id: 'execution', label: 'EXECUTION' }
];

const MicrostructurePanel = ({ data, ticker }) => {
  const [activeTab, setActiveTab] = useState('orderflow');

  const {
    status, metrics, book, ofi, liquidity, aggression,
    footprint, regime, alpha, execution,
    queue, resiliency, replenishment, priceImpact, adverseSelection, vpin, iceberg,
    consumption, flowRatio, fragility, sequencing, flowVelocity, tradeToxicity,
    sweepPattern, fragmentation, momentumDiv, absorptionPersist, sizeDist, rhythm,
    sweepExhaustion, stressRadar, smartMoneyIntent, executionConviction, flowTransition,
    dealerPressure, hiddenAlpha, mmDefense, toxicLiquidity, tacticalEntry
  } = data;

  const ofiColor = ofi.value >= 0 ? 'var(--status-up)' : 'var(--status-down)';
  const pressureColor = book.pressure >= 0.5 ? 'var(--status-up)' : 'var(--status-down)';
  const aggressionColor = aggression.index >= 0 ? 'var(--status-up)' : 'var(--status-down)';

  const ofiHeatmap = useMemo(() => {
    return ofi.series.map((val, idx) => ({
      id: idx,
      value: val,
      color: val >= 0 ? 'var(--status-up)' : 'var(--status-down)'
    }));
  }, [ofi.series]);

  const regimeRows = useMemo(() => regime.map(item => ({
    ...item,
    color: item.id === 'TREND' ? 'var(--status-up)' : item.id === 'PANIC' ? 'var(--status-down)' : 'var(--accent-amber)'
  })), [regime]);

  const alphaRows = useMemo(() => alpha.map(item => ({
    ...item,
    color: item.id === 'CONT' ? 'var(--status-up)' : item.id === 'FAKE' ? 'var(--status-down)' : 'var(--accent-amber)'
  })), [alpha]);

  const footprintRows = useMemo(() => {
    const maxVol = footprint.maxVol || 1;
    return footprint.buckets.map(bucket => {
      const buyVol = bucket.buyVol || 0;
      const sellVol = bucket.sellVol || 0;
      const totalVol = buyVol + sellVol;
      const intensity = Math.min(1, totalVol / maxVol);
      const isPOC = totalVol > 0 && totalVol >= maxVol * 0.95;
      
      return {
        ...bucket,
        totalVol,
        intensity,
        isPOC
      };
    });
  }, [footprint.buckets, footprint.maxVol]);

  const statusTag = status.state === 'live' ? 'LIVE' : status.state.toUpperCase();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orderflow':
        return (
          <div className="micro-tab-content">
            <div className="micro-panel micro-orderflow">
              <div className="micro-panel-title">ORDER FLOW IMBALANCE</div>
              <div className="micro-ofi-metrics">
                <span style={{ color: ofiColor }}>OFI {formatScore(ofi.value)}</span>
                <span>TREND {formatScore(ofi.trend)}</span>
                <span style={{ color: pressureColor }}>PRES {formatScore(book.pressure)}</span>
              </div>
              <Sparkline data={ofi.series} color={ofiColor} />
              <div className="micro-ofi-heatmap">
                {ofiHeatmap.map(cell => (
                  <div key={cell.id} className="micro-ofi-cell" style={{ background: cell.color, opacity: Math.min(0.9, Math.abs(cell.value) + 0.15) }} />
                ))}
              </div>
              <div className="micro-ladder">
                <div className="micro-ladder-col micro-ladder-asks">
                  <div className="micro-ladder-head">ASK</div>
                  {book.asks.map((row, idx) => (
                    <div key={`ask-${idx}`} className="micro-ladder-row">
                      <span className="micro-ladder-price down">{formatPrice(row.price)}</span>
                      <span className="micro-ladder-size">{formatSize(row.size)}</span>
                      <div className="micro-ladder-fill down" style={{ width: `${row.intensity * 100}%` }} />
                    </div>
                  ))}
                </div>
                <div className="micro-ladder-mid">
                  <div className="micro-mid-price">{book.mid ? `${curr}${formatPrice(book.mid)}` : '--'}</div>
                  <div className="micro-mid-spread">SPR {book.spread ? formatPrice(book.spread) : '--'}</div>
                </div>
                <div className="micro-ladder-col micro-ladder-bids">
                  <div className="micro-ladder-head">BID</div>
                  {book.bids.map((row, idx) => (
                    <div key={`bid-${idx}`} className="micro-ladder-row">
                      <span className="micro-ladder-price up">{formatPrice(row.price)}</span>
                      <span className="micro-ladder-size">{formatSize(row.size)}</span>
                      <div className="micro-ladder-fill up" style={{ width: `${row.intensity * 100}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="micro-panel micro-liquidity">
              <div className="micro-panel-title">LIQUIDITY RADAR</div>
              <SignalRow label="THIN" value={formatScore(liquidity.thinScore)} score={liquidity.thinScore} color="var(--status-down)" />
              <SignalRow label="VOID" value={formatScore(liquidity.voidScore)} score={liquidity.voidScore} color="var(--status-down)" />
              <SignalRow label="BALANCE" value={formatScore(book.pressure)} score={book.pressure} color={pressureColor} />
              <div className="micro-liquidity-footer">
                <span>DEPTH</span>
                <span>{formatSize(liquidity.total)}</span>
              </div>
            </div>

            <div className="micro-panel micro-queue-panel">
              <div className="micro-panel-title">QUEUE STABILITY MAP</div>
              <QueueStabilityMap stabilityMap={queue.stabilityMap} />
            </div>
          </div>
        );

      case 'resiliency':
        return (
          <div className="micro-tab-content">
            <div className="micro-panel micro-resiliency-panel">
              <div className="micro-panel-title">ORDERBOOK RESILIENCY</div>
              <ResiliencyCurve curve={resiliency.curve} score={resiliency.score} />
              <div className="micro-replenishment">
                <span>REPL VEL</span>
                <span style={{ color: replenishment.velocity > 0 ? 'var(--status-up)' : 'var(--text-secondary)' }}>
                  {replenishment.velocity.toFixed(2)}/s
                </span>
              </div>
            </div>

            <div className="micro-panel micro-toxicity-panel">
              <div className="micro-panel-title">TOXICITY HEATMAP</div>
              <ToxicityHeatmap vpin={vpin} adverseSelection={adverseSelection} tradeToxicity={tradeToxicity} />
              <div className="micro-adverse-metrics">
                <span>TOXIC: {formatScore(adverseSelection.toxicFlowProb)}</span>
                <span>MM: {formatScore(adverseSelection.mmStress)}</span>
              </div>
            </div>

            <div className="micro-panel micro-vpin-panel">
              <div className="micro-panel-title">VPIN TOXICITY</div>
              <SignalRow label="SCORE" value={formatScore(vpin.score)} score={vpin.score} color="var(--status-down)" />
              <SignalRow label="INFORMED" value={formatScore(vpin.informedProb)} score={vpin.informedProb} color="var(--accent-amber)" />
              <SignalRow label="SPIKE" value={formatScore(vpin.volSpikeRisk)} score={vpin.volSpikeRisk} color="var(--status-down)" />
              <PriceImpactDisplay priceImpact={priceImpact} />
            </div>
          </div>
        );

      case 'footprint':
        return (
          <div className="micro-tab-content">
            <div className="micro-panel micro-footprint">
              <div className="micro-panel-title">VOLUME PROFILE DISTRIBUTION</div>
              <div className="micro-footprint-grid volume-profile-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px' }}>
                {footprintRows.map((bucket, idx) => {
                  const isMidPrice = book.mid && Math.abs(bucket.price - book.mid) < 0.00001;
                  return (
                    <div
                      key={`vp-${idx}`}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        position: 'relative',
                        height: '22px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    >
                      <div style={{ width: '80px', color: isMidPrice ? '#fff' : 'var(--text-secondary)', fontWeight: bucket.isPOC ? 'bold' : 'normal' }}>
                        {formatPrice(bucket.price)}
                      </div>
                      
                      <div style={{ flex: 1, position: 'relative', height: '100%', background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid var(--panel-border)' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: 0, 
                          top: 0, 
                          height: '100%', 
                          width: `${bucket.intensity * 100}%`,
                          background: bucket.isPOC ? 'var(--accent-amber)' : 'rgba(0, 196, 255, 0.3)',
                          borderRight: bucket.isPOC ? '2px solid #fff' : 'none'
                        }} />
                        <div style={{ position: 'absolute', right: '6px', top: '2px', color: '#fff', fontSize: '10px' }}>
                          {formatSize(bucket.totalVol)}
                        </div>
                      </div>
                      
                      <div style={{ width: '60px', textAlign: 'right', color: bucket.delta > 0 ? 'var(--status-up)' : bucket.delta < 0 ? 'var(--status-down)' : '#666' }}>
                        {bucket.delta >= 0 ? '+' : ''}{formatSize(bucket.delta)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="micro-footprint-footer">
                <span>DELTA</span>
                <span style={{ color: aggressionColor }}>{formatScore(aggression.index)}</span>
                <span>RATE</span>
                <span>{formatHz(aggression.tradeRate)}</span>
              </div>
            </div>

            <div className="micro-panel micro-signals">
              <div className="micro-panel-title">FLOW MATRIX</div>
              <FlowMatrix flowRatio={flowRatio} flowVelocity={flowVelocity} consumption={consumption} />
            </div>

            <div className="micro-panel micro-sweep-panel">
              <div className="micro-panel-title">SWEEP PATTERN</div>
              <SweepDisplay sweepPattern={sweepPattern} sweepExhaustion={sweepExhaustion} />
            </div>
          </div>
        );

      case 'detection':
        return (
          <div className="micro-tab-content">
            <div className="micro-panel micro-iceberg-panel">
              <div className="micro-panel-title">ICEBERG DETECTOR</div>
              <IcebergDisplay iceberg={iceberg} />
              <div className="micro-fragility">
                <span>FRAG</span>
                <span style={{ color: fragility.score > 0.6 ? 'var(--status-down)' : 'var(--status-up)' }}>{formatScore(fragility.score)}</span>
              </div>
            </div>

            <div className="micro-panel micro-fragmentation-panel">
              <div className="micro-panel-title">EXECUTION FRAGMENTATION</div>
              <FragmentationDisplay fragmentation={fragmentation} sequencing={sequencing} rhythm={rhythm} />
            </div>

            <div className="micro-panel micro-sizedist-panel">
              <div className="micro-panel-title">TRADE SIZE DIST</div>
              <SizeDistribution sizeDist={sizeDist} />
            </div>
          </div>
        );

      case 'regime':
        return (
          <div className="micro-tab-content">
            <div className="micro-panel micro-regime">
              <div className="micro-panel-title">MICROSTRUCTURE REGIME</div>
              <div className="micro-prob-block">
                {regimeRows.map(row => (
                  <ProbabilityRow key={row.id} label={row.label} value={row.value} color={row.color} />
                ))}
              </div>
            </div>

            <div className="micro-panel micro-execution">
              <div className="micro-panel-title">ALPHA PROBABILITY</div>
              <div className="micro-prob-block">
                {alphaRows.map(row => (
                  <ProbabilityRow key={row.id} label={row.label} value={row.value} color={row.color} />
                ))}
              </div>
              <div className="micro-exec-footer">
                <div className="micro-panel-subtitle">EXEC: {execution.mode} Q:{formatScore(execution.quality)}</div>
              </div>
            </div>

            <div className="micro-panel micro-stress-panel">
              <div className="micro-panel-title">STRESS RADAR</div>
              <StressRadar stressRadar={stressRadar} fragility={fragility} toxicLiquidity={toxicLiquidity} />
            </div>
          </div>
        );

      case 'execution':
        return (
          <div className="micro-tab-content">
            <div className="micro-panel micro-smartmoney-panel">
              <div className="micro-panel-title">SMART MONEY INTENT</div>
              <SmartMoneyIntent smartMoneyIntent={smartMoneyIntent} executionConviction={executionConviction} hiddenAlpha={hiddenAlpha} />
            </div>

            <div className="micro-panel micro-tactical-panel">
              <div className="micro-panel-title">TACTICAL ENTRY</div>
              <TacticalEntry tacticalEntry={tacticalEntry} momentumDiv={momentumDiv} absorptionPersist={absorptionPersist} />
              <MomentumDivergence momentumDiv={momentumDiv} />
            </div>

            <div className="micro-panel micro-dealer-panel">
              <div className="micro-panel-title">DEALER PRESSURE</div>
              <DealerPressure dealerPressure={dealerPressure} mmDefense={mmDefense} />
              <FlowTransition flowTransition={flowTransition} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isIndian = ticker && (ticker.toUpperCase().endsWith('.NS') || ticker.toUpperCase().endsWith('.BO'));
  const curr = isIndian ? '₹' : '$';

  return (
    <div className="microstructure-container">
      <div className="micro-metrics-bar">
        <span className={`micro-status micro-status-${status.state}`}>{statusTag}</span>
        <span className="micro-source">{status.source || 'NO FEED'}</span>
        <span className="micro-mid">{book.mid ? `MID ${curr}${formatPrice(book.mid)}` : 'MID --'}</span>
        <div className="micro-metrics-inline">
          <Metric label="DELAY" value={formatMs(metrics.feedDelayMs)} />
          <Metric label="COMPUTE" value={formatMs(metrics.computeMs)} />
          <Metric label="RATE" value={formatHz(metrics.updateRateHz)} />
          <Metric label="RENDER" value={formatHz(metrics.renderRateHz)} />
          <Metric label="JITTER" value={formatMs(metrics.jitterMs)} />
        </div>
      </div>

      {status.message && (
        <div className="micro-banner">{status.message}</div>
      )}

      <div className="micro-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`micro-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  );
};

export default MicrostructurePanel;
