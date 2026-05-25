/**
 * 2D Spatial Hash — for fast proximity queries.
 *
 * Grid divides world into square cells. Each cell holds a set of entity IDs
 * currently inside it. Querying "all entities within radius R of (x,y)" only
 * inspects ⌈R / cellSize⌉² cells instead of every entity.
 *
 * Used by:
 *   - conversation-system  (find Kips within talk range)
 *   - relationship-system  (social attraction)
 *   - pathfinding          (local steering / collision avoidance)
 *
 * Coordinates are world-space (not tile-space). cellSize is in world units.
 */

export class SpatialHash {
  constructor(cellSize = 64) {
    if (cellSize <= 0) throw new Error('cellSize must be > 0');
    this.cellSize = cellSize;
    /** @type {Map<string, Set<number>>} "cx,cy" → entity ids */
    this._grid = new Map();
    /** @type {Map<number, string>} entityId → cell key */
    this._where = new Map();
  }

  _key(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  /** Insert or move an entity to its current world position. */
  set(id, x, y) {
    const key = this._key(x, y);
    const old = this._where.get(id);
    if (old === key) return;

    if (old !== undefined) {
      const set = this._grid.get(old);
      if (set) { set.delete(id); if (set.size === 0) this._grid.delete(old); }
    }

    let bucket = this._grid.get(key);
    if (!bucket) { bucket = new Set(); this._grid.set(key, bucket); }
    bucket.add(id);
    this._where.set(id, key);
  }

  remove(id) {
    const key = this._where.get(id);
    if (key === undefined) return;
    const set = this._grid.get(key);
    if (set) { set.delete(id); if (set.size === 0) this._grid.delete(key); }
    this._where.delete(id);
  }

  /** Iterate ids in cells overlapping the given AABB (world coords). */
  *queryAABB(minX, minY, maxX, maxY) {
    const cs = this.cellSize;
    const cx0 = Math.floor(minX / cs);
    const cy0 = Math.floor(minY / cs);
    const cx1 = Math.floor(maxX / cs);
    const cy1 = Math.floor(maxY / cs);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const set = this._grid.get(`${cx},${cy}`);
        if (!set) continue;
        for (const id of set) yield id;
      }
    }
  }

  /**
   * Iterate ids whose cell *might* contain points within `radius` of (x,y).
   * Caller must verify exact distance (cells are coarser than circles).
   */
  *queryRadius(x, y, radius) {
    yield* this.queryAABB(x - radius, y - radius, x + radius, y + radius);
  }

  size() { return this._where.size; }

  clear() {
    this._grid.clear();
    this._where.clear();
  }
}
