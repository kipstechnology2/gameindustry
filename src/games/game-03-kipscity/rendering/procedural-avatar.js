/**
 * Procedural Avatar — fully-original chibi sprite atlas built at runtime.
 *
 * Why procedural?
 *   - Zero PNG assets to ship → tiny bundle
 *   - Infinite avatar variation from a small parameter object
 *   - No IP risk — every shape is drawn programmatically here
 *
 * Atlas layout (one canvas per avatar config):
 *   Cols (5):  [ idle, walk1, walk2, walk3, walk4 ]
 *   Rows (4):  [   S,    E,     N,     W   ]
 *
 *   So `getRegion(direction, frame)` maps to a single rect blit.
 *
 * Sprite anatomy (S = front-facing example):
 *
 *     ___       ← hair cap
 *    (   )      ← head (skin tone)
 *    [-]-]      ← outfit body (rounded)
 *    | | |      ← legs
 *     ‾‾        ← shadow ellipse on ground
 *
 * Walk frames bob the body up by a couple of px and swap leg positions —
 * gives the classic four-direction RPG Maker feel without needing
 * hand-painted frames.
 *
 * Visual identity is intentionally cozy/kawaii (round, soft, pastel) so
 * we never approach the realistic Sims aesthetic.
 */

const SPRITE_W = 48;
const SPRITE_H = 64;
const COLS = 5;
const ROWS = 4;

const DIRECTIONS = ['S', 'E', 'N', 'W'];
const DIR_INDEX = { S: 0, E: 1, N: 2, W: 3 };

/**
 * @typedef {object} AvatarConfig
 * @property {string} skin     — hex color
 * @property {string} hair     — hex color
 * @property {string} outfit   — hex color
 * @property {string} accent   — hex color (legs / shoes)
 * @property {string} eyeColor — hex color
 * @property {('cap'|'pony'|'short'|'tall')} hairStyle
 */

export class ProceduralAvatar {
  /** @param {AvatarConfig} config */
  constructor(config) {
    this.config = config;
    this.spriteW = SPRITE_W;
    this.spriteH = SPRITE_H;

    this.atlas = document.createElement('canvas');
    this.atlas.width = SPRITE_W * COLS;
    this.atlas.height = SPRITE_H * ROWS;
    this._render();
  }

  /**
   * Get the source rectangle for a direction + frame.
   * @param {('S'|'E'|'N'|'W')} direction
   * @param {number} frame  0 = idle, 1..4 = walk frames
   */
  getRegion(direction, frame) {
    const f = Math.max(0, Math.min(COLS - 1, frame | 0));
    const r = DIR_INDEX[direction] ?? 0;
    return {
      sx: f * SPRITE_W,
      sy: r * SPRITE_H,
      sw: SPRITE_W,
      sh: SPRITE_H,
    };
  }

  /**
   * Blit this avatar into a context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x  destination world-x (sprite is centered horizontally,
   *                    feet anchored at this y)
   * @param {number} y
   * @param {('S'|'E'|'N'|'W')} direction
   * @param {number} frame
   */
  blit(ctx, x, y, direction, frame) {
    const { sx, sy, sw, sh } = this.getRegion(direction, frame);
    // Anchor: feet are at (x, y); sprite is SPRITE_W wide, SPRITE_H tall
    // → top-left = (x - SPRITE_W/2, y - SPRITE_H + 6) — small lift so feet
    // hover slightly above the tile's bottom edge (visual breathing room).
    ctx.drawImage(
      this.atlas,
      sx, sy, sw, sh,
      x - SPRITE_W / 2,
      y - SPRITE_H + 6,
      SPRITE_W, SPRITE_H
    );
  }

  /** Free GPU resources. */
  destroy() {
    if (this.atlas) {
      this.atlas.width = 0;
      this.atlas.height = 0;
      this.atlas = null;
    }
  }

  // ============================================================
  // INTERNALS — drawing
  // ============================================================
  _render() {
    const ctx = this.atlas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.save();
        ctx.translate(c * SPRITE_W, r * SPRITE_H);
        const direction = DIRECTIONS[r];
        this._drawSprite(ctx, direction, c);
        ctx.restore();
      }
    }
  }

  _drawSprite(ctx, direction, frame) {
    const cx = SPRITE_W / 2;
    const cfg = this.config;

    // Bob: idle frame is fixed; walk frames cycle 0, 1, 0, -1 (units).
    // We index walk frames 1..4 -> bob by sin(theta).
    const bobPhase = frame === 0 ? 0 : ((frame - 1) % 4) * (Math.PI / 2);
    const bob = frame === 0 ? 0 : Math.sin(bobPhase) * 1.5;

    // Leg swing: alternate frames swap left/right leg position
    const legSwing = frame === 0 ? 0
      : (frame === 1 || frame === 3 ? 0 : (frame === 2 ? 2 : -2));

    // 1. Shadow (always at the same Y — ground-anchored)
    ctx.fillStyle = 'rgba(8, 14, 30, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, SPRITE_H - 4, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body baseline (y=0 is top of sprite)
    const bodyTop = SPRITE_H - 36 - bob;
    const headCY  = SPRITE_H - 44 - bob;
    const headR   = 10;

    // 2. Legs
    ctx.fillStyle = cfg.accent;
    const legW = 5;
    const legH = 11;
    const legY = SPRITE_H - 14 - bob;
    if (direction === 'S' || direction === 'N') {
      ctx.fillRect(cx - 6, legY + (legSwing > 0 ? 0 : 1), legW, legH - Math.abs(legSwing));
      ctx.fillRect(cx + 1, legY + (legSwing < 0 ? 0 : 1), legW, legH - Math.abs(legSwing));
    } else {
      // Side view: a single visible leg
      ctx.fillRect(cx - 3, legY, legW, legH - Math.abs(legSwing));
    }

    // 3. Body (rounded rect)
    ctx.fillStyle = cfg.outfit;
    this._roundRect(ctx, cx - 9, bodyTop, 18, 18, 5);
    ctx.fill();

    // Body highlight (top edge for soft "lit from above" look)
    const grad = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + 18);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    this._roundRect(ctx, cx - 9, bodyTop, 18, 18, 5);
    ctx.fill();

    // 4. Arms (small puffy rectangles on the sides for S/N; tucked for E/W)
    if (direction === 'S' || direction === 'N') {
      ctx.fillStyle = cfg.skin;
      const armSwing = frame === 0 ? 0 : Math.sin(bobPhase) * 1.5;
      ctx.fillRect(cx - 12, bodyTop + 4 + armSwing, 4, 9);
      ctx.fillRect(cx + 8,  bodyTop + 4 - armSwing, 4, 9);
    }

    // 5. Head
    ctx.fillStyle = cfg.skin;
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Head soft cheek tint
    ctx.fillStyle = 'rgba(255, 130, 140, 0.18)';
    ctx.beginPath();
    if (direction === 'S') {
      ctx.arc(cx - 5, headCY + 1, 3, 0, Math.PI * 2);
      ctx.arc(cx + 5, headCY + 1, 3, 0, Math.PI * 2);
    } else if (direction === 'E') {
      ctx.arc(cx + 4, headCY + 1, 3, 0, Math.PI * 2);
    } else if (direction === 'W') {
      ctx.arc(cx - 4, headCY + 1, 3, 0, Math.PI * 2);
    }
    ctx.fill();

    // 6. Hair (style varies)
    this._drawHair(ctx, direction, headCY, headR, cx);

    // 7. Face features (none on N — back of head)
    if (direction !== 'N') {
      this._drawFace(ctx, direction, headCY, cx);
    }
  }

  _drawHair(ctx, direction, hcy, hr, cx) {
    const cfg = this.config;
    ctx.fillStyle = cfg.hair;

    switch (cfg.hairStyle) {
      case 'cap': {
        // Half-circle cap covering top of head
        ctx.beginPath();
        ctx.arc(cx, hcy - 1, hr + 1, Math.PI, 0);
        ctx.lineTo(cx + hr + 1, hcy + 1);
        ctx.lineTo(cx - hr - 1, hcy + 1);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'pony': {
        // Cap + a back ponytail (visible from S/N/W more than E)
        ctx.beginPath();
        ctx.arc(cx, hcy - 1, hr + 1, Math.PI, 0);
        ctx.lineTo(cx + hr + 1, hcy + 1);
        ctx.lineTo(cx - hr - 1, hcy + 1);
        ctx.closePath();
        ctx.fill();
        // Tail
        if (direction === 'N' || direction === 'W' || direction === 'S') {
          const tailX = direction === 'W' ? cx + hr - 2 : cx;
          ctx.beginPath();
          ctx.ellipse(tailX, hcy + 4, 4, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'tall': {
        // Cap with a tuft on top
        ctx.beginPath();
        ctx.arc(cx, hcy - 1, hr + 1, Math.PI, 0);
        ctx.lineTo(cx + hr + 1, hcy + 1);
        ctx.lineTo(cx - hr - 1, hcy + 1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 2, hcy - hr - 1, 4, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'short':
      default: {
        // Snug cap, slightly tapered
        ctx.beginPath();
        ctx.arc(cx, hcy, hr + 1, Math.PI + 0.2, -0.2);
        ctx.lineTo(cx + hr - 2, hcy + 2);
        ctx.lineTo(cx - hr + 2, hcy + 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
  }

  _drawFace(ctx, direction, hcy, cx) {
    const eye = this.config.eyeColor || '#1c1d2b';
    ctx.fillStyle = eye;
    if (direction === 'S') {
      ctx.fillRect(cx - 4, hcy - 1, 2, 3);
      ctx.fillRect(cx + 2, hcy - 1, 2, 3);
      // Subtle smile
      ctx.fillStyle = 'rgba(140, 60, 70, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, hcy + 4, 1.4, 0, Math.PI);
      ctx.fill();
    } else if (direction === 'E') {
      ctx.fillRect(cx + 2, hcy - 1, 2, 3);
    } else if (direction === 'W') {
      ctx.fillRect(cx - 4, hcy - 1, 2, 3);
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

/** Sprite dimensions exported for layout math. */
export const AVATAR_SPRITE_DIMS = Object.freeze({
  width: SPRITE_W,
  height: SPRITE_H,
});
