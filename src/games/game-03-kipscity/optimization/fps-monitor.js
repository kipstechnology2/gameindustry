/**
 * FPS Monitor — rolling-window average + min/max.
 *
 * Used by quality-controller to step the render quality up/down on the fly,
 * and by the debug overlay for visibility.
 *
 * Implementation: keeps timestamps within a 1-second window. Average FPS is
 * (frameCount - 1) / windowSec. Min/max are computed from instantaneous
 * frame deltas in the same window.
 */

const DEFAULT_WINDOW_MS = 1000;

export class FpsMonitor {
  constructor(windowMs = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
    /** @type {number[]} timestamps of recent frame ends */
    this._frames = [];
    this._currentFps = 60;
    this._minFps = 60;
    this._maxFps = 60;
  }

  /** Call once per rendered frame. */
  tick() {
    const now = performance.now();
    this._frames.push(now);

    // Drop frames older than the window
    const cutoff = now - this.windowMs;
    let drop = 0;
    while (drop < this._frames.length && this._frames[drop] < cutoff) drop++;
    if (drop > 0) this._frames.splice(0, drop);

    if (this._frames.length >= 2) {
      const span = (now - this._frames[0]) / 1000;
      this._currentFps = span > 0 ? (this._frames.length - 1) / span : 60;

      // Instantaneous FPS from last frame delta
      const prev = this._frames[this._frames.length - 2];
      const dt = now - prev;
      const inst = dt > 0 ? 1000 / dt : 60;

      // Reset min/max if window moved past them
      if (this._frames.length === 2) {
        this._minFps = inst;
        this._maxFps = inst;
      } else {
        if (inst < this._minFps) this._minFps = inst;
        if (inst > this._maxFps) this._maxFps = inst;
      }
    }
  }

  get fps() { return this._currentFps; }

  getStats() {
    return {
      current: Math.round(this._currentFps),
      min: Math.round(this._minFps),
      max: Math.round(this._maxFps),
      sampleCount: this._frames.length,
    };
  }

  reset() {
    this._frames.length = 0;
    this._currentFps = 60;
    this._minFps = 60;
    this._maxFps = 60;
  }
}
