/**
 * 4-Layer Canvas Stack.
 *
 * Layer 0 (bottom)  : world / tiles            — repaint on dirty
 * Layer 1           : entities                 — repaint every frame
 * Layer 2           : world UI (mood ring,     — repaint every frame
 *                     speech bubbles, FX)
 * Layer 3 (top)     : day/night tint overlay   — only when phase changes
 *
 * All layers share the same logical size (cssW × cssH).
 * Internal canvas backing-store uses min(devicePixelRatio, 2) — caps GPU
 * memory on phones with extreme DPR (3×) without sacrificing crispness.
 *
 * Resize handling:
 *   - ResizeObserver tracks the wrap element (so it works inside any layout)
 *   - Backing stores resize, contexts re-scaled, listeners notified
 */

const MAX_DPR = 2;

export class CanvasStack {
  constructor(parent, layerCount = 4) {
    if (!parent) throw new Error('CanvasStack: parent required');

    this.cssW = 0;
    this.cssH = 0;
    this.dpr = 1;

    /** @type {Array<{canvas:HTMLCanvasElement, ctx:CanvasRenderingContext2D}>} */
    this.layers = [];

    this._resizeListeners = [];

    // Wrapper provides positioning context + capturing pointer events
    this.wrap = document.createElement('div');
    this.wrap.className = 'kc-canvas-stack';
    this.wrap.style.cssText = [
      'position: relative',
      'width: 100%',
      'height: 100%',
      'overflow: hidden',
      'touch-action: none',
      'user-select: none',
      '-webkit-user-select: none',
      'background: #07090f',
      'cursor: grab',
    ].join(';');

    parent.appendChild(this.wrap);

    for (let i = 0; i < layerCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.className = `kc-canvas kc-canvas-${i}`;
      canvas.style.cssText = [
        'position: absolute',
        'inset: 0',
        'width: 100%',
        'height: 100%',
        'image-rendering: auto',
        // Only the topmost canvas should receive pointer events; the wrap
        // also receives them via bubbling so the InputRouter listening on
        // wrap works regardless.
        'pointer-events: none',
      ].join(';');
      this.wrap.appendChild(canvas);

      const ctx = canvas.getContext('2d', {
        alpha: i > 0,        // bottom layer is opaque (avoids needless compositing)
        desynchronized: true, // hint browser; ignored if unsupported
      });
      this.layers.push({ canvas, ctx });
    }

    this._onResize = this._resize.bind(this);
    this._ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(this.wrap);
    } else {
      window.addEventListener('resize', this._onResize);
    }
    // Initial layout
    this._resize();
  }

  _resize() {
    const rect = this.wrap.getBoundingClientRect();
    const cssW = Math.max(320, Math.floor(rect.width));
    const cssH = Math.max(240, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    if (cssW === this.cssW && cssH === this.cssH && dpr === this.dpr) return;

    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;

    for (const { canvas, ctx } of this.layers) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low'; // we don't need bilinear for crisp tiles
    }

    for (const fn of this._resizeListeners) {
      try { fn(cssW, cssH, dpr); } catch (e) { console.error('[stack] resize cb', e); }
    }
  }

  onResize(fn) {
    this._resizeListeners.push(fn);
    // Fire once with current dimensions so caller can initialize
    try { fn(this.cssW, this.cssH, this.dpr); } catch { /* ignore */ }
    return () => {
      const idx = this._resizeListeners.indexOf(fn);
      if (idx >= 0) this._resizeListeners.splice(idx, 1);
    };
  }

  layer(idx) { return this.layers[idx]; }

  clearLayer(idx) {
    const layer = this.layers[idx];
    if (!layer) return;
    layer.ctx.clearRect(0, 0, this.cssW, this.cssH);
  }

  destroy() {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    else window.removeEventListener('resize', this._onResize);

    for (const { canvas } of this.layers) {
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    }
    this.layers.length = 0;
    this._resizeListeners.length = 0;
    this.wrap?.remove();
    this.wrap = null;
  }
}
