import React, { useMemo } from 'react';

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

const OrderflowDepthPanel = ({ data }) => {
  const { book, footprint, aggression } = data;

  const footprintRows = useMemo(() => {
    const maxVol = footprint.maxVol || 1;
    return footprint.buckets.map(bucket => {
      const bidIntensity = Math.min(1, (bucket.sellVol || 0) / maxVol);
      const askIntensity = Math.min(1, (bucket.buyVol || 0) / maxVol);
      const buyVol = bucket.buyVol || 0;
      const sellVol = bucket.sellVol || 0;
      const showSellImbalance = sellVol >= 3 * buyVol && sellVol > 0;
      const showBuyImbalance = buyVol >= 3 * sellVol && buyVol > 0;
      return {
        ...bucket,
        bidIntensity,
        askIntensity,
        showSellImbalance,
        showBuyImbalance
      };
    });
  }, [footprint.buckets, footprint.maxVol]);

  const aggressionColor = aggression.index >= 0 ? 'var(--status-up)' : 'var(--status-down)';

  return (
    <div className="microstructure-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b0b0b' }}>
      <div className="micro-header" style={{ padding: '4px', borderBottom: '1px solid var(--panel-border)' }}>
        <div className="micro-tab-buttons" style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '4px' }}>
          <button
            className="micro-tab-btn active"
            style={{
              background: 'var(--accent-amber)',
              color: '#000',
              border: 'none',
              padding: '4px 8px',
              fontSize: '9px',
              fontWeight: 'bold',
              cursor: 'default',
              fontFamily: 'var(--font-mono)'
            }}
          >
            TAPE
          </button>
        </div>
      </div>
      
      <div className="micro-panel micro-footprint" style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0, border: 'none', padding: '8px' }}>
        <div className="micro-panel-title">ORDERFLOW DEPTH TAPE</div>
        <div className="micro-footprint-header-row jigsaw-header" style={{ marginBottom: '4px' }}>
          <span className="jigsaw-col">BID VOL</span>
          <span className="jigsaw-col">PRICE</span>
          <span className="jigsaw-col">ASK VOL</span>
          <span className="jigsaw-col">DELTA</span>
        </div>
        
        <div className="micro-footprint-grid jigsaw-grid" style={{ flex: 1, overflowY: 'auto' }}>
          {footprintRows.map((bucket, idx) => {
            const isMidPrice = book.mid && Math.abs(bucket.price - book.mid) < 0.00001;
            const bidBg = `rgba(255, 51, 51, ${Math.max(0.02, bucket.bidIntensity * 0.85)})`;
            const askBg = `rgba(0, 196, 255, ${Math.max(0.02, bucket.askIntensity * 0.85)})`;
            
            return (
              <div
                key={`fp-${idx}`}
                className={`micro-footprint-row jigsaw-row ${isMidPrice ? 'jigsaw-row-mid' : ''}`}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                  gap: '2px', 
                  marginBottom: '2px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  lineHeight: '24px'
                }}
              >
                {/* Bid Vol (Sell side) */}
                <div 
                  className={`jigsaw-cell-bid ${bucket.showSellImbalance ? 'imbalance-sell' : ''}`}
                  style={{ backgroundColor: bidBg, borderRight: bucket.showSellImbalance ? '2px solid #ff3333' : 'none' }}
                >
                  <span style={{ fontWeight: bucket.bidIntensity > 0.5 ? 'bold' : 'normal', color: bucket.bidIntensity > 0.5 ? '#fff' : '#ccc' }}>
                    {formatSize(bucket.sellVol)}
                  </span>
                </div>

                {/* Price */}
                <div 
                  className="jigsaw-cell-price"
                  style={{ backgroundColor: isMidPrice ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: isMidPrice ? '#fff' : '#aaa', fontWeight: isMidPrice ? 'bold' : 'normal' }}
                >
                  {formatPrice(bucket.price)}
                </div>

                {/* Ask Vol (Buy side) */}
                <div 
                  className={`jigsaw-cell-ask ${bucket.showBuyImbalance ? 'imbalance-buy' : ''}`}
                  style={{ backgroundColor: askBg, borderLeft: bucket.showBuyImbalance ? '2px solid #00c4ff' : 'none' }}
                >
                  <span style={{ fontWeight: bucket.askIntensity > 0.5 ? 'bold' : 'normal', color: bucket.askIntensity > 0.5 ? '#fff' : '#ccc' }}>
                    {formatSize(bucket.buyVol)}
                  </span>
                </div>

                {/* Delta */}
                <div 
                  className="jigsaw-cell-delta"
                  style={{ color: bucket.delta > 0 ? '#00c4ff' : bucket.delta < 0 ? '#ff3333' : '#666' }}
                >
                  {bucket.delta >= 0 ? '+' : ''}{formatSize(bucket.delta)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="micro-footprint-footer" style={{ marginTop: 'auto', paddingTop: '8px' }}>
          <span>TAPE DELTA</span>
          <span style={{ color: aggressionColor }}>{(aggression.index * 100).toFixed(0)}</span>
          <span>PACE</span>
          <span>{(aggression.tradeRate).toFixed(1)}/s</span>
        </div>
      </div>
    </div>
  );
};

export default OrderflowDepthPanel;
