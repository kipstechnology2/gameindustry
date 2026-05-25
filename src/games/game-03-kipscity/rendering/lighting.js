/**
 * Day/Night Lighting.
 *
 * Two outputs:
 *   1. skyColor(timeSystem)        → CSS rgb string for sky background
 *   2. tintOverlay(timeSystem)     → CSS rgba overlay applied on top of
 *                                    everything to color-grade the scene
 *
 * Implementation is keyframe-based with linear interpolation between
 * known anchor times. Cheap, smooth, no extra deps.
 */

import { lerp, clamp } from '../utils/grid-math.js';

// Sky color keyframes [hour 0..24, [r, g, b]]
const SKY_KEYS = [
  { h: 0,    rgb: [10, 14, 32] },     // deep night
  { h: 4,    rgb: [16, 22, 50] },     // pre-dawn
  { h: 6,    rgb: [80, 80, 130] },    // first light
  { h: 7.5,  rgb: [255, 180, 140] },  // dawn warmth
  { h: 9,    rgb: [180, 220, 245] },  // morning
  { h: 13,   rgb: [150, 210, 240] },  // mid-day
  { h: 16,   rgb: [220, 220, 230] },  // late afternoon
  { h: 18,   rgb: [255, 165, 100] },  // sunset
  { h: 19.5, rgb: [180, 90, 110] },   // dusk afterglow
  { h: 21,   rgb: [40, 30, 70] },     // night onset
  { h: 23,   rgb: [12, 16, 40] },     // night
  { h: 24,   rgb: [10, 14, 32] },     // wrap
];

// Tint overlay keyframes [hour 0..24, [r, g, b, a]]
const TINT_KEYS = [
  { h: 0,    rgba: [10, 20, 60, 0.42] },     // night
  { h: 4,    rgba: [10, 20, 60, 0.42] },
  { h: 5.5,  rgba: [60, 40, 70, 0.30] },     // pre-dawn
  { h: 7,    rgba: [255, 180, 130, 0.12] },  // dawn warm
  { h: 9,    rgba: [255, 245, 230, 0.0] },   // morning clear
  { h: 14,   rgba: [255, 245, 230, 0.0] },   // day clear
  { h: 16.5, rgba: [255, 220, 170, 0.10] },  // late afternoon
  { h: 18,   rgba: [255, 130, 70, 0.18] },   // sunset orange
  { h: 19.5, rgba: [180, 70, 100, 0.25] },   // dusk magenta
  { h: 21,   rgba: [30, 40, 90, 0.36] },     // night onset
  { h: 23,   rgba: [10, 20, 60, 0.42] },     // night
  { h: 24,   rgba: [10, 20, 60, 0.42] },     // wrap
];

function interpKeys(keys, h) {
  // Find bracketing keys
  const t = clamp(h, 0, 24);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.h && t <= b.h) {
      const span = (b.h - a.h) || 1;
      const u = (t - a.h) / span;
      return a.rgb
        ? a.rgb.map((v, k) => v + (b.rgb[k] - v) * u)
        : a.rgba.map((v, k) => v + (b.rgba[k] - v) * u);
    }
  }
  return keys[keys.length - 1].rgb || keys[keys.length - 1].rgba;
}

/** Returns a CSS rgb() string. */
export function skyColor(timeSystem) {
  const [r, g, b] = interpKeys(SKY_KEYS, timeSystem.hourFloat);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/**
 * Returns a CSS rgba() string for the day/night tint overlay,
 * or null if essentially transparent (alpha < 0.02).
 */
export function tintOverlay(timeSystem) {
  const [r, g, b, a] = interpKeys(TINT_KEYS, timeSystem.hourFloat);
  if (a < 0.02) return null;
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(3)})`;
}

/**
 * Returns ambient light brightness multiplier [0..1] for shading tiles
 * and sprites without applying an overlay (multiply at draw time).
 */
export function ambientBrightness(timeSystem) {
  const h = timeSystem.hourFloat;
  // Dim from 0.5 at night to 1.0 at noon, smoothly
  if (h < 5) return 0.45;
  if (h < 7) return lerp(0.45, 0.85, (h - 5) / 2);
  if (h < 16) return lerp(0.85, 1.0, clamp((h - 7) / 5, 0, 1));
  if (h < 19) return lerp(1.0, 0.65, (h - 16) / 3);
  if (h < 21) return lerp(0.65, 0.45, (h - 19) / 2);
  return 0.45;
}
