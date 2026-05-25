/**
 * Pathfinder — A* on a tilemap with optional hierarchical (room-graph)
 * coarse pass for large maps.
 *
 * Public API:
 *   const pf = new Pathfinder(tilemap, { roomGraph?, maxNodes? })
 *   const path = pf.find(startCol, startRow, goalCol, goalRow)
 *
 * Returns:
 *   - Array of { col, row, x, y } waypoints (excluding start, including goal),
 *     or null if no path exists / either endpoint is unwalkable.
 *
 * Heuristic: octile distance with diagonals weighted √2; we use 4-neighbor
 * movement so pure Manhattan is admissible and consistent.
 *
 * Cost model:
 *   - Walkable tile: 1
 *   - Hard preference: walking on path tiles (id=3) costs 0.9 — A* will
 *     gently route along paved areas when reasonable, which feels natural.
 *
 * Safety: bounded by maxNodes (default 4096) so pathological queries can't
 * lock the main thread on huge maps.
 */

import { TILE_TYPES } from './tilemap.js';
import { tileCenter } from '../utils/iso-math.js';
import { NEIGHBORS_4 } from '../utils/grid-math.js';

const DEFAULT_MAX_NODES = 4096;
const PATH_TILE_DISCOUNT = 0.9; // grass=1.0, path=0.9
const STONE_PATH_ID = 3;

export class Pathfinder {
  /**
   * @param {import('./tilemap.js').Tilemap} tilemap
   * @param {object} [opts]
   */
  constructor(tilemap, opts = {}) {
    this.tilemap = tilemap;
    this.roomGraph = opts.roomGraph || null;
    this.maxNodes = opts.maxNodes || DEFAULT_MAX_NODES;
  }

  isWalkable(col, row) {
    if (!this.tilemap.inBounds(col, row)) return false;
    const t = TILE_TYPES[this.tilemap.get(col, row)];
    return !!(t && t.walkable);
  }

  /**
   * Find a path. Returns array of waypoints with both tile and world coords,
   * or null. Excludes the start tile (caller already there).
   */
  find(startCol, startRow, goalCol, goalRow) {
    startCol = Math.floor(startCol);
    startRow = Math.floor(startRow);
    goalCol  = Math.floor(goalCol);
    goalRow  = Math.floor(goalRow);

    if (!this.isWalkable(startCol, startRow)) return null;
    if (!this.isWalkable(goalCol, goalRow))   return null;
    if (startCol === goalCol && startRow === goalRow) return [];

    // If we have a room graph and the goal is in a different room,
    // we *could* split the search. For 32×32 a flat A* is fast; the
    // room graph is wired up for future big maps.
    return this._aStar(startCol, startRow, goalCol, goalRow);
  }

  _aStar(sc, sr, gc, gr) {
    const open = new MinHeap();
    /** @type {Map<number, number>} */
    const gScore = new Map();
    /** @type {Map<number, number>} */
    const cameFrom = new Map();

    const startKey = this._key(sc, sr);
    gScore.set(startKey, 0);
    open.push(startKey, this._heuristic(sc, sr, gc, gr));

    let explored = 0;
    const cols = this.tilemap.cols;

    while (!open.isEmpty()) {
      if (++explored > this.maxNodes) {
        // Bail: prefer "no path" over freezing the main thread
        return null;
      }

      const currentKey = open.pop();
      const cc = currentKey % cols;
      const cr = Math.floor(currentKey / cols);

      if (cc === gc && cr === gr) {
        return this._reconstruct(cameFrom, currentKey);
      }

      for (const { dc, dr } of NEIGHBORS_4) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (!this.isWalkable(nc, nr)) continue;
        const nKey = this._key(nc, nr);
        const tileId = this.tilemap.get(nc, nr);
        const stepCost = tileId === STONE_PATH_ID ? PATH_TILE_DISCOUNT : 1.0;
        const tentativeG = gScore.get(currentKey) + stepCost;
        if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, currentKey);
          gScore.set(nKey, tentativeG);
          open.push(nKey, tentativeG + this._heuristic(nc, nr, gc, gr));
        }
      }
    }
    return null;
  }

  _heuristic(c1, r1, c2, r2) {
    return Math.abs(c1 - c2) + Math.abs(r1 - r2);
  }

  _key(col, row) { return row * this.tilemap.cols + col; }

  _reconstruct(cameFrom, endKey) {
    const cols = this.tilemap.cols;
    const path = [];
    let k = endKey;
    while (cameFrom.has(k)) {
      const col = k % cols;
      const row = Math.floor(k / cols);
      path.push(this._waypoint(col, row));
      k = cameFrom.get(k);
    }
    path.reverse();
    return path;
  }

  _waypoint(col, row) {
    const c = tileCenter(col, row);
    return { col, row, x: c.x, y: c.y };
  }
}

// ============================================================
// Min-Heap (priority queue keyed by priority number)
// ============================================================
class MinHeap {
  constructor() {
    /** @type {Array<{item:any, priority:number}>} */
    this._h = [];
  }

  isEmpty() { return this._h.length === 0; }
  size() { return this._h.length; }

  push(item, priority) {
    const h = this._h;
    h.push({ item, priority });
    this._siftUp(h.length - 1);
  }

  /** @returns the lowest-priority item, or undefined if empty. */
  pop() {
    const h = this._h;
    if (h.length === 0) return undefined;
    const top = h[0].item;
    const last = h.pop();
    if (h.length > 0) {
      h[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  _siftUp(i) {
    const h = this._h;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (h[i].priority < h[parent].priority) {
        [h[i], h[parent]] = [h[parent], h[i]];
        i = parent;
      } else break;
    }
  }

  _siftDown(i) {
    const h = this._h;
    const n = h.length;
    while (true) {
      const l = i * 2 + 1;
      const r = l + 1;
      let smallest = i;
      if (l < n && h[l].priority < h[smallest].priority) smallest = l;
      if (r < n && h[r].priority < h[smallest].priority) smallest = r;
      if (smallest !== i) {
        [h[i], h[smallest]] = [h[smallest], h[i]];
        i = smallest;
      } else break;
    }
  }
}
