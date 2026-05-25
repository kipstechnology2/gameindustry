/**
 * Seeded RNG — Mulberry32.
 *
 * Deterministic across browsers given the same seed.
 * Used for: world generation, NPC personality rolls, daily quest selection.
 *
 * Why seeded? Replayable saves: we store the seed, regenerate identical worlds.
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  /** @param {number} [seed] 32-bit unsigned int */
  constructor(seed) {
    if (seed === undefined) {
      // Use crypto if available for better entropy; fallback to time
      try {
        const buf = new Uint32Array(1);
        (globalThis.crypto || globalThis.msCrypto).getRandomValues(buf);
        seed = buf[0];
      } catch {
        seed = Math.floor(Date.now() % 0xFFFFFFFF);
      }
    }
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }

  /** Unit float [0, 1). */
  next() { return this._next(); }

  /** Float in [min, max). */
  range(min, max) { return min + this._next() * (max - min); }

  /** Integer in [min, max] (inclusive). */
  rangeInt(min, max) { return Math.floor(min + this._next() * (max - min + 1)); }

  /** Pick random element from non-empty array. */
  pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }

  /** Bernoulli trial — true with probability p. */
  chance(p) { return this._next() < p; }

  /** Fisher–Yates shuffle in-place; returns same array. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Weighted pick. items: [{ value, weight }, …]. weight > 0. */
  weighted(items) {
    let total = 0;
    for (const it of items) total += it.weight;
    let r = this._next() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }

  /** Re-seed (e.g. when loading a save). */
  reset(seed) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }
}
