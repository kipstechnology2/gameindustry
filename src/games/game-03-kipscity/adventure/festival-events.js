/**
 * Festival Events — recurring seasonal celebrations.
 *
 * Each season has one festival that triggers on a specific day-of-season.
 * When active, the festival adds temporary bonus objects to the map and
 * modifies the ambient vibe (music intensity, particles, NPC behavior).
 *
 * For the initial pass we define the 4 festivals and a simple isActive()
 * check; the full spawn/cleanup mechanics come in a polish pass when the
 * save system supports "event state" persistence.
 *
 * Festivals:
 *   Spring Bloom (day 7)  — flowers extra-vibrant, flower-picking mini-reward
 *   Summer Surf  (day 14) — beach area has bonus fun multiplier
 *   Autumn Harvest (day 7) — food carts give double hunger satisfaction
 *   Winter Lights (day 21) — night phase gives calm bonus, lantern particles
 */

export const FESTIVALS = Object.freeze([
  {
    id: 'spring-bloom',
    season: 'spring',
    dayOfSeason: 7,
    durationDays: 3,
    title: 'Spring Bloom Festival',
    description: 'Flowers bloom extra bright. Fun activities give +50% bonus.',
    effects: { funMultiplier: 1.5 },
  },
  {
    id: 'summer-surf',
    season: 'summer',
    dayOfSeason: 14,
    durationDays: 3,
    title: 'Summer Surf Day',
    description: 'The beach is alive! Social interactions near water give double.',
    effects: { socialMultiplier: 2.0 },
  },
  {
    id: 'autumn-harvest',
    season: 'autumn',
    dayOfSeason: 7,
    durationDays: 3,
    title: 'Autumn Harvest Fair',
    description: 'Food carts serve double portions. Hunger restored faster.',
    effects: { hungerMultiplier: 2.0 },
  },
  {
    id: 'winter-lights',
    season: 'winter',
    dayOfSeason: 21,
    durationDays: 3,
    title: 'Winter Lights Festival',
    description: 'Lanterns glow at night. Calm drains slower.',
    effects: { calmDecayMultiplier: 0.5 },
  },
]);

/**
 * Check if any festival is currently active.
 * @param {string} season   current season
 * @param {number} dayOfSeason  1-based day within the current season
 * @returns {object|null} the active festival definition, or null
 */
export function getActiveFestival(season, dayOfSeason) {
  for (const f of FESTIVALS) {
    if (f.season !== season) continue;
    if (dayOfSeason >= f.dayOfSeason && dayOfSeason < f.dayOfSeason + f.durationDays) {
      return f;
    }
  }
  return null;
}
