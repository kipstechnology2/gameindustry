/**
 * Material-style ripple click.
 * Delegated globally — any element with [data-ripple] receives the effect.
 * Auto-adds .ripple class for the CSS to clip.
 */

import { Device } from '../utils/device.js';

const RIPPLE_LIFETIME_MS = 650;

export function installRipple(root = document) {
  if (Device.prefersReducedMotion) return;

  const handler = (e) => {
    const target = e.target.closest('[data-ripple]');
    if (!target || target.disabled) return;

    // Ensure clipping container
    if (!target.classList.contains('ripple')) target.classList.add('ripple');

    const rect = target.getBoundingClientRect();
    const x = (e.clientX ?? (rect.left + rect.width / 2)) - rect.left;
    const y = (e.clientY ?? (rect.top + rect.height / 2)) - rect.top;
    const size = Math.max(rect.width, rect.height);

    const wave = document.createElement('span');
    wave.className = 'ripple__wave';
    wave.style.cssText =
      `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;`;
    target.appendChild(wave);
    setTimeout(() => wave.remove(), RIPPLE_LIFETIME_MS);
  };

  root.addEventListener('pointerdown', handler, { passive: true });
}
