/**
 * Starter NPC roster — the first 5 Kips of the city.
 *
 * Each entry:
 *   - name        : display name
 *   - avatarId    : preset key in entities/avatar-presets.js
 *   - personality : 6-axis trait vector (-1..+1)
 *   - spawnTile   : initial tile location
 *   - color       : optional thematic accent for journal entries
 *   - bio         : one-line cozy backstory (used in dialog/journal later)
 *
 * These NPCs are deliberately diverse in personality so the city feels
 * alive even with just five Kips: an introverted bookworm, an extroverted
 * party-goer, a disciplined morning-runner, a creative dreamer, and a
 * lazy beach-comber.
 */

export const NPC_ROSTER = Object.freeze([
  {
    id: 'rosa',
    name: 'Rosa',
    avatarId: 'rosa',
    personality: {
      extroversion:      0.7,
      conscientiousness: 0.4,
      openness:          0.5,
      agreeableness:     0.7,
      neuroticism:       0.2,
      ambition:          0.4,
    },
    spawnTile: { col: 12, row: 12 },
    bio: 'Loves chatting with everyone she meets.',
  },
  {
    id: 'bao',
    name: 'Bao',
    avatarId: 'bao',
    personality: {
      extroversion:     -0.3,
      conscientiousness: 0.7,
      openness:          0.2,
      agreeableness:     0.4,
      neuroticism:      -0.2,
      ambition:          0.6,
    },
    spawnTile: { col: 20, row: 20 },
    bio: 'Disciplined morning runner.',
  },
  {
    id: 'june',
    name: 'June',
    avatarId: 'june',
    personality: {
      extroversion:      0.1,
      conscientiousness:-0.2,
      openness:          0.8,
      agreeableness:     0.5,
      neuroticism:       0.3,
      ambition:          0.0,
    },
    spawnTile: { col: 14, row: 22 },
    bio: 'Daydreamer always inventing something.',
  },
  {
    id: 'niko',
    name: 'Niko',
    avatarId: 'niko',
    personality: {
      extroversion:     -0.6,
      conscientiousness:-0.4,
      openness:          0.3,
      agreeableness:     0.2,
      neuroticism:       0.0,
      ambition:         -0.4,
    },
    spawnTile: { col: 22, row: 12 },
    bio: 'Likes sleeping in. A lot.',
  },
  {
    id: 'rosa-jr',
    name: 'Mira',
    avatarId: 'rosa', // reuse atlas (memory savings)
    personality: {
      extroversion:      0.4,
      conscientiousness: 0.1,
      openness:          0.6,
      agreeableness:     0.6,
      neuroticism:       0.1,
      ambition:          0.2,
    },
    spawnTile: { col: 18, row: 14 },
    bio: 'Curious explorer. Always wandering.',
  },
]);
