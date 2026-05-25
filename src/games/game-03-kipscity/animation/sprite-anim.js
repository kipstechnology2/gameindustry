/**
 * Sprite Animation utilities.
 *
 * The animator state on each entity (see components/types.js) is small:
 *
 *   { state, frame, frameTime, fps }
 *
 * This module defines named clips (frame counts + loop config) and the
 * tick() helper that advances frame/frameTime per dt.
 *
 * Currently only two clips exist; future batches add 'sleep', 'work', 'eat',
 * 'talk', etc. The contract: each clip is keyed by a `state` string and
 * encodes frameCount + whether it loops.
 */

const CLIPS = Object.freeze({
  idle: { frames: 1, loop: true },
  // walk uses 4 frames (1..4 in atlas, 0 reserved for idle)
  walk: { frames: 4, loop: true },
});

/**
 * Advance an animator by dt seconds.
 * Returns the *current frame index in the clip's local space* (0..frames-1)
 * AFTER advancement. Caller maps that to the avatar atlas:
 *   - idle → atlas col 0
 *   - walk → atlas col 1 + (localFrame mod 4) = 1..4
 */
export function tickAnimator(animator, dt) {
  const clip = CLIPS[animator.state] || CLIPS.idle;
  if (clip.frames <= 1) {
    // Idle: lock to single frame
    animator.frame = 0;
    animator.frameTime = 0;
    return;
  }
  const period = 1 / animator.fps;
  animator.frameTime += dt;
  while (animator.frameTime >= period) {
    animator.frameTime -= period;
    animator.frame = (animator.frame + 1) % clip.frames;
    if (!clip.loop && animator.frame === 0) {
      // One-shot finished; hold last frame
      animator.frame = clip.frames - 1;
      animator.frameTime = 0;
      break;
    }
  }
}

/**
 * Map animator (state, local frame) → atlas column index.
 * Atlas convention: col 0 = idle, cols 1..4 = walk.
 */
export function frameToAtlasCol(animator) {
  if (animator.state === 'walk') {
    return 1 + (animator.frame % 4);
  }
  return 0;
}

/**
 * Set the animator state, resetting frame timing only when actually changing.
 * (Avoids the visible "snap" if a system tries to set the same state.)
 */
export function setState(animator, newState) {
  if (animator.state === newState) return;
  animator.state = newState;
  animator.frame = 0;
  animator.frameTime = 0;
}

export { CLIPS };
