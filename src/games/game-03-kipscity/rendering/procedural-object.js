/**
 * Procedural Object Sprites — original isometric props rendered via Canvas2D.
 *
 * Just like the avatar, every shape is drawn programmatically; zero PNG/JPG
 * dependencies. Each object kind has its own draw() routine; the result is
 * cached into an offscreen canvas (one per kind) for fast blits.
 *
 * Anchor convention: feet/base of the object lands at (x, y) — same as
 * avatars, so Z-sort ordering works uniformly.
 *
 * Object kinds (Batch 3f):
 *   - bed
 *   - bench
 *   - fountain
 *   - food_cart
 *
 * To add a new kind: register a draw routine in DRAW_ROUTINES + footprint
 * dimensions in OBJECT_DIMS. Object kind ids are stable strings used by
 * the Sprite component and the affordance catalog.
 */

const PI2 = Math.PI * 2;

/** Object footprint dimensions in pixels. Used by the atlas builder. */
export const OBJECT_DIMS = Object.freeze({
  bed:       { w: 80, h: 56 },
  bench:     { w: 72, h: 44 },
  fountain:  { w: 80, h: 64 },
  food_cart: { w: 72, h: 64 },
});

const DRAW_ROUTINES = {
  bed,
  bench,
  fountain,
  food_cart: foodCart,
};

/**
 * Builds + caches the per-kind sprite canvases.
 */
export class ObjectAtlas {
  constructor() {
    /** @type {Map<string, HTMLCanvasElement>} */
    this._cache = new Map();
  }

  /** Returns the cached canvas, building on first request. */
  get(kind) {
    let c = this._cache.get(kind);
    if (c) return c;
    const dims = OBJECT_DIMS[kind];
    if (!dims) {
      console.warn('[ObjectAtlas] unknown kind', kind);
      return null;
    }
    c = document.createElement('canvas');
    c.width = dims.w;
    c.height = dims.h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const fn = DRAW_ROUTINES[kind];
    if (fn) fn(ctx, dims.w, dims.h);
    this._cache.set(kind, c);
    return c;
  }

  /**
   * Blit an object sprite into the world.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} kind
   * @param {number} x  destination world-x (object base center)
   * @param {number} y  destination world-y (base anchor)
   */
  blit(ctx, kind, x, y) {
    const sprite = this.get(kind);
    if (!sprite) return;
    const dims = OBJECT_DIMS[kind];
    ctx.drawImage(sprite, x - dims.w / 2, y - dims.h + 4);
  }

  destroy() {
    for (const c of this._cache.values()) { c.width = 0; c.height = 0; }
    this._cache.clear();
  }
}

// ============================================================
// Drawing routines — pure isometric primitives
// ============================================================

function shadow(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(8, 14, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, PI2);
  ctx.fill();
}

/** A 2-tile-long isometric bed (frame + mattress + pillow + blanket). */
function bed(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;

  shadow(ctx, cx, baseY, 30, 7);

  // Frame (warm brown)
  ctx.fillStyle = '#8e5a32';
  isoBlock(ctx, cx, baseY - 2, 56, 28, 8);

  // Mattress (cream)
  ctx.fillStyle = '#f3e7d0';
  isoTopFace(ctx, cx, baseY - 12, 50, 26);

  // Mattress top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  isoTopFaceStripe(ctx, cx, baseY - 12, 50, 26, 0.85);

  // Blanket (accent purple)
  ctx.fillStyle = '#b06bff';
  isoTopFaceClipped(ctx, cx + 8, baseY - 12, 26, 22);

  // Pillow (white)
  ctx.fillStyle = '#fff';
  isoTopFaceClipped(ctx, cx - 14, baseY - 13, 16, 14);
}

function bench(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 26, 5);

  // Legs (stone grey)
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(cx - 22, baseY - 14, 6, 14);
  ctx.fillRect(cx + 16, baseY - 14, 6, 14);

  // Seat plank (wood)
  ctx.fillStyle = '#9a6a3c';
  isoTopFace(ctx, cx, baseY - 16, 50, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - 25, baseY - 12, 50, 1);

  // Backrest plank
  ctx.fillStyle = '#a87440';
  ctx.fillRect(cx - 22, baseY - 30, 44, 4);
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(cx - 22, baseY - 30, 44, 1);
}

function fountain(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;

  shadow(ctx, cx, baseY, 30, 7);

  // Outer stone basin
  ctx.fillStyle = '#a9a9b3';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 4, 30, 9, 0, 0, PI2);
  ctx.fill();
  ctx.fillStyle = '#8d8d97';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 7, 30, 9, 0, 0, PI2);
  ctx.fill();
  // Outer rim depth
  ctx.fillStyle = '#b8b8c2';
  ctx.fillRect(cx - 30, baseY - 7, 60, 3);

  // Water surface
  const waterGrad = ctx.createLinearGradient(0, baseY - 14, 0, baseY - 6);
  waterGrad.addColorStop(0, '#a4ddef');
  waterGrad.addColorStop(1, '#4d9fcb');
  ctx.fillStyle = waterGrad;
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 9, 24, 7, 0, 0, PI2);
  ctx.fill();

  // Center column
  ctx.fillStyle = '#8d8d97';
  ctx.fillRect(cx - 5, baseY - 24, 10, 16);
  ctx.fillStyle = '#a9a9b3';
  ctx.fillRect(cx - 7, baseY - 26, 14, 4);

  // Top water plume
  ctx.fillStyle = 'rgba(164, 221, 239, 0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 30, 5, 8, 0, 0, PI2);
  ctx.fill();

  // Tiny droplets (subtle)
  ctx.fillStyle = 'rgba(164, 221, 239, 0.6)';
  ctx.beginPath(); ctx.arc(cx - 9, baseY - 22, 1.2, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9, baseY - 24, 1.2, 0, PI2); ctx.fill();
}

function foodCart(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;

  shadow(ctx, cx, baseY, 26, 5);

  // Wheels
  ctx.fillStyle = '#26282e';
  ctx.beginPath(); ctx.arc(cx - 18, baseY, 4, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 18, baseY, 4, 0, PI2); ctx.fill();
  ctx.fillStyle = '#5a5a64';
  ctx.beginPath(); ctx.arc(cx - 18, baseY, 1.5, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 18, baseY, 1.5, 0, PI2); ctx.fill();

  // Cart body (warm wood)
  ctx.fillStyle = '#c08054';
  isoBlock(ctx, cx, baseY - 4, 48, 20, 12);

  // Counter top (cream)
  ctx.fillStyle = '#f3e7d0';
  isoTopFace(ctx, cx, baseY - 16, 44, 16);

  // Awning (red & white striped)
  const awning = h - 24;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff5470' : '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 22 + i * 11, awning);
    ctx.lineTo(cx - 11 + i * 11, awning);
    ctx.lineTo(cx - 14 + i * 11, awning + 8);
    ctx.lineTo(cx - 25 + i * 11, awning + 8);
    ctx.closePath();
    ctx.fill();
  }
  // Awning top bar
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 24, awning - 2, 48, 3);

  // Tiny food items on counter
  ctx.fillStyle = '#ffb84d';
  ctx.beginPath(); ctx.arc(cx - 6, baseY - 18, 2.4, 0, PI2); ctx.fill();
  ctx.fillStyle = '#ff5470';
  ctx.beginPath(); ctx.arc(cx + 4, baseY - 18, 2.2, 0, PI2); ctx.fill();
  ctx.fillStyle = '#9bd66f';
  ctx.beginPath(); ctx.arc(cx + 12, baseY - 18, 2.2, 0, PI2); ctx.fill();
}

// ============================================================
// Iso primitives
// ============================================================

/** Filled isometric block (with side + top faces) at base center (cx, by). */
function isoBlock(ctx, cx, by, w, depth, tallness) {
  const half = w / 2;
  const dh = depth / 2;

  // Front face (lower)
  ctx.beginPath();
  ctx.moveTo(cx - half, by);
  ctx.lineTo(cx + half, by);
  ctx.lineTo(cx + half, by - tallness);
  ctx.lineTo(cx - half, by - tallness);
  ctx.closePath();
  ctx.fill();

  // Top face (slightly darker)
  const orig = ctx.fillStyle;
  ctx.fillStyle = darken(orig, 0.85);
  ctx.beginPath();
  ctx.moveTo(cx - half, by - tallness);
  ctx.lineTo(cx,        by - tallness - dh);
  ctx.lineTo(cx + half, by - tallness);
  ctx.lineTo(cx,        by - tallness + dh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = orig;
}

/** Iso "top face" diamond at center y. */
function isoTopFace(ctx, cx, cy, w, depth) {
  const half = w / 2;
  const dh = depth / 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx,        cy - dh);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx,        cy + dh);
  ctx.closePath();
  ctx.fill();
}

function isoTopFaceClipped(ctx, cx, cy, w, depth) {
  isoTopFace(ctx, cx, cy, w, depth);
}

function isoTopFaceStripe(ctx, cx, cy, w, depth, scale) {
  const half = (w * scale) / 2;
  const dh = (depth * scale) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx,        cy - dh);
  ctx.lineTo(cx + half, cy);
  ctx.closePath();
  ctx.fill();
}

function darken(cssColor, factor) {
  // Very simple — only handles "#rrggbb"; otherwise return as-is
  if (typeof cssColor !== 'string' || !cssColor.startsWith('#') || cssColor.length !== 7) {
    return cssColor;
  }
  const r = parseInt(cssColor.slice(1, 3), 16);
  const g = parseInt(cssColor.slice(3, 5), 16);
  const b = parseInt(cssColor.slice(5, 7), 16);
  const f = Math.max(0, Math.min(1, factor));
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
