/**
 * Affordance Catalog — what each object kind offers.
 *
 * Each affordance is one possible interaction with an object. The action
 * wheel UI presents these to the player on click; NPC AI uses the
 * underlying object kind directly via action-catalog.js.
 *
 * Schema:
 *   id          : unique key (object-scoped, e.g. 'bed.sleep')
 *   labelKey    : i18n key (defaults to label if missing)
 *   label       : English fallback
 *   duration    : seconds to spend interacting
 *   effects     : need deltas applied at completion
 *   anim        : animator state during interaction
 *   minNeed     : optional gating ('hunger' < 90 to allow eating)
 *   icon        : single emoji (or unicode glyph) for the action wheel
 */

export const AFFORDANCES = Object.freeze({
  'bed.sleep': {
    id: 'bed.sleep',
    label: 'Sleep',
    labelKey: 'affordance.sleep',
    duration: 12,
    effects: { energy: +60, calm: +15, comfort: +20 },
    anim: 'idle',
    icon: '💤',
  },
  'bed.nap': {
    id: 'bed.nap',
    label: 'Nap',
    labelKey: 'affordance.nap',
    duration: 4,
    effects: { energy: +20, comfort: +8 },
    anim: 'idle',
    icon: '😴',
  },

  'bench.sit': {
    id: 'bench.sit',
    label: 'Sit & rest',
    labelKey: 'affordance.sit',
    duration: 6,
    effects: { energy: +12, comfort: +12, calm: +5 },
    anim: 'idle',
    icon: '🪑',
  },
  'bench.read': {
    id: 'bench.read',
    label: 'Read a book',
    labelKey: 'affordance.read',
    duration: 10,
    effects: { fun: +15, calm: +8, comfort: +6 },
    anim: 'idle',
    icon: '📖',
  },

  'fountain.drink': {
    id: 'fountain.drink',
    label: 'Refresh',
    labelKey: 'affordance.drink',
    duration: 3,
    effects: { hunger: +10, fun: +12, calm: +12, hygiene: +3 },
    anim: 'idle',
    icon: '💧',
  },
  'fountain.toss-coin': {
    id: 'fountain.toss-coin',
    label: 'Make a wish',
    labelKey: 'affordance.toss-coin',
    duration: 3,
    effects: { fun: +20, calm: +15 },
    anim: 'idle',
    icon: '🪙',
  },

  'food_cart.snack': {
    id: 'food_cart.snack',
    label: 'Grab a snack',
    labelKey: 'affordance.snack',
    duration: 3,
    effects: { hunger: +20, fun: +5 },
    anim: 'idle',
    icon: '🍎',
  },
  'food_cart.meal': {
    id: 'food_cart.meal',
    label: 'Get a full meal',
    labelKey: 'affordance.meal',
    duration: 5,
    effects: { hunger: +45, fun: +10, hygiene: -2 },
    anim: 'idle',
    icon: '🍱',
  },
});

/** Affordance ids per object kind. */
export const OBJECT_AFFORDANCES = Object.freeze({
  bed:       ['bed.sleep', 'bed.nap'],
  bench:     ['bench.sit', 'bench.read'],
  fountain:  ['fountain.drink', 'fountain.toss-coin'],
  food_cart: ['food_cart.snack', 'food_cart.meal'],
});

/** Object catalog: where defaults live. */
export const OBJECT_CATALOG = Object.freeze({
  bed:       { kind: 'bed',       label: 'Bed' },
  bench:     { kind: 'bench',     label: 'Bench' },
  fountain:  { kind: 'fountain',  label: 'Fountain' },
  food_cart: { kind: 'food_cart', label: 'Food cart' },
});
