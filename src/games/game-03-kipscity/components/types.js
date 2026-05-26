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
  Sprite:       'Sprite',        // kind, avatarId/objectId, tint
  Animator:     'Animator',      // state, frame, frameTime, fps

  // Identity / classification
  TagPlayer:    'TagPlayer',
  TagNPC:       'TagNPC',
  TagObject:    'TagObject',

  // Simulation (Batch 3d)
  Needs:        'Needs',         // hunger/energy/hygiene/social/fun/...
  Emotion:      'Emotion',       // current emotion + intensity + decay timer

  // AI (Batch 3e)
  Personality:  'Personality',   // 6-axis traits
  Intent:       'Intent',        // current chosen action
  Memory:       'Memory',        // ring buffer of MemoryEvent
  Relations:    'Relations',     // Map<entityId, Bond>

  // Interactions (Batch 3f)
  Interactable: 'Interactable',  // affordances offered by an object

  // Reserved for future
  Inventory:    'Inventory',
  Schedule:     'Schedule',
  Job:          'Job',
});

export const FACING = Object.freeze({
  N: 'N',
  E: 'E',
  S: 'S',
  W: 'W',
});

/** Sprite kinds for the entity-renderer dispatch. */
export const SPRITE_KIND = Object.freeze({
  AVATAR: 'avatar',
  OBJECT: 'object',
});

/** Default player walking speed in world units per second.
 *  Tile half-width is 32, so 192 px/s ≈ 3 tiles per second. */
export const DEFAULT_KIP_SPEED = 192;

// ============================================================
// Spatial / Visual factories
// ============================================================

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

/**
 * Sprite component.
 * - kind: 'avatar' or 'object' — entity-renderer dispatches by this
 * - id:   look-up key (preset id for avatars, type key for objects)
 * - tint: optional CSS color for tinting (null = none)
 */
export function createSprite(id, kind = SPRITE_KIND.AVATAR, tint = null) {
  return { kind, id, tint };
}

/** Convenience: avatar Sprite (matches old createSprite signature). */
export function createAvatarSprite(avatarId, tint = null) {
  return { kind: SPRITE_KIND.AVATAR, id: avatarId, tint };
}

/** Convenience: object Sprite. */
export function createObjectSprite(objectId, tint = null) {
  return { kind: SPRITE_KIND.OBJECT, id: objectId, tint };
}

export function createAnimator(state = 'idle', fps = 8) {
  return {
    state,
    frame: 0,
    frameTime: 0,
    fps,
  };
}

// ============================================================
// Tags (marker components — value is just `true`)
// ============================================================

export function createTagPlayer() { return true; }
export function createTagNPC()    { return true; }
export function createTagObject() { return true; }

// ============================================================
// Needs (Batch 3d)
// ============================================================

/**
 * 9-channel needs vector. All channels normalized to [0..100].
 * For most channels, 100 = satisfied. Stress is INVERTED — stored as
 * `calm` so the model is uniform: 100 = calm.
 *
 * Decay/regrowth rates are defined in simulation/needs-system.js.
 */
export function createNeeds(overrides = {}) {
  return {
    hunger:  85,   // food fullness; decays
    energy:  90,   // rested-ness; decays
    hygiene: 80,
    social:  70,
    fun:     75,
    comfort: 80,
    bladder: 95,
    calm:    80,   // inverse stress; decays (gets less calm) over time
    health: 100,
    ...overrides,
  };
}

/** All need keys in stable display order. */
export const NEED_KEYS = Object.freeze([
  'hunger', 'energy', 'hygiene', 'social', 'fun',
  'comfort', 'bladder', 'calm', 'health',
]);

/** Friendly labels (the i18n keys map to these in locales). */
export const NEED_LABELS = Object.freeze({
  hunger:  'needs.hunger',
  energy:  'needs.energy',
  hygiene: 'needs.hygiene',
  social:  'needs.social',
  fun:     'needs.fun',
  comfort: 'needs.comfort',
  bladder: 'needs.bladder',
  calm:    'needs.calm',
  health:  'needs.health',
});

// ============================================================
// Emotion (Batch 3d)
// ============================================================

export const EMOTION = Object.freeze({
  NEUTRAL: 'neutral',
  HAPPY:   'happy',
  EXCITED: 'excited',
  SAD:     'sad',
  TIRED:   'tired',
  HUNGRY:  'hungry',
  LONELY:  'lonely',
  STRESSED: 'stressed',
  INSPIRED: 'inspired',
});

/**
 * Emotion component.
 *   - state    : EMOTION value
 *   - intensity: 0..1 (mood ring radius / saturation)
 *   - timer    : seconds until natural decay back toward NEUTRAL
 */
export function createEmotion(state = EMOTION.NEUTRAL, intensity = 0.3) {
  return {
    state,
    intensity,
    timer: 0,
  };
}

// ============================================================
// AI: Personality (Batch 3e)
// ============================================================

/**
 * Personality is a 6-axis trait vector, each in [-1..+1].
 *  - extroversion       : -1 introverted ↔ +1 social
 *  - conscientiousness  : -1 lazy        ↔ +1 disciplined
 *  - openness           : -1 traditional ↔ +1 creative
 *  - agreeableness      : -1 competitive ↔ +1 cooperative
 *  - neuroticism        : -1 calm        ↔ +1 emotional
 *  - ambition           : -1 relaxed     ↔ +1 driven
 *
 * Inspired by the Big Five but renamed/repurposed for game design — each
 * trait has a documented effect on action utility scoring (see ai/utility-scorer).
 */
export function createPersonality(overrides = {}) {
  return {
    extroversion:      0,
    conscientiousness: 0,
    openness:          0,
    agreeableness:     0,
    neuroticism:       0,
    ambition:          0,
    ...overrides,
  };
}

// ============================================================
// AI: Intent (current chosen action) — Batch 3e
// ============================================================

/**
 * What the AI/player currently intends to do.
 *   - actionId  : key into ai/action-catalog
 *   - phase     : 'idle' | 'travel' | 'execute' | 'complete'
 *   - target    : { col, row, x, y, entityId? } where to be
 *   - duration  : seconds remaining for 'execute' phase
 *   - effects   : need deltas applied at completion
 *   - anim      : animation state to play during execute
 */
export function createIntent() {
  return {
    actionId: null,
    phase:    'idle',
    target:   null,
    duration: 0,
    effects:  null,
    anim:     null,
    startedAt: 0,
    chosenAt: 0,
  };
}

// ============================================================
// Memory ring buffer (Batch 3e)
// ============================================================

const MEMORY_CAPACITY = 64;

/**
 * Each memory event:
 *   { withWho:number|null, type:string, valence:number, intensity:number, time:number }
 *  - valence in [-1..+1] (negative = bad memory, positive = good)
 *  - intensity in [0..1]
 *  - time = in-game day count when it happened
 */
export function createMemory(capacity = MEMORY_CAPACITY) {
  return {
    capacity,
    head: 0,
    /** @type {Array<{withWho:number|null, type:string, valence:number, intensity:number, time:number}>} */
    events: [],
  };
}

export function pushMemory(memory, event) {
  if (memory.events.length < memory.capacity) {
    memory.events.push(event);
  } else {
    memory.events[memory.head] = event;
    memory.head = (memory.head + 1) % memory.capacity;
  }
}

// ============================================================
// Relations (Batch 3e)
// ============================================================

/**
 * Map of entityId → Bond.
 * Bond.score in [-100..+100] — derived periodically from memories with that entity.
 * Bond.tier ∈ { 'enemy', 'cool', 'acquaintance', 'friend', 'close', 'best' }
 */
export function createRelations() {
  return {
    /** @type {Map<number, {score:number, tier:string, lastInteraction:number}>} */
    bonds: new Map(),
  };
}

export const BOND_TIERS = Object.freeze([
  { tier: 'enemy',        min: -101, max: -40 },
  { tier: 'cool',         min: -40,  max: -10 },
  { tier: 'acquaintance', min: -10,  max:  20 },
  { tier: 'friend',       min:  20,  max:  50 },
  { tier: 'close',        min:  50,  max:  80 },
  { tier: 'best',         min:  80,  max:  101 },
]);

export function tierForScore(score) {
  for (const t of BOND_TIERS) if (score >= t.min && score < t.max) return t.tier;
  return 'acquaintance';
}

// ============================================================
// Interactable (Batch 3f)
// ============================================================

/**
 * Interactable component — held by world objects (beds, fountains, food
 * carts, etc.). The `affordances` array references entries in the
 * interactions/affordance-catalog by id.
 */
export function createInteractable(objectKind, affordanceIds = []) {
  return {
    objectKind,
    affordanceIds,
    /** Tile location (set by spawn factory). */
    col: 0,
    row: 0,
    /** Entity currently using this object, or null. */
    occupiedBy: null,
  };
}
