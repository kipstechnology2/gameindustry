/**
 * Ambient Emitter System — drives passive particle emission from objects.
 *
 *   - Fountain: continuous water spray at the top of the basin
 *   - Food cart: occasional steam
 *
 * Queries by interactable kind so it scales with object count.
 *
 * Throttling: each emitter has its own time-since-last-emit. Steam is rare
 * enough (every ~0.4s) that even 10 carts add ~25 particles/sec total.
 * Fountains emit a few drops per frame for a continuous shimmer.
 */

import { C } from '../components/types.js';
import { PRESET_WATER, PRESET_STEAM } from '../effects/particle-presets.js';

const STEAM_INTERVAL = 0.45;     // seconds between steam puffs
const WATER_PER_TICK_LOW = 1;
const WATER_PER_TICK_NORMAL = 2;

export class AmbientEmitterSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../effects/particle-system.js').ParticleSystem} deps.particles
   * @param {() => string} deps.qualityTier  returns 'LOW'/'HIGH'/'ULTRA'
   */
  constructor({ world, particles, qualityTier }) {
    this.world = world;
    this.particles = particles;
    this.qualityTier = qualityTier || (() => 'HIGH');
    /** Per-entity throttle timers: id → seconds since last emit */
    this._timers = new Map();
  }

  update(dt) {
    if (dt <= 0) return;
    const tier = this.qualityTier();
    if (tier === 'LOW') {
      // Skip ambient emission entirely on low-end
      return;
    }
    const waterPerTick = tier === 'ULTRA' ? WATER_PER_TICK_NORMAL : WATER_PER_TICK_LOW;

    for (const e of this.world.query([C.Transform, C.Interactable])) {
      const interactable = e[C.Interactable];
      const t = e[C.Transform];

      if (interactable.objectKind === 'fountain') {
        // Top of fountain ~26px above base
        this.particles.emit(PRESET_WATER, t.x, t.y - 30, waterPerTick);
      } else if (interactable.objectKind === 'food_cart') {
        let timer = this._timers.get(e.id) || 0;
        timer += dt;
        if (timer >= STEAM_INTERVAL) {
          timer = 0;
          // Steam comes off the counter-top
          this.particles.emit(PRESET_STEAM, t.x + 6, t.y - 30, 1);
        }
        this._timers.set(e.id, timer);
      }
    }
  }

  destroy() {
    this._timers.clear();
  }
}
