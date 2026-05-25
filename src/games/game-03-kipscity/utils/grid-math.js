/**
 * Grid math helpers — pure functions, no side effects.
 */

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function inBounds(col, row, cols, rows) {
  return col >= 0 && col < cols && row >= 0 && row < rows;
}

export function manhattan(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function chebyshev(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function euclidean(x1, y1, x2, y2) {
  const dx = x1 - x2, dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 4-neighborhood deltas (N/E/S/W in tile coords). */
export const NEIGHBORS_4 = Object.freeze([
  Object.freeze({ dc: 0, dr: -1 }),
  Object.freeze({ dc: 1, dr: 0 }),
  Object.freeze({ dc: 0, dr: 1 }),
  Object.freeze({ dc: -1, dr: 0 }),
]);

/** 8-neighborhood deltas (incl diagonals). */
export const NEIGHBORS_8 = Object.freeze([
  Object.freeze({ dc: 0, dr: -1 }),
  Object.freeze({ dc: 1, dr: -1 }),
  Object.freeze({ dc: 1, dr: 0 }),
  Object.freeze({ dc: 1, dr: 1 }),
  Object.freeze({ dc: 0, dr: 1 }),
  Object.freeze({ dc: -1, dr: 1 }),
  Object.freeze({ dc: -1, dr: 0 }),
  Object.freeze({ dc: -1, dr: -1 }),
]);
