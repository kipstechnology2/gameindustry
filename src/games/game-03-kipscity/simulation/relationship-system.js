/**
 * Relationship System — passive social fabric for autonomous Kips.
 *
 * For Batch 3i this stays intentionally simple but produces emergent drama:
 *
 *   1. Every 1 Hz tick, walk every pair of Kips within social-radius (3 tiles).
 *   2. Each pair contributes a small positive memory event (enjoying company),
 *      tinted by personality compatibility (extroversion + agreeableness).
 *      If both Kips are stressed/lonely critically, valence flips slightly
 *      negative to model "tension when both are miserable" — emergent drama.
 *   3. Memory rolls into the bond score for that pair on each event.
 *   4. Bond.tier is recomputed from score (best/close/friend/acquaintance/cool/enemy).
 *
 * Cost: O(K²) per Hz where K = visible Kip count. With ≤6 Kips that's ≤30
 * pair checks per second — trivial.
 *
 * Future (3j+): conversations, gossip propagation, gift-giving, jealousy.
 */

import { C, EMOTION, BOND_TIERS, tierForScore, pushMemory } from '../components/types.js';
import { tileToScreen, TILE } from '../utils/iso-math.js';

const SOCIAL_RADIUS_TILES = 3;
const SOCIAL_RADIUS_PX = SOCIAL_RADIUS_TILES * TILE.W; // ~192 px

export class RelationshipSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {() => number} [deps.dayProvider]   returns current in-game day
   * @param {(payload:any)=>void} [deps.onSocialEvent]  optional UI hook
   */
  constructor({ world, dayProvider, onSocialEvent }) {
    this.world = world;
    this.dayProvider = dayProvider || (() => 0);
    this.onSocialEvent = onSocialEvent || (() => {});
  }

  /** dt seconds (real, scaled). Called on the 1 Hz needs/social track. */
  update(_dt) {
    const day = this.dayProvider();
    // Snapshot all socializable Kips into an array (player + NPCs)
    const kips = [];
    for (const e of this.world.query([
      C.Transform, C.Memory, C.Relations, C.Personality, C.Needs,
    ])) {
      kips.push(e);
    }

    // Pair scan
    for (let i = 0; i < kips.length; i++) {
      const a = kips[i];
      const ta = a[C.Transform];
      for (let j = i + 1; j < kips.length; j++) {
        const b = kips[j];
        const tb = b[C.Transform];
        const dx = ta.x - tb.x;
        const dy = ta.y - tb.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > SOCIAL_RADIUS_PX * SOCIAL_RADIUS_PX) continue;

        // Compatibility from personality + current needs
        const compat = compatibility(
          a[C.Personality], b[C.Personality],
          a[C.Needs], b[C.Needs],
        );

        const event = {
          withWho: 0,
          type: compat >= 0 ? 'pleasant' : 'awkward',
          valence: compat,
          intensity: 0.3 + Math.min(1, Math.abs(compat)) * 0.3,
          time: day,
        };

        // Symmetric memories
        event.withWho = b.id;
        pushMemory(a[C.Memory], event);
        event.withWho = a.id;
        pushMemory(b[C.Memory], event);

        bumpBond(a[C.Relations], b.id, compat * 1.5, day);
        bumpBond(b[C.Relations], a.id, compat * 1.5, day);

        // Optional UI/audio hook (e.g. heart particles when bond crosses tier)
        this.onSocialEvent({ a: a.id, b: b.id, valence: compat });
      }
    }
  }
}

/**
 * Compatibility score in [-1..+1] from personality + needs.
 *
 * Heuristic:
 *   - Both extroverted → bonus
 *   - Both introverted → small bonus
 *   - One extrovert, one introvert → small penalty
 *   - High agreeableness on either side → bonus
 *   - If BOTH are critically stressed (calm < 20) → penalty (snap at each other)
 *   - Random ±0.05 jitter so identical pairs don't always produce identical events
 */
function compatibility(pa, pb, na, nb) {
  let c = 0;

  const eAvg = (pa.extroversion + pb.extroversion) / 2;
  c += eAvg * 0.25;
  // Same-axis bonus (both extro or both intro)
  c += (pa.extroversion * pb.extroversion) * 0.15;

  c += (pa.agreeableness + pb.agreeableness) / 2 * 0.3;

  // Tension when both are stressed
  if (na.calm < 20 && nb.calm < 20) c -= 0.4;

  // High neuroticism amplifies drama in both directions
  const neuroAvg = (pa.neuroticism + pb.neuroticism) / 2;
  c += (Math.random() * 0.1 - 0.05) * (1 + neuroAvg);

  // Clamp
  if (c > 1) c = 1;
  if (c < -1) c = -1;
  return c;
}

function bumpBond(relations, otherId, delta, day) {
  let bond = relations.bonds.get(otherId);
  if (!bond) {
    bond = { score: 0, tier: 'acquaintance', lastInteraction: day };
    relations.bonds.set(otherId, bond);
  }
  bond.score = Math.max(-100, Math.min(100, bond.score + delta));
  bond.tier = tierForScore(bond.score);
  bond.lastInteraction = day;
}

export const SOCIAL = Object.freeze({
  RADIUS_TILES: SOCIAL_RADIUS_TILES,
  RADIUS_PX: SOCIAL_RADIUS_PX,
});
