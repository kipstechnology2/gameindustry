/**
 * Component Types — pure data factories.
 *
 * Components are plain objects (no methods). Systems read/write them.
 * String keys are used as the ECS component-type identifier; the C
 * registry below documents and centralizes them so we never typo.
 *
 * Why factories rather than classes?
 *   - Cache-friendly iteration (no v-table indirection)
 *   - Trivial to JSON-serialize for save system
 *   - Easy to clone with structuredClone for snapshots
 */

export const C = Object.freeze({
  // Spatial
  Transform:    'Transform',     // x, y, facing
  Motion:       'Motion',        // vx, vy, speed
  Path:         'Path',          // waypoints, index

  // Visual
  Sprite:       'Sprite',        // avatarId, tint
  Animator:     'Animator',      // state, frame, frameTime, fps

  // Identity / classification
  TagPlayer:    'TagPlayer',
  TagNPC:       'TagNPC',

  // Future batches (declared so type IDs allocate consistently)
  Needs:        'Needs',
  Emotion:      'Emotion',
  Personality:  'Personality',
  Relations:    'Relations',
  Memory:       'Memory',
  Inventory:    'Inventory',
  Schedule:     'Schedule',
  Job:          'Job',
  Intent:       'Intent',
  Interactable: 'Interactable',
});

export const FACING = Object.freeze({
  N: 'N',
  E: 'E',
  S: 'S',
  W: 'W',
});

/** Default player walking speed in world units per second.
 *  Tile half-width is 32, so 192 px/s ≈ 3 tiles per second. */
export const DEFAULT_KIP_SPEED = 192;

// ---------------- factories ----------------

export function createTransform(x = 0, y = 0, facing = FACING.S) {
  return { x, y, facing };
}

export function createMotion(speed = DEFAULT_KIP_SPEED) {
  return { vx: 0, vy: 0, speed };
}

export function createPath() {
  return {
    /** @type {Array<{col:number,row:number,x:number,y:number}>|null} */
    waypoints: null,
    index: 0,
  };
}

export function createSprite(avatarId, tint = null) {
  return { avatarId, tint };
}

/**
 * Animator component.
 * State is one of: 'idle' | 'walk'. Future: 'sleep' | 'work' | 'talk' | 'eat'…
 * Frame = current frame index inside the running clip. fps drives advancement.
 */
export function createAnimator(state = 'idle', fps = 8) {
  return {
    state,
    frame: 0,
    frameTime: 0,
    fps,
  };
}

/** Marker components — value is just `true`. */
export function createTagPlayer() { return true; }
export function createTagNPC() { return true; }
