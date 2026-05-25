/**
 * Isometric Coordinate Math.
 *
 * Conventions:
 *   - World grid is (col, row); col grows to the right, row grows down-right.
 *   - Diamond tile of W × H pixels (default 64 × 32, 2:1).
 *   - Origin (0,0) sits at the top of tile (0,0) in screen space.
 *
 * Visual orientation:
 *
 *           col 0,0 (top)
 *          / \
 *  row+1  /   \  col+1
 *         \   /
 *          \ /
 *
 * Conversion derived from:
 *   screenX = (col − row) × W/2
 *   screenY = (col + row) × H/2
 *
 * Inverse:
 *   col = (sx / (W/2) + sy / (H/2)) / 2
 *   row = (sy / (H/2) − sx / (W/2)) / 2
 */

export const TILE = Object.freeze({
  W: 64,
  H: 32,
  HW: 32,        // half-width
  HH: 16,        // half-height
});

/** Tile (col,row) → screen-space (x,y) of the *top* point of the diamond. */
export function tileToScreen(col, row) {
  return {
    x: (col - row) * TILE.HW,
    y: (col + row) * TILE.HH,
  };
}

/** Screen-space (x,y) → fractional tile (col,row). */
export function screenToTile(x, y) {
  return {
    col: (x / TILE.HW + y / TILE.HH) / 2,
    row: (y / TILE.HH - x / TILE.HW) / 2,
  };
}

/** Center of tile (col,row) in screen-space. */
export function tileCenter(col, row) {
  return {
    x: (col - row) * TILE.HW,
    y: (col + row) * TILE.HH + TILE.HH,
  };
}

/** Snap a fractional tile coordinate to integer (floor). */
export function snapTile(col, row) {
  return { col: Math.floor(col), row: Math.floor(row) };
}

/**
 * Compute the visible tile range given a viewport rectangle in world coords.
 * Returns inclusive bounds with a 1-tile margin to cover edge cases.
 */
export function visibleTileRange(viewMinX, viewMinY, viewMaxX, viewMaxY, mapCols, mapRows) {
  // Corners of the viewport projected to tile coords; take min/max of all four
  const corners = [
    screenToTile(viewMinX, viewMinY),
    screenToTile(viewMaxX, viewMinY),
    screenToTile(viewMinX, viewMaxY),
    screenToTile(viewMaxX, viewMaxY),
  ];
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
  for (const c of corners) {
    if (c.col < minCol) minCol = c.col;
    if (c.col > maxCol) maxCol = c.col;
    if (c.row < minRow) minRow = c.row;
    if (c.row > maxRow) maxRow = c.row;
  }
  return {
    minCol: Math.max(0, Math.floor(minCol) - 1),
    maxCol: Math.min(mapCols - 1, Math.ceil(maxCol) + 1),
    minRow: Math.max(0, Math.floor(minRow) - 1),
    maxRow: Math.min(mapRows - 1, Math.ceil(maxRow) + 1),
  };
}

/** Manhattan distance between two tile coords. */
export function tileDistance(c1, r1, c2, r2) {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}
