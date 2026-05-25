/**
 * Camera — pan, zoom, smooth follow, screen-shake.
 *
 * State model:
 *   - target* = where we *want* to be (set by input / follow logic)
 *   - x/y/zoom = where we *are* (interpolated each frame for smoothness)
 *
 * Coordinates: world-space pixels (camera position lands at viewport center).
 *
 * Shake: trauma-based; intensity decays exponentially. Render code asks for
 * `getRenderOffset()` to apply a small jitter without changing logical x/y.
 */

import { clamp } from '../utils/grid-math.js';

const DEFAULT_MIN_ZOOM = 0.5;
const DEFAULT_MAX_ZOOM = 2.5;
const POSITION_LERP_RATE = 12;  // higher = snappier follow
const ZOOM_LERP_RATE = 14;
const SHAKE_DECAY = 5;          // intensity units per second

export class Camera {
  constructor(viewportW, viewportH) {
    this.viewportW = viewportW;
    this.viewportH = viewportH;

    this.x = 0;
    this.y = 0;
    this.zoom = 1;

    this.targetX = 0;
    this.targetY = 0;
    this.targetZoom = 1;

    this.minZoom = DEFAULT_MIN_ZOOM;
    this.maxZoom = DEFAULT_MAX_ZOOM;

    this.shakeIntensity = 0;
    this.shakeFreq = 30; // visual samples per second

    /** Optional clamp to a world-space rectangle. */
    this.bounds = null;
  }

  setViewport(w, h) {
    this.viewportW = w;
    this.viewportH = h;
  }

  setBounds(minX, minY, maxX, maxY) {
    this.bounds = { minX, minY, maxX, maxY };
    this._clampTarget();
  }

  setZoomLimits(min, max) {
    this.minZoom = min;
    this.maxZoom = max;
    this.targetZoom = clamp(this.targetZoom, min, max);
  }

  /** Snap immediately to (x,y,zoom) — bypasses smoothing. Use for init/teleport. */
  snapTo(x, y, zoom = this.targetZoom) {
    this.x = this.targetX = x;
    this.y = this.targetY = y;
    this.zoom = this.targetZoom = clamp(zoom, this.minZoom, this.maxZoom);
    this._clampTarget();
  }

  /**
   * Pan by screen-space pixel delta.
   * Negative dx/dy means content shifts in the *opposite* direction.
   * Caller passes the *drag* delta; we negate so dragging right pans right.
   */
  panBy(screenDx, screenDy) {
    this.targetX += screenDx / this.zoom;
    this.targetY += screenDy / this.zoom;
    this._clampTarget();
  }

  /**
   * Zoom by a factor around an anchor point in screen-space.
   * Anchor is preserved: the world point under the anchor stays under it.
   */
  zoomBy(factor, anchorX, anchorY) {
    const newZoom = clamp(this.targetZoom * factor, this.minZoom, this.maxZoom);
    if (Math.abs(newZoom - this.targetZoom) < 0.0001) return;

    // World point under anchor before zoom
    const wx = (anchorX - this.viewportW / 2) / this.targetZoom + this.targetX;
    const wy = (anchorY - this.viewportH / 2) / this.targetZoom + this.targetY;

    this.targetZoom = newZoom;

    // Adjust target so wx,wy stays under anchor after zoom
    this.targetX = wx - (anchorX - this.viewportW / 2) / this.targetZoom;
    this.targetY = wy - (anchorY - this.viewportH / 2) / this.targetZoom;
    this._clampTarget();
  }

  /** Add screen shake; intensity stacks (max-merge). */
  shake(intensity) {
    if (intensity > this.shakeIntensity) this.shakeIntensity = intensity;
  }

  /** Smoothly interpolate toward target each frame. */
  update(dt) {
    if (dt <= 0) return;

    // Exponential decay toward target — frame-rate independent
    const tPos = 1 - Math.exp(-POSITION_LERP_RATE * dt);
    const tZoom = 1 - Math.exp(-ZOOM_LERP_RATE * dt);

    this.x += (this.targetX - this.x) * tPos;
    this.y += (this.targetY - this.y) * tPos;
    this.zoom += (this.targetZoom - this.zoom) * tZoom;

    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - SHAKE_DECAY * dt);
    }

    // Snap to target if very close (prevents micro-jitter)
    if (Math.abs(this.x - this.targetX) < 0.05) this.x = this.targetX;
    if (Math.abs(this.y - this.targetY) < 0.05) this.y = this.targetY;
    if (Math.abs(this.zoom - this.targetZoom) < 0.001) this.zoom = this.targetZoom;
  }

  /** Pseudo-random shake offset for current frame; symmetric, decays. */
  getRenderOffset() {
    if (this.shakeIntensity <= 0.01) return ZERO;
    const ang = Math.random() * Math.PI * 2;
    const r = this.shakeIntensity;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
  }

  /** World coords for a screen-space point. */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewportW / 2) / this.zoom + this.x,
      y: (sy - this.viewportH / 2) / this.zoom + this.y,
    };
  }

  /** Screen coords for a world-space point. */
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewportW / 2,
      y: (wy - this.y) * this.zoom + this.viewportH / 2,
    };
  }

  _clampTarget() {
    if (!this.bounds) return;
    this.targetX = clamp(this.targetX, this.bounds.minX, this.bounds.maxX);
    this.targetY = clamp(this.targetY, this.bounds.minY, this.bounds.maxY);
  }
}

const ZERO = Object.freeze({ x: 0, y: 0 });
