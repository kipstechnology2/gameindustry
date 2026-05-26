/**
 * Tilemap — 2D grid of tile type IDs.
 *
 * Storage: flat Uint8Array (cols × rows). Up to 256 tile types.
 * Indexing: tiles[row * cols + col]. (Row-major; matches drawing order.)
 *
 * No chunking yet — that lands in 3b once map size grows past ~64².
 */

export class Tilemap {
  /**
   * @param {number} cols
   * @param {number} rows
   * @param {number} [defaultType] tile id to fill with
   */
  constructor(cols, rows, defaultType = 0) {
    if (cols <= 0 || rows <= 0) throw new Error('tilemap dims must be > 0');
    if (cols > 4096 || rows > 4096) throw new Error('tilemap too large');
    this.cols = cols;
    this.rows = rows;
    this.tiles = new Uint8Array(cols * rows);
    if (defaultType !== 0) this.tiles.fill(defaultType);
  }

  inBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  get(col, row) {
    if (!this.inBounds(col, row)) return 0;
    return this.tiles[row * this.cols + col];
  }

  set(col, row, type) {
    if (!this.inBounds(col, row)) return;
    this.tiles[row * this.cols + col] = type;
  }

  fill(type) { this.tiles.fill(type); }

  /** Fill a rectangular region (inclusive). */
  fillRect(col0, row0, col1, row1, type) {
    const c0 = Math.max(0, Math.min(col0, col1));
    const c1 = Math.min(this.cols - 1, Math.max(col0, col1));
    const r0 = Math.max(0, Math.min(row0, row1));
    const r1 = Math.min(this.rows - 1, Math.max(row0, row1));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        this.tiles[r * this.cols + c] = type;
      }
    }
  }

  // -------- save/load --------
  serialize() {
    // Encode as base64 of the underlying byte buffer
    let bin = '';
    for (let i = 0; i < this.tiles.length; i++) bin += String.fromCharCode(this.tiles[i]);
    return { cols: this.cols, rows: this.rows, data: btoa(bin) };
  }

  static deserialize({ cols, rows, data }) {
    const map = new Tilemap(cols, rows);
    const bin = atob(data);
    for (let i = 0; i < bin.length; i++) map.tiles[i] = bin.charCodeAt(i);
    return map;
  }
}

/**
 * Tile type catalog.
 * Each entry: { id, name, r, g, b, walkable, isRoad? }
 *
 * Colors are mid-day full-brightness; lighting module multiplies by ambient.
 */
export const TILE_TYPES = Object.freeze({
  0: Object.freeze({ id: 0, name: 'void',         r: 0,   g: 0,   b: 0,   walkable: false }),
  1: Object.freeze({ id: 1, name: 'grass-light',  r: 142, g: 198, b: 110, walkable: true  }),
  2: Object.freeze({ id: 2, name: 'grass-dark',   r: 122, g: 178, b: 92,  walkable: true  }),
  3: Object.freeze({ id: 3, name: 'path-stone',   r: 198, g: 184, b: 152, walkable: true  }),
  4: Object.freeze({ id: 4, name: 'water',        r: 92,  g: 158, b: 220, walkable: false }),
  5: Object.freeze({ id: 5, name: 'sand',         r: 232, g: 212, b: 168, walkable: true  }),
  6: Object.freeze({ id: 6, name: 'flowers-pink', r: 230, g: 168, b: 195, walkable: true  }),
  7: Object.freeze({ id: 7, name: 'wood-floor',   r: 188, g: 142, b: 88,  walkable: true  }),
  8: Object.freeze({ id: 8, name: 'tile-floor',   r: 220, g: 220, b: 226, walkable: true  }),

  // Urban infrastructure (Big City pack)
  9:  Object.freeze({ id: 9,  name: 'asphalt',     r: 56,  g: 60,  b: 68,  walkable: true,  isRoad: true }),
  10: Object.freeze({ id: 10, name: 'sidewalk',    r: 178, g: 180, b: 186, walkable: true,  isSidewalk: true }),
  11: Object.freeze({ id: 11, name: 'crosswalk',   r: 56,  g: 60,  b: 68,  walkable: true,  isRoad: true, isCrosswalk: true }),
  12: Object.freeze({ id: 12, name: 'grass-park',  r: 132, g: 188, b: 100, walkable: true  }),
  13: Object.freeze({ id: 13, name: 'cobblestone', r: 168, g: 156, b: 132, walkable: true  }),
});

/** Looks up tile def; returns void if unknown. */
export function getTileType(id) {
  return TILE_TYPES[id] || TILE_TYPES[0];
}
