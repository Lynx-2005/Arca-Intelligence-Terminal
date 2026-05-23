import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';
import { fetchGDELTGeoData } from '../../services/gdelt';
import Panel from '../Panel';
import { Activity, ShieldAlert, Zap, Target, Globe, AlertTriangle, TrendingUp, Radar } from 'lucide-react';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// --- Enrichment Logic (Mock Intelligence Analysis) ---
const ENRICH_DATA = (features) => {
  return features.map((f, i) => {
    const name = f.properties?.name?.toLowerCase() || '';
    const isBreaking = name.includes('war') || name.includes('attack') || name.includes('strike') || name.includes('breaking');
    const isHighImpact = name.includes('economy') || name.includes('sanction') || name.includes('military');
    
    let severity = 'LOW';
    if (isBreaking) severity = 'BREAKING';
    else if (isHighImpact) severity = 'HIGH';
    else if (i % 5 === 0) severity = 'MEDIUM'; // Random distribution

    let sentiment = 'NEUTRAL';
    if (severity === 'BREAKING') sentiment = 'PANIC';
    else if (severity === 'HIGH') sentiment = 'BEARISH';
    else if (i % 3 === 0) sentiment = 'BULLISH';

    const sectors = [];
    if (name.includes('tech') || i % 7 === 0) sectors.push('SEMICONDUCTORS');
    if (name.includes('oil') || i % 4 === 0) sectors.push('ENERGY');
    if (name.includes('bank') || i % 6 === 0) sectors.push('FINANCIALS');
    if (sectors.length === 0) sectors.push('EQUITIES');

    // Strip HTML tags for clean summary
    const rawHtml = f.properties?.html || '';
    const cleanSummary = rawHtml.replace(/<[^>]*>?/gm, '');

    return {
      id: `evt-${f.geometry?.coordinates?.join('-') || i}-${name}`, // Stable ID
      original: f,
      coords: f.geometry?.coordinates, // [lng, lat]
      name: f.properties?.name || 'Unknown Event',
      summary: cleanSummary || name,
      description: f.properties?.description || '',
      severity,
      sentiment,
      sectors,
      riskScore: Math.floor(Math.random() * 40) + (severity === 'BREAKING' ? 60 : severity === 'HIGH' ? 40 : 10),
      timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
      source: ['Reuters', 'Bloomberg', 'Geopolitical Intel', 'OSINT'][Math.floor(Math.random() * 4)],
      phase: Math.random() * Math.PI * 2, // For animation offset
    };
  }).filter(f => f.coords && f.coords.length === 2);
};

// --- Map Canvas Component ---
const MapCanvas = ({ data, hoveredEvent, onHoverEvent, onClickEvent }) => {
  const containerRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const fgCanvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [worldData, setWorldData] = useState(null);

  // Load Map Data
  useEffect(() => {
    fetch(GEO_URL)
      .then(res => res.json())
      .then(topology => {
        const geojson = topojson.feature(topology, topology.objects.countries);
        setWorldData(geojson);
      });
  }, []);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Track transform state for Zooming
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Projection setup
  const projection = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return null;
    return d3Geo.geoMercator()
      .fitSize([dimensions.width, dimensions.height * 1.2], worldData || { type: 'FeatureCollection', features: [] })
      .translate([dimensions.width / 2 + 100, dimensions.height / 1.7]); // Shift right by 100px for Left HUD
  }, [dimensions, worldData]);

  // Draw Background Map
  useEffect(() => {
    if (!bgCanvasRef.current || !worldData || !projection) return;
    const ctx = bgCanvasRef.current.getContext('2d', { alpha: false });
    const { width, height } = dimensions;
    
    const dpr = window.devicePixelRatio || 1;
    bgCanvasRef.current.width = width * dpr;
    bgCanvasRef.current.height = height * dpr;
    bgCanvasRef.current.style.width = `${width}px`;
    bgCanvasRef.current.style.height = `${height}px`;

    // Fill deep matte black background
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, width * dpr, height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Subtle grid
    ctx.strokeStyle = '#080808';
    ctx.lineWidth = 1 / transform.k;
    for(let x=0; x<width; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); }
    for(let y=0; y<height; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); }

    const pathGenerator = d3Geo.geoPath().projection(projection).context(ctx);

    // Draw Countries
    worldData.features.forEach(feature => {
      ctx.beginPath();
      pathGenerator(feature);
      ctx.fillStyle = '#0a0a0b'; // Very dark grey
      ctx.fill();
      ctx.strokeStyle = '#1a1a1c'; // Subtle border
      ctx.lineWidth = 0.8 / transform.k;
      ctx.stroke();
    });
    
    ctx.restore();

    // Add subtle vignette/glow to the map edges
    const gradient = ctx.createRadialGradient(width/2 * dpr, height/2 * dpr, height/4 * dpr, width/2 * dpr, height/2 * dpr, width/2 * dpr);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width * dpr, height * dpr);

  }, [dimensions, worldData, projection, transform]);



  // Draw Foreground Animations
  useEffect(() => {
    if (!fgCanvasRef.current || !projection || data.length === 0) return;
    const canvas = fgCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;
    let animationFrameId;
    let startTime = performance.now();

    const render = (time) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.clearRect(0, 0, width * dpr, height * dpr);
      
      const currT = transformRef.current;
      ctx.save();
      
      try {
        ctx.scale(dpr, dpr);
        ctx.translate(currT.x, currT.y);
        ctx.scale(currT.k, currT.k);

        const elapsed = Math.max(0, (time - startTime) / 1000); // Prevent negative elapsed time

      // Orbital lines / Data Streams (Random connections)
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = 0.5 / currT.k;
      for (let i = 0; i < Math.min(15, data.length - 1); i++) {
        const start = data[i];
        const end = data[i + 1];
        if (start.severity !== 'BREAKING' && end.severity !== 'BREAKING') continue;

        const [x1, y1] = projection(start.coords);
        const [x2, y2] = projection(end.coords);
        
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - dist * 0.2; // Curve up

        const dashOffset = (elapsed * 50) % 100;
        ctx.setLineDash([4 / currT.k, 12 / currT.k]);
        ctx.lineDashOffset = -dashOffset / currT.k;
        ctx.strokeStyle = 'rgba(255, 176, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';

      // Draw Events
      data.forEach(evt => {
        if (evt.severity === 'LOW') return; // Do not draw low severity (white) dots

        const [x, y] = projection(evt.coords);
        
        // Culling out of bounds optimization (accounting for zoom)
        const screenX = x * currT.k + currT.x;
        const screenY = y * currT.k + currT.y;
        if (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100) return;

        const isHovered = hoveredEvent?.id === evt.id;
        let baseColor = 'rgba(100, 100, 100, 0.8)';
        let glowColor = 'rgba(100, 100, 100, 0.2)';
        
        const scaleAdjust = 1 / Math.pow(currT.k, 0.4); // Scale dots down slightly when zoomed
        let radius = 1.5 * scaleAdjust;

        if (evt.severity === 'MEDIUM') {
          baseColor = 'rgba(255, 176, 0, 0.8)';
          glowColor = 'rgba(255, 176, 0, 0.3)';
          radius = 2 * scaleAdjust;
        } else if (evt.severity === 'HIGH') {
          baseColor = 'rgba(255, 80, 0, 0.9)';
          glowColor = 'rgba(255, 80, 0, 0.4)';
          radius = 2.5 * scaleAdjust;
        } else if (evt.severity === 'BREAKING') {
          baseColor = 'rgba(255, 0, 50, 1)';
          glowColor = 'rgba(255, 0, 50, 0.5)';
          radius = 3 * scaleAdjust;
        }

        if (isHovered) {
          radius *= 1.5;
          ctx.shadowBlur = 15 / currT.k;
          ctx.shadowColor = baseColor;
        } else {
          ctx.shadowBlur = 0;
        }

        // Draw Base Dot
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();

        // Draw Heat Aura / Pulse
        if (evt.severity === 'HIGH' || evt.severity === 'BREAKING' || isHovered) {
          const pulseSpeed = evt.severity === 'BREAKING' ? 3 : 1.5;
          const pulsePhase = evt.phase + elapsed * pulseSpeed;
          const maxRadius = (isHovered ? 40 : (evt.severity === 'BREAKING' ? 25 : 15)) * scaleAdjust;
          
          // Outer expanding ring
          const ringRadius = Math.max(0.01, (pulsePhase % Math.PI) / Math.PI * maxRadius);
          const ringOpacity = Math.max(0, 1 - (ringRadius / maxRadius));
          
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = evt.severity === 'BREAKING' ? `rgba(255, 0, 50, ${ringOpacity})` : `rgba(255, 176, 0, ${ringOpacity})`;
          ctx.lineWidth = 1 / currT.k;
          ctx.stroke();

          // Soft core glow
          if (evt.severity === 'BREAKING' || isHovered) {
             ctx.beginPath();
             ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
             ctx.fillStyle = glowColor;
             ctx.fill();
          }
        }
      });
      } finally {
        ctx.restore();
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    render(startTime);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, projection, data, hoveredEvent]);

  // Handle Zoom & Pan Interactions
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e) => {
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => {
      const newK = Math.max(1, Math.min(10, prev.k * scaleAdjust));
      const rect = fgCanvasRef.current?.getBoundingClientRect();
      if (!rect) return prev;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newX = mouseX - (mouseX - prev.x) * (newK / prev.k);
      const newY = mouseY - (mouseY - prev.y) * (newK / prev.k);
      
      return { k: newK, x: newX, y: newY };
    });
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    if (fgCanvasRef.current) fgCanvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDragging.current) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
      return;
    }

    if (!projection || !fgCanvasRef.current) return;
    const rect = fgCanvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;

    let closest = null;
    let minDist = 15 / transform.k; // Hit radius

    data.forEach(evt => {
      if (evt.severity === 'LOW') return; 
      const [px, py] = projection(evt.coords);
      const dist = Math.hypot(px - mx, py - my);
      if (dist < minDist) {
        minDist = dist;
        closest = evt;
      }
    });

    if (closest !== hoveredEvent) {
      onHoverEvent(closest);
    }
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    if (fgCanvasRef.current) fgCanvasRef.current.releasePointerCapture(e.pointerId);
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
      <canvas
        ref={bgCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      />
      <canvas
        ref={fgCanvasRef}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, cursor: isDragging.current ? 'grabbing' : (hoveredEvent ? 'pointer' : 'crosshair') }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => { handlePointerUp(e); onHoverEvent(null); }}
        onClick={() => !isDragging.current && hoveredEvent && onClickEvent(hoveredEvent)}
      />
    </div>
  );
};

// --- HUD Components ---

const LeftHUD = ({ data }) => {
  const tickerNews = useMemo(() => data.filter(d => d.severity !== 'LOW').slice(0, 30), [data]);
  return (
    <div className="intel-hud-left">
      <div className="intel-hud-left-fade-top" />
      <div className="intel-hud-left-scroll-container">
        <div className="intel-hud-left-scroll">
          {tickerNews.map((news, i) => (
            <div key={i} className="intel-hud-ticker-item">
              <span className={`severity-dot ${news.severity.toLowerCase()}`}></span>
              <span className="ticker-title">{news.name}</span>
            </div>
          ))}
          {/* Duplicate for seamless marquee */}
          {tickerNews.map((news, i) => (
            <div key={`dup-${i}`} className="intel-hud-ticker-item">
              <span className={`severity-dot ${news.severity.toLowerCase()}`}></span>
              <span className="ticker-title">{news.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="intel-hud-left-fade-bottom" />
    </div>
  );
};

const TopHUD = ({ activeCount, breakingCount }) => (
  <div className="intel-hud-top">
    <div className="intel-hud-counter">
      <Globe size={12} className="intel-icon" />
      <span>ACTIVE NODES: <strong style={{ color: 'var(--text-primary)'}}>{activeCount}</strong></span>
    </div>
    <div className="intel-hud-counter breaking">
      <AlertTriangle size={12} className="intel-icon" />
      <span>BREAKING: <strong>{breakingCount}</strong></span>
    </div>
    <div className="intel-hud-counter">
      <TrendingUp size={12} className="intel-icon" />
      <span>MACRO RISK: <strong style={{ color: 'var(--status-down)'}}>ELEVATED</strong></span>
    </div>
    <div className="intel-hud-counter">
      <Radar size={12} className="intel-icon" />
      <span>SYSTEM: <strong>ONLINE</strong></span>
    </div>
  </div>
);



const RightHUD = ({ event, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    setIsScanning(false);
    setScanResult(null);
  }, [event]);

  if (!event) return null;

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult("SCAN COMPLETE: NO COVERT ANOMALIES DETECTED. SIGNAL CONFIRMED.");
    }, 1500);
  };

  return (
    <div className="intel-hud-right active">
      <div className="intel-hud-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={14} /> MACRO IMPACT ANALYSIS
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
      </div>
      <div className="intel-card-content">
        <div className="intel-card-title">{event.name}</div>
        <div className="intel-card-source">SOURCE: {event.source} • {event.timestamp}</div>
        
        <div className="intel-card-section" style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1c' }}>
          <div className="intel-section-title">INTELLIGENCE SUMMARY</div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            {event.summary}
          </div>
          {event.description && (
             <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--text-primary)', lineHeight: '1.5', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
                <div style={{ fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>CATEGORY:</div>
                {event.description}
             </div>
          )}
        </div>

        <div className="intel-card-section">
          <div className="intel-section-title">SEVERITY LEVEL</div>
          <div className={`intel-severity-bar ${event.severity.toLowerCase()}`}>
            <div className="intel-severity-fill" style={{ width: event.severity === 'BREAKING' ? '100%' : event.severity === 'HIGH' ? '75%' : event.severity === 'MEDIUM' ? '50%' : '25%' }}></div>
          </div>
        </div>

        <div className="intel-card-grid">
          <div className="intel-grid-item">
            <div className="intel-grid-label">SENTIMENT</div>
            <div className={`intel-grid-val ${event.sentiment.toLowerCase()}`}>{event.sentiment}</div>
          </div>
          <div className="intel-grid-item">
            <div className="intel-grid-label">RISK SCORE</div>
            <div className="intel-grid-val">{event.riskScore}/100</div>
          </div>
        </div>

        <div className="intel-card-section">
          <div className="intel-section-title">AFFECTED SECTORS</div>
          <div className="intel-sectors">
            {event.sectors.map(s => <span key={s} className="intel-sector-badge">{s}</span>)}
          </div>
        </div>

        {scanResult ? (
          <div style={{ marginTop: 'auto', fontSize: '8px', color: 'var(--status-up)', border: '1px solid var(--status-up)', padding: '6px', backgroundColor: 'rgba(0, 255, 0, 0.05)', textAlign: 'center', letterSpacing: '0.5px' }}>
            {scanResult}
          </div>
        ) : (
          <button className="intel-action-btn" onClick={handleScan} disabled={isScanning} style={{ opacity: isScanning ? 0.7 : 1 }}>
            <Zap size={10} /> {isScanning ? "SCANNING SECTORS..." : "INITIATE DEEP SCAN"}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Main Container ---
const GlobalNewsMap = () => {
  const [rawNewsData, setRawNewsData] = useState([]);
  const [enrichedData, setEnrichedData] = useState([]);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTimespan, setActiveTimespan] = useState('LIVE');

  useEffect(() => {
    let intervalId;
    const loadData = async () => {
      const data = await fetchGDELTGeoData();
      if (data && data.features) {
        setRawNewsData(data.features);
        setEnrichedData(ENRICH_DATA(data.features));
      }
    };
    
    loadData();
    intervalId = setInterval(loadData, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const breakingCount = enrichedData.filter(d => d.severity === 'BREAKING').length;

  return (
    <Panel title="GLOBAL MACRO COMMAND CENTER" className="map-panel">
      <div className="intel-command-center">
        <MapCanvas 
          data={enrichedData} 
          hoveredEvent={hoveredEvent || selectedEvent}
          onHoverEvent={(e) => { if (!selectedEvent) setHoveredEvent(e); }}
          onClickEvent={(e) => setSelectedEvent(selectedEvent === e ? null : e)}
        />
        
        {/* UI Overlays */}
        <div className="intel-overlay-container">
          <LeftHUD data={enrichedData} />
          <TopHUD activeCount={enrichedData.length} breakingCount={breakingCount} />
          
          <div className="intel-middle-container" style={{ justifyContent: 'flex-end', paddingRight: '20px' }}>
            {selectedEvent && <RightHUD event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
          </div>
          
          {/* Bottom Timeline HUD */}
          <div className="intel-hud-bottom" style={{ pointerEvents: 'auto' }}>
            <div className="intel-timeline-bar">
              <div className="intel-timeline-progress" style={{ 
                width: activeTimespan === '24H' ? '25%' : activeTimespan === '12H' ? '50%' : activeTimespan === '6H' ? '75%' : '100%',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <div className="intel-timeline-labels">
              <span style={{ cursor: 'pointer', color: activeTimespan === '24H' ? 'var(--accent-amber)' : 'inherit' }} onClick={() => setActiveTimespan('24H')}>-24H</span>
              <span style={{ cursor: 'pointer', color: activeTimespan === '12H' ? 'var(--accent-amber)' : 'inherit' }} onClick={() => setActiveTimespan('12H')}>-12H</span>
              <span style={{ cursor: 'pointer', color: activeTimespan === '6H' ? 'var(--accent-amber)' : 'inherit' }} onClick={() => setActiveTimespan('6H')}>-6H</span>
              <span style={{ cursor: 'pointer', color: activeTimespan === 'LIVE' ? 'var(--accent-amber)' : 'inherit' }} onClick={() => setActiveTimespan('LIVE')}>LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default GlobalNewsMap;
