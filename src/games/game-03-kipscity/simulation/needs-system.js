/**
 * Needs System — decays needs over real time, scaled by in-game day length.
 *
 * The system runs on the loop's 1 Hz fixed track. Needs decay rates are
 * authored as "units per game-hour"; the system converts that to per-tick
 * deltas using the loop's time scale.
 *
 *   1 game day = REAL_MS_PER_GAME_DAY (12 real minutes by default).
 *   1 game hour = REAL_MS_PER_GAME_DAY / 24 ≈ 30 real seconds.
 *
 * So at 1× time scale, calling update(dt=1s) advances 2 game minutes, i.e.
 * 1/30th of a game hour.
 *
 * Health is computed differently — it slowly drops only when 2+ needs are
 * critical (< 15) for sustained periods.
 */

import { C, NEED_KEYS } from '../components/types.js';
import { REAL_MS_PER_GAME_DAY } from '../core/time.js';
import { clamp } from '../utils/grid-math.js';

const REAL_SECONDS_PER_GAME_HOUR = REAL_MS_PER_GAME_DAY / 24 / 1000; // ≈ 30s

/**
 * Decay rates: units per **game hour**. Negative = drains faster.
 * Tuned so a Kip with no intervention reaches critical levels around the
 * end of an in-game waking day (~16 game hours = ~8 real minutes).
 */
export const NEED_RATES = Object.freeze({
  hunger:  -3.0,
  energy:  -2.5,
  hygiene: -1.0,
  social:  -1.5,
  fun:     -2.0,
  comfort: -1.0,
  bladder: -4.0,
  calm:    -0.6,   // calm decays slowly → stress climbs
  health:   0.0,   // computed separately
});

const CRITICAL_THRESHOLD = 15;

export class NeedsSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../core/loop.js').GameLoop} [deps.loop] — to read time scale
   */
  constructor({ world, loop }) {
    this.world = world;
    this.loop = loop || null;
  }

  /** @param {number} dt seconds (real time, NOT scaled) */
  update(dt) {
    if (dt <= 0) return;

    // Apply the loop's time scale so "speed up time" also speeds up decay
    const ts = this.loop ? this.loop.timeScale : 1;
    if (ts === 0) return; // paused

    const dGameHours = (dt * ts) / REAL_SECONDS_PER_GAME_HOUR;

    for (const e of this.world.query([C.Needs])) {
      const n = e[C.Needs];
      let criticalCount = 0;

      for (const key of NEED_KEYS) {
        if (key === 'health') continue;
        const rate = NEED_RATES[key] || 0;
        n[key] = clamp(n[key] + rate * dGameHours, 0, 100);
        if (n[key] < CRITICAL_THRESHOLD) criticalCount++;
      }

      // Health: -0.4/hr per critical need beyond 1; recover slowly otherwise
      if (criticalCount >= 2) {
        n.health = clamp(n.health - 0.4 * (criticalCount - 1) * dGameHours, 0, 100);
      } else if (criticalCount === 0) {
        n.health = clamp(n.health + 0.2 * dGameHours, 0, 100);
      }
    }
  }
}

/** Compute "drive" for a need — non-linear so urgent needs dominate. */
export function needDrive(value) {
  // value is 0..100 satisfaction; 0 = most desperate
  const def = clamp(100 - value, 0, 100) / 100; // 0..1
  // Cubic curve: drive grows fast as need approaches zero
  return def * def * def;
}

/** Apply effects (delta map) to a Needs component. */
export function applyEffects(needs, effects) {
  if (!effects) return;
  for (const k of NEED_KEYS) {
    if (effects[k] != null) needs[k] = clamp(needs[k] + effects[k], 0, 100);
  }
}

export { CRITICAL_THRESHOLD };
