import { useMemo } from 'react';

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
    return footprint.buckets.map(bucket => {
      const buyVol = bucket.buyVol || 0;
      const sellVol = bucket.sellVol || 0;
      const totalTraded = buyVol + sellVol;
      const imbalancePct = totalTraded > 0 ? (buyVol / totalTraded) * 100 : 50;

      return {
        ...bucket,
        buyVol,
        sellVol,
        totalTraded,
        imbalancePct
      };
    });
  }, [footprint.buckets]);

  // Compute max depth to scale background intensity for limit orders
  const maxDepth = useMemo(() => {
    return Math.max(
      1,
      ...footprintRows.map(b => Math.max(b.bidSize || 0, b.askSize || 0))
    );
  }, [footprintRows]);

  const maxVolume = useMemo(() => {
    return Math.max(
      1,
      ...footprintRows.map(b => Math.max(b.buyVol || 0, b.sellVol || 0))
    );
  }, [footprintRows]);

  // Find the exact bucket price that is closest to the current mid price
  const closestMidPrice = useMemo(() => {
    if (!book.mid || footprintRows.length === 0) return null;
    let closestPrice = footprintRows[0].price;
    let minDiff = Math.abs(footprintRows[0].price - book.mid);
    for (let i = 1; i < footprintRows.length; i++) {
      const diff = Math.abs(footprintRows[i].price - book.mid);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = footprintRows[i].price;
      }
    }
    return closestPrice;
  }, [footprintRows, book.mid]);

  const aggressionColor = aggression.index >= 0 ? 'var(--status-up)' : 'var(--status-down)';

  return (
    <div className="microstructure-container dom-trader-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a' }}>
      <style>{`
        .dom-trader-grid::-webkit-scrollbar {
          width: 12px !important;
          background: rgba(255, 255, 255, 0.02);
        }
        .dom-trader-grid::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
        }
        .dom-trader-grid::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2) !important;
          border-radius: 6px;
          border: 3px solid #0a0a0a;
        }
        .dom-trader-grid::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4) !important;
        }
      `}</style>
      
      <div className="micro-panel micro-footprint" style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0, border: 'none', padding: '8px' }}>
        <div className="micro-panel-title">ORDERFLOW DEPTH TAPE</div>
        <div className="micro-footprint-header-row jigsaw-header" style={{ marginBottom: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1.2fr 1.2fr 1fr', fontSize: '9px', textAlign: 'center', color: '#888', fontWeight: 'bold' }}>
          <span>Buy</span>
          <span>Bids</span>
          <span>Price</span>
          <span>Asks</span>
          <span>Sell</span>
          <span>Liq Chg</span>
          <span>Imbal %</span>
          <span>Volume</span>
        </div>
        
        <div className="micro-footprint-grid jigsaw-grid dom-trader-grid" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {footprintRows.map((bucket, idx) => {
            const isMidPrice = closestMidPrice !== null && Math.abs(bucket.price - closestMidPrice) < 0.000001;
            
            const bidIntensity = Math.min(1, (bucket.bidSize || 0) / maxDepth);
            const askIntensity = Math.min(1, (bucket.askSize || 0) / maxDepth);
            
            const buyIntensity = Math.min(1, (bucket.buyVol || 0) / maxVolume);
            const sellIntensity = Math.min(1, (bucket.sellVol || 0) / maxVolume);

            // Translucent bar backgrounds
            const buyBg = `linear-gradient(to left, rgba(0, 255, 102, 0.25) ${buyIntensity * 100}%, transparent ${buyIntensity * 100}%)`;
            const sellBg = `linear-gradient(to right, rgba(255, 51, 51, 0.25) ${sellIntensity * 100}%, transparent ${sellIntensity * 100}%)`;

            // Depth bars (Resting Liquidity)
            const bidBg = `linear-gradient(to left, rgba(0, 191, 255, 0.5) ${bidIntensity * 100}%, rgba(0, 191, 255, 0.1) ${bidIntensity * 100}%)`;
            const askBg = `linear-gradient(to right, rgba(255, 140, 0, 0.5) ${askIntensity * 100}%, rgba(255, 140, 0, 0.1) ${askIntensity * 100}%)`;

            return (
              <div
                key={`fp-${idx}`}
                className={`micro-footprint-row jigsaw-row ${isMidPrice ? 'jigsaw-row-mid' : ''}`}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1.2fr 1.2fr 1fr', 
                  gap: '1px', 
                  marginBottom: '1px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  lineHeight: '20px',
                  backgroundColor: isMidPrice ? 'rgba(255, 176, 0, 0.08)' : 'transparent'
                }}
              >
                {/* Buy */}
                <div style={{ color: '#00ff66', background: buyBg }}>
                  {formatSize(bucket.buyVol)}
                </div>
                
                {/* Bids */}
                <div style={{ background: bidBg, color: '#fff' }}>
                  {formatSize(bucket.bidSize)}
                </div>

                {/* Price */}
                <div style={{ 
                  backgroundColor: isMidPrice ? 'var(--accent-amber)' : '#111', 
                  color: isMidPrice ? '#000' : '#aaa', 
                  fontWeight: 'bold',
                  boxShadow: isMidPrice ? '0 0 8px rgba(255, 176, 0, 0.5)' : 'none',
                  zIndex: isMidPrice ? 1 : 'auto',
                  borderRadius: isMidPrice ? '2px' : '0'
                }}>
                  {formatPrice(bucket.price)}
                </div>

                {/* Asks */}
                <div style={{ background: askBg, color: '#fff' }}>
                  {formatSize(bucket.askSize)}
                </div>

                {/* Sell */}
                <div style={{ color: '#ff3333', background: sellBg }}>
                  {formatSize(bucket.sellVol)}
                </div>

                {/* Liq Chg */}
                <div style={{ color: bucket.liqChange > 0 ? '#00ff66' : bucket.liqChange < 0 ? '#ff3333' : '#666' }}>
                  {bucket.liqChange > 0 ? '+' : ''}{formatSize(bucket.liqChange)}
                </div>

                {/* Imbalance % */}
                <div style={{ color: bucket.imbalancePct > 55 ? '#00ff66' : bucket.imbalancePct < 45 ? '#ff3333' : '#888' }}>
                  {bucket.totalTraded > 0 ? bucket.imbalancePct.toFixed(1) : '--'}
                </div>

                {/* Volume */}
                <div style={{ color: '#fff', fontWeight: 'bold' }}>
                  {formatSize(bucket.volume)}
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
