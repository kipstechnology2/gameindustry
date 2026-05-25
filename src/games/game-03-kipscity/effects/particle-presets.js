/**
 * Particle Presets — pre-tuned init functions for common visual effects.
 *
 * Each preset writes into a (recycled) Particle and returns. The system
 * never allocates — all randomness happens via Math.random() inline.
 *
 * Add new presets freely; they cost nothing until emitted.
 */

const PI2 = Math.PI * 2;

/** Splash / fountain water droplets — short life, gravity pulls down. */
export const PRESET_WATER = {
  init(p, x, y) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7;
    const speed = 30 + Math.random() * 50;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.ax = 0;
    p.ay = 140; // gravity (px/s²)
    p.life = p.maxLife = 0.9 + Math.random() * 0.4;
    p.alpha = 1;
    p.size = 1.2 + Math.random() * 0.8;
    p.color = Math.random() < 0.5 ? '#a4ddef' : '#cfeeff';
    p.shape = 'circle';
  },
};

/** Steam — rises slowly, fades, drifts sideways. */
export const PRESET_STEAM = {
  init(p, x, y) {
    p.x = x + (Math.random() - 0.5) * 6;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 6;
    p.vy = -16 - Math.random() * 8;
    p.ax = (Math.random() - 0.5) * 4;
    p.ay = -2;
    p.life = p.maxLife = 1.4 + Math.random() * 0.8;
    p.alpha = 0.7;
    p.size = 3 + Math.random() * 2;
    p.color = 'rgba(255, 255, 255, 0.55)';
    p.shape = 'circle';
  },
};

/** Sparkle — small, bright, short pop. */
export const PRESET_SPARKLE = {
  init(p, x, y) {
    const angle = Math.random() * PI2;
    const speed = 20 + Math.random() * 40;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 20;
    p.ax = 0;
    p.ay = 60;
    p.life = p.maxLife = 0.6 + Math.random() * 0.3;
    p.alpha = 1;
    p.size = 1.4 + Math.random() * 0.8;
    p.color = Math.random() < 0.5 ? '#ffe9a3' : '#fff';
    p.shape = 'circle';
  },
};

/** Heart bubble — rises slowly, fades. Great for relationship feedback. */
export const PRESET_HEART = {
  init(p, x, y) {
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 8;
    p.vy = -22 - Math.random() * 6;
    p.ax = 0;
    p.ay = 0;
    p.life = p.maxLife = 1.6;
    p.alpha = 1;
    p.size = 3.2;
    p.color = '#ff7a90';
    p.shape = 'square'; // chunky pixel-art heart placeholder
  },
};

/** Falling leaf — slow drift, side-to-side sway from gravity sign flips. */
export const PRESET_LEAF = {
  init(p, x, y) {
    p.x = x + (Math.random() - 0.5) * 80;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 10;
    p.vy = 8 + Math.random() * 6;
    p.ax = (Math.random() - 0.5) * 4;
    p.ay = 0;
    p.life = p.maxLife = 4 + Math.random() * 2;
    p.alpha = 0.8;
    p.size = 2 + Math.random() * 1.5;
    const palette = ['#9bd66f', '#86c956', '#ffb84d', '#ff7a4a'];
    p.color = palette[(Math.random() * palette.length) | 0];
    p.shape = 'square';
  },
};

/** Rain — vertical streak; gravity-only. */
export const PRESET_RAIN = {
  init(p, x, y) {
    p.x = x;
    p.y = y;
    p.vx = -10;
    p.vy = 200 + Math.random() * 60;
    p.ax = 0;
    p.ay = 0;
    p.life = p.maxLife = 0.6 + Math.random() * 0.3;
    p.alpha = 0.55;
    p.size = 0.8;
    p.color = '#9ec6e0';
    p.shape = 'circle';
  },
};

/** Soft +score / +need toast burst. */
export const PRESET_BURST = {
  init(p, x, y) {
    const angle = Math.random() * PI2;
    const speed = 10 + Math.random() * 20;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 12;
    p.ax = 0;
    p.ay = 24;
    p.life = p.maxLife = 0.5 + Math.random() * 0.3;
    p.alpha = 1;
    p.size = 1.6;
    p.color = '#9bd66f';
    p.shape = 'circle';
  },
};
