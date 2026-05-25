/**
 * Cinematic view transitions.
 * Uses the View Transitions API where available, falls back to CSS classes.
 * Honors prefers-reduced-motion automatically (animations.css already neutralizes).
 */

import { Device } from '../utils/device.js';

const SUPPORTS_VTAPI = typeof document !== 'undefined' && 'startViewTransition' in document;

/** Plays the exit phase. Returns when DOM is safe to clear. */
export async function runExit(root) {
  if (!root || Device.prefersReducedMotion) return;
  root.classList.remove('t-fade-up', 't-scale-in', 't-slide-in', 't-fade-in');
  // No exit anim for now — just yield a frame so layout/paint flushes
  await new Promise((r) => requestAnimationFrame(() => r()));
}

/** Plays the enter phase on freshly-mounted content. */
export function runEnter(root, kind = 'fade-up') {
  if (!root || Device.prefersReducedMotion) return;
  const cls = `t-${kind}`;
  // Re-trigger animation
  root.classList.remove(cls);
  // Force reflow
  void root.offsetWidth;
  root.classList.add(cls);
}

/**
 * Cinematic page swap — opt-in via View Transitions API.
 * Use when navigating from list -> detail to get a smooth morph.
 */
export async function withViewTransition(updateFn) {
  if (SUPPORTS_VTAPI && !Device.prefersReducedMotion) {
    await document.startViewTransition(() => Promise.resolve(updateFn())).finished
      .catch(() => {});
  } else {
    await updateFn();
  }
}
