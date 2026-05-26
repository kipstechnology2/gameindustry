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
 * Object kinds:
 *   Furniture: bed, bench, fountain, food_cart
 *   Buildings: house_cozy, house_2story, house_asian, apartment_3story,
 *              shop_modern, cafe, warung
 *   Trees:     tree_oak, tree_pine, tree_cherry, tree_palm
 *   Vehicles:  car_sedan, car_compact, motorcycle
 *   Street:    lamppost, fence_wood, mailbox, bus_stop, traffic_pole
 */

const PI2 = Math.PI * 2;

/** Object footprint dimensions in pixels. Used by the atlas builder. */
export const OBJECT_DIMS = Object.freeze({
  // Furniture
  bed:           { w: 80,  h: 56 },
  bench:         { w: 72,  h: 44 },
  fountain:      { w: 80,  h: 64 },
  food_cart:     { w: 72,  h: 64 },

  // Buildings
  house_cozy:    { w: 110, h: 110 },
  house_2story:  { w: 120, h: 150 },
  house_asian:   { w: 120, h: 110 },
  apartment_3story: { w: 130, h: 200 },
  shop_modern:   { w: 130, h: 110 },
  cafe:          { w: 130, h: 100 },
  warung:        { w: 100, h: 90  },

  // Trees
  tree_oak:      { w: 60,  h: 90  },
  tree_pine:     { w: 50,  h: 100 },
  tree_cherry:   { w: 60,  h: 88  },
  tree_palm:     { w: 50,  h: 110 },

  // Vehicles
  car_sedan:     { w: 70,  h: 50  },
  car_compact:   { w: 60,  h: 46  },
  motorcycle:    { w: 44,  h: 48  },

  // Street furniture
  lamppost:      { w: 28,  h: 90  },
  fence_wood:    { w: 50,  h: 36  },
  mailbox:       { w: 28,  h: 50  },
  bus_stop:      { w: 80,  h: 90  },
  traffic_pole:  { w: 28,  h: 80  },
});

const DRAW_ROUTINES = {
  bed,
  bench,
  fountain,
  food_cart: foodCart,
  // Buildings
  house_cozy: houseCozy,
  house_2story: house2Story,
  house_asian: houseAsian,
  apartment_3story: apartment3Story,
  shop_modern: shopModern,
  cafe,
  warung,
  // Trees
  tree_oak: treeOak,
  tree_pine: treePine,
  tree_cherry: treeCherry,
  tree_palm: treePalm,
  // Vehicles
  car_sedan: carSedan,
  car_compact: carCompact,
  motorcycle,
  // Street furniture
  lamppost,
  fence_wood: fenceWood,
  mailbox,
  bus_stop: busStop,
  traffic_pole: trafficPole,
};

/** Builds + caches the per-kind sprite canvases. */
export class ObjectAtlas {
  constructor() {
    /** @type {Map<string, HTMLCanvasElement>} */
    this._cache = new Map();
  }

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
// Iso primitives (shared by all draw routines)
// ============================================================

function shadow(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(8, 14, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, PI2);
  ctx.fill();
}

/** Filled isometric block (with side + top faces) at base center (cx, by). */
function isoBlock(ctx, cx, by, w, depth, tallness) {
  const half = w / 2;
  const dh = depth / 2;

  ctx.beginPath();
  ctx.moveTo(cx - half, by);
  ctx.lineTo(cx + half, by);
  ctx.lineTo(cx + half, by - tallness);
  ctx.lineTo(cx - half, by - tallness);
  ctx.closePath();
  ctx.fill();

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
  if (typeof cssColor !== 'string' || !cssColor.startsWith('#') || cssColor.length !== 7) {
    return cssColor;
  }
  const r = parseInt(cssColor.slice(1, 3), 16);
  const g = parseInt(cssColor.slice(3, 5), 16);
  const b = parseInt(cssColor.slice(5, 7), 16);
  const f = Math.max(0, Math.min(1, factor));
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

// ============================================================
// FURNITURE (existing)
// ============================================================

function bed(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 30, 7);
  ctx.fillStyle = '#8e5a32';
  isoBlock(ctx, cx, baseY - 2, 56, 28, 8);
  ctx.fillStyle = '#f3e7d0';
  isoTopFace(ctx, cx, baseY - 12, 50, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  isoTopFaceStripe(ctx, cx, baseY - 12, 50, 26, 0.85);
  ctx.fillStyle = '#b06bff';
  isoTopFace(ctx, cx + 8, baseY - 12, 26, 22);
  ctx.fillStyle = '#fff';
  isoTopFace(ctx, cx - 14, baseY - 13, 16, 14);
}

function bench(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 26, 5);
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(cx - 22, baseY - 14, 6, 14);
  ctx.fillRect(cx + 16, baseY - 14, 6, 14);
  ctx.fillStyle = '#9a6a3c';
  isoTopFace(ctx, cx, baseY - 16, 50, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - 25, baseY - 12, 50, 1);
  ctx.fillStyle = '#a87440';
  ctx.fillRect(cx - 22, baseY - 30, 44, 4);
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(cx - 22, baseY - 30, 44, 1);
}

function fountain(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 30, 7);
  ctx.fillStyle = '#a9a9b3';
  ctx.beginPath(); ctx.ellipse(cx, baseY - 4, 30, 9, 0, 0, PI2); ctx.fill();
  ctx.fillStyle = '#8d8d97';
  ctx.beginPath(); ctx.ellipse(cx, baseY - 7, 30, 9, 0, 0, PI2); ctx.fill();
  ctx.fillStyle = '#b8b8c2';
  ctx.fillRect(cx - 30, baseY - 7, 60, 3);
  const waterGrad = ctx.createLinearGradient(0, baseY - 14, 0, baseY - 6);
  waterGrad.addColorStop(0, '#a4ddef');
  waterGrad.addColorStop(1, '#4d9fcb');
  ctx.fillStyle = waterGrad;
  ctx.beginPath(); ctx.ellipse(cx, baseY - 9, 24, 7, 0, 0, PI2); ctx.fill();
  ctx.fillStyle = '#8d8d97';
  ctx.fillRect(cx - 5, baseY - 24, 10, 16);
  ctx.fillStyle = '#a9a9b3';
  ctx.fillRect(cx - 7, baseY - 26, 14, 4);
  ctx.fillStyle = 'rgba(164, 221, 239, 0.85)';
  ctx.beginPath(); ctx.ellipse(cx, baseY - 30, 5, 8, 0, 0, PI2); ctx.fill();
  ctx.fillStyle = 'rgba(164, 221, 239, 0.6)';
  ctx.beginPath(); ctx.arc(cx - 9, baseY - 22, 1.2, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 9, baseY - 24, 1.2, 0, PI2); ctx.fill();
}

function foodCart(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 26, 5);
  ctx.fillStyle = '#26282e';
  ctx.beginPath(); ctx.arc(cx - 18, baseY, 4, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 18, baseY, 4, 0, PI2); ctx.fill();
  ctx.fillStyle = '#5a5a64';
  ctx.beginPath(); ctx.arc(cx - 18, baseY, 1.5, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 18, baseY, 1.5, 0, PI2); ctx.fill();
  ctx.fillStyle = '#c08054';
  isoBlock(ctx, cx, baseY - 4, 48, 20, 12);
  ctx.fillStyle = '#f3e7d0';
  isoTopFace(ctx, cx, baseY - 16, 44, 16);
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
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 24, awning - 2, 48, 3);
  ctx.fillStyle = '#ffb84d';
  ctx.beginPath(); ctx.arc(cx - 6, baseY - 18, 2.4, 0, PI2); ctx.fill();
  ctx.fillStyle = '#ff5470';
  ctx.beginPath(); ctx.arc(cx + 4, baseY - 18, 2.2, 0, PI2); ctx.fill();
  ctx.fillStyle = '#9bd66f';
  ctx.beginPath(); ctx.arc(cx + 12, baseY - 18, 2.2, 0, PI2); ctx.fill();
}

// ============================================================
// BUILDINGS — Cozy
// ============================================================
function houseCozy(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 50, 10);
  // Walls (warm yellow)
  ctx.fillStyle = '#f7c873';
  isoBlock(ctx, cx, baseY - 2, 80, 50, 36);
  // Door
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 8, baseY - 30, 16, 28);
  ctx.fillStyle = '#8b6334';
  ctx.fillRect(cx - 8, baseY - 30, 16, 1);
  // Doorknob
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx + 4, baseY - 18, 2, 2);
  // Windows
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 32, baseY - 30, 14, 12);
  ctx.fillRect(cx + 18, baseY - 30, 14, 12);
  // Window frames
  ctx.strokeStyle = '#5a3a1f';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 32, baseY - 30, 14, 12);
  ctx.strokeRect(cx + 18, baseY - 30, 14, 12);
  ctx.beginPath();
  ctx.moveTo(cx - 25, baseY - 30); ctx.lineTo(cx - 25, baseY - 18);
  ctx.moveTo(cx - 32, baseY - 24); ctx.lineTo(cx - 18, baseY - 24);
  ctx.moveTo(cx + 25, baseY - 30); ctx.lineTo(cx + 25, baseY - 18);
  ctx.moveTo(cx + 18, baseY - 24); ctx.lineTo(cx + 32, baseY - 24);
  ctx.stroke();
  // Roof (red triangular)
  ctx.fillStyle = '#c25c5c';
  ctx.beginPath();
  ctx.moveTo(cx - 44, baseY - 38);
  ctx.lineTo(cx, baseY - 60);
  ctx.lineTo(cx + 44, baseY - 38);
  ctx.lineTo(cx + 22, baseY - 30);
  ctx.lineTo(cx - 22, baseY - 30);
  ctx.closePath();
  ctx.fill();
  // Roof shadow line
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(cx - 44, baseY - 38, 88, 1.5);
  // Chimney
  ctx.fillStyle = '#8e5a32';
  ctx.fillRect(cx + 14, baseY - 56, 8, 14);
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx + 14, baseY - 56, 8, 2);
}

function house2Story(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 56, 12);
  // First floor (cream)
  ctx.fillStyle = '#e8d8a8';
  isoBlock(ctx, cx, baseY - 2, 90, 60, 40);
  // Second floor (slightly different shade)
  ctx.fillStyle = '#d8c898';
  isoBlock(ctx, cx, baseY - 42, 84, 56, 36);
  // Door (first floor center)
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 8, baseY - 32, 16, 30);
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx + 4, baseY - 20, 2, 2);
  // First-floor windows
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 36, baseY - 32, 12, 14);
  ctx.fillRect(cx + 24, baseY - 32, 12, 14);
  ctx.strokeStyle = '#5a3a1f'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 36, baseY - 32, 12, 14);
  ctx.strokeRect(cx + 24, baseY - 32, 12, 14);
  // Second-floor windows (3 across)
  ctx.fillStyle = '#bfe6f0';
  for (let i = 0; i < 3; i++) {
    const wx = cx - 32 + i * 24;
    ctx.fillRect(wx - 4, baseY - 70, 12, 14);
    ctx.strokeRect(wx - 4, baseY - 70, 12, 14);
  }
  // Roof (dark brown, hipped)
  ctx.fillStyle = '#6e4a28';
  ctx.beginPath();
  ctx.moveTo(cx - 46, baseY - 78);
  ctx.lineTo(cx, baseY - 105);
  ctx.lineTo(cx + 46, baseY - 78);
  ctx.lineTo(cx + 24, baseY - 76);
  ctx.lineTo(cx - 24, baseY - 76);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 46, baseY - 78, 92, 1.5);
}

function houseAsian(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 56, 12);
  // White-cream walls
  ctx.fillStyle = '#f3ead2';
  isoBlock(ctx, cx, baseY - 2, 90, 56, 32);
  // Wooden support pillars
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 42, baseY - 32, 4, 30);
  ctx.fillRect(cx + 38, baseY - 32, 4, 30);
  // Door (red traditional)
  ctx.fillStyle = '#9a3030';
  ctx.fillRect(cx - 10, baseY - 28, 20, 26);
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx - 1, baseY - 16, 2, 2);
  // Lattice windows
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 32, baseY - 28, 16, 14);
  ctx.fillRect(cx + 16, baseY - 28, 16, 14);
  ctx.strokeStyle = '#5a3a1f'; ctx.lineWidth = 0.8;
  // Lattice grid on left window
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 32 + i * 4, baseY - 28);
    ctx.lineTo(cx - 32 + i * 4, baseY - 14);
    ctx.stroke();
  }
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 32, baseY - 28 + i * 4.5);
    ctx.lineTo(cx - 16, baseY - 28 + i * 4.5);
    ctx.stroke();
  }
  // Right window same
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + 16 + i * 4, baseY - 28);
    ctx.lineTo(cx + 16 + i * 4, baseY - 14);
    ctx.stroke();
  }
  // Curved/upturned tile roof — signature Asian look
  ctx.fillStyle = '#383838';
  ctx.beginPath();
  // Left wing (curves up)
  ctx.moveTo(cx - 56, baseY - 36);
  ctx.quadraticCurveTo(cx - 30, baseY - 60, cx, baseY - 60);
  ctx.quadraticCurveTo(cx + 30, baseY - 60, cx + 56, baseY - 36);
  ctx.lineTo(cx + 36, baseY - 32);
  ctx.lineTo(cx - 36, baseY - 32);
  ctx.closePath();
  ctx.fill();
  // Roof tile pattern (subtle horizontal lines)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 50 + i * 2, baseY - 38 + i * 5);
    ctx.lineTo(cx + 50 - i * 2, baseY - 38 + i * 5);
    ctx.stroke();
  }
  // Ridge ornament
  ctx.fillStyle = '#9a3030';
  ctx.fillRect(cx - 4, baseY - 64, 8, 6);
}

function apartment3Story(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 60, 13);
  // Tall block — concrete grey
  ctx.fillStyle = '#b8b8c0';
  isoBlock(ctx, cx, baseY - 2, 100, 64, 168);
  // Subtle floor divider lines
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx - 50, baseY - 60, 100, 1);
  ctx.fillRect(cx - 50, baseY - 116, 100, 1);
  // Window grid (3 floors × 4 windows each)
  ctx.fillStyle = '#bfe6f0';
  for (let floor = 0; floor < 3; floor++) {
    const yWin = baseY - 28 - floor * 56;
    for (let i = 0; i < 4; i++) {
      const wx = cx - 38 + i * 22;
      ctx.fillRect(wx, yWin, 14, 22);
    }
  }
  // Window frames
  ctx.strokeStyle = '#5a5a64'; ctx.lineWidth = 0.8;
  for (let floor = 0; floor < 3; floor++) {
    const yWin = baseY - 28 - floor * 56;
    for (let i = 0; i < 4; i++) {
      const wx = cx - 38 + i * 22;
      ctx.strokeRect(wx, yWin, 14, 22);
      ctx.beginPath();
      ctx.moveTo(wx + 7, yWin); ctx.lineTo(wx + 7, yWin + 22);
      ctx.moveTo(wx, yWin + 11); ctx.lineTo(wx + 14, yWin + 11);
      ctx.stroke();
    }
  }
  // Ground-floor entrance (glass door)
  ctx.fillStyle = '#3a4458';
  ctx.fillRect(cx - 12, baseY - 28, 24, 26);
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 11, baseY - 27, 22, 24);
  ctx.strokeStyle = '#5a5a64';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 27); ctx.lineTo(cx, baseY - 3);
  ctx.stroke();
  // Rooftop trim
  ctx.fillStyle = '#7a7a84';
  ctx.fillRect(cx - 50, baseY - 168, 100, 4);
}

function shopModern(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 56, 12);
  // White facade
  ctx.fillStyle = '#f0f0f4';
  isoBlock(ctx, cx, baseY - 2, 100, 50, 60);
  // Big glass storefront (full width)
  ctx.fillStyle = '#3a4458';
  ctx.fillRect(cx - 42, baseY - 50, 84, 38);
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 40, baseY - 48, 80, 36);
  // Glass dividers
  ctx.strokeStyle = '#5a5a64'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(cx - 40 + i * 20, baseY - 48);
    ctx.lineTo(cx - 40 + i * 20, baseY - 12);
  }
  ctx.stroke();
  // Awning (modern flat)
  ctx.fillStyle = '#6c8cff';
  ctx.fillRect(cx - 46, baseY - 56, 92, 6);
  // Shop sign
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - 28, baseY - 68, 56, 10);
  ctx.fillStyle = '#1c1d2b';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOP', cx, baseY - 63);
  // Roof line
  ctx.fillStyle = '#d8d8dc';
  ctx.fillRect(cx - 50, baseY - 72, 100, 4);
}

function cafe(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 56, 12);
  // Wood-trim walls
  ctx.fillStyle = '#e0c8a8';
  isoBlock(ctx, cx, baseY - 2, 100, 50, 50);
  // Door (with glass)
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 10, baseY - 38, 20, 36);
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 8, baseY - 36, 16, 24);
  // Big windows on sides
  ctx.fillStyle = '#bfe6f0';
  ctx.fillRect(cx - 38, baseY - 38, 22, 24);
  ctx.fillRect(cx + 16, baseY - 38, 22, 24);
  ctx.strokeStyle = '#5a3a1f'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 38, baseY - 38, 22, 24);
  ctx.strokeRect(cx + 16, baseY - 38, 22, 24);
  // Striped awning (red+white)
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c25c5c' : '#fff';
    ctx.beginPath();
    ctx.moveTo(cx - 50 + i * 20, baseY - 50);
    ctx.lineTo(cx - 30 + i * 20, baseY - 50);
    ctx.lineTo(cx - 35 + i * 20, baseY - 42);
    ctx.lineTo(cx - 55 + i * 20, baseY - 42);
    ctx.closePath();
    ctx.fill();
  }
  // Sign
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 22, baseY - 64, 44, 10);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 8px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAFE', cx, baseY - 59);
  // Outdoor table + chair (small)
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 46, baseY - 4, 6, 4); // chair
  ctx.fillStyle = '#9a6a3c';
  ctx.beginPath(); ctx.ellipse(cx + 36, baseY - 6, 5, 2, 0, 0, PI2); ctx.fill();
}

function warung(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 42, 9);
  // Wooden walls
  ctx.fillStyle = '#9a7050';
  isoBlock(ctx, cx, baseY - 2, 76, 40, 32);
  // Open front (counter)
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 32, baseY - 16, 64, 14);
  // Counter display items
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx - 22, baseY - 14, 4, 4);
  ctx.fillStyle = '#ff5470';
  ctx.fillRect(cx - 12, baseY - 14, 4, 4);
  ctx.fillStyle = '#9bd66f';
  ctx.fillRect(cx - 2, baseY - 14, 4, 4);
  ctx.fillStyle = '#b06bff';
  ctx.fillRect(cx + 8, baseY - 14, 4, 4);
  ctx.fillStyle = '#00d4ff';
  ctx.fillRect(cx + 18, baseY - 14, 4, 4);
  // Tarp roof (blue striped)
  ctx.fillStyle = '#3a6a9a';
  ctx.beginPath();
  ctx.moveTo(cx - 46, baseY - 36);
  ctx.lineTo(cx, baseY - 56);
  ctx.lineTo(cx + 46, baseY - 36);
  ctx.lineTo(cx + 30, baseY - 32);
  ctx.lineTo(cx - 30, baseY - 32);
  ctx.closePath();
  ctx.fill();
  // Stripes on roof
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 44 + i * 4, baseY - 36 + i * 5);
    ctx.lineTo(cx + 44 - i * 4, baseY - 36 + i * 5);
    ctx.stroke();
  }
  // Hanging sign
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx - 16, baseY - 30, 32, 8);
  ctx.fillStyle = '#1c1d2b';
  ctx.font = 'bold 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WARUNG', cx, baseY - 26);
}

// ============================================================
// TREES
// ============================================================
function treeOak(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 18, 5);
  // Trunk
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 4, baseY - 30, 8, 28);
  // Trunk highlight
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(cx - 4, baseY - 30, 2, 28);
  // Foliage (3 puffy circles)
  ctx.fillStyle = '#5a9c43';
  ctx.beginPath(); ctx.arc(cx - 12, baseY - 50, 14, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, baseY - 48, 14, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, baseY - 60, 16, 0, PI2); ctx.fill();
  // Highlight
  ctx.fillStyle = '#7ec25c';
  ctx.beginPath(); ctx.arc(cx - 6, baseY - 64, 6, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 8, baseY - 54, 4, 0, PI2); ctx.fill();
}

function treePine(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 14, 4);
  // Trunk
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 3, baseY - 18, 6, 16);
  // Triangular layered foliage
  ctx.fillStyle = '#3a7a3a';
  // Bottom layer (widest)
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 48);
  ctx.lineTo(cx + 18, baseY - 18);
  ctx.lineTo(cx - 18, baseY - 18);
  ctx.closePath();
  ctx.fill();
  // Middle
  ctx.fillStyle = '#5a9c43';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 70);
  ctx.lineTo(cx + 14, baseY - 42);
  ctx.lineTo(cx - 14, baseY - 42);
  ctx.closePath();
  ctx.fill();
  // Top
  ctx.fillStyle = '#7ec25c';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 90);
  ctx.lineTo(cx + 10, baseY - 65);
  ctx.lineTo(cx - 10, baseY - 65);
  ctx.closePath();
  ctx.fill();
  // Snow tip in winter? optional — just a tiny white cap
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 90);
  ctx.lineTo(cx + 3, baseY - 84);
  ctx.lineTo(cx - 3, baseY - 84);
  ctx.closePath();
  ctx.fill();
}

function treeCherry(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 18, 5);
  // Trunk
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 4, baseY - 28, 8, 26);
  // Pink cherry blossom foliage
  ctx.fillStyle = '#e6a4c2';
  ctx.beginPath(); ctx.arc(cx - 12, baseY - 48, 14, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, baseY - 46, 14, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, baseY - 58, 16, 0, PI2); ctx.fill();
  // Lighter pink highlights
  ctx.fillStyle = '#f5c2d4';
  ctx.beginPath(); ctx.arc(cx - 6, baseY - 60, 6, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10, baseY - 50, 5, 0, PI2); ctx.fill();
  // Fallen petals on ground (small dots)
  ctx.fillStyle = 'rgba(230, 164, 194, 0.6)';
  ctx.beginPath(); ctx.arc(cx - 14, baseY - 4, 1.2, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, baseY - 6, 1.2, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 4, baseY - 3, 1.2, 0, PI2); ctx.fill();
}

function treePalm(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 12, 4);
  // Curved trunk
  ctx.strokeStyle = '#7a5028';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 2);
  ctx.quadraticCurveTo(cx + 6, baseY - 50, cx, baseY - 88);
  ctx.stroke();
  // Trunk segments
  ctx.strokeStyle = '#5a3a1f';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const y = baseY - 14 - i * 12;
    ctx.beginPath();
    ctx.moveTo(cx - 3, y);
    ctx.lineTo(cx + 3, y);
    ctx.stroke();
  }
  // Fronds (5 leaves radiating)
  ctx.fillStyle = '#3a7a3a';
  for (let angle = -2; angle <= 2; angle++) {
    const a = (angle * Math.PI) / 8;
    ctx.save();
    ctx.translate(cx, baseY - 90);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -10, 4, 22, 0, 0, PI2);
    ctx.fill();
    ctx.restore();
  }
  // Coconut cluster
  ctx.fillStyle = '#5a3a1f';
  ctx.beginPath(); ctx.arc(cx - 2, baseY - 86, 2.5, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 2, baseY - 84, 2.5, 0, PI2); ctx.fill();
}

// ============================================================
// VEHICLES
// ============================================================
function carSedan(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 30, 6);
  // Wheels (visible bottom)
  ctx.fillStyle = '#1c1d2b';
  ctx.beginPath(); ctx.arc(cx - 22, baseY, 4, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 22, baseY, 4, 0, PI2); ctx.fill();
  // Hubcap
  ctx.fillStyle = '#9aa3b8';
  ctx.beginPath(); ctx.arc(cx - 22, baseY, 1.5, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 22, baseY, 1.5, 0, PI2); ctx.fill();
  // Body (rounded)
  ctx.fillStyle = '#6c8cff';
  ctx.beginPath();
  ctx.moveTo(cx - 28, baseY - 4);
  ctx.lineTo(cx - 28, baseY - 16);
  ctx.quadraticCurveTo(cx - 14, baseY - 26, cx, baseY - 26);
  ctx.quadraticCurveTo(cx + 14, baseY - 26, cx + 28, baseY - 16);
  ctx.lineTo(cx + 28, baseY - 4);
  ctx.closePath();
  ctx.fill();
  // Windshield
  ctx.fillStyle = '#3a4458';
  ctx.beginPath();
  ctx.moveTo(cx - 14, baseY - 18);
  ctx.quadraticCurveTo(cx - 4, baseY - 24, cx + 6, baseY - 24);
  ctx.quadraticCurveTo(cx + 14, baseY - 22, cx + 20, baseY - 18);
  ctx.lineTo(cx + 18, baseY - 12);
  ctx.lineTo(cx - 12, baseY - 12);
  ctx.closePath();
  ctx.fill();
  // Headlight
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx - 30, baseY - 10, 3, 4);
  // Highlight on top
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(cx - 14, baseY - 24, 12, 2);
}

function carCompact(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 26, 5);
  // Wheels
  ctx.fillStyle = '#1c1d2b';
  ctx.beginPath(); ctx.arc(cx - 18, baseY, 4, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 18, baseY, 4, 0, PI2); ctx.fill();
  ctx.fillStyle = '#9aa3b8';
  ctx.beginPath(); ctx.arc(cx - 18, baseY, 1.5, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 18, baseY, 1.5, 0, PI2); ctx.fill();
  // Body (smaller, taller proportions for compact)
  ctx.fillStyle = '#ff7a4a';
  ctx.beginPath();
  ctx.moveTo(cx - 24, baseY - 4);
  ctx.lineTo(cx - 24, baseY - 14);
  ctx.quadraticCurveTo(cx - 16, baseY - 24, cx - 4, baseY - 24);
  ctx.lineTo(cx + 14, baseY - 24);
  ctx.quadraticCurveTo(cx + 24, baseY - 18, cx + 24, baseY - 14);
  ctx.lineTo(cx + 24, baseY - 4);
  ctx.closePath();
  ctx.fill();
  // Windshield (steeper)
  ctx.fillStyle = '#3a4458';
  ctx.beginPath();
  ctx.moveTo(cx - 12, baseY - 16);
  ctx.lineTo(cx - 4, baseY - 22);
  ctx.lineTo(cx + 14, baseY - 22);
  ctx.lineTo(cx + 16, baseY - 12);
  ctx.lineTo(cx - 10, baseY - 12);
  ctx.closePath();
  ctx.fill();
  // Headlight
  ctx.fillStyle = '#ffd24a';
  ctx.fillRect(cx - 26, baseY - 8, 2, 3);
}

function motorcycle(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 16, 4);
  // Two wheels
  ctx.fillStyle = '#1c1d2b';
  ctx.beginPath(); ctx.arc(cx - 12, baseY, 5, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, baseY, 5, 0, PI2); ctx.fill();
  ctx.fillStyle = '#9aa3b8';
  ctx.beginPath(); ctx.arc(cx - 12, baseY, 2, 0, PI2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 12, baseY, 2, 0, PI2); ctx.fill();
  // Body
  ctx.fillStyle = '#c25c5c';
  ctx.fillRect(cx - 14, baseY - 12, 28, 8);
  // Seat
  ctx.fillStyle = '#1c1d2b';
  ctx.fillRect(cx - 4, baseY - 18, 12, 6);
  // Handlebar
  ctx.strokeStyle = '#1c1d2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 14, baseY - 20);
  ctx.lineTo(cx - 16, baseY - 28);
  ctx.lineTo(cx - 8, baseY - 28);
  ctx.stroke();
  // Headlight
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath(); ctx.arc(cx - 16, baseY - 18, 2, 0, PI2); ctx.fill();
}

// ============================================================
// STREET FURNITURE
// ============================================================
function lamppost(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 8, 2);
  // Base
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(cx - 3, baseY - 6, 6, 6);
  // Pole
  ctx.fillStyle = '#5a5a64';
  ctx.fillRect(cx - 1.5, baseY - 78, 3, 72);
  // Pole highlight
  ctx.fillStyle = '#7a7a84';
  ctx.fillRect(cx - 1.5, baseY - 78, 0.8, 72);
  // Lamp head
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath();
  ctx.moveTo(cx - 6, baseY - 78);
  ctx.lineTo(cx + 6, baseY - 78);
  ctx.lineTo(cx + 5, baseY - 86);
  ctx.lineTo(cx - 5, baseY - 86);
  ctx.closePath();
  ctx.fill();
  // Glass shade (glowing-yellow tint)
  ctx.fillStyle = '#ffe9a3';
  ctx.fillRect(cx - 4, baseY - 84, 8, 5);
  // Tiny soft glow halo (subtle, day-time looks faint, night will overlay it)
  const grad = ctx.createRadialGradient(cx, baseY - 81, 1, cx, baseY - 81, 12);
  grad.addColorStop(0, 'rgba(255, 233, 163, 0.45)');
  grad.addColorStop(1, 'rgba(255, 233, 163, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, baseY - 81, 12, 0, PI2);
  ctx.fill();
}

function fenceWood(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 22, 3);
  ctx.fillStyle = '#9a6a3c';
  // 5 vertical pickets
  for (let i = 0; i < 5; i++) {
    const px = cx - 20 + i * 10;
    ctx.fillRect(px, baseY - 24, 4, 22);
    // Pointed tops
    ctx.beginPath();
    ctx.moveTo(px, baseY - 24);
    ctx.lineTo(px + 2, baseY - 28);
    ctx.lineTo(px + 4, baseY - 24);
    ctx.closePath();
    ctx.fill();
  }
  // Horizontal cross-rails
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(cx - 22, baseY - 18, 44, 2);
  ctx.fillRect(cx - 22, baseY - 8, 44, 2);
}

function mailbox(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 8, 2);
  // Pole
  ctx.fillStyle = '#5a3a1f';
  ctx.fillRect(cx - 1, baseY - 30, 2, 28);
  // Box (curved top)
  ctx.fillStyle = '#3a6a9a';
  ctx.beginPath();
  ctx.moveTo(cx - 8, baseY - 30);
  ctx.lineTo(cx + 8, baseY - 30);
  ctx.lineTo(cx + 8, baseY - 42);
  ctx.quadraticCurveTo(cx, baseY - 48, cx - 8, baseY - 42);
  ctx.closePath();
  ctx.fill();
  // Slot
  ctx.fillStyle = '#1c1d2b';
  ctx.fillRect(cx - 4, baseY - 38, 8, 1.5);
  // Flag (raised)
  ctx.fillStyle = '#c25c5c';
  ctx.fillRect(cx + 8, baseY - 44, 4, 4);
}

function busStop(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 32, 6);
  // Bench
  ctx.fillStyle = '#5a5a64';
  ctx.fillRect(cx - 24, baseY - 10, 48, 6);
  ctx.fillRect(cx - 22, baseY - 4, 4, 4);
  ctx.fillRect(cx + 18, baseY - 4, 4, 4);
  // Posts
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(cx - 28, baseY - 60, 3, 56);
  ctx.fillRect(cx + 25, baseY - 60, 3, 56);
  // Roof
  ctx.fillStyle = '#3a4458';
  ctx.fillRect(cx - 32, baseY - 62, 64, 6);
  // Glass back
  ctx.fillStyle = 'rgba(180, 220, 240, 0.35)';
  ctx.fillRect(cx - 25, baseY - 56, 50, 46);
  ctx.strokeStyle = '#5a5a64'; ctx.lineWidth = 0.6;
  ctx.strokeRect(cx - 25, baseY - 56, 50, 46);
  // Sign
  ctx.fillStyle = '#3a6a9a';
  ctx.fillRect(cx - 8, baseY - 80, 16, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BUS', cx, baseY - 71);
}

function trafficPole(ctx, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  shadow(ctx, cx, baseY, 6, 2);
  // Pole
  ctx.fillStyle = '#5a5a64';
  ctx.fillRect(cx - 1.5, baseY - 70, 3, 64);
  // Box housing
  ctx.fillStyle = '#1c1d2b';
  ctx.fillRect(cx - 6, baseY - 80, 12, 18);
  // Three lights (red, yellow, green)
  ctx.fillStyle = '#c25c5c';
  ctx.beginPath(); ctx.arc(cx, baseY - 76, 2, 0, PI2); ctx.fill();
  ctx.fillStyle = '#5a5a30';
  ctx.beginPath(); ctx.arc(cx, baseY - 71, 2, 0, PI2); ctx.fill();
  ctx.fillStyle = '#9bd66f';
  ctx.beginPath(); ctx.arc(cx, baseY - 66, 2, 0, PI2); ctx.fill();
}
