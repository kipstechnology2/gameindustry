/**
 * Starter Quests — the first 5 adventures every new Kips City player gets.
 *
 * Each is small and discoverable; they teach the player the systems
 * (talking, building, time, exploration) without holding their hand.
 *
 * Predicates are pure functions of (ctx). The quest engine evaluates them
 * once per slow tick; any expensive lookups should be cached behind a flag.
 */

export const STARTER_QUESTS = Object.freeze([
  {
    id: 'welcome-wave',
    title: 'Wave Hello',
    summary: 'Walk near Rosa and let her notice you.',
    trigger: { day: 1 },
    steps: [
      {
        id: 'meet-rosa',
        label: 'Be near Rosa for a moment.',
        predicate: (ctx) => !!ctx.flagPersistent('met-rosa'),
      },
    ],
    reward: { friendship: { 'rosa': +5 } },
  },

  {
    id: 'decorate',
    title: 'Make Yourself at Home',
    summary: 'Place 3 pieces of furniture using the Workshop.',
    trigger: { day: 1 },
    steps: [
      {
        id: 'place-3',
        label: 'Place 3 furniture pieces.',
        predicate: (ctx) => (ctx.placedFurnitureCount || 0) >= 3,
      },
    ],
    reward: { coins: 30 },
  },

  {
    id: 'fountain-wish',
    title: 'A Wish at the Fountain',
    summary: 'Toss a coin into the central fountain.',
    trigger: { day: 1 },
    steps: [
      {
        id: 'toss-coin',
        label: 'Use the Make a wish action on the fountain.',
        predicate: (ctx) => !!ctx.flagPersistent('tossed-coin'),
      },
    ],
    reward: { fun: +10 },
  },

  {
    id: 'market-mingle',
    title: 'Marketplace Mingle',
    summary: 'Visit both food carts.',
    trigger: { day: 2 },
    steps: [
      {
        id: 'visit-carts',
        label: 'Eat at both food carts.',
        predicate: (ctx) => (ctx.foodCartsVisited || 0) >= 2,
      },
    ],
    reward: { coins: 20 },
  },

  {
    id: 'dawn-stroll',
    title: 'Dawn Stroll',
    summary: 'Be out and about between 5–7 AM.',
    trigger: { day: 2 },
    steps: [
      {
        id: 'be-outside',
        label: 'Be in the city during dawn.',
        predicate: (ctx) => ctx.phase === 'dawn',
      },
    ],
    reward: { calm: +12 },
  },
]);
