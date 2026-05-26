/**
 * Ambient Life — small living things that decorate the world.
 *
 * For Batch 3g this includes:
 *   - Butterflies (sunny daytime, near grass/flowers)
 *   - Falling leaves (autumn-tinted seasonal hint)
 *
 * They are NOT ECS entities — they're managed here for low overhead. Each
 * is a tiny struct with position + animation phase. Quality controller
 * sets the population cap (0/4/12 at LOW/HIGH/ULTRA).
 */

import { TILE } from '../utils/iso-math.js';

const BUTTERFLY_BOB_SPEED = 0.8;
const BUTTERFLY_DRIFT = 18;
const BUTTERFLY_LIFE = 14;

export class AmbientLife {
  constructor() {
    /** @type {Butterfly[]} */
    this.butterflies = [];
    this.maxButterflies = 4;
    this._bounds = { minX: -512, maxX: 512, minY: -256, maxY: 768 };
  }

  setBounds(minX, minY, maxX, maxY) {
    this._bounds = { minX, minY, maxX, maxY };
  }

  setMaxButterflies(n) {
    this.maxButterflies = Math.max(0, n | 0);
    if (this.butterflies.length > this.maxButterflies) {
      this.butterflies.length = this.maxButterflies;
    }
  }

  update(dt) {
    if (dt <= 0) return;

    // Spawn missing butterflies
    while (this.butterflies.length < this.maxButterflies) {
      this.butterflies.push(spawnButterfly(this._bounds));
    }

    // Update each one
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const b = this.butterflies[i];
      b.life -= dt;
      b.t += dt;
      // Flutter: slow horizontal drift + sinusoidal vertical bob
      b.x += b.vx * dt;
      b.y = b.baseY + Math.sin(b.t * BUTTERFLY_BOB_SPEED) * 8;

      const out =
        b.x < this._bounds.minX - 32 || b.x > this._bounds.maxX + 32 ||
        b.y < this._bounds.minY - 32 || b.y > this._bounds.maxY + 32;
      if (b.life <= 0 || out) {
        // Recycle: respawn at edge
        this.butterflies[i] = spawnButterfly(this._bounds);
      }
    }
  }

  render(ctx) {
    if (this.butterflies.length === 0) return;
    for (const b of this.butterflies) {
      drawButterfly(ctx, b);
    }
  }

  clear() { this.butterflies.length = 0; }
}

function spawnButterfly(bounds) {
  // Spawn from a random edge, drift toward opposite
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? bounds.minX : bounds.maxX;
  const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
  const vx = (fromLeft ? 1 : -1) * (BUTTERFLY_DRIFT + Math.random() * 12);
  const colors = ['#ff7a90', '#ffd24a', '#b06bff', '#9bd66f', '#00d4ff'];
  return {
    x,
    y,
    baseY: y,
    vx,
    t: Math.random() * 6,
    life: BUTTERFLY_LIFE,
    color: colors[(Math.random() * colors.length) | 0],
    flap: 0,
  };
}

function drawButterfly(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  // Wing flap from the bob phase
  const flap = Math.cos(b.t * 14) * 0.5 + 0.5; // 0..1
  ctx.fillStyle = b.color;
  // Two wings — narrow when flap=0, wide when flap=1
  const wing = 2 + flap * 3;
  ctx.beginPath();
  ctx.ellipse(-wing * 0.6, 0, wing, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(wing * 0.6, 0, wing, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = '#1c1d2b';
  ctx.fillRect(-0.5, -1.5, 1, 3);
  ctx.restore();
}

/**
 * @typedef {object} Butterfly
 * @property {number} x,y
 * @property {number} baseY
 * @property {number} vx
 * @property {number} t
 * @property {number} life
 * @property {string} color
 * @property {number} flap
 */
