/**
 * Input System — mode-aware tap dispatcher.
 *
 * Supports four modes (set externally via setMode):
 *   - 'play'          (default) tap object → onObjectTap; tap tile → walk + onTileTap
 *   - 'build-place'   tap tile → onTileTap (placement); object taps fall through
 *   - 'build-select'  tap object → onObjectTap (delete); tile taps ignored
 *   - 'disabled'      ignores all taps
 */

import { C } from '../components/types.js';
import { screenToTile } from '../utils/iso-math.js';
import { entityTile } from '../entities/player.js';

const OBJECT_HIT_RADIUS = 36; // world-px around object center

export const INPUT_MODE = Object.freeze({
  PLAY:         'play',
  BUILD_PLACE:  'build-place',
  BUILD_SELECT: 'build-select',
  DISABLED:     'disabled',
});

export class InputSystem {
  constructor({ world, input, camera, pathfinder, tilemap,
                getPlayerId, onObjectTap, onTileTap }) {
    this.world = world;
    this.input = input;
    this.camera = camera;
    this.pathfinder = pathfinder;
    this.tilemap = tilemap;
    this.getPlayerId = getPlayerId;
    this.onObjectTap = onObjectTap || null;
    this.onTileTap = onTileTap || null;

    this.mode = INPUT_MODE.PLAY;
    this.lastDest = null;

    this._offTap = input.on('tap', (sx, sy) => this._onTap(sx, sy));
  }

  setMode(mode) {
    this.mode = mode;
  }

  _onTap(screenX, screenY) {
    if (this.mode === INPUT_MODE.DISABLED) return;
    const playerId = this.getPlayerId();
    if (!playerId) return;

    // Screen → world
    const wx = (screenX - this.camera.viewportW / 2) / this.camera.zoom + this.camera.x;
    const wy = (screenY - this.camera.viewportH / 2) / this.camera.zoom + this.camera.y;

    // Object hit-test
    const obj = this._objectAt(wx, wy);
    if (obj && this.mode !== INPUT_MODE.BUILD_PLACE) {
      if (this.onObjectTap) {
        this.onObjectTap({ objectEntityId: obj.id, screenX, screenY });
      }
      return;
    }

    // In build-select, ignore tile taps
    if (this.mode === INPUT_MODE.BUILD_SELECT) return;

    // Tile tap
    const tile = screenToTile(wx, wy - 16);
    const goalCol = Math.round(tile.col);
    const goalRow = Math.round(tile.row);

    // Build-place: hand off to onTileTap, do not walk
    if (this.mode === INPUT_MODE.BUILD_PLACE) {
      if (this.onTileTap) this.onTileTap({ col: goalCol, row: goalRow, screenX, screenY });
      return;
    }

    // Default play mode: walk there
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

    if (this.onTileTap) this.onTileTap({ col: goalCol, row: goalRow, screenX, screenY });
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
