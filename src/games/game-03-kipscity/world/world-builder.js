/**
 * World Builder — generates the starter neighborhood.
 *
 * For Batch 3a: a small park-like map showing off lighting + tile variety.
 * Future batches: biomes, building lots, procedural districts.
 *
 * Layout (32×32):
 *   - grass checker base
 *   - cross-shaped stone path through the center
 *   - pond with sandy beach in north-west quadrant
 *   - flower clusters scattered for color
 *   - small plaza of tile-floor at center crossing
 */

import { Tilemap } from './tilemap.js';

export const STARTER_MAP_COLS = 32;
export const STARTER_MAP_ROWS = 32;

export function buildStarterMap(rng) {
  const map = new Tilemap(STARTER_MAP_COLS, STARTER_MAP_ROWS);

  // 1. Checker grass base
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const checker = (Math.floor(r / 2) + Math.floor(c / 2)) & 1;
      map.set(c, r, checker ? 1 : 2);
    }
  }

  // 2. Cross paths
  const midC = Math.floor(map.cols / 2);
  const midR = Math.floor(map.rows / 2);
  // Horizontal path (3 tiles wide)
  map.fillRect(0, midR - 1, map.cols - 1, midR + 1, 3);
  // Vertical path (3 tiles wide)
  map.fillRect(midC - 1, 0, midC + 1, map.rows - 1, 3);

  // 3. Central plaza (5×5 tile-floor at the crossing)
  map.fillRect(midC - 2, midR - 2, midC + 2, midR + 2, 8);

  // 4. Pond + beach in north-west (avoid path)
  const pondC0 = 4, pondR0 = 4, pondC1 = 8, pondR1 = 8;
  // Beach ring first
  map.fillRect(pondC0 - 1, pondR0 - 1, pondC1 + 1, pondR1 + 1, 5);
  // Water inside
  map.fillRect(pondC0, pondR0, pondC1, pondR1, 4);

  // 5. Scatter flower patches in safe spots
  if (rng) {
    let placed = 0;
    let attempts = 0;
    while (placed < 18 && attempts < 200) {
      attempts++;
      const c = rng.rangeInt(1, map.cols - 2);
      const r = rng.rangeInt(1, map.rows - 2);
      const t = map.get(c, r);
      // Only on grass, not on paths/water/plaza
      if (t !== 1 && t !== 2) continue;
      // Don't put flowers right next to water for a cleaner look
      let nearWater = false;
      for (let dr = -1; dr <= 1 && !nearWater; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (map.get(c + dc, r + dr) === 4) { nearWater = true; break; }
        }
      }
      if (nearWater) continue;
      map.set(c, r, 6);
      placed++;
    }
  }

  return map;
}

/** The "spawn point" tile column/row — the player will appear here in 3c. */
export function getStarterSpawn() {
  return { col: STARTER_MAP_COLS / 2, row: STARTER_MAP_ROWS / 2 };
}
