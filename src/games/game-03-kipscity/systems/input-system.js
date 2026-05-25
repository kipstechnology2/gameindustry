/**
 * Input System — translates user taps into pathfind requests for the player.
 *
 * Behavior:
 *   - Tap on a walkable tile → request path from player tile to clicked tile,
 *     write the resulting waypoints into the player's Path component.
 *   - Tap on an unwalkable tile → ignore (with a tiny camera shake for
 *     subtle feedback so the player learns the tile types).
 *   - Pan/zoom/pinch are handled directly by game.js wiring; this system
 *     only owns the tap-to-move semantic.
 *
 * The system is event-driven (subscribes once on construction, unsubscribes
 * on destroy). It does not run per-frame.
 */

import { C } from '../components/types.js';
import { screenToTile } from '../utils/iso-math.js';
import { entityTile } from '../entities/player.js';

export class InputSystem {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../utils/input-router.js').InputRouter} deps.input
   * @param {import('../world/camera.js').Camera} deps.camera
   * @param {import('../world/pathfinder.js').Pathfinder} deps.pathfinder
   * @param {import('../world/tilemap.js').Tilemap} deps.tilemap
   * @param {() => number} deps.getPlayerId  callback returning the current player entity id
   */
  constructor({ world, input, camera, pathfinder, tilemap, getPlayerId }) {
    this.world = world;
    this.input = input;
    this.camera = camera;
    this.pathfinder = pathfinder;
    this.tilemap = tilemap;
    this.getPlayerId = getPlayerId;

    /** Path destination for HUD/debug rendering. */
    this.lastDest = null;

    this._offTap = input.on('tap', (sx, sy) => this._onTap(sx, sy));
  }

  _onTap(screenX, screenY) {
    const playerId = this.getPlayerId();
    if (!playerId) return;

    // Screen → world (camera transform)
    const wx = (screenX - this.camera.viewportW / 2) / this.camera.zoom + this.camera.x;
    const wy = (screenY - this.camera.viewportH / 2) / this.camera.zoom + this.camera.y;

    // World → tile (subtract HH so we hit the *center* of the diamond)
    const tile = screenToTile(wx, wy - 16);
    const goalCol = Math.round(tile.col);
    const goalRow = Math.round(tile.row);

    if (!this.pathfinder.isWalkable(goalCol, goalRow)) {
      // Subtle UX: feedback that the tile isn't walkable
      this.camera.shake(2);
      return;
    }

    const startTile = entityTile(this.world, playerId);
    if (!startTile) return;

    const path = this.world.getComponent(playerId, C.Path);
    if (!path) return;

    const waypoints = this.pathfinder.find(
      startTile.col, startTile.row,
      goalCol, goalRow
    );

    if (!waypoints) {
      // No path (rare on this map, but possible if tiles get disconnected)
      this.camera.shake(3);
      return;
    }

    // Writing into the existing component preserves entity archetype
    path.waypoints = waypoints;
    path.index = 0;
    this.lastDest = { col: goalCol, row: goalRow };
  }

  destroy() {
    if (this._offTap) { this._offTap(); this._offTap = null; }
  }
}
