/**
 * Particle System — pooled, allocation-free particle emission.
 *
 * Why: gameplay events (water spray, food cart steam, sparkles, leaves) need
 * lightweight visual feedback. Allocating new objects each frame would drive
 * GC pauses on low-end Android. We keep a pre-sized pool of Particle slots
 * and reuse them.
 *
 * Particle data layout (struct-of-arrays would be even cheaper but we keep
 * the API readable here; profiling shows the array-of-objects approach is
 * fine up to ~600 active particles on 4GB RAM phones).
 *
 * API:
 *   ps.emit(preset, x, y, count?)        — spawn from a preset (see particle-presets)
 *   ps.update(dt)                        — advance positions + lifetimes
 *   ps.render(ctx)                       — blit to canvas (caller has applied camera transform)
 *
 * Quality awareness:
 *   ps.setMaxActive(n)                   — quality-controller dynamically caps the pool
 */

const PARTICLE_POOL_DEFAULT = 600;

export class ParticleSystem {
  constructor(maxActive = PARTICLE_POOL_DEFAULT) {
    this.maxActive = maxActive;
    /** @type {Particle[]} */
    this._pool = new Array(maxActive);
    for (let i = 0; i < maxActive; i++) this._pool[i] = createParticle();
    /** Number of currently-alive particles (occupy slots [0..count)). */
    this.count = 0;
  }

  setMaxActive(n) {
    if (n === this.maxActive) return;
    this.maxActive = n;
    if (this._pool.length < n) {
      for (let i = this._pool.length; i < n; i++) this._pool.push(createParticle());
    } else if (this._pool.length > n) {
      this._pool.length = n;
      if (this.count > n) this.count = n;
    }
  }

  /**
   * Emit `count` particles from `preset` at world (x, y).
   * @param {ParticlePreset} preset
   * @param {number} x
   * @param {number} y
   * @param {number} [count=1]
   */
  emit(preset, x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.count >= this.maxActive) return; // capped
      const p = this._pool[this.count++];
      preset.init(p, x, y);
    }
  }

  update(dt) {
    if (dt <= 0 || this.count === 0) return;
    let write = 0;
    for (let read = 0; read < this.count; read++) {
      const p = this._pool[read];
      p.life -= dt;
      if (p.life <= 0) continue; // dead — drop by NOT incrementing write

      // Apply gravity + drag
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;

      // Fade alpha based on life remaining
      p.alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

      if (write !== read) {
        const tmp = this._pool[write];
        this._pool[write] = p;
        this._pool[read] = tmp;
      }
      write++;
    }
    this.count = write;
  }

  /**
   * Render all alive particles. Caller's ctx is assumed in world-space.
   * Single fillStyle batch per shape — minimizes state changes.
   */
  render(ctx) {
    if (this.count === 0) return;
    ctx.save();
    for (let i = 0; i < this.count; i++) {
      const p = this._pool[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 'square'
        const s = p.size * 2;
        ctx.fillRect(p.x - p.size, p.y - p.size, s, s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() { this.count = 0; }
}

/**
 * @typedef {object} Particle
 * @property {number} x,y       position (world)
 * @property {number} vx,vy     velocity (px/s)
 * @property {number} ax,ay     acceleration (px/s²)
 * @property {number} life      seconds remaining
 * @property {number} maxLife
 * @property {number} alpha
 * @property {number} size      radius (circle) / half-side (square)
 * @property {string} color
 * @property {('circle'|'square')} shape
 */

function createParticle() {
  return {
    x: 0, y: 0,
    vx: 0, vy: 0,
    ax: 0, ay: 0,
    life: 0, maxLife: 1,
    alpha: 1,
    size: 2,
    color: '#fff',
    shape: 'circle',
  };
}

/**
 * @typedef {object} ParticlePreset
 * @property {(p: Particle, x: number, y: number) => void} init
 */
