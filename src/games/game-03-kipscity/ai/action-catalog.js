/**
 * Action Catalog — the closed set of high-level actions a Kip can choose.
 *
 * Each action has:
 *   - id           : unique key
 *   - label        : display string (already localized in en for now)
 *   - score(ctx)   : returns a utility score given { needs, personality, ... }
 *   - target(ctx)  : optional resolver that returns { col, row, x, y, entityId? }
 *                    or null if the action is currently unavailable
 *   - duration     : seconds to spend in 'execute' phase after arriving
 *   - effects      : need deltas applied at completion (full effect)
 *   - anim         : animation state during execute
 *   - rewardEmotion: optional EMOTION value to inject on completion
 *
 * The decision system iterates the catalog every 4 Hz, picks the action
 * with the highest score whose target() returns non-null.
 */

import { needDrive } from '../simulation/needs-system.js';
import { tileCenter } from '../utils/iso-math.js';
import { C, EMOTION } from '../components/types.js';

/** Find the closest entity (with TagObject) that matches a predicate. */
function nearestObject(world, fromX, fromY, predicate) {
  let best = null;
  let bestDistSq = Infinity;
  for (const e of world.query([C.Transform, C.Interactable])) {
    if (!predicate(e)) continue;
    const t = e[C.Transform];
    const dx = t.x - fromX;
    const dy = t.y - fromY;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = e;
    }
  }
  return best;
}

/** Find a nearby Kip (NPC or player) within `maxTiles` tiles. */
function nearestKip(world, fromX, fromY, selfId, maxWorldUnits = 256) {
  let best = null;
  let bestDistSq = maxWorldUnits * maxWorldUnits;
  for (const e of world.query([C.Transform, C.Animator])) {
    if (e.id === selfId) continue;
    if (e[C.Sprite]?.kind === 'object') continue;
    const t = e[C.Transform];
    const dx = t.x - fromX;
    const dy = t.y - fromY;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = e;
    }
  }
  return best;
}

/**
 * Action context passed to score() and target() functions.
 * @typedef {object} ActionCtx
 * @property {number} entityId
 * @property {object} transform
 * @property {object} needs
 * @property {object} personality
 * @property {import('../ecs/world.js').World} world
 * @property {number} now            — performance.now() ms
 */

export const ACTIONS = Object.freeze({

  // -------------------------------------------------------------------
  // Baseline: wander randomly. Always picks SOMETHING when nothing else
  // is attractive enough.
  // -------------------------------------------------------------------
  wander: {
    id: 'wander',
    label: 'Wander',
    score: () => 6,                   // baseline floor
    target: ({ transform, world }) => {
      // Pick a random nearby tile up to ~5 tiles away on grass/path.
      // The intent-execution-system will pathfind; here we just propose.
      const tilemap = world.__tilemap;  // injected by game.js (see service register)
      if (!tilemap) return null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 240;
        const tx = transform.x + Math.cos(angle) * dist;
        const ty = transform.y + Math.sin(angle) * dist;
        return { x: tx, y: ty };       // pathfinder validates walkability
      }
      return null;
    },
    duration: 0.8,
    effects: { fun: +0.4 },
    anim: 'idle',
  },

  // -------------------------------------------------------------------
  // Rest at a bench → restore energy + comfort
  // -------------------------------------------------------------------
  rest_at_bench: {
    id: 'rest_at_bench',
    label: 'Rest at bench',
    score: ({ needs, personality }) =>
      needDrive(needs.energy) * 90 * (1 - personality.ambition * 0.4)
      + needDrive(needs.comfort) * 30,
    target: ({ transform, world }) => {
      const bench = nearestObject(world, transform.x, transform.y,
        (e) => e[C.Interactable].objectKind === 'bench');
      if (!bench) return null;
      const t = bench[C.Transform];
      return { x: t.x, y: t.y, entityId: bench.id };
    },
    duration: 6,
    effects: { energy: +18, comfort: +10, calm: +5 },
    anim: 'idle',
    rewardEmotion: EMOTION.NEUTRAL,
  },

  // -------------------------------------------------------------------
  // Eat at food cart
  // -------------------------------------------------------------------
  eat_at_cart: {
    id: 'eat_at_cart',
    label: 'Eat snack',
    score: ({ needs }) =>
      needDrive(needs.hunger) * 110,
    target: ({ transform, world }) => {
      const cart = nearestObject(world, transform.x, transform.y,
        (e) => e[C.Interactable].objectKind === 'food_cart');
      if (!cart) return null;
      const t = cart[C.Transform];
      return { x: t.x, y: t.y, entityId: cart.id };
    },
    duration: 4,
    effects: { hunger: +35, fun: +5, hygiene: -2 },
    anim: 'idle',
    rewardEmotion: EMOTION.HAPPY,
  },

  // -------------------------------------------------------------------
  // Drink at fountain → hydration + a bit of fun + calm
  // -------------------------------------------------------------------
  drink_at_fountain: {
    id: 'drink_at_fountain',
    label: 'Refresh at fountain',
    score: ({ needs }) =>
      needDrive(needs.hunger) * 30
      + needDrive(needs.fun) * 35
      + needDrive(needs.calm) * 25,
    target: ({ transform, world }) => {
      const f = nearestObject(world, transform.x, transform.y,
        (e) => e[C.Interactable].objectKind === 'fountain');
      if (!f) return null;
      const t = f[C.Transform];
      return { x: t.x, y: t.y, entityId: f.id };
    },
    duration: 3,
    effects: { hunger: +10, fun: +12, calm: +12, hygiene: +3 },
    anim: 'idle',
  },

  // -------------------------------------------------------------------
  // Sleep in bed → big energy boost
  // -------------------------------------------------------------------
  sleep_in_bed: {
    id: 'sleep_in_bed',
    label: 'Sleep',
    score: ({ needs, personality }) => {
      // Sleeping hard kicks in when energy < 40
      const drive = needDrive(needs.energy);
      const lazyBonus = 1 + Math.max(0, -personality.conscientiousness) * 0.5;
      // Strong threshold: don't sleep if energy > 60
      if (needs.energy > 60) return 0;
      return drive * 130 * lazyBonus;
    },
    target: ({ transform, world }) => {
      const bed = nearestObject(world, transform.x, transform.y,
        (e) => e[C.Interactable].objectKind === 'bed');
      if (!bed) return null;
      const t = bed[C.Transform];
      return { x: t.x, y: t.y, entityId: bed.id };
    },
    duration: 12,
    effects: { energy: +60, calm: +15, comfort: +20 },
    anim: 'idle',
    rewardEmotion: EMOTION.HAPPY,
  },

  // -------------------------------------------------------------------
  // Socialize with a nearby Kip
  // -------------------------------------------------------------------
  socialize: {
    id: 'socialize',
    label: 'Chat',
    score: ({ entityId, needs, personality, transform, world }) => {
      const other = nearestKip(world, transform.x, transform.y, entityId, 320);
      if (!other) return 0;
      const drive = needDrive(needs.social);
      const extroBonus = 0.5 + (personality.extroversion + 1) * 0.4; // 0.5..1.3
      return drive * 80 * extroBonus;
    },
    target: ({ entityId, transform, world }) => {
      const other = nearestKip(world, transform.x, transform.y, entityId, 320);
      if (!other) return null;
      const t = other[C.Transform];
      // Aim a tile *next to* the other Kip — close but not on top
      return {
        x: t.x - 32,
        y: t.y - 16,
        entityId: other.id,
      };
    },
    duration: 5,
    effects: { social: +25, fun: +6 },
    anim: 'idle',
    rewardEmotion: EMOTION.HAPPY,
  },
});

/**
 * Returns an array of all action ids in stable order — useful for tests
 * and the decision system loop.
 */
export const ACTION_IDS = Object.freeze(Object.keys(ACTIONS));
