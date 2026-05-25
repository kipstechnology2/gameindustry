/**
 * Input System — translates user taps into either:
 *   (a) a tile pathfind request (tap on empty walkable tile)
 *   (b) an action wheel open (tap on an interactable object)
 *
 * Hit-testing for objects: pick the object whose footprint overlaps the
 * tapped world point. We use a generous radius so it works on touch with
 * sausage fingers.
 */

import { C } from '../components/types.js';
import { screenToTile } from '../utils/iso-math.js';
import { entityTile } from '../entities/player.js';

const OBJECT_HIT_RADIUS = 36; // world-px around object center

export class InputSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../utils/input-router.js').InputRouter} deps.input
   * @param {import('../world/camera.js').Camera} deps.camera
   * @param {import('../world/pathfinder.js').Pathfinder} deps.pathfinder
   * @param {import('../world/tilemap.js').Tilemap} deps.tilemap
   * @param {() => number} deps.getPlayerId
   * @param {(payload:{objectEntityId:number, screenX:number, screenY:number}) => void} [deps.onObjectTap]
   */
  constructor({ world, input, camera, pathfinder, tilemap, getPlayerId, onObjectTap }) {
    this.world = world;
    this.input = input;
    this.camera = camera;
    this.pathfinder = pathfinder;
    this.tilemap = tilemap;
    this.getPlayerId = getPlayerId;
    this.onObjectTap = onObjectTap || null;

    /** Last tap destination tile — for HUD/debug rendering. */
    this.lastDest = null;

    this._offTap = input.on('tap', (sx, sy) => this._onTap(sx, sy));
  }

  _onTap(screenX, screenY) {
    const playerId = this.getPlayerId();
    if (!playerId) return;

    // Convert screen → world
    const wx = (screenX - this.camera.viewportW / 2) / this.camera.zoom + this.camera.x;
    const wy = (screenY - this.camera.viewportH / 2) / this.camera.zoom + this.camera.y;

    // 1. Object hit-test first — tapping an object opens the action wheel
    const obj = this._objectAt(wx, wy);
    if (obj) {
      if (this.onObjectTap) this.onObjectTap({ objectEntityId: obj.id, screenX, screenY });
      return;
    }

    // 2. Otherwise: tile pathfind (ground tap → walk there)
    const tile = screenToTile(wx, wy - 16);
    const goalCol = Math.round(tile.col);
    const goalRow = Math.round(tile.row);

    if (!this.pathfinder.isWalkable(goalCol, goalRow)) {
      this.camera.shake(2);
      return;
    }

    const startTile = entityTile(this.world, playerId);
    if (!startTile) return;

    const path = this.world.getComponent(playerId, C.Path);
    if (!path) return;

    const waypoints = this.pathfinder.find(
      startTile.col, startTile.row, goalCol, goalRow
    );
    if (!waypoints) {
      this.camera.shake(3);
      return;
    }

    path.waypoints = waypoints;
    path.index = 0;
    this.lastDest = { col: goalCol, row: goalRow };

    // Cancel any in-progress player intent — explicit movement overrides
    const intent = this.world.getComponent(playerId, C.Intent);
    if (intent) {
      intent.phase = 'idle';
      intent.actionId = null;
      intent.target = null;
    }
  }

  _objectAt(wx, wy) {
    let best = null;
    let bestDistSq = OBJECT_HIT_RADIUS * OBJECT_HIT_RADIUS;
    for (const e of this.world.query([C.Transform, C.Interactable])) {
      const t = e[C.Transform];
      const dx = t.x - wx;
      const dy = t.y - wy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = e;
      }
    }
    return best;
  }

  destroy() {
    if (this._offTap) { this._offTap(); this._offTap = null; }
  }
}
