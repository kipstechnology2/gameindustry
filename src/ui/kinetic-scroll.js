/**
 * Kinetic horizontal scrolling for the catalog rails.
 *
 * - Pointer / touch / mouse drag to pan.
 * - Releases with momentum (decaying velocity) for a "Netflix on iOS" feel.
 * - Snaps to nearest card on settle.
 * - Plays nicely with native wheel + native touch scroll: only hijacks when the
 *   user clearly initiates a horizontal drag.
 */

import { Device } from '../utils/device.js';

const FRICTION   = 0.94;   // velocity decay per frame (~60Hz)
const MIN_VEL    = 0.15;   // px/frame; below this -> snap
const DRAG_THRESH = 6;     // px before we hijack scroll
const MAX_VEL    = 60;     // safety clamp

export function attachKineticScroll(rail, { snap = true, snapSelector = '.game-card' } = {}) {
  if (!rail) return () => {};

  let isDown = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let raf = 0;
  let dragHijacked = false;
  let pointerId = null;

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDown = true;
    dragHijacked = false;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    startScroll = rail.scrollLeft;
    lastT = performance.now();
    velocity = 0;
    cancelAnimationFrame(raf);
  };

  const onPointerMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;

    // Only hijack once the user moves horizontally past threshold
    if (!dragHijacked) {
      if (Math.abs(dx) < DRAG_THRESH) return;
      dragHijacked = true;
      rail.classList.add('is-dragging');
      try { rail.setPointerCapture(pointerId); } catch (_) {}
    }

    rail.scrollLeft = startScroll - dx;

    const now = performance.now();
    const dt = Math.max(8, now - lastT);
    velocity = clamp(((lastX - e.clientX) / dt) * 16, -MAX_VEL, MAX_VEL);
    lastX = e.clientX;
    lastT = now;
    e.preventDefault();
  };

  const onPointerUp = () => {
    if (!isDown) return;
    isDown = false;
    rail.classList.remove('is-dragging');
    try { rail.releasePointerCapture(pointerId); } catch (_) {}
    if (!dragHijacked) return;

    // Suppress the click that would otherwise fire on the card we just dragged
    rail.addEventListener('click', swallowClickOnce, { capture: true, once: true });

    // Momentum
    const tick = () => {
      if (Math.abs(velocity) < MIN_VEL) {
        if (snap) snapToNearest(rail, snapSelector);
        return;
      }
      rail.scrollLeft += velocity;
      velocity *= FRICTION;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  rail.addEventListener('pointerdown', onPointerDown);
  rail.addEventListener('pointermove', onPointerMove);
  rail.addEventListener('pointerup', onPointerUp);
  rail.addEventListener('pointercancel', onPointerUp);
  rail.addEventListener('pointerleave', onPointerUp);

  // Mouse wheel: vertical wheel -> horizontal pan (desktop)
  if (Device.isDesktop) {
    rail.addEventListener('wheel', (e) => {
      // Only convert when there's no horizontal intent (e.g. trackpad swipe)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        rail.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }

  // teardown
  return () => {
    cancelAnimationFrame(raf);
    rail.removeEventListener('pointerdown', onPointerDown);
    rail.removeEventListener('pointermove', onPointerMove);
    rail.removeEventListener('pointerup', onPointerUp);
    rail.removeEventListener('pointercancel', onPointerUp);
    rail.removeEventListener('pointerleave', onPointerUp);
  };
}

function swallowClickOnce(e) {
  e.stopPropagation();
  e.preventDefault();
}

function snapToNearest(rail, selector) {
  const cards = rail.querySelectorAll(selector);
  if (!cards.length) return;
  const railRect = rail.getBoundingClientRect();
  let best = null, bestDist = Infinity;
  cards.forEach((c) => {
    const r = c.getBoundingClientRect();
    const d = Math.abs(r.left - railRect.left);
    if (d < bestDist) { bestDist = d; best = c; }
  });
  if (best && Math.abs(rail.scrollLeft - (best.offsetLeft - rail.offsetLeft)) > 2) {
    rail.scrollTo({ left: best.offsetLeft - rail.offsetLeft, behavior: 'smooth' });
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
