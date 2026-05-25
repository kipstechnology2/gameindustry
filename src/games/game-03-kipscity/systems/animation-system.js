/**
 * Animation System — per-frame animator advancement.
 *
 * For every entity with Animator + Motion:
 *   - If motion is essentially zero  → state = 'idle'
 *   - Else                            → state = 'walk'
 *   - Tick the frame counter by dt
 *
 * State transitions reset the frame timer (see setState in sprite-anim).
 */

import { C } from '../components/types.js';
import { tickAnimator, setState } from '../animation/sprite-anim.js';

const MOTION_THRESHOLD_SQ = 1.5 * 1.5; // (px/s)² — squared to avoid sqrt

export class AnimationSystem {
  constructor({ world }) {
    this.world = world;
  }

  update(dt) {
    if (dt <= 0) return;
    for (const e of this.world.query([C.Animator, C.Motion])) {
      const a = e[C.Animator];
      const m = e[C.Motion];
      const speedSq = m.vx * m.vx + m.vy * m.vy;
      if (speedSq < MOTION_THRESHOLD_SQ) {
        setState(a, 'idle');
      } else {
        setState(a, 'walk');
      }
      tickAnimator(a, dt);
    }
  }
}
