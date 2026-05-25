/**
 * Room Graph — flood-fill connectivity regions for hierarchical pathfinding.
 *
 * For a 32×32 starter map, flat A* is plenty fast. This module exists so
 * future bigger maps (3j+) get HPA*-style coarse-then-fine pathfinding for
 * free: high-level path goes "kitchen → hallway → park", refined inside
 * each region.
 *
 * Algorithm:
 *   1. Walk all walkable tiles, BFS-flood any unassigned tile to give all
 *      members the same regionId.
 *   2. Compute portal points = walkable tiles whose 4-neighbors include a
 *      different regionId (in this batch every region is its own connected
 *      component, so no inter-region portals are produced — they appear
 *      once doors / walls are added).
 *
 * Output:
 *   - regionMap: Uint16Array(cols × rows), value = regionId (0 = void)
 *   - regions:   Array<{ id, tiles:number, bounds:{minC,minR,maxC,maxR} }>
 *
 * Cost: O(cols × rows). For 32×32 this is ~1ms; on 256×256 it's ~50ms,
 * still fine if computed once at world-build time.
 */

import { TILE_TYPES } from './tilemap.js';
import { NEIGHBORS_4 } from '../utils/grid-math.js';

export class RoomGraph {
  /** @param {import('./tilemap.js').Tilemap} tilemap */
  constructor(tilemap) {
    this.tilemap = tilemap;
    this.cols = tilemap.cols;
    this.rows = tilemap.rows;
    this.regionMap = new Uint16Array(this.cols * this.rows);
    /** @type {Array<{id:number, tiles:number, bounds:{minC:number,minR:number,maxC:number,maxR:number}}>} */
    this.regions = [];
    this._build();
  }

  regionAt(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;
    return this.regionMap[row * this.cols + col];
  }

  _build() {
    const tm = this.tilemap;
    const cols = this.cols;
    const rows = this.rows;
    let nextId = 1;
    const queue = [];

    const isWalkable = (col, row) => {
      if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
      const id = tm.tiles[row * cols + col];
      const t = TILE_TYPES[id];
      return !!(t && t.walkable);
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (this.regionMap[idx] !== 0) continue;       // already labeled
        if (!isWalkable(c, r)) continue;               // void / unwalkable

        const id = nextId++;
        let tiles = 0;
        let minC = c, minR = r, maxC = c, maxR = r;

        queue.length = 0;
        queue.push(idx);
        this.regionMap[idx] = id;

        // BFS flood
        while (queue.length > 0) {
          const cur = queue.shift();
          const cc = cur % cols;
          const cr = Math.floor(cur / cols);
          tiles++;
          if (cc < minC) minC = cc; if (cc > maxC) maxC = cc;
          if (cr < minR) minR = cr; if (cr > maxR) maxR = cr;

          for (const { dc, dr } of NEIGHBORS_4) {
            const nc = cc + dc;
            const nr = cr + dr;
            if (!isWalkable(nc, nr)) continue;
            const nIdx = nr * cols + nc;
            if (this.regionMap[nIdx] !== 0) continue;
            this.regionMap[nIdx] = id;
            queue.push(nIdx);
          }
        }

        this.regions.push({ id, tiles, bounds: { minC, minR, maxC, maxR } });
      }
    }
  }

  /** Number of distinct connected walkable regions (0 = unwalkable, excluded). */
  get regionCount() { return this.regions.length; }
}
