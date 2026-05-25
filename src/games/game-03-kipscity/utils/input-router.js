/**
 * Unified Input Router.
 *
 * Normalizes pointer (mouse / touch / pen), wheel, pinch, and keyboard into
 * a small set of high-level events: pan, tap, longpress, pinch, wheel, key.
 *
 * Why custom and not just listeners? We need:
 *   - reliable drag-vs-tap discrimination across mouse/touch
 *   - 2-finger pinch tracking (touch)
 *   - centralized teardown (one destroy() call)
 *   - independence from any framework
 *
 * High-level events emitted (subscribe via `.on(name, fn)`):
 *   pan(dx, dy, x, y)              — incremental drag delta in CSS px
 *   tap(x, y)                      — single tap with no drag
 *   longpress(x, y)                — pointer held > 500ms with no drag
 *   pinch(scale, x, y)             — relative scale factor since last event
 *   wheel(deltaY, x, y, ctrl)      — wheel/trackpad
 *   keydown(key, e), keyup(key, e) — keyboard
 *
 * Coordinates are CSS pixels relative to the target element.
 */

const DRAG_THRESHOLD_PX = 6;
const LONGPRESS_MS = 500;

export class InputRouter {
  /** @param {HTMLElement} target */
  constructor(target) {
    if (!target) throw new Error('InputRouter requires a target element');
    this.target = target;

    /** @type {Map<number, {x:number,y:number}>} active pointer positions */
    this._pointers = new Map();

    this._dragging = false;
    this._dragId = -1;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._longpressTimer = 0;

    this._lastPinchDist = 0;

    /** @type {Set<string>} */
    this.keysDown = new Set();

    this._listeners = {
      pan: [], tap: [], longpress: [], pinch: [], wheel: [],
      keydown: [], keyup: [],
    };

    this._bind();
  }

  on(event, fn) {
    const arr = this._listeners[event];
    if (!arr) throw new Error(`Unknown input event: ${event}`);
    arr.push(fn);
    return () => {
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    };
  }

  isKeyDown(key) { return this.keysDown.has(key); }

  _emit(event, ...args) {
    for (const fn of this._listeners[event]) {
      try { fn(...args); } catch (e) { console.error(`[input] ${event}`, e); }
    }
  }

  _localXY(e) {
    const r = this.target.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _bind() {
    const t = this.target;

    this._onPointerDown = (e) => {
      const { x, y } = this._localXY(e);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._pointers.size === 1) {
        this._dragId = e.pointerId;
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        this._dragging = false;

        // Long-press timer
        clearTimeout(this._longpressTimer);
        this._longpressTimer = setTimeout(() => {
          if (!this._dragging && this._pointers.has(this._dragId)) {
            this._emit('longpress', x, y);
          }
        }, LONGPRESS_MS);

        try { t.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      } else if (this._pointers.size === 2) {
        // Begin pinch — cancel longpress and tap intent
        clearTimeout(this._longpressTimer);
        this._dragging = true;
        const pts = [...this._pointers.values()];
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        this._lastPinchDist = Math.hypot(dx, dy);
      }
    };

    this._onPointerMove = (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._pointers.size === 1 && e.pointerId === this._dragId) {
        const dxTotal = e.clientX - this._dragStartX;
        const dyTotal = e.clientY - this._dragStartY;
        if (!this._dragging && Math.hypot(dxTotal, dyTotal) > DRAG_THRESHOLD_PX) {
          this._dragging = true;
          clearTimeout(this._longpressTimer);
        }
        if (this._dragging) {
          const dx = e.clientX - this._lastX;
          const dy = e.clientY - this._lastY;
          const { x, y } = this._localXY(e);
          this._emit('pan', dx, dy, x, y);
        }
        this._lastX = e.clientX;
        this._lastY = e.clientY;
      } else if (this._pointers.size === 2) {
        const pts = [...this._pointers.values()];
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const dist = Math.hypot(dx, dy);
        if (this._lastPinchDist > 0 && dist > 0) {
          const scale = dist / this._lastPinchDist;
          const cx = (pts[0].x + pts[1].x) / 2;
          const cy = (pts[0].y + pts[1].y) / 2;
          const rect = t.getBoundingClientRect();
          this._emit('pinch', scale, cx - rect.left, cy - rect.top);
        }
        this._lastPinchDist = dist;
      }
    };

    this._onPointerUp = (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      const wasOne = this._pointers.size === 1;
      const wasTwo = this._pointers.size === 2;
      this._pointers.delete(e.pointerId);
      try { t.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

      if (wasOne) {
        clearTimeout(this._longpressTimer);
        if (!this._dragging) {
          const { x, y } = this._localXY(e);
          this._emit('tap', x, y);
        }
        this._dragging = false;
        this._dragId = -1;
      }
      if (wasTwo) {
        // Going from 2 → 1 pointers; reset pinch state
        this._lastPinchDist = 0;
        // Treat the remaining pointer as a fresh drag origin to avoid jumps
        if (this._pointers.size === 1) {
          const remaining = [...this._pointers.values()][0];
          this._lastX = remaining.x;
          this._lastY = remaining.y;
          this._dragStartX = remaining.x;
          this._dragStartY = remaining.y;
          this._dragId = [...this._pointers.keys()][0];
        }
      }
    };

    this._onWheel = (e) => {
      e.preventDefault();
      const { x, y } = this._localXY(e);
      this._emit('wheel', e.deltaY, x, y, e.ctrlKey || e.metaKey);
    };

    this._onContextMenu = (e) => e.preventDefault();

    this._onKeyDown = (e) => {
      if (this.keysDown.has(e.key)) return;
      this.keysDown.add(e.key);
      this._emit('keydown', e.key, e);
    };

    this._onKeyUp = (e) => {
      this.keysDown.delete(e.key);
      this._emit('keyup', e.key, e);
    };

    t.addEventListener('pointerdown', this._onPointerDown);
    t.addEventListener('pointermove', this._onPointerMove);
    t.addEventListener('pointerup', this._onPointerUp);
    t.addEventListener('pointercancel', this._onPointerUp);
    t.addEventListener('pointerleave', this._onPointerUp);
    t.addEventListener('wheel', this._onWheel, { passive: false });
    t.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  destroy() {
    clearTimeout(this._longpressTimer);
    const t = this.target;
    t.removeEventListener('pointerdown', this._onPointerDown);
    t.removeEventListener('pointermove', this._onPointerMove);
    t.removeEventListener('pointerup', this._onPointerUp);
    t.removeEventListener('pointercancel', this._onPointerUp);
    t.removeEventListener('pointerleave', this._onPointerUp);
    t.removeEventListener('wheel', this._onWheel);
    t.removeEventListener('contextmenu', this._onContextMenu);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    Object.keys(this._listeners).forEach((k) => { this._listeners[k].length = 0; });
    this._pointers.clear();
    this.keysDown.clear();
  }
}
