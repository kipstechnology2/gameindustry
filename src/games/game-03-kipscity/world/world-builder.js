/**
 * World Builder — generates the Kips City neighborhood.
 *
 * Layout (128×128 grid divided by central crossroads):
 *
 *   ╔════════════╤════════════╗
 *   ║ ASIAN QTR  │ URBAN MOD  ║   ← North half (rows 0..63)
 *   ║  (NW)      │  (NE)      ║
 *   ╠══════<HRD>═╪═<HRD>══════╣   ← Horizontal main road (rows 62-66)
 *   ║ COZY SUBR  │ MARKET     ║   ← South half (rows 67..127)
 *   ║  (SW)      │  (SE)      ║
 *   ╚════════════╧════════════╝
 *                ↑
 *           Vertical main road (cols 62-66)
 *
 * Roads:
 *   - Main horizontal: rows 62..66 (3-tile asphalt + 1-tile sidewalks each side)
 *   - Main vertical:   cols 62..66 (same)
 *   - Crosswalks at the central intersection
 *   - Each district has 1-2 secondary streets (1-tile asphalt) for variety
 *
 * Districts:
 *   - NW Asian:    rows 0..61, cols 0..61      — slightly cobblestone base
 *   - NE Urban:    rows 0..61, cols 67..127    — tile-floor city blocks
 *   - SW Suburbs:  rows 67..127, cols 0..61    — grass-heavy with cozy paths
 *   - SE Market:   rows 67..127, cols 67..127  — mixed plaza + market
 *
 * Spawn points provided per-district so npc-roster + objects can place
 * themselves without overlapping the road network.
 */

import { Tilemap } from './tilemap.js';

export const STARTER_MAP_COLS = 128;
export const STARTER_MAP_ROWS = 128;

const ROAD_THICKNESS = 3;     // asphalt tiles wide
const SIDEWALK_THICKNESS = 1;  // sidewalk on each side

// District region boundaries (inclusive-exclusive). The road occupies
// the gap between them.
export const DISTRICTS = Object.freeze({
  ASIAN:   { name: 'asian',   minCol: 1,   maxCol: 60,  minRow: 1,   maxRow: 60  },
  URBAN:   { name: 'urban',   minCol: 68,  maxCol: 127, minRow: 1,   maxRow: 60  },
  SUBURBS: { name: 'suburbs', minCol: 1,   maxCol: 60,  minRow: 68,  maxRow: 127 },
  MARKET:  { name: 'market',  minCol: 68,  maxCol: 127, minRow: 68,  maxRow: 127 },
});

// Center of map = central plaza intersection
const CENTER_COL = 64;
const CENTER_ROW = 64;

export function buildStarterMap(rng) {
  const map = new Tilemap(STARTER_MAP_COLS, STARTER_MAP_ROWS);

  // 1. Base tiles per district
  fillDistrict(map, DISTRICTS.ASIAN,   { base: 13, accent: 1, accentChance: 0.25 }); // cobblestone + grass tufts
  fillDistrict(map, DISTRICTS.URBAN,   { base: 8,  accent: 13, accentChance: 0.18 }); // tile floor + cobble
  fillDistrict(map, DISTRICTS.SUBURBS, { base: 1,  accent: 2,  accentChance: 0.5 });  // checker grass
  fillDistrict(map, DISTRICTS.MARKET,  { base: 12, accent: 6,  accentChance: 0.12 }); // park grass + flowers

  // Initialize the road corridor rows/cols as grass first (clean canvas)
  // Then we overlay roads on top.
  for (let r = CENTER_ROW - ROAD_THICKNESS - SIDEWALK_THICKNESS;
           r <= CENTER_ROW + ROAD_THICKNESS + SIDEWALK_THICKNESS; r++) {
    for (let c = 0; c < map.cols; c++) {
      if (map.get(c, r) === 0) map.set(c, r, 1);
    }
  }
  for (let c = CENTER_COL - ROAD_THICKNESS - SIDEWALK_THICKNESS;
           c <= CENTER_COL + ROAD_THICKNESS + SIDEWALK_THICKNESS; c++) {
    for (let r = 0; r < map.rows; r++) {
      if (map.get(c, r) === 0) map.set(c, r, 1);
    }
  }

  // 2. Build main roads (asphalt + sidewalks)
  buildHorizontalRoad(map, CENTER_ROW);
  buildVerticalRoad(map, CENTER_COL);

  // 3. Crosswalks at the central intersection (4 directions)
  buildCrosswalks(map, CENTER_COL, CENTER_ROW);

  // 4. Secondary streets within each district
  buildSecondaryStreets(map, rng);

  // 5. Sprinkle decorative tiles per district
  sprinkleDistrictDetails(map, rng);

  return map;
}

// ============================================================
// District base fill
// ============================================================
function fillDistrict(map, region, { base, accent, accentChance }) {
  for (let r = region.minRow; r <= region.maxRow; r++) {
    for (let c = region.minCol; c <= region.maxCol; c++) {
      // Light variation: every other 2x2 block uses accent
      const useAccent = ((Math.floor(r / 2) + Math.floor(c / 2)) & 1) === 0
                        && Math.random() < accentChance;
      map.set(c, r, useAccent ? accent : base);
    }
  }
}

// ============================================================
// Roads
// ============================================================
function buildHorizontalRoad(map, centerRow) {
  // Sidewalks
  const swTop = centerRow - ROAD_THICKNESS - SIDEWALK_THICKNESS;
  const swBot = centerRow + ROAD_THICKNESS + SIDEWALK_THICKNESS;
  for (let c = 0; c < map.cols; c++) {
    for (let dr = 1; dr <= SIDEWALK_THICKNESS; dr++) {
      map.set(c, centerRow - ROAD_THICKNESS - dr, 10);
      map.set(c, centerRow + ROAD_THICKNESS + dr, 10);
    }
  }
  // Asphalt center
  for (let c = 0; c < map.cols; c++) {
    for (let dr = -ROAD_THICKNESS; dr <= ROAD_THICKNESS; dr++) {
      map.set(c, centerRow + dr, 9);
    }
  }
}

function buildVerticalRoad(map, centerCol) {
  for (let r = 0; r < map.rows; r++) {
    for (let dc = 1; dc <= SIDEWALK_THICKNESS; dc++) {
      map.set(centerCol - ROAD_THICKNESS - dc, r, 10);
      map.set(centerCol + ROAD_THICKNESS + dc, r, 10);
    }
  }
  for (let r = 0; r < map.rows; r++) {
    for (let dc = -ROAD_THICKNESS; dc <= ROAD_THICKNESS; dc++) {
      map.set(centerCol + dc, r, 9);
    }
  }
}

function buildCrosswalks(map, centerCol, centerRow) {
  // North & South crosswalks (across vertical road)
  for (let dc = -ROAD_THICKNESS; dc <= ROAD_THICKNESS; dc++) {
    map.set(centerCol + dc, centerRow - ROAD_THICKNESS - 2, 11);
    map.set(centerCol + dc, centerRow + ROAD_THICKNESS + 2, 11);
  }
  // East & West crosswalks (across horizontal road)
  for (let dr = -ROAD_THICKNESS; dr <= ROAD_THICKNESS; dr++) {
    map.set(centerCol - ROAD_THICKNESS - 2, centerRow + dr, 11);
    map.set(centerCol + ROAD_THICKNESS + 2, centerRow + dr, 11);
  }
}

// ============================================================
// Secondary streets within each district
// ============================================================
function buildSecondaryStreets(map, rng) {
  // For each district, draw 1-2 small connecting paths (cobblestone) so
  // NPCs and the player can move between buildings within a district.

  for (const dist of Object.values(DISTRICTS)) {
    const midR = Math.floor((dist.minRow + dist.maxRow) / 2);
    const midC = Math.floor((dist.minCol + dist.maxCol) / 2);

    // Horizontal mid-line within district (1 tile wide, cobblestone)
    for (let c = dist.minCol; c <= dist.maxCol; c++) {
      // Don't overwrite roads/sidewalks
      const t = map.get(c, midR);
      if (t === 9 || t === 10 || t === 11) continue;
      map.set(c, midR, 13);
    }
    // Vertical mid-line
    for (let r = dist.minRow; r <= dist.maxRow; r++) {
      const t = map.get(midC, r);
      if (t === 9 || t === 10 || t === 11) continue;
      map.set(midC, r, 13);
    }
  }
}

// ============================================================
// Decorative details
// ============================================================
function sprinkleDistrictDetails(map, rng) {
  if (!rng) return;
  // Suburban district: scatter flower patches
  const sub = DISTRICTS.SUBURBS;
  let placed = 0, attempts = 0;
  while (placed < 30 && attempts < 200) {
    attempts++;
    const c = rng.rangeInt(sub.minCol, sub.maxCol);
    const r = rng.rangeInt(sub.minRow, sub.maxRow);
    const t = map.get(c, r);
    if (t === 1 || t === 2) {
      map.set(c, r, 6);
      placed++;
    }
  }

  // Market district: small water feature (pond) in NE corner
  for (let r = 70; r <= 73; r++) {
    for (let c = 92; c <= 96; c++) {
      map.set(c, r, 4); // water
    }
  }
  // Sandy ring around pond
  for (let r = 69; r <= 74; r++) {
    for (let c = 91; c <= 97; c++) {
      const t = map.get(c, r);
      if (t === 12 || t === 6 || t === 1 || t === 2) map.set(c, r, 5);
    }
  }
  // Restore water inside (sand overwrote some)
  for (let r = 70; r <= 73; r++) {
    for (let c = 92; c <= 96; c++) {
      map.set(c, r, 4);
    }
  }
}

// ============================================================
// Spawn points
// ============================================================
/** The "spawn point" tile column/row — the player starts here. */
export function getStarterSpawn() {
  // Spawn on sidewalk just north of central intersection — feels like
  // entering the city from the main avenue.
  return { col: CENTER_COL, row: CENTER_ROW - ROAD_THICKNESS - 1 };
}

/** Random spawn tile within a district (prefers non-road tiles). */
export function getDistrictSpawn(districtName, offsetIndex = 0) {
  const dist = DISTRICTS[districtName.toUpperCase()];
  if (!dist) return { col: CENTER_COL, row: CENTER_ROW };
  // Spread NPCs across the district by sampling a grid
  const cols = dist.maxCol - dist.minCol;
  const rows = dist.maxRow - dist.minRow;
  // Pseudo-random based on offsetIndex
  const seed = (offsetIndex * 2654435761) % (cols * rows);
  const dx = seed % cols;
  const dy = Math.floor(seed / cols) % rows;
  return {
    col: dist.minCol + 5 + (dx % (cols - 10)),
    row: dist.minRow + 5 + (dy % (rows - 10)),
  };
}
