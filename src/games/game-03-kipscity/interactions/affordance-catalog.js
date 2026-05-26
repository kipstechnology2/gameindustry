/**
 * Affordance Catalog — what each object kind offers.
 *
 * Every interactable object has 1-3 affordances (player choices in the
 * action wheel). NPC AI uses the underlying object kind via action-catalog.
 */

export const AFFORDANCES = Object.freeze({
  // ------- Bed -------
  'bed.sleep': {
    id: 'bed.sleep', label: 'Sleep', labelKey: 'affordance.sleep',
    duration: 12, effects: { energy: +60, calm: +15, comfort: +20 },
    anim: 'idle', icon: '💤',
  },
  'bed.nap': {
    id: 'bed.nap', label: 'Nap', labelKey: 'affordance.nap',
    duration: 4, effects: { energy: +20, comfort: +8 },
    anim: 'idle', icon: '😴',
  },

  // ------- Bench -------
  'bench.sit': {
    id: 'bench.sit', label: 'Sit & rest', labelKey: 'affordance.sit',
    duration: 6, effects: { energy: +12, comfort: +12, calm: +5 },
    anim: 'idle', icon: '🪑',
  },
  'bench.read': {
    id: 'bench.read', label: 'Read a book', labelKey: 'affordance.read',
    duration: 10, effects: { fun: +15, calm: +8, comfort: +6 },
    anim: 'idle', icon: '📖',
  },

  // ------- Fountain -------
  'fountain.drink': {
    id: 'fountain.drink', label: 'Refresh', labelKey: 'affordance.drink',
    duration: 3, effects: { hunger: +10, fun: +12, calm: +12, hygiene: +3 },
    anim: 'idle', icon: '💧',
  },
  'fountain.toss-coin': {
    id: 'fountain.toss-coin', label: 'Make a wish', labelKey: 'affordance.toss-coin',
    duration: 3, effects: { fun: +20, calm: +15 },
    anim: 'idle', icon: '🪙',
  },

  // ------- Food cart -------
  'food_cart.snack': {
    id: 'food_cart.snack', label: 'Grab a snack', labelKey: 'affordance.snack',
    duration: 3, effects: { hunger: +20, fun: +5 },
    anim: 'idle', icon: '🍎',
  },
  'food_cart.meal': {
    id: 'food_cart.meal', label: 'Get a full meal', labelKey: 'affordance.meal',
    duration: 5, effects: { hunger: +45, fun: +10, hygiene: -2 },
    anim: 'idle', icon: '🍱',
  },

  // ------- Houses (visit / decorate) -------
  'house_cozy.visit': {
    id: 'house_cozy.visit', label: 'Visit home',
    duration: 8, effects: { calm: +20, comfort: +15 },
    anim: 'idle', icon: '🏠',
  },
  'house_2story.visit': {
    id: 'house_2story.visit', label: 'Visit',
    duration: 8, effects: { calm: +18, comfort: +12 },
    anim: 'idle', icon: '🏡',
  },
  'house_asian.visit': {
    id: 'house_asian.visit', label: 'Visit',
    duration: 8, effects: { calm: +20, comfort: +12 },
    anim: 'idle', icon: '⛩️',
  },

  // ------- Apartment / shops / cafe -------
  'apartment_3story.enter': {
    id: 'apartment_3story.enter', label: 'Go up',
    duration: 6, effects: { energy: +5 },
    anim: 'idle', icon: '🏢',
  },
  'shop_modern.shop': {
    id: 'shop_modern.shop', label: 'Window shop',
    duration: 5, effects: { fun: +15, comfort: +5 },
    anim: 'idle', icon: '🛍️',
  },
  'cafe.coffee': {
    id: 'cafe.coffee', label: 'Have coffee',
    duration: 6, effects: { energy: +25, fun: +12, calm: +8 },
    anim: 'idle', icon: '☕',
  },
  'cafe.relax': {
    id: 'cafe.relax', label: 'Relax outside',
    duration: 8, effects: { calm: +15, fun: +10, comfort: +10 },
    anim: 'idle', icon: '🪴',
  },
  'warung.snack': {
    id: 'warung.snack', label: 'Buy snack',
    duration: 3, effects: { hunger: +20, fun: +6 },
    anim: 'idle', icon: '🍢',
  },
  'warung.chat': {
    id: 'warung.chat', label: 'Chat with seller',
    duration: 5, effects: { social: +15, fun: +8 },
    anim: 'idle', icon: '💬',
  },

  // ------- Trees -------
  'tree_oak.shade': {
    id: 'tree_oak.shade', label: 'Rest in shade',
    duration: 5, effects: { calm: +12, comfort: +8 },
    anim: 'idle', icon: '🌳',
  },
  'tree_cherry.admire': {
    id: 'tree_cherry.admire', label: 'Admire blossoms',
    duration: 4, effects: { fun: +15, calm: +12 },
    anim: 'idle', icon: '🌸',
  },
  'tree_palm.beach-vibe': {
    id: 'tree_palm.beach-vibe', label: 'Tropical breeze',
    duration: 4, effects: { fun: +12, calm: +10 },
    anim: 'idle', icon: '🌴',
  },

  // ------- Bus stop / mailbox -------
  'bus_stop.wait': {
    id: 'bus_stop.wait', label: 'Wait for bus',
    duration: 8, effects: { social: +5, energy: +5 },
    anim: 'idle', icon: '🚏',
  },
  'mailbox.check': {
    id: 'mailbox.check', label: 'Check mail',
    duration: 2, effects: { fun: +5 },
    anim: 'idle', icon: '📬',
  },
});

/** Affordance ids per object kind. */
export const OBJECT_AFFORDANCES = Object.freeze({
  // Furniture
  bed:              ['bed.sleep', 'bed.nap'],
  bench:            ['bench.sit', 'bench.read'],
  fountain:         ['fountain.drink', 'fountain.toss-coin'],
  food_cart:        ['food_cart.snack', 'food_cart.meal'],
  // Buildings
  house_cozy:       ['house_cozy.visit'],
  house_2story:     ['house_2story.visit'],
  house_asian:      ['house_asian.visit'],
  apartment_3story: ['apartment_3story.enter'],
  shop_modern:      ['shop_modern.shop'],
  cafe:             ['cafe.coffee', 'cafe.relax'],
  warung:           ['warung.snack', 'warung.chat'],
  // Trees
  tree_oak:         ['tree_oak.shade'],
  tree_pine:        ['tree_oak.shade'], // same affordance, conifer shade
  tree_cherry:      ['tree_cherry.admire'],
  tree_palm:        ['tree_palm.beach-vibe'],
  // Street
  bus_stop:         ['bus_stop.wait'],
  mailbox:          ['mailbox.check'],
});

/** Object catalog: where defaults live. */
export const OBJECT_CATALOG = Object.freeze({
  bed:              { kind: 'bed',              label: 'Bed' },
  bench:            { kind: 'bench',            label: 'Bench' },
  fountain:         { kind: 'fountain',         label: 'Fountain' },
  food_cart:        { kind: 'food_cart',        label: 'Food cart' },
  house_cozy:       { kind: 'house_cozy',       label: 'Cozy House' },
  house_2story:     { kind: 'house_2story',     label: '2-Story House' },
  house_asian:      { kind: 'house_asian',      label: 'Asian House' },
  apartment_3story: { kind: 'apartment_3story', label: 'Apartment' },
  shop_modern:      { kind: 'shop_modern',      label: 'Modern Shop' },
  cafe:             { kind: 'cafe',             label: 'Cafe' },
  warung:           { kind: 'warung',           label: 'Warung' },
  tree_oak:         { kind: 'tree_oak',         label: 'Oak Tree' },
  tree_pine:        { kind: 'tree_pine',        label: 'Pine Tree' },
  tree_cherry:      { kind: 'tree_cherry',      label: 'Cherry Tree' },
  tree_palm:        { kind: 'tree_palm',        label: 'Palm Tree' },
  car_sedan:        { kind: 'car_sedan',        label: 'Car (Sedan)' },
  car_compact:      { kind: 'car_compact',      label: 'Car (Compact)' },
  motorcycle:       { kind: 'motorcycle',       label: 'Motorcycle' },
  lamppost:         { kind: 'lamppost',         label: 'Lamppost' },
  fence_wood:       { kind: 'fence_wood',       label: 'Wood Fence' },
  mailbox:          { kind: 'mailbox',          label: 'Mailbox' },
  bus_stop:         { kind: 'bus_stop',         label: 'Bus Stop' },
  traffic_pole:     { kind: 'traffic_pole',     label: 'Traffic Light' },
});
