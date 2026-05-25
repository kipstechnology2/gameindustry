/**
 * Quality Controller — adaptive 3-tier render quality.
 *
 * Detects an initial tier from device capabilities, then auto-steps it
 * down/up based on observed FPS. The tier exposes a "profile" that tells
 * other subsystems (particle, lighting, rendering) how much budget they
 * have.
 *
 *   ULTRA  — desktops & flagship phones
 *   HIGH   — mid-tier (default for most devices)
 *   LOW    — budget Android, save-data on, or sustained <40fps
 *
 * Stepping is hysteretic: 2s under 40fps to step DOWN, 5s above 55fps to
 * step UP. Prevents flapping.
 */

export const TIERS = Object.freeze({
  ULTRA: 'ULTRA',
  HIGH:  'HIGH',
  LOW:   'LOW',
});

const STEP_DOWN_FPS = 40;
const STEP_DOWN_TIME = 2.0;
const STEP_UP_FPS = 55;
const STEP_UP_TIME = 5.0;

const PROFILES = Object.freeze({
  ULTRA: Object.freeze({
    particlesMax: 600,
    npcsMax: 30,
    lighting: 'full',
    shadows: true,
    ambientLife: 'full',
    weatherDensity: 1.0,
  }),
  HIGH: Object.freeze({
    particlesMax: 250,
    npcsMax: 18,
    lighting: 'tint',
    shadows: true,
    ambientLife: 'reduced',
    weatherDensity: 0.6,
  }),
  LOW: Object.freeze({
    particlesMax: 80,
    npcsMax: 10,
    lighting: 'tint',
    shadows: false,
    ambientLife: 'minimal',
    weatherDensity: 0.3,
  }),
});

export function detectInitialTier() {
  const mem = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  if (saveData) return TIERS.LOW;
  if (mem != null && mem < 4) return TIERS.LOW;
  if (cores != null && cores < 4) return TIERS.LOW;
  if ((mem == null || mem >= 8) && (cores == null || cores >= 6)) return TIERS.ULTRA;
  return TIERS.HIGH;
}

export class QualityController {
  constructor(initial) {
    this._tier = initial || detectInitialTier();
    this._lowSec = 0;
    this._highSec = 0;
    this._listeners = [];
  }

  get tier() { return this._tier; }

  getProfile() { return PROFILES[this._tier]; }

  /** Call once per frame; reacts to FPS to flip tier. */
  evaluate(fps, dt) {
    if (fps < STEP_DOWN_FPS) {
      this._lowSec += dt;
      this._highSec = 0;
      if (this._lowSec >= STEP_DOWN_TIME && this._tier !== TIERS.LOW) {
        this._stepDown();
      }
    } else if (fps > STEP_UP_FPS) {
      this._highSec += dt;
      this._lowSec = 0;
      if (this._highSec >= STEP_UP_TIME && this._tier !== TIERS.ULTRA) {
        this._stepUp();
      }
    } else {
      // Mid-zone — slowly drain hysteresis so we don't accumulate
      this._lowSec = Math.max(0, this._lowSec - dt * 0.5);
      this._highSec = Math.max(0, this._highSec - dt * 0.5);
    }
  }

  /** Force a tier (player setting). Resets hysteresis counters. */
  setTier(tier) {
    if (!PROFILES[tier]) return;
    if (this._tier === tier) return;
    const prev = this._tier;
    this._tier = tier;
    this._lowSec = 0;
    this._highSec = 0;
    this._notify(prev);
  }

  _stepDown() {
    if (this._tier === TIERS.ULTRA) this.setTier(TIERS.HIGH);
    else if (this._tier === TIERS.HIGH) this.setTier(TIERS.LOW);
  }
  _stepUp() {
    if (this._tier === TIERS.LOW) this.setTier(TIERS.HIGH);
    else if (this._tier === TIERS.HIGH) this.setTier(TIERS.ULTRA);
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      const idx = this._listeners.indexOf(fn);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  _notify(prev) {
    for (const fn of this._listeners) {
      try { fn(this._tier, prev); } catch (e) { console.error('[quality]', e); }
    }
  }
}
