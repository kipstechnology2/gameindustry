/**
 * Multi-Rate Game Loop — Kips City
 *
 * Different game systems naturally run at different rates:
 *   - Render        : every animation frame (display rate)
 *   - Motion        : 30 Hz fixed step (smooth, deterministic)
 *   - AI decisions  : 4 Hz (utility scoring is expensive, low cadence is fine)
 *   - Needs decay   : 1 Hz (slow simulation)
 *   - Weather       : 0.1 Hz (very slow)
 *
 * Running everything at 60 Hz wastes CPU. This scheduler runs render every
 * rAF tick, and dispatches fixed tracks via accumulator-based timing with
 * spiral-of-death protection.
 *
 * Time scaling: a global multiplier lets the player speed up/slow down
 * in-game time. Render still runs at real time; only the dt fed to fixed
 * tracks is scaled.
 */

const MAX_FRAME_DT_MS = 100;      // clamp huge dts (tab return / breakpoints)
const MAX_FIXED_ITERS = 5;        // spiral-of-death guard per fixed track
const TIME_SCALE_MIN = 0;
const TIME_SCALE_MAX = 16;

export class GameLoop {
  constructor() {
    /** @type {Map<string, {hz:number, interval:number, accumulator:number, callback:Function}>} */
    this.fixedTracks = new Map();
    this.renderCallback = null;
    this.running = false;
    this._lastTime = 0;
    this._rafId = 0;
    this._timeScale = 1;
    this._tick = this._tick.bind(this);
    this._frameCount = 0;
  }

  /**
   * Register a fixed-rate update track.
   * @param {string} name unique track id
   * @param {number} hz updates per second
   * @param {(dt:number)=>void} callback receives fixed dt in seconds
   */
  addFixedTrack(name, hz, callback) {
    if (hz <= 0) throw new Error('hz must be > 0');
    this.fixedTracks.set(name, {
      hz,
      interval: 1000 / hz,
      accumulator: 0,
      callback,
    });
  }

  removeFixedTrack(name) {
    this.fixedTracks.delete(name);
  }

  /** Set the per-frame render callback. dt is real-time seconds since last frame. */
  setRenderCallback(callback) {
    this.renderCallback = callback;
  }

  setTimeScale(scale) {
    this._timeScale = Math.max(TIME_SCALE_MIN, Math.min(TIME_SCALE_MAX, scale));
  }

  get timeScale() { return this._timeScale; }

  get frameCount() { return this._frameCount; }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this._rafId);
    this._rafId = 0;
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.pause();
    this.fixedTracks.clear();
    this.renderCallback = null;
  }

  _tick(now) {
    if (!this.running) return;

    const rawDt = now - this._lastTime;
    const realDtMs = Math.min(rawDt, MAX_FRAME_DT_MS);
    this._lastTime = now;

    const scaledDtMs = realDtMs * this._timeScale;

    // Fixed-rate tracks (with spiral-of-death guard)
    for (const track of this.fixedTracks.values()) {
      track.accumulator += scaledDtMs;
      let iters = 0;
      while (track.accumulator >= track.interval && iters < MAX_FIXED_ITERS) {
        track.callback(track.interval / 1000);
        track.accumulator -= track.interval;
        iters++;
      }
      // If we dropped frames, clamp accumulator so we don't try to catch up
      if (track.accumulator > track.interval * MAX_FIXED_ITERS) {
        track.accumulator = track.interval;
      }
    }

    // Render at display rate; render uses real dt (not scaled) so animations
    // remain smooth even when in-game time is sped up.
    if (this.renderCallback) {
      try {
        this.renderCallback(realDtMs / 1000);
      } catch (e) {
        console.error('[loop] render error', e);
      }
    }

    this._frameCount++;
    this._rafId = requestAnimationFrame(this._tick);
  }
}
