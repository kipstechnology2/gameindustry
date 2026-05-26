/**
 * NPC roster — the residents of Kips City.
 *
 * 15 NPCs distributed across 4 districts so the world feels populated
 * everywhere, not just at the central plaza.
 *
 * Each entry:
 *   - id          : unique key
 *   - name        : display name
 *   - avatarId    : preset key in entities/avatar-presets.js (atlas reuse)
 *   - personality : 6-axis trait vector (-1..+1)
 *   - spawnTile   : initial tile location
 *   - bio         : one-line cozy backstory
 */

export const NPC_ROSTER = Object.freeze([
  // ---------- ASIAN QUARTER residents ----------
  {
    id: 'rosa',
    name: 'Rosa',
    avatarId: 'rosa',
    personality: { extroversion: 0.7, conscientiousness: 0.4, openness: 0.5,
                   agreeableness: 0.7, neuroticism: 0.2, ambition: 0.4 },
    spawnTile: { col: 18, row: 16 },
    bio: 'Loves chatting with everyone she meets.',
  },
  {
    id: 'bao',
    name: 'Bao',
    avatarId: 'bao',
    personality: { extroversion: -0.3, conscientiousness: 0.7, openness: 0.2,
                   agreeableness: 0.4, neuroticism: -0.2, ambition: 0.6 },
    spawnTile: { col: 32, row: 18 },
    bio: 'Disciplined morning runner.',
  },
  {
    id: 'mei',
    name: 'Mei',
    avatarId: 'rosa',
    personality: { extroversion: 0.2, conscientiousness: 0.5, openness: 0.7,
                   agreeableness: 0.6, neuroticism: 0.1, ambition: 0.3 },
    spawnTile: { col: 46, row: 22 },
    bio: 'Tea collector and quiet observer.',
  },

  // ---------- URBAN MODERN residents ----------
  {
    id: 'june',
    name: 'June',
    avatarId: 'june',
    personality: { extroversion: 0.1, conscientiousness: -0.2, openness: 0.8,
                   agreeableness: 0.5, neuroticism: 0.3, ambition: 0.0 },
    spawnTile: { col: 80, row: 14 },
    bio: 'Daydreamer always inventing something.',
  },
  {
    id: 'alex',
    name: 'Alex',
    avatarId: 'bao',
    personality: { extroversion: 0.4, conscientiousness: 0.5, openness: 0.5,
                   agreeableness: 0.3, neuroticism: 0.0, ambition: 0.7 },
    spawnTile: { col: 96, row: 14 },
    bio: 'Tech worker on a coffee mission.',
  },
  {
    id: 'kira',
    name: 'Kira',
    avatarId: 'june',
    personality: { extroversion: 0.5, conscientiousness: 0.3, openness: 0.6,
                   agreeableness: 0.7, neuroticism: 0.2, ambition: 0.4 },
    spawnTile: { col: 112, row: 18 },
    bio: 'Urban explorer with a film camera.',
  },
  {
    id: 'leo',
    name: 'Leo',
    avatarId: 'niko',
    personality: { extroversion: 0.6, conscientiousness: 0.2, openness: 0.4,
                   agreeableness: 0.5, neuroticism: 0.0, ambition: 0.6 },
    spawnTile: { col: 90, row: 36 },
    bio: 'Cafe regular, knows every barista.',
  },

  // ---------- COZY SUBURBS residents ----------
  {
    id: 'niko',
    name: 'Niko',
    avatarId: 'niko',
    personality: { extroversion: -0.6, conscientiousness: -0.4, openness: 0.3,
                   agreeableness: 0.2, neuroticism: 0.0, ambition: -0.4 },
    spawnTile: { col: 14, row: 80 },
    bio: 'Likes sleeping in. A lot.',
  },
  {
    id: 'ana',
    name: 'Ana',
    avatarId: 'rosa',
    personality: { extroversion: 0.6, conscientiousness: 0.4, openness: 0.5,
                   agreeableness: 0.8, neuroticism: 0.1, ambition: 0.3 },
    spawnTile: { col: 30, row: 86 },
    bio: 'Gardener who knows every neighbor.',
  },
  {
    id: 'ben',
    name: 'Ben',
    avatarId: 'bao',
    personality: { extroversion: -0.2, conscientiousness: 0.6, openness: 0.3,
                   agreeableness: 0.4, neuroticism: -0.1, ambition: 0.5 },
    spawnTile: { col: 48, row: 96 },
    bio: 'Dad of three, weekend handyman.',
  },
  {
    id: 'mira',
    name: 'Mira',
    avatarId: 'rosa',
    personality: { extroversion: 0.4, conscientiousness: 0.1, openness: 0.6,
                   agreeableness: 0.6, neuroticism: 0.1, ambition: 0.2 },
    spawnTile: { col: 22, row: 110 },
    bio: 'Curious explorer. Always wandering.',
  },

  // ---------- MARKET DISTRICT residents ----------
  {
    id: 'tomo',
    name: 'Tomo',
    avatarId: 'niko',
    personality: { extroversion: 0.8, conscientiousness: 0.5, openness: 0.4,
                   agreeableness: 0.7, neuroticism: 0.0, ambition: 0.5 },
    spawnTile: { col: 84, row: 80 },
    bio: 'Food cart vendor and town gossip.',
  },
  {
    id: 'lila',
    name: 'Lila',
    avatarId: 'june',
    personality: { extroversion: 0.5, conscientiousness: 0.4, openness: 0.7,
                   agreeableness: 0.6, neuroticism: 0.2, ambition: 0.4 },
    spawnTile: { col: 100, row: 90 },
    bio: 'Loves the fountain and people-watching.',
  },
  {
    id: 'sam',
    name: 'Sam',
    avatarId: 'bao',
    personality: { extroversion: 0.3, conscientiousness: 0.6, openness: 0.5,
                   agreeableness: 0.5, neuroticism: -0.1, ambition: 0.6 },
    spawnTile: { col: 116, row: 100 },
    bio: 'Cafe owner who never seems to rest.',
  },
  {
    id: 'ria',
    name: 'Ria',
    avatarId: 'rosa',
    personality: { extroversion: 0.4, conscientiousness: 0.3, openness: 0.6,
                   agreeableness: 0.7, neuroticism: 0.1, ambition: 0.3 },
    spawnTile: { col: 90, row: 116 },
    bio: 'Sells flowers near the palm grove.',
  },
]);
