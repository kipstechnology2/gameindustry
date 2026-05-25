/**
 * AI Decision System — re-evaluates each NPC's chosen action every 4 Hz.
 *
 * Pulls the highest-utility action from the action catalog and writes it
 * into the NPC's Intent component. The intent-execution-system then drives
 * pathfinding + animation + effects.
 *
 * Why a separate system? Decision-making is expensive (queries, scoring,
 * personality math) — running it at the rendering rate (60 Hz) wastes 90%
 * of the work. 4 Hz is more than enough cadence for a life-sim, and frees
 * CPU for movement/animation/render.
 */

import { C } from '../components/types.js';
import { pickBestAction } from '../ai/utility-scorer.js';

export class AiDecisionSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/pathfinder.js').Pathfinder} deps.pathfinder
   * @param {import('../world/tilemap.js').Tilemap} deps.tilemap
   */
  constructor({ world, pathfinder, tilemap }) {
    this.world = world;
    this.pathfinder = pathfinder;
    this.tilemap = tilemap;
    // Inject tilemap into world for action.target accessors
    // (cheap shim — keeps action catalog free of constructor wiring)
    this.world.__tilemap = tilemap;
  }

  /** dt seconds (real, scaled by loop). */
  update(_dt) {
    const now = performance.now();

    for (const e of this.world.query([
      C.TagNPC, C.Transform, C.Needs, C.Personality, C.Intent,
    ])) {
      const intent = e[C.Intent];

      // Don't re-decide while in the middle of executing — let it finish.
      // Exception: if execute phase has run > 30s without progress, force a
      // re-decision (escape pathological stuck states).
      if (intent.phase === 'execute') {
        if (now - intent.startedAt < 30_000) continue;
      }

      const ctx = {
        entityId: e.id,
        transform: e[C.Transform],
        needs: e[C.Needs],
        personality: e[C.Personality],
        world: this.world,
        now,
      };

      const choice = pickBestAction(ctx, intent.actionId);
      if (!choice) continue;

      const { action, target } = choice;

      // If we picked a different action OR we have no current intent, swap.
      if (intent.actionId !== action.id || intent.phase === 'idle') {
        intent.actionId = action.id;
        intent.target = target;
        intent.duration = action.duration;
        intent.effects = action.effects || null;
        intent.anim = action.anim || 'idle';
        intent.rewardEmotion = action.rewardEmotion || null;
        intent.phase = 'travel';
        intent.chosenAt = now;
        intent.startedAt = 0;
      } else {
        // Same action chosen again — refresh target if it has moved (e.g.
        // socialize target Kip walked away).
        intent.target = target;
      }
    }
  }
}
