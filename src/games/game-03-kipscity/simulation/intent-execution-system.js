/**
 * Intent Execution System — drives the 3-phase intent state machine.
 *
 *   idle      → nothing to do
 *   travel    → pathfind + walk to target
 *   execute   → play animation for `duration` seconds
 *   complete  → apply effects, return to idle (decision system picks next)
 *
 * Runs for ANY entity with an Intent component — NPCs (set by AI) and the
 * player (set by player-interaction-system after action-wheel pick) follow
 * the same SM. Only the source of the Intent differs.
 *
 * Why not a full Behavior Tree? For Batch 3e, every action follows the same
 * shape (go-somewhere → do-something → reward), so a 3-state SM is cleaner
 * and faster than a generic BT runner. We can swap to BT when action variety
 * expands (3i+).
 */

import { C, EMOTION } from '../components/types.js';
import { applyEffects } from './needs-system.js';
import { entityTile } from '../entities/player.js';
import { setState } from '../animation/sprite-anim.js';
import { screenToTile } from '../utils/iso-math.js';

const ARRIVAL_TILE_RADIUS = 1.2; // tiles
const ARRIVAL_PX_SQ = (ARRIVAL_TILE_RADIUS * 32) * (ARRIVAL_TILE_RADIUS * 32);

export class IntentExecutionSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/pathfinder.js').Pathfinder} deps.pathfinder
   */
  constructor({ world, pathfinder }) {
    this.world = world;
    this.pathfinder = pathfinder;
  }

  update(dt) {
    if (dt <= 0) return;
    const now = performance.now();

    for (const e of this.world.query([
      C.Transform, C.Intent, C.Path, C.Animator,
    ])) {
      const intent = e[C.Intent];
      if (intent.phase === 'idle' || !intent.actionId) continue;

      const t = e[C.Transform];
      const a = e[C.Animator];
      const path = e[C.Path];

      // -------- TRAVEL --------
      if (intent.phase === 'travel') {
        if (!intent.target) {
          intent.phase = 'idle';
          continue;
        }

        const dx = intent.target.x - t.x;
        const dy = intent.target.y - t.y;
        const d2 = dx * dx + dy * dy;
        const arrivedDirectly = d2 < ARRIVAL_PX_SQ;
        const pathFinished = !path.waypoints;

        if (arrivedDirectly && pathFinished) {
          intent.phase = 'execute';
          intent.startedAt = now;
          continue;
        }

        // If we don't have a path yet, request one
        if (!path.waypoints) {
          const start = entityTile(this.world, e.id);
          if (!start) { intent.phase = 'idle'; continue; }

          const tileXY = screenToTile(intent.target.x, intent.target.y - 16);
          const goalCol = Math.round(tileXY.col);
          const goalRow = Math.round(tileXY.row);

          let wpts = this.pathfinder.find(start.col, start.row, goalCol, goalRow);
          if (!wpts) {
            // Try neighbor tiles
            const offsets = [{ dc: 0, dr: 0 }, { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
                             { dc: 0, dr: 1 }, { dc: 0, dr: -1 }];
            for (const o of offsets) {
              const w = this.pathfinder.find(start.col, start.row,
                                             goalCol + o.dc, goalRow + o.dr);
              if (w) { wpts = w; break; }
            }
          }
          if (!wpts) {
            intent.phase = 'idle';
            continue;
          }
          path.waypoints = wpts.length > 0 ? wpts : null;
          path.index = 0;

          // If the path is empty (already at goal), transition to execute
          if (!path.waypoints) {
            intent.phase = 'execute';
            intent.startedAt = now;
          }
          continue;
        }

        // Path is in progress — wait for path-follow-system to finish it.
        // (path.waypoints will be null when done.)
        if (pathFinished) {
          intent.phase = 'execute';
          intent.startedAt = now;
        }
        continue;
      }

      // -------- EXECUTE --------
      if (intent.phase === 'execute') {
        if (intent.anim) setState(a, intent.anim);

        intent.duration -= dt;
        if (intent.duration <= 0) {
          // Apply effects to needs
          if (intent.effects) {
            const needs = this.world.getComponent(e.id, C.Needs);
            if (needs) applyEffects(needs, intent.effects);
          }
          // Inject reward emotion
          if (intent.rewardEmotion) {
            const em = this.world.getComponent(e.id, C.Emotion);
            if (em) {
              em.state = intent.rewardEmotion;
              em.intensity = 0.7;
              em.timer = 6;
            }
          }
          // Reset
          intent.phase = 'idle';
          intent.actionId = null;
          intent.target = null;
          intent.effects = null;
          intent.anim = null;
          intent.rewardEmotion = null;
        }
      }
    }
  }
}
