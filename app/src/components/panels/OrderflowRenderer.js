/**
 * OrderflowRenderer — Footprint + DOM unified rendering engine.
 *
 * Layout:  [ Footprint Chart | DOM Ladder ]
 *          [ Delta Histogram             ]
 *          [ Time Axis                   ]
 *
 * - Each candle shows Bid×Ask at each price level (sellers × buyers)
 * - Dominant side is highlighted (brighter color)
 * - DOM ladder on right shows live L2 depth
 * - Delta histogram at bottom shows per-candle cumulative delta
 */
export class OrderflowRenderer {
  constructor(canvas, dataRef, domRef, optionsLevels = []) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dataRef = dataRef;
    this.domRef = domRef;
    this.optionsLevels = optionsLevels;

    this.width = 0;
    this.height = 0;

    // Layout
    this.DOM_W = 160;           // width of DOM ladder panel
    this.PRICE_AXIS_W = 68;     // price axis between chart and DOM
    this.TIME_AXIS_H = 24;
    this.DELTA_H = 50;          // delta histogram height

    // Camera
    this.candleWidth = 14;
    this.scrollX = 0;
    this.priceTop = 0;
    this.priceBottom = 0;
    this.autoFit = true;

    // Drag state
    this.dragMode = null;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartScrollX = 0;
    this.dragStartCandleWidth = 0;
    this.dragStartPriceTop = 0;
    this.dragStartPriceBottom = 0;

    this.mouseX = -1;
    this.mouseY = -1;

    this.isRunning = false;
    this._rafId = null;

    // Bound handlers
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onMouseLeave = this._handleMouseLeave.bind(this);
    this._onDblClick = this._handleDblClick.bind(this);

    // Colors — matching reference image palette
    this.C = {
      bg: '#0a0e14',
      chartBg: '#0c1018',
      grid: 'rgba(255,255,255,0.03)',
      gridText: '#3a3f48',
      // Footprint colors
      buyCell: 'rgba(0, 188, 212, ',       // teal/cyan for buy-dominant
      sellCell: 'rgba(239, 83, 80, ',       // red for sell-dominant
      buyText: '#4dd0e1',                    // bright teal text
      sellText: '#ef9a9a',                   // soft red text
      buyTextBright: '#00e5ff',              // dominant buyer highlight
      sellTextBright: '#ff5252',             // dominant seller highlight
      // Candle
      up: '#26a69a',
      down: '#ef5350',
      // DOM
      domBg: '#0a0e14',
      domBidBar: 'rgba(0, 188, 212, 0.2)',
      domAskBar: 'rgba(239, 83, 80, 0.2)',
      domBidText: '#4dd0e1',
      domAskText: '#ef9a9a',
      domPriceText: '#888',
      domSizeText: '#aaa',
      // Current price
      priceLine: '#ffab00',
      priceTag: '#ffab00',
      // Delta
      deltaUp: '#26a69a',
      deltaDown: '#ef5350',
      deltaBg: '#080c10',
      // Axis
      axisBg: 'rgba(10, 14, 20, 0.95)',
      axisBorder: 'rgba(255,255,255,0.06)',
      crosshair: 'rgba(255,255,255,0.1)',
    };

    this._attachEvents();
    this._setupResize();
  }

  // ═══════════════════ EVENTS ═══════════════════

  _attachEvents() {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
    this.canvas.addEventListener('dblclick', this._onDblClick);
    window.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
  }

  _detachEvents() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
    this.canvas.removeEventListener('dblclick', this._onDblClick);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
  }

  _setupResize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const apply = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    this._resizeObserver = new ResizeObserver(apply);
    this._resizeObserver.observe(parent);
    apply();
  }

  // Layout zones
  _chartW() { return this.width - this.PRICE_AXIS_W - this.DOM_W; }
  _chartH() { return this.height - this.TIME_AXIS_H - this.DELTA_H; }
  _priceAxisX() { return this._chartW(); }
  _domX() { return this._chartW() + this.PRICE_AXIS_W; }

  _hitZone(x, y) {
    const cw = this._chartW();
    const ch = this._chartH();
    const pax = this._priceAxisX();
    const domX = this._domX();
    if (y < ch) {
      if (x < cw) return 'chart';
      if (x < domX) return 'priceAxis';
      return 'dom';
    }
    if (y < ch + this.DELTA_H) return 'delta';
    return 'timeAxis';
  }

  _handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zone = this._hitZone(mx, my);

    this.isDragging = true;
    this.dragMode = zone;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartScrollX = this.scrollX;
    this.dragStartCandleWidth = this.candleWidth;
    this.dragStartPriceTop = this.priceTop;
    this.dragStartPriceBottom = this.priceBottom;

    if (zone === 'chart' || zone === 'delta') {
      this.autoFit = false;
      this.canvas.style.cursor = 'grabbing';
    } else if (zone === 'priceAxis') {
      this.autoFit = false;
      this.canvas.style.cursor = 'ns-resize';
    } else if (zone === 'timeAxis') {
      this.canvas.style.cursor = 'ew-resize';
    }
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (!this.isDragging) {
      const zone = this._hitZone(this.mouseX, this.mouseY);
      this.canvas.style.cursor =
        zone === 'priceAxis' ? 'ns-resize' :
        zone === 'timeAxis' ? 'ew-resize' :
        zone === 'dom' ? 'default' : 'crosshair';
      return;
    }

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (this.dragMode === 'chart' || this.dragMode === 'delta') {
      this.scrollX = this.dragStartScrollX + dx;
      const priceRange = this.dragStartPriceTop - this.dragStartPriceBottom;
      const chartH = this._chartH();
      const priceShift = (dy / chartH) * priceRange;
      this.priceTop = this.dragStartPriceTop + priceShift;
      this.priceBottom = this.dragStartPriceBottom + priceShift;

    } else if (this.dragMode === 'priceAxis') {
      const sensitivity = 0.005;
      const zoomFactor = Math.exp(-dy * sensitivity);
      const priceRange = this.dragStartPriceTop - this.dragStartPriceBottom;
      const center = (this.dragStartPriceTop + this.dragStartPriceBottom) / 2;
      const newRange = priceRange * zoomFactor;
      this.priceTop = center + newRange / 2;
      this.priceBottom = center - newRange / 2;

    } else if (this.dragMode === 'timeAxis') {
      const sensitivity = 0.005;
      const zoomFactor = Math.exp(dx * sensitivity);
      this.candleWidth = Math.max(3, Math.min(400, this.dragStartCandleWidth * zoomFactor));
      const scaleDelta = this.candleWidth / this.dragStartCandleWidth;
      this.scrollX = this.dragStartScrollX * scaleDelta;
    }
  }

  _handleMouseUp() {
    this.isDragging = false;
    this.dragMode = null;
  }

  _handleMouseLeave() {
    this.mouseX = -1;
    this.mouseY = -1;
    if (!this.isDragging) this.canvas.style.cursor = 'crosshair';
  }

  _handleDblClick() {
    this.autoFit = true;
    this.priceTop = 0;
    this.priceBottom = 0;
    this.scrollX = 0;
    this.candleWidth = 14;
  }

  _handleWheel(e) {
    e.preventDefault();
    const zone = this._hitZone(this.mouseX, this.mouseY);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;

    if (zone === 'priceAxis') {
      this.autoFit = false;
      const range = this.priceTop - this.priceBottom;
      const center = (this.priceTop + this.priceBottom) / 2;
      const nr = range / factor;
      this.priceTop = center + nr / 2;
      this.priceBottom = center - nr / 2;
    } else if (zone === 'timeAxis') {
      const oldW = this.candleWidth;
      this.candleWidth = Math.max(3, Math.min(400, this.candleWidth * factor));
      const s = this.candleWidth / oldW;
      this.scrollX = this.scrollX * s;
    } else if (zone === 'chart' || zone === 'delta') {
      const oldW = this.candleWidth;
      this.candleWidth = Math.max(3, Math.min(400, this.candleWidth * factor));
      const chartW = this._chartW();
      const mr = this.mouseX >= 0 ? this.mouseX / chartW : 1;
      const s = this.candleWidth / oldW;
      this.scrollX = this.scrollX * s + chartW * mr * (1 - s);
    }
  }

  // ═══════════════════ LIFECYCLE ═══════════════════

  setOptionsLevels(levels) {
    this.optionsLevels = levels || [];
  }

  start() { this.isRunning = true; this._loop(); }
  stop() {
    this.isRunning = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
  unbindEvents() {
    this._detachEvents();
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }
  _loop() {
    if (!this.isRunning) return;
    this._render();
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  // ═══════════════════ HELPERS ═══════════════════

  _priceToY(price) {
    const ch = this._chartH();
    const range = this.priceTop - this.priceBottom || 1;
    return ch * (1 - (price - this.priceBottom) / range);
  }

  _yToPrice(y) {
    const ch = this._chartH();
    const range = this.priceTop - this.priceBottom || 1;
    return this.priceBottom + (1 - y / ch) * range;
  }

  _fv(v) { // format volume
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (a >= 1000) return (v / 1000).toFixed(1) + 'k';
    // Preserve enough decimals so additions of tiny sizes are visible in cumulative totals
    return Number(v.toFixed(4)).toString();
  }

  _fp(p) { // format price
    // Keep enough decimals so raw limit orders don't look repeated
    if (p >= 10000) return Number(p.toFixed(2)).toString();
    if (p >= 100) return Number(p.toFixed(3)).toString();
    if (p >= 1) return Number(p.toFixed(4)).toString();
    return Number(p.toFixed(6)).toString();
  }

  _niceStep(range, targetCount) {
    const rough = range / (targetCount || 5);
    if (rough <= 0) return 1;
    const exp = Math.floor(Math.log10(rough));
    const frac = rough / Math.pow(10, exp);
    let nice;
    if (frac <= 1.5) nice = 1;
    else if (frac <= 3.5) nice = 2;
    else if (frac <= 7.5) nice = 5;
    else nice = 10;
    return nice * Math.pow(10, exp);
  }

  _candleX(i, total) {
    return this._chartW() - (total - i) * this.candleWidth + this.scrollX;
  }

  _xToCandleIdx(x, total) {
    return Math.floor(total - (this._chartW() - x + this.scrollX) / this.candleWidth);
  }

  // ═══════════════════ RENDER ═══════════════════

  _render() {
    const ctx = this.ctx;
    const data = this.dataRef.current;
    const dom = this.domRef?.current;
    const W = this.width;
    const H = this.height;
    if (W === 0 || H === 0) return;

    const chartW = this._chartW();
    const chartH = this._chartH();
    const cw = this.candleWidth;
    const gap = Math.max(1, Math.floor(cw * 0.08));

    // ── Background ──
    ctx.fillStyle = this.C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = this.C.chartBg;
    ctx.fillRect(0, 0, chartW, chartH);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#555';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AWAITING LIVE TRADE STREAM...', chartW / 2, chartH / 2 - 8);
      ctx.fillStyle = '#333';
      ctx.font = '9px monospace';
      ctx.fillText('Candles construct from real-time orderflow', chartW / 2, chartH / 2 + 10);
      this._drawDOM(ctx, dom, chartH);
      this._drawAxesEmpty(ctx, W, H, chartW, chartH);
      return;
    }

    // ── Visible range ──
    const rightEdge = chartW + this.scrollX;
    const startIdx = Math.max(0, Math.floor(data.length - rightEdge / cw) - 1);
    const endIdx = Math.min(data.length - 1, Math.ceil(data.length - (rightEdge - chartW) / cw) + 1);

    // ── Auto-fit ──
    if (this.autoFit) {
      let lo = Infinity, hi = -Infinity;
      for (let i = startIdx; i <= endIdx; i++) {
        if (data[i].low < lo) lo = data[i].low;
        if (data[i].high > hi) hi = data[i].high;
      }
      if (lo === Infinity) { lo = 0; hi = 1; }
      const range = hi - lo || 1;
      const pad = range * 0.12;
      const tT = hi + pad, tB = lo - pad;
      if (this.priceTop === 0 && this.priceBottom === 0) {
        this.priceTop = tT; this.priceBottom = tB;
      } else {
        this.priceTop += (tT - this.priceTop) * 0.12;
        this.priceBottom += (tB - this.priceBottom) * 0.12;
      }
    }

    // ── Zoom thresholds ──
    const showFootprint = cw >= 40;
    const showText = cw >= 90;
    const showDeltaPerLevel = cw >= 160;

    // ── Price grid ──
    const priceRange = this.priceTop - this.priceBottom || 1;
    const gridStep = this._niceStep(priceRange, chartH / 55);
    const gridStart = Math.floor(this.priceBottom / gridStep) * gridStep;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    ctx.strokeStyle = this.C.grid;
    ctx.lineWidth = 1;
    for (let p = gridStart; p <= this.priceTop; p += gridStep) {
      const y = Math.round(this._priceToY(p)) + 0.5;
      if (y < 0 || y > chartH) continue;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }

    // ── Draw candles ──
    let hoveredCandle = null;
    for (let i = startIdx; i <= endIdx; i++) {
      const candle = data[i];
      const x = this._candleX(i, data.length);
      if (x + cw < 0 || x > chartW) continue;

      if (!this.isDragging && this.mouseX >= x && this.mouseX <= x + cw && this.mouseY >= 0 && this.mouseY <= chartH) {
        hoveredCandle = candle;
      }

      const isUp = candle.close >= candle.open;
      const color = isUp ? this.C.up : this.C.down;

      const oY = this._priceToY(candle.open);
      const cY = this._priceToY(candle.close);
      const hY = this._priceToY(candle.high);
      const lY = this._priceToY(candle.low);
      const bodyTop = Math.min(oY, cY);
      const bodyH = Math.max(Math.abs(cY - oY), 1);
      const bx = x + gap;
      const bw = cw - gap * 2;

      if (!showFootprint) {
        // ═══ MACRO VIEW: hollow candles ═══
        const wickX = Math.round(x + cw / 2) + 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(wickX, hY); ctx.lineTo(wickX, lY); ctx.stroke();

        ctx.fillStyle = this.C.chartBg;
        ctx.fillRect(bx, bodyTop, bw, bodyH);
        ctx.strokeStyle = color;
        ctx.strokeRect(bx, bodyTop, bw, bodyH);
        if (!isUp) {
          ctx.fillStyle = isUp ? this.C.buyCell + '0.12)' : this.C.sellCell + '0.12)';
          ctx.fillRect(bx, bodyTop, bw, bodyH);
        }
      } else {
        // ═══ FOOTPRINT VIEW ═══
        const fp = candle.footprint;
        const tickSz = candle.tickSize || 1;
        const maxLvl = candle.maxLevelVol || 1;

        // Candle range outline
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, hY, cw - 2, lY - hY);

        // Open/Close edge markers
        ctx.fillStyle = color;
        ctx.fillRect(x, oY - 0.5, 2, 1);
        ctx.fillRect(x + cw - 2, cY - 0.5, 2, 1);

        let topY = hY;
        let bottomY = lY;

        const keys = Object.keys(fp);
        for (let k = 0; k < keys.length; k++) {
          const price = parseFloat(keys[k]);
          const cell = fp[keys[k]];
          const ly1 = this._priceToY(price + tickSz);
          const ly2 = this._priceToY(price);
          const lh = Math.max(ly2 - ly1, 1);
          
          if (ly1 < topY) topY = ly1;
          if (ly2 > bottomY) bottomY = ly2;

          if (ly1 > chartH || ly2 < 0) continue;

          const intensity = Math.min(1, cell.total / maxLvl);
          const buyDominant = cell.ask > cell.bid;

          // Heatmap cell
          if (buyDominant) {
            ctx.fillStyle = this.C.buyCell + (intensity * 0.5 + 0.04).toFixed(2) + ')';
          } else {
            ctx.fillStyle = this.C.sellCell + (intensity * 0.5 + 0.04).toFixed(2) + ')';
          }
          ctx.fillRect(x + 1, ly1, cw - 2, lh);

          // Separator line between levels
          ctx.strokeStyle = 'rgba(255,255,255,0.02)';
          ctx.beginPath(); ctx.moveTo(x + 1, ly2 + 0.5); ctx.lineTo(x + cw - 1, ly2 + 0.5); ctx.stroke();

          // ── Bid × Ask text ──
          if (showText && lh > 9) {
            const fs = Math.min(10, Math.max(7, lh - 2));
            ctx.font = `${fs}px monospace`;
            const textY = ly1 + lh / 2 + fs * 0.35;
            const halfW = (cw - 4) / 2;
            const maxTextW = Math.max(1, halfW - 4);

            // Sellers (bid side) - left
            ctx.fillStyle = cell.bid >= cell.ask ? this.C.sellTextBright : this.C.sellText;
            ctx.textAlign = 'right';
            ctx.fillText(this._fv(cell.bid), x + halfW, textY, maxTextW);

            // Buyers (ask side) - right
            ctx.fillStyle = cell.ask >= cell.bid ? this.C.buyTextBright : this.C.buyText;
            ctx.textAlign = 'left';
            ctx.fillText(this._fv(cell.ask), x + halfW + 6, textY, maxTextW);

            // Center separator
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText('×', x + cw / 2, textY);
          }

          // Imbalance highlight
          if (cell.bid > 0 && cell.ask > 0) {
            const ratio = Math.max(cell.ask / cell.bid, cell.bid / cell.ask);
            if (ratio > 3 && intensity > 0.25) {
              ctx.strokeStyle = buyDominant
                ? 'rgba(0, 229, 255, 0.4)'
                : 'rgba(255, 82, 82, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x + 1, ly1, cw - 2, lh);
              ctx.lineWidth = 1;
            }
          }
        }

        // Cumulative delta above candle
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = candle.delta >= 0 ? this.C.buyTextBright : this.C.sellTextBright;
        const dl = 'Δ' + (candle.delta >= 0 ? '+' : '') + this._fv(candle.delta);
        ctx.fillText(dl, x + cw / 2, topY - 4, Math.max(1, cw - 2));

        // Volume below candle
        ctx.font = '7px monospace';
        ctx.fillStyle = '#444';
        ctx.fillText('V:' + this._fv(candle.volume), x + cw / 2, bottomY + 10, Math.max(1, cw - 2));
      }
    }

    // ── DRAW OPTIONS LEVELS (Support / Resistance) ──
    if (this.optionsLevels && this.optionsLevels.length > 0) {
      this.optionsLevels.forEach(level => {
        const y = this._priceToY(level.strike);
        const isRes = level.type === 'resistance';
        const isPain = level.type === 'maxpain';
        const sourceStr = level.source || 'Deribit';
        
        let label = '';
        if (isPain) {
           label = `${level.expirationLabel} Max Pain (${sourceStr})`;
        } else {
           label = `${level.expirationLabel} ${isRes ? 'Res' : 'Supp'} (${sourceStr}) - ${level.oi.toLocaleString()} Sellers`;
        }
        
        ctx.font = '10px sans-serif';
        const textW = ctx.measureText(label).width;

        let lineColor, textColor;
        if (isPain) {
           lineColor = 'rgba(255, 167, 38, 0.9)'; // Orange
           textColor = '#ffb74d';
        } else if (isRes) {
           lineColor = 'rgba(239, 83, 80, 0.7)'; // Red
           textColor = '#ef9a9a';
        } else {
           lineColor = 'rgba(0, 188, 212, 0.7)'; // Teal
           textColor = '#4dd0e1';
        }

        // Draw if within vertical view
        if (y > -20 && y < chartH + 20) {
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = isPain ? 2.0 : 1.5;
          if (!isPain) ctx.setLineDash([4, 4]); // Dashed for res/supp, solid for max pain
          
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartW, y);
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash

          // Background for text
          ctx.fillStyle = 'rgba(10, 14, 20, 0.8)';
          ctx.fillRect(10, y - 14, textW + 8, 14);
          
          ctx.fillStyle = textColor;
          ctx.textAlign = 'left';
          ctx.fillText(label, 14, y - 3);
        } else {
          // OFF-SCREEN INDICATOR
          const isAbove = y <= -20;
          const edgeY = isAbove ? 14 : chartH - 4;
          const arrow = isAbove ? '↑' : '↓';
          
          ctx.fillStyle = 'rgba(10, 14, 20, 0.8)';
          ctx.fillRect(10, edgeY - 10, textW + 20, 14);
          
          ctx.fillStyle = textColor;
          ctx.textAlign = 'left';
          ctx.fillText(`${arrow} ${label}`, 14, edgeY);
        }
      });
    }

    ctx.restore(); // pop chart clip

    // ═══════════════════ DELTA HISTOGRAM ═══════════════════

    const deltaTop = chartH;
    ctx.fillStyle = this.C.deltaBg;
    ctx.fillRect(0, deltaTop, chartW, this.DELTA_H);
    ctx.strokeStyle = this.C.axisBorder;
    ctx.beginPath(); ctx.moveTo(0, deltaTop + 0.5); ctx.lineTo(chartW, deltaTop + 0.5); ctx.stroke();

    // Find max delta for scaling
    let maxDelta = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      const ad = Math.abs(data[i].delta);
      if (ad > maxDelta) maxDelta = ad;
    }
    if (maxDelta === 0) maxDelta = 1;

    const zeroY = deltaTop + this.DELTA_H / 2;
    // Zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(0, zeroY + 0.5); ctx.lineTo(chartW, zeroY + 0.5); ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, deltaTop, chartW, this.DELTA_H);
    ctx.clip();

    for (let i = startIdx; i <= endIdx; i++) {
      const candle = data[i];
      const x = this._candleX(i, data.length);
      if (x + cw < 0 || x > chartW) continue;

      const barH = (Math.abs(candle.delta) / maxDelta) * (this.DELTA_H / 2 - 2);
      const isPos = candle.delta >= 0;
      ctx.fillStyle = isPos ? this.C.deltaUp : this.C.deltaDown;

      if (isPos) {
        ctx.fillRect(x + gap, zeroY - barH, cw - gap * 2, barH);
      } else {
        ctx.fillRect(x + gap, zeroY, cw - gap * 2, barH);
      }
    }
    ctx.restore();

    // Delta label
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText('DELTA', 4, deltaTop + 10);

    // ═══════════════════ PRICE AXIS ═══════════════════

    const pax = this._priceAxisX();
    ctx.fillStyle = this.C.axisBg;
    ctx.fillRect(pax, 0, this.PRICE_AXIS_W, chartH + this.DELTA_H);
    ctx.strokeStyle = this.C.axisBorder;
    ctx.beginPath(); ctx.moveTo(pax + 0.5, 0); ctx.lineTo(pax + 0.5, chartH + this.DELTA_H); ctx.stroke();

    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = this.C.gridText;
    for (let p = gridStart; p <= this.priceTop; p += gridStep) {
      const y = this._priceToY(p);
      if (y < 5 || y > chartH - 5) continue;
      ctx.strokeStyle = this.C.axisBorder;
      ctx.beginPath(); ctx.moveTo(pax, y); ctx.lineTo(pax + 4, y); ctx.stroke();
      ctx.fillStyle = this.C.gridText;
      ctx.fillText(this._fp(p), pax + this.PRICE_AXIS_W - 4, y + 3);
    }

    // Current price
    const lastCandle = data[data.length - 1];
    if (lastCandle) {
      const curY = this._priceToY(lastCandle.close);
      if (curY > 0 && curY < chartH) {
        const curUp = lastCandle.close >= lastCandle.open;
        const cc = curUp ? this.C.up : this.C.down;

        // Dashed line
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();
        ctx.strokeStyle = cc;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, curY); ctx.lineTo(chartW, curY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Price badge
        ctx.fillStyle = cc;
        ctx.fillRect(pax, curY - 8, this.PRICE_AXIS_W, 16);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(this._fp(lastCandle.close), pax + this.PRICE_AXIS_W - 4, curY + 3);
      }
    }

    // ═══════════════════ DOM LADDER ═══════════════════
    this._drawDOM(ctx, dom, chartH);

    // ═══════════════════ TIME AXIS ═══════════════════

    const timeY = chartH + this.DELTA_H;
    const domX = this._domX();
    ctx.fillStyle = this.C.axisBg;
    ctx.fillRect(0, timeY, domX, this.TIME_AXIS_H);
    ctx.strokeStyle = this.C.axisBorder;
    ctx.beginPath(); ctx.moveTo(0, timeY + 0.5); ctx.lineTo(domX, timeY + 0.5); ctx.stroke();

    ctx.font = '8px monospace';
    ctx.fillStyle = this.C.gridText;
    ctx.textAlign = 'center';

    const timeGridInterval = cw > 100 ? 1 : cw > 50 ? 2 : cw > 20 ? 5 : cw > 10 ? 10 : cw > 5 ? 30 : 60;
    let lastDay = '';
    for (let i = startIdx; i <= endIdx; i++) {
      if (!data[i]) continue;
      const d = new Date(data[i].time);
      if (d.getMinutes() % timeGridInterval !== 0) continue;
      const x = this._candleX(i, data.length) + cw / 2;
      if (x < 25 || x > chartW - 25) continue;

      ctx.strokeStyle = this.C.axisBorder;
      ctx.beginPath(); ctx.moveTo(x, timeY); ctx.lineTo(x, timeY + 3); ctx.stroke();

      const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDay) {
        const ds = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
        ctx.fillStyle = '#666';
        ctx.fillText(ds, x, timeY + 11);
        ctx.fillStyle = this.C.gridText;
        ctx.fillText(ts, x, timeY + 20);
        lastDay = dayKey;
      } else {
        ctx.fillText(ts, x, timeY + 13);
      }
    }

    // ═══════════════════ CROSSHAIR ═══════════════════
    if (this.mouseX >= 0 && this.mouseX < chartW && this.mouseY >= 0 && this.mouseY < chartH && !this.isDragging) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();
      ctx.strokeStyle = this.C.crosshair;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(this.mouseX + 0.5, 0); ctx.lineTo(this.mouseX + 0.5, chartH);
      ctx.moveTo(0, this.mouseY + 0.5); ctx.lineTo(chartW, this.mouseY + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Price label
      const cp = this._yToPrice(this.mouseY);
      ctx.fillStyle = '#222';
      ctx.fillRect(pax, this.mouseY - 8, this.PRICE_AXIS_W, 16);
      ctx.fillStyle = '#ccc';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(this._fp(cp), pax + this.PRICE_AXIS_W - 4, this.mouseY + 3);
    }

    // ═══════════════════ TOOLTIP (MACRO VIEW) ═══════════════════
    if (!showFootprint && hoveredCandle && !this.isDragging) {
      const pad = 10;
      const fp = hoveredCandle.footprint;
      const levels = Object.keys(fp).sort((a, b) => parseFloat(b) - parseFloat(a));
      
      let pocIdx = 0; let maxV = 0;
      levels.forEach((k, i) => { if (fp[k].total > maxV) { maxV = fp[k].total; pocIdx = i; } });
      
      const startLvl = Math.max(0, pocIdx - 5);
      const endLvl = Math.min(levels.length, pocIdx + 6);
      const displayLevels = levels.slice(startLvl, endLvl);

      const rowH = 14;
      const tooltipW = 160;
      let tooltipH = 70 + displayLevels.length * rowH;
      if (displayLevels.length < levels.length) tooltipH += rowH;

      let tx = this.mouseX + 15;
      let ty = this.mouseY + 15;
      if (tx + tooltipW > chartW) tx = this.mouseX - tooltipW - 15;
      if (ty + tooltipH > chartH) ty = chartH - tooltipH - 5;

      // Background
      ctx.fillStyle = 'rgba(12, 16, 24, 0.95)';
      ctx.fillRect(tx, ty, tooltipW, tooltipH);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(tx, ty, tooltipW, tooltipH);

      // Header (Time + OHL + Vol + Delta)
      const d = new Date(hoveredCandle.time);
      const ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`TIME: ${ts}`, tx + pad, ty + 16);
      
      ctx.textAlign = 'right';
      ctx.fillStyle = hoveredCandle.delta >= 0 ? this.C.buyTextBright : this.C.sellTextBright;
      ctx.fillText(`Δ ${hoveredCandle.delta > 0 ? '+' : ''}${this._fv(hoveredCandle.delta)}`, tx + tooltipW - pad, ty + 16);

      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText(`O:${this._fp(hoveredCandle.open)} H:${this._fp(hoveredCandle.high)}`, tx + pad, ty + 30);
      ctx.fillText(`L:${this._fp(hoveredCandle.low)} C:${this._fp(hoveredCandle.close)}`, tx + pad, ty + 44);

      ctx.beginPath();
      ctx.moveTo(tx + pad, ty + 52);
      ctx.lineTo(tx + tooltipW - pad, ty + 52);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.stroke();

      // Footprint Header
      ctx.fillStyle = '#555';
      ctx.font = '9px monospace';
      ctx.fillText('PRICE', tx + pad, ty + 64);
      ctx.textAlign = 'center';
      ctx.fillText('BID × ASK', tx + tooltipW / 2 + 10, ty + 64);

      let curY = ty + 78;
      displayLevels.forEach(k => {
        const cell = fp[k];
        const p = parseFloat(k);
        const isPoc = (cell.total === maxV);
        
        ctx.fillStyle = isPoc ? '#ffab00' : '#888';
        ctx.textAlign = 'left';
        ctx.fillText(this._fp(p), tx + pad, curY);

        ctx.textAlign = 'right';
        ctx.fillStyle = cell.bid >= cell.ask ? this.C.sellTextBright : this.C.sellText;
        ctx.fillText(this._fv(cell.bid), tx + tooltipW / 2 + 4, curY);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#444';
        ctx.fillText('×', tx + tooltipW / 2 + 10, curY);

        ctx.textAlign = 'left';
        ctx.fillStyle = cell.ask >= cell.bid ? this.C.buyTextBright : this.C.buyText;
        ctx.fillText(this._fv(cell.ask), tx + tooltipW / 2 + 16, curY);
        
        curY += rowH;
      });

      if (displayLevels.length < levels.length) {
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText(`... ${levels.length - displayLevels.length} more levels ...`, tx + tooltipW / 2, curY);
      }
    }
  }

  // ═══════════════════ DOM RENDERING ═══════════════════

  _drawDOM(ctx, dom, chartH) {
    const domX = this._domX();
    const domW = this.DOM_W;
    const totalH = this.height;

    // Background
    ctx.fillStyle = this.C.domBg;
    ctx.fillRect(domX, 0, domW, totalH);
    ctx.strokeStyle = this.C.axisBorder;
    ctx.beginPath(); ctx.moveTo(domX + 0.5, 0); ctx.lineTo(domX + 0.5, totalH); ctx.stroke();

    if (!dom || (!dom.bids.length && !dom.asks.length)) {
      ctx.fillStyle = '#444';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DOM', domX + domW / 2, totalH / 2 - 4);
      ctx.fillStyle = '#333';
      ctx.font = '8px monospace';
      ctx.fillText('Awaiting depth...', domX + domW / 2, totalH / 2 + 10);
      return;
    }

    const { bids, asks, bestBid, bestAsk, totalBid, totalAsk } = dom;
    const maxSize = Math.max(
      ...bids.map(b => b.size),
      ...asks.map(a => a.size),
      1
    );

    // Calculate row height
    const totalLevels = 10 + 10 + 2; // 10 bids, 10 asks, +2 for spread row and header
    const rowH = Math.min(18, Math.max(12, totalH / totalLevels));

    // Header
    ctx.fillStyle = '#444';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PRICE', domX + 4, 10);
    ctx.textAlign = 'center';
    ctx.fillText('SIZE', domX + domW * 0.6, 10);
    ctx.textAlign = 'right';
    ctx.fillText('TOTAL', domX + domW - 4, 10);

    let yOff = 16;

    // Asks (reversed: highest at top)
    const asksReversed = [...asks].reverse();
    // Pad to exactly 10 rows (padding at top pushes real asks down closer to the spread)
    while (asksReversed.length < 10) asksReversed.unshift(null);

    for (let i = 0; i < 10; i++) {
      const a = asksReversed[i];
      const y = yOff + i * rowH;
      if (y > totalH) break;

      if (a) {
        // Volume bar (anchored right)
        const barW = (a.size / maxSize) * (domW * 0.45);
        ctx.fillStyle = this.C.domAskBar;
        ctx.fillRect(domX + domW - barW - 2, y, barW, rowH - 1);

        // Price
        ctx.fillStyle = this.C.domAskText;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this._fp(a.price), domX + 4, y + rowH / 2 + 3);

        // Size
        ctx.fillStyle = this.C.domSizeText;
        ctx.textAlign = 'center';
        ctx.fillText(this._fv(a.size), domX + domW * 0.6, y + rowH / 2 + 3);

        // Cumulative
        ctx.textAlign = 'right';
        ctx.fillText(this._fv(a.cumulative), domX + domW - 4, y + rowH / 2 + 3);
      }
    }

    yOff += 10 * rowH;

    // Spread row
    const spread = bestAsk - bestBid;
    const spreadPct = bestBid > 0 ? ((spread / bestBid) * 100).toFixed(3) : '0';
    const midPrice = (bestBid + bestAsk) / 2;

    ctx.fillStyle = '#111';
    ctx.fillRect(domX, yOff, domW, rowH + 4);

    ctx.fillStyle = this.C.priceLine;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('$' + this._fp(midPrice), domX + 4, yOff + rowH / 2 + 5);

    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SPR: ${this._fp(spread)} (${spreadPct}%)`, domX + domW - 4, yOff + rowH / 2 + 5);

    // Buy/Sell pressure bar
    const bpct = totalBid + totalAsk > 0 ? totalBid / (totalBid + totalAsk) : 0.5;
    const barY = yOff + rowH + 1;
    ctx.fillStyle = this.C.domBidBar;
    ctx.fillRect(domX + 2, barY, (domW - 4) * bpct, 2);
    ctx.fillStyle = this.C.domAskBar;
    ctx.fillRect(domX + 2 + (domW - 4) * bpct, barY, (domW - 4) * (1 - bpct), 2);

    yOff += rowH + 6;

    // Bids
    const paddedBids = [...bids];
    // Pad to exactly 10 rows (padding at bottom keeps real bids up near the spread)
    while (paddedBids.length < 10) paddedBids.push(null);

    for (let i = 0; i < 10; i++) {
      const b = paddedBids[i];
      const y = yOff + i * rowH;
      if (y > totalH) break;

      if (b) {
        // Volume bar (anchored right to match asks)
        const barW = (b.size / maxSize) * (domW * 0.45);
        ctx.fillStyle = this.C.domBidBar;
        ctx.fillRect(domX + domW - barW - 2, y, barW, rowH - 1);

        // Price
        ctx.fillStyle = this.C.domBidText;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this._fp(b.price), domX + 4, y + rowH / 2 + 3);

        // Size
        ctx.fillStyle = this.C.domSizeText;
        ctx.textAlign = 'center';
        ctx.fillText(this._fv(b.size), domX + domW * 0.6, y + rowH / 2 + 3);

        // Cumulative
        ctx.textAlign = 'right';
        ctx.fillText(this._fv(b.cumulative), domX + domW - 4, y + rowH / 2 + 3);
      }
    }
  }

  _drawAxesEmpty(ctx, W, H, chartW, chartH) {
    const pax = this._priceAxisX();
    const timeW = pax + this.PRICE_AXIS_W;
    ctx.fillStyle = this.C.axisBg;
    ctx.fillRect(pax, 0, this.PRICE_AXIS_W, H);
    ctx.fillRect(0, chartH + this.DELTA_H, timeW, this.TIME_AXIS_H);
    ctx.strokeStyle = this.C.axisBorder;
    ctx.beginPath();
    ctx.moveTo(pax + 0.5, 0); ctx.lineTo(pax + 0.5, H);
    ctx.moveTo(0, chartH + this.DELTA_H + 0.5); ctx.lineTo(timeW, chartH + this.DELTA_H + 0.5);
    ctx.stroke();
  }
}
