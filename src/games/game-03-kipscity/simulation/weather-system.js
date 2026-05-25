/**
 * Weather System — drifts atmospheric state on a slow track (0.1 Hz).
 *
 * State machine:
 *   sunny → cloudy → rain → cloudy → sunny (with random hold times)
 *   In winter: rain becomes snow.
 *
 * Effects:
 *   - Rain emits particle preset PRESET_RAIN above the camera, falling
 *     across the screen. Density scales with quality tier.
 *   - Slight needs influence: rain reduces fun gain from outdoor activities
 *     (Future: handled by action utility scoring).
 *
 * Smooth transitions: stateProgress 0..1 between weather changes — used by
 * lighting/audio for crossfades in future batches.
 */

import { TILE } from '../utils/iso-math.js';
import { PRESET_RAIN } from '../effects/particle-presets.js';

export const WEATHER = Object.freeze({
  SUNNY:  'sunny',
  CLOUDY: 'cloudy',
  RAIN:   'rain',
  SNOW:   'snow',
});

const WEATHER_HOLD_RANGE = { min: 90, max: 240 }; // game seconds (~3-8 game min)

const RAIN_PER_SEC_BY_TIER = {
  ULTRA: 90,
  HIGH:  50,
  LOW:   0,
};

export class WeatherSystem {
  /**
   * @param {object} deps
   * @param {import('../core/time.js').TimeSystem} deps.time
   * @param {import('../effects/particle-system.js').ParticleSystem} deps.particles
   * @param {import('../world/camera.js').Camera} deps.camera
   * @param {() => string} deps.qualityTier
   * @param {(payload:{previous:string,current:string})=>void} [deps.onChange]
   */
  constructor({ time, particles, camera, qualityTier, onChange }) {
    this.time = time;
    this.particles = particles;
    this.camera = camera;
    this.qualityTier = qualityTier || (() => 'HIGH');
    this.onChange = onChange || (() => {});

    this.current = WEATHER.SUNNY;
    /** seconds remaining in current state (real-time) */
    this._holdLeft = randHold();
    this._rainAccumulator = 0;
  }

  /** Slow track 0.1 Hz: choose next weather. */
  tick(dt) {
    if (dt <= 0) return;
    this._holdLeft -= dt;
    if (this._holdLeft > 0) return;

    const next = pickNext(this.current, this.time.season);
    if (next !== this.current) {
      const prev = this.current;
      this.current = next;
      this.onChange({ previous: prev, current: next });
    }
    this._holdLeft = randHold();
  }

  /** Per-frame: emit weather particles into camera band. */
  emit(dtReal) {
    if (this.current !== WEATHER.RAIN && this.current !== WEATHER.SNOW) return;
    const tier = this.qualityTier();
    const rate = RAIN_PER_SEC_BY_TIER[tier] || 0;
    if (rate <= 0) return;

    this._rainAccumulator += rate * dtReal;
    const toEmit = Math.floor(this._rainAccumulator);
    this._rainAccumulator -= toEmit;

    if (toEmit <= 0) return;

    // Spawn above the camera bounds, drift downward into view
    const cam = this.camera;
    const left = cam.x - cam.viewportW / 2 / cam.zoom;
    const right = cam.x + cam.viewportW / 2 / cam.zoom;
    const top   = cam.y - cam.viewportH / 2 / cam.zoom - TILE.H;

    for (let i = 0; i < toEmit; i++) {
      const x = left + Math.random() * (right - left);
      this.particles.emit(PRESET_RAIN, x, top, 1);
    }
  }
}

function randHold() {
  return WEATHER_HOLD_RANGE.min
       + Math.random() * (WEATHER_HOLD_RANGE.max - WEATHER_HOLD_RANGE.min);
}

function pickNext(current, season) {
  // Markov-ish: most likely to drift to neighboring states
  const winter = season === 'winter';
  const wet = winter ? WEATHER.SNOW : WEATHER.RAIN;
  const r = Math.random();
  switch (current) {
    case WEATHER.SUNNY:
      if (r < 0.7) return WEATHER.CLOUDY;
      return WEATHER.SUNNY;
    case WEATHER.CLOUDY:
      if (r < 0.4) return wet;
      if (r < 0.85) return WEATHER.SUNNY;
      return WEATHER.CLOUDY;
    case WEATHER.RAIN:
    case WEATHER.SNOW:
      if (r < 0.65) return WEATHER.CLOUDY;
      return current;
    default:
      return WEATHER.SUNNY;
  }
}
