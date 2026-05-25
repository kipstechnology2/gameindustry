/**
 * Tile Renderer — draws an isometric tilemap.
 *
 * For Batch 3a we draw a clean diamond per tile with a per-type fill, soft
 * outline, and a checkerboard variation. Future batches will replace the
 * fill with sprite blits from an atlas + autotiled edge sprites.
 *
 * Performance:
 *   - Draws only tiles within the camera view (visibleTileRange).
 *   - Fill color is shaded by ambientBrightness once per frame to avoid
 *     per-tile getter calls.
 *   - One Path2D per tile (cheap on modern GPUs); no allocations in hot loop.
 */

import { TILE, tileToScreen, visibleTileRange } from '../utils/iso-math.js';
import { TILE_TYPES } from '../world/tilemap.js';
import { ambientBrightness } from './lighting.js';

/**
 * @param {CanvasRenderingContext2D} ctx     - already transformed (world-space)
 * @param {import('../world/tilemap.js').Tilemap} tilemap
 * @param {{minX,minY,maxX,maxY:number}} viewBounds  world-space view rect
 * @param {import('../core/time.js').TimeSystem} time
 */
export function drawTilemap(ctx, tilemap, viewBounds, time) {
  const range = visibleTileRange(
    viewBounds.minX, viewBounds.minY,
    viewBounds.maxX, viewBounds.maxY,
    tilemap.cols, tilemap.rows
  );

  const brightness = ambientBrightness(time);

  // Draw row by row, col by col — naturally produces correct depth ordering
  // for floor tiles (no entities yet — those come in 3c).
  for (let row = range.minRow; row <= range.maxRow; row++) {
    for (let col = range.minCol; col <= range.maxCol; col++) {
      const typeId = tilemap.get(col, row);
      if (typeId === 0) continue; // void
      const type = TILE_TYPES[typeId];
      if (!type) continue;

      drawTile(ctx, col, row, type, brightness);
    }
  }
}

function drawTile(ctx, col, row, type, brightness) {
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

  // Tile outline — very subtle, just enough to read the grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(0,0,0,${0.06 * brightness})`;
  ctx.stroke();
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Draw a faint highlight on a single tile (useful for hover/selection).
 * Caller must ensure ctx is in world-space already.
 */
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
