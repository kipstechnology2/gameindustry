/**
 * Tile Renderer — draws an isometric tilemap with road markings.
 *
 * Performance:
 *   - Draws only tiles within the camera view (visibleTileRange).
 *   - Fill color is shaded by ambientBrightness once per frame.
 *   - One Path2D per tile (cheap on modern GPUs); no allocations in hot loop.
 *
 * Road handling:
 *   - Asphalt (id 9) gets center-line markings when adjacent tiles are
 *     also asphalt in N+S or E+W direction (forms a continuous lane).
 *   - Crosswalks (id 11) are drawn with white stripes pattern.
 *   - Sidewalks (id 10) get a subtle inner border for definition.
 */

import { TILE, tileToScreen, visibleTileRange } from '../utils/iso-math.js';
import { TILE_TYPES } from '../world/tilemap.js';
import { ambientBrightness } from './lighting.js';

export function drawTilemap(ctx, tilemap, viewBounds, time) {
  const range = visibleTileRange(
    viewBounds.minX, viewBounds.minY,
    viewBounds.maxX, viewBounds.maxY,
    tilemap.cols, tilemap.rows
  );

  const brightness = ambientBrightness(time);

  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      const typeId = tilemap.get(col, row);
      if (typeId === 0) continue;
      const type = TILE_TYPES[typeId];
      if (!type) continue;

      drawTile(ctx, col, row, type, brightness, tilemap);
    }
  }
}

function drawTile(ctx, col, row, type, brightness, tilemap) {
  const { x, y } = tileToScreen(col, row);
  const r = Math.round(type.r * brightness);
  const g = Math.round(type.g * brightness);
  const b = Math.round(type.b * brightness);

  // Diamond path
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + TILE.HW, y + TILE.HH);
  ctx.lineTo(x, y + TILE.H);
  ctx.lineTo(x - TILE.HW, y + TILE.HH);
  ctx.closePath();

  // Subtle gradient by row+col parity for visible texture
  const checker = (row + col) & 1;
  const shade = checker ? 0.96 : 1.04;
  ctx.fillStyle = `rgb(${clamp255(r * shade)},${clamp255(g * shade)},${clamp255(b * shade)})`;
  ctx.fill();

  // Tile outline — very subtle
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(0,0,0,${0.06 * brightness})`;
  ctx.stroke();

  // Road markings (asphalt centerline)
  if (type.isRoad && !type.isCrosswalk) {
    drawRoadMarkings(ctx, x, y, col, row, tilemap, brightness);
  }
  // Crosswalk stripes
  if (type.isCrosswalk) {
    drawCrosswalk(ctx, x, y, col, row, tilemap, brightness);
  }
  // Sidewalk inner border
  if (type.isSidewalk) {
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = `rgba(255,255,255,${0.12 * brightness})`;
    ctx.stroke();
  }
}

/** Yellow centerline if this tile is in the middle of a row/col of asphalt. */
function drawRoadMarkings(ctx, x, y, col, row, tilemap, brightness) {
  const isRoadAt = (c, r) => {
    const t = TILE_TYPES[tilemap.get(c, r)];
    return t && (t.isRoad || t.isCrosswalk);
  };

  // Detect dominant direction from neighbors
  const n = isRoadAt(col, row - 1);
  const s = isRoadAt(col, row + 1);
  const e = isRoadAt(col + 1, row);
  const w = isRoadAt(col - 1, row);

  // We only mark "center" lanes (where both N+S OR both E+W are road,
  // and the tile is not at the road edge).
  const isHCenter = e && w && !n && !s; // horizontal lane center
  const isVCenter = n && s && !e && !w; // vertical lane center
  const isInter = (n + s + e + w) >= 3; // intersection

  if (isInter) return; // skip markings at intersections — looks cleaner

  if (isHCenter) {
    // Yellow dashed line along x-axis (E-W)
    ctx.fillStyle = `rgba(255, 210, 70, ${0.7 * brightness})`;
    // Two short dashes inside the diamond
    const cy = y + TILE.HH;
    ctx.fillRect(x - 12, cy - 1, 8, 2);
    ctx.fillRect(x + 4, cy - 1, 8, 2);
  } else if (isVCenter) {
    // Yellow dashed line along y-axis (N-S)
    ctx.fillStyle = `rgba(255, 210, 70, ${0.7 * brightness})`;
    const cx = x;
    ctx.fillRect(cx - 1, y + 4, 2, 6);
    ctx.fillRect(cx - 1, y + 18, 2, 6);
  }
}

/** White stripes for a pedestrian crosswalk. */
function drawCrosswalk(ctx, x, y, col, row, tilemap, brightness) {
  ctx.fillStyle = `rgba(245, 245, 250, ${0.85 * brightness})`;
  // 4 stripes spread inside the diamond
  for (let i = -1; i <= 1; i += 1) {
    const px = x - 6 + (i + 1) * 6;
    const py = y + TILE.HH - 6 + i * 4;
    ctx.fillRect(px, py, 4, 8);
  }
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export function highlightTile(ctx, col, row, color = 'rgba(255,255,255,0.35)') {
  const { x, y } = tileToScreen(col, row);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + TILE.HW, y + TILE.HH);
  ctx.lineTo(x, y + TILE.H);
  ctx.lineTo(x - TILE.HW, y + TILE.HH);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
