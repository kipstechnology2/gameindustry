/**
 * Build Mode — Workshop state machine.
 *
 * State:
 *   inactive   → normal play
 *   placing    → carrying a "ghost" furniture; tap to place
 *   selecting  → tap an existing object to act on it (move/delete)
 *
 * Build mode pauses time-of-day decay impact on the player (no fairness
 * concerns since needs are purely cosmetic during build), and disables
 * tap-to-walk so taps go to placement instead.
 *
 * Save/load:
 *   - Layout = list of { kind, col, row } for player-placed furniture.
 *   - serialize() returns the array.
 *   - deserialize(world, layout) re-creates the entities at boot.
 */

import { C } from '../components/types.js';
import { createObject } from '../entities/objects.js';

export const BUILD_STATE = Object.freeze({
  INACTIVE: 'inactive',
  PLACING:  'placing',
  SELECTING: 'selecting',
});

export class BuildMode {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/tilemap.js').Tilemap} deps.tilemap
   * @param {import('../world/pathfinder.js').Pathfinder} deps.pathfinder
   */
  constructor({ world, tilemap, pathfinder }) {
    this.world = world;
    this.tilemap = tilemap;
    this.pathfinder = pathfinder;

    this.state = BUILD_STATE.INACTIVE;
    /** When placing: the kind being held. */
    this.heldKind = null;
    /** Hover tile during placement (cleared by canvas-renderer each frame after read). */
    this.hoverTile = null;
    this.hoverValid = false;

    /** ECS ids of player-placed furniture (so save/load can identify them). */
    this._placedIds = new Set();

    /** Listeners for state transitions (UI subscribes to update its appearance). */
    this._listeners = [];
  }

  isActive() { return this.state !== BUILD_STATE.INACTIVE; }

  enter() {
    if (this.state !== BUILD_STATE.INACTIVE) return;
    this.state = BUILD_STATE.SELECTING;
    this.heldKind = null;
    this._notify();
  }

  exit() {
    if (this.state === BUILD_STATE.INACTIVE) return;
    this.state = BUILD_STATE.INACTIVE;
    this.heldKind = null;
    this.hoverTile = null;
    this.hoverValid = false;
    this._notify();
  }

  toggle() {
    if (this.state === BUILD_STATE.INACTIVE) this.enter();
    else this.exit();
  }

  /** Begin placing a piece of furniture. */
  pickKind(kind) {
    this.state = BUILD_STATE.PLACING;
    this.heldKind = kind;
    this._notify();
  }

  /** Update hover preview (called each frame by game.js with current tile). */
  setHover(col, row) {
    this.hoverTile = { col, row };
    this.hoverValid = this.canPlaceAt(col, row);
  }

  canPlaceAt(col, row) {
    if (!this.heldKind) return false;
    if (!this.tilemap.inBounds(col, row)) return false;
    if (!this.pathfinder.isWalkable(col, row)) return false;
    // No object already on this tile
    for (const e of this.world.query([C.Interactable])) {
      const i = e[C.Interactable];
      if (i.col === col && i.row === row) return false;
    }
    return true;
  }

  /** Confirm a placement at the hovered tile. Returns the new entity id, or null. */
  placeAtHover() {
    if (!this.heldKind || !this.hoverTile || !this.hoverValid) return null;
    const id = createObject(this.world, this.heldKind, this.hoverTile);
    this._placedIds.add(id);
    return id;
  }

  /** Delete an object (entity id). Only player-placed pieces may be removed. */
  removeObject(entityId) {
    if (!this._placedIds.has(entityId)) {
      // Don't allow deleting starter-spawned objects (anti-foot-gun)
      return false;
    }
    this.world.destroyEntity(entityId);
    this._placedIds.delete(entityId);
    return true;
  }

  /** Snapshot of all player-placed furniture for the save system. */
  serialize() {
    const layout = [];
    for (const id of this._placedIds) {
      const i = this.world.getComponent(id, C.Interactable);
      if (!i) continue;
      layout.push({ kind: i.objectKind, col: i.col, row: i.row });
    }
    return layout;
  }

  /** Restore a previously-saved layout. Returns the count of restored items. */
  deserialize(layout) {
    if (!Array.isArray(layout)) return 0;
    let n = 0;
    for (const item of layout) {
      try {
        const id = createObject(this.world, item.kind, { col: item.col, row: item.row });
        this._placedIds.add(id);
        n++;
      } catch (e) {
        console.warn('[build] failed to restore', item, e);
      }
    }
    return n;
  }

  /** Subscribe to state changes. Returns an unsubscribe fn. */
  onStateChange(fn) {
    this._listeners.push(fn);
    return () => {
      const idx = this._listeners.indexOf(fn);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  destroy() {
    this._placedIds.clear();
    this._listeners.length = 0;
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn(this.state, this.heldKind); } catch (e) { console.error('[build]', e); }
    }
  }
}
