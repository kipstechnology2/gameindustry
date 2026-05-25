/**
 * Player Interaction System — turns an action-wheel pick into an executable
 * intent for the player Kip.
 *
 * When the user picks an affordance from the wheel, we:
 *   1. Pathfind from the player's current tile to the object's tile.
 *   2. Write the player's Intent: phase='travel', target=object,
 *      effects/duration/anim from the affordance.
 *   3. The shared intent-execution-system handles the rest (travel →
 *      execute → apply effects → idle).
 *
 * The player only differs from NPCs in that *the player chose this*; under
 * the hood the same SM runs.
 */

import { C } from '../components/types.js';
import { AFFORDANCES } from '../interactions/affordance-catalog.js';
import { entityTile } from '../entities/player.js';

export class PlayerInteractionSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/pathfinder.js').Pathfinder} deps.pathfinder
   */
  constructor({ world, pathfinder }) {
    this.world = world;
    this.pathfinder = pathfinder;
  }

  /**
   * Trigger the pick.
   * @param {number} playerId
   * @param {string} affordanceId
   * @param {number} objectEntityId
   * @returns {boolean} true if intent was set
   */
  apply(playerId, affordanceId, objectEntityId) {
    const aff = AFFORDANCES[affordanceId];
    if (!aff) return false;

    const playerT = this.world.getComponent(playerId, C.Transform);
    const objT    = this.world.getComponent(objectEntityId, C.Transform);
    const objI    = this.world.getComponent(objectEntityId, C.Interactable);
    if (!playerT || !objT || !objI) return false;

    const intent = this.world.getComponent(playerId, C.Intent);
    if (!intent) return false;

    const path = this.world.getComponent(playerId, C.Path);
    const start = entityTile(this.world, playerId);
    if (!start) return false;

    // Try to walk *adjacent* to the object — bench/bed placement means the
    // exact tile may itself be unwalkable (object footprint).
    const goal = pickAdjacentWalkable(
      this.pathfinder, start, { col: objI.col, row: objI.row });
    if (!goal) return false;

    const waypoints = this.pathfinder.find(start.col, start.row, goal.col, goal.row);
    if (!waypoints) return false;

    if (path) {
      path.waypoints = waypoints;
      path.index = 0;
    }

    intent.actionId = 'player.' + affordanceId;
    intent.phase = 'travel';
    intent.target = { x: objT.x, y: objT.y, entityId: objectEntityId };
    intent.duration = aff.duration;
    intent.effects = aff.effects;
    intent.anim = aff.anim;
    intent.rewardEmotion = null;
    intent.startedAt = 0;
    intent.chosenAt = performance.now();

    return true;
  }
}

/**
 * Find a walkable tile adjacent to (or at) the object — try the object tile
 * first, then 4-neighbors, then 8-neighbors.
 */
function pickAdjacentWalkable(pathfinder, start, target) {
  if (pathfinder.isWalkable(target.col, target.row)) return target;
  const offsets = [
    { dc:  0, dr: 1 }, { dc:  1, dr: 0 }, { dc:  0, dr: -1 }, { dc: -1, dr: 0 },
    { dc:  1, dr: 1 }, { dc:  1, dr: -1 }, { dc: -1, dr: 1 }, { dc: -1, dr: -1 },
  ];
  for (const o of offsets) {
    const c = target.col + o.dc;
    const r = target.row + o.dr;
    if (pathfinder.isWalkable(c, r)) return { col: c, row: r };
  }
  return null;
}
