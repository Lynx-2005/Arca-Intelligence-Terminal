import React, { useState, useEffect, useRef } from 'react';
import './Magnifier.css';

const Magnifier = () => {
  const [active, setActive] = useState(false);
  const [zoom, setZoom] = useState(2.0);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [clientCoords, setClientCoords] = useState({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);
  const [telemetryLabel, setTelemetryLabel] = useState('NO TARGET');
  const [originalTarget, setOriginalTarget] = useState(null);
  const [targetNode, setTargetNode] = useState(null);

  const mirrorRef = useRef(null);
  const lensRef = useRef(null);

  // Helper to parse telemetry labels based on active element
  const getTelemetryLabel = (element) => {
    if (!element) return 'SYSTEM: BACKGROUND';
    
    let current = element;
    while (current && current !== document.body) {
      if (current.classList && current.classList.contains('recharts-responsive-container')) {
        return 'ANALYTICS: RECHARTS PLOT';
      }
      if (current.tagName === 'svg' || current.tagName === 'SVG') {
        return 'DATA GRAPHICS: VECTOR PLOT';
      }
      if ((current.classList && current.classList.contains('data-table')) || current.tagName === 'TABLE') {
        return 'INTEL GRID: STAT MATRIX';
      }
      if (current.classList && current.classList.contains('ladder-table')) {
        return 'MICROSTRUCTURE: ORDER DEPTH LADDER';
      }
      if (current.classList && current.classList.contains('panel')) {
        const titleEl = current.querySelector('.panel-title') || current.querySelector('.panel-header');
        const title = titleEl ? titleEl.textContent.trim() : 'DASHBOARD';
        return `PANEL FEED: ${title.toUpperCase()}`;
      }
      current = current.parentElement;
    }
    
    const tag = element.tagName.toLowerCase();
    const cls = element.className && typeof element.className === 'string' 
      ? `.${element.className.split(' ')[0]}` 
      : '';
    return `OBJECT NODE: ${tag.toUpperCase()}${cls.toUpperCase()}`;
  };

  // Deep clone with form inputs and scroll offsets copied recursively
  const clonePanelWithState = (original) => {
    const clone = original.cloneNode(true);
    
    // Copy scroll values recursively with structural mismatch safety
    const copyScroll = (src, dest) => {
      if (!src || !dest) return;
      if (src.scrollTop > 0) dest.scrollTop = src.scrollTop;
      if (src.scrollLeft > 0) dest.scrollLeft = src.scrollLeft;
      
      if (src.tagName === 'INPUT' || src.tagName === 'SELECT' || src.tagName === 'TEXTAREA') {
        dest.value = src.value;
      }

      const srcChildren = src.children;
      const destChildren = dest.children;
      
      if (srcChildren && destChildren) {
        const len = Math.min(srcChildren.length, destChildren.length);
        for (let i = 0; i < len; i++) {
          copyScroll(srcChildren[i], destChildren[i]);
        }
      }
    };
    
    copyScroll(original, clone);
    return clone;
  };

  useEffect(() => {
    const handleContextMenu = (e) => {
      // Prevent default right click menu
      e.preventDefault();

      // If active, right-clicking again will close it
      if (active) {
        setActive(false);
        setIsPinned(false);
        setTargetNode(null);
        setOriginalTarget(null);
        return;
      }

      // Grab the closest panel, terminal layout section or fallback to body
      const target = e.target.closest('.panel') || 
                     e.target.closest('.terminal-workspace') || 
                     e.target.closest('.terminal-analytics') || 
                     document.body;

      // Position calculations
      const rect = target.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      setOriginalTarget(target);
      setClientCoords({ x: e.clientX, y: e.clientY });
      setCoords({ x: relativeX, y: relativeY });

      // Generate snapshot clone
      const clone = clonePanelWithState(target);
      setTargetNode(clone);

      // Determine initial telemetry
      const hoveredEl = document.elementFromPoint(e.clientX, e.clientY);
      setTelemetryLabel(getTelemetryLabel(hoveredEl));
      
      setActive(true);
      setIsPinned(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [active]);

  // Handle cursor tracking inside the panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!active || isPinned || !originalTarget) return;

      // Track screen cursor coordinates
      setClientCoords({ x: e.clientX, y: e.clientY });

      // Detect current hovered target panel
      const hovered = document.elementFromPoint(e.clientX, e.clientY);
      if (!hovered) return;

      const currentTarget = hovered.closest('.panel') || 
                            hovered.closest('.terminal-layout') || 
                            document.body;

      let activeTarget = originalTarget;

      if (currentTarget && currentTarget !== originalTarget) {
        activeTarget = currentTarget;
        setOriginalTarget(currentTarget);
        
        // Clone the new panel on boundary cross
        const clone = clonePanelWithState(currentTarget);
        setTargetNode(clone);
      }

      // Track relative pan coordinates in active panel bounds
      const rect = activeTarget.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      setCoords({ x: relativeX, y: relativeY });

      // Find hover telemetry
      setTelemetryLabel(getTelemetryLabel(hovered));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [active, isPinned, originalTarget]);

  // Handle mousewheel zoom adjustments inside the lens
  useEffect(() => {
    const handleWheel = (e) => {
      if (!active) return;
      
      // Stop background layout scrolling
      e.preventDefault();

      setZoom((prev) => {
        const step = 0.2;
        // Scroll Up: Increase zoom, Scroll Down: Decrease zoom
        const nextZoom = e.deltaY < 0 ? prev + step : prev - step;
        return Math.max(1.2, Math.min(4.0, Number(nextZoom.toFixed(1))));
      });
    };

    if (active) {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => window.removeEventListener('wheel', handleWheel);
  }, [active]);

  // Handle pinning, unpinning and key dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!active) return;

      if (e.key === 'Escape') {
        setActive(false);
        setIsPinned(false);
        setTargetNode(null);
        setOriginalTarget(null);
      } else if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
        e.preventDefault();
        setIsPinned((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  // Left click anywhere on screen also dismisses the magnifier
  useEffect(() => {
    const handleWindowClick = (e) => {
      if (!active) return;
      
      // Prevent click from closing on first mount tick
      setActive(false);
      setIsPinned(false);
      setTargetNode(null);
      setOriginalTarget(null);
    };

    if (active) {
      // Delay click listener to prevent immediate trigger on right-click release
      const timeout = setTimeout(() => {
        window.addEventListener('click', handleWindowClick);
      }, 50);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('click', handleWindowClick);
      };
    }
  }, [active]);

  // Append clone node inside container ref on update
  useEffect(() => {
    if (active && targetNode && mirrorRef.current && originalTarget) {
      mirrorRef.current.innerHTML = '';
      mirrorRef.current.appendChild(targetNode);

      // Re-apply correct scrolled offsets to cloned container with structural mismatch safety
      const syncScrolls = (src, dest) => {
        if (!src || !dest) return;
        if (src.scrollTop > 0) dest.scrollTop = src.scrollTop;
        if (src.scrollLeft > 0) dest.scrollLeft = src.scrollLeft;

        const srcChildren = src.children;
        const destChildren = dest.children;
        
        if (srcChildren && destChildren) {
          const len = Math.min(srcChildren.length, destChildren.length);
          for (let i = 0; i < len; i++) {
            syncScrolls(srcChildren[i], destChildren[i]);
          }
        }
      };

      syncScrolls(originalTarget, targetNode);
    }
  }, [active, targetNode, originalTarget]);

  if (!active || !originalTarget) return null;

  const originalRect = originalTarget.getBoundingClientRect();

  // Positioning formula for mirror translation
  // Centers relative target coordinates (coords.x, coords.y) inside the 250px lens (125px center offset)
  const tx = 125 - coords.x * zoom;
  const ty = 125 - coords.y * zoom;

  const mirrorStyle = {
    position: 'absolute',
    width: `${originalRect.width}px`,
    height: `${originalRect.height}px`,
    transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
    transformOrigin: '0 0',
    pointerEvents: 'none'
  };

  const lensStyle = {
    left: `${clientCoords.x - 125}px`,
    top: `${clientCoords.y - 125}px`,
  };

  return (
    <div className="magnifier-hud-wrapper">
      <div 
        ref={lensRef}
        className="magnifier-lens" 
        style={lensStyle}
      >
        {/* Render cloned viewport mirror */}
        <div ref={mirrorRef} className="magnifier-mirror" style={mirrorStyle} />
        
        {/* High-tech overlays */}
        <div className="magnifier-scanlines" />
        <div className="magnifier-crosshair" />
        <div className="magnifier-center-dot" />
        <div className="magnifier-glass-glare" />
        <div className="magnifier-rotating-ring" />

        {/* Telemetry Labels */}
        <div className="magnifier-telemetry-badge magnifier-badge-top">
          Z-VAL: {zoom.toFixed(1)}x // {isPinned ? 'LOCK: PINNED' : 'LOCK: TRK'}
        </div>
        
        <div className="magnifier-telemetry-badge magnifier-badge-bottom">
          {telemetryLabel}
        </div>

        <div className={`magnifier-telemetry-badge magnifier-badge-coords ${isPinned ? 'magnifier-badge-coords-pinned' : ''}`}>
          INS_COORD [X:{Math.round(coords.x)} Y:{Math.round(coords.y)}]
        </div>
      </div>
    </div>
  );
};

export default Magnifier;
