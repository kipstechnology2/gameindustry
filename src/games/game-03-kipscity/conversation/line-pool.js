/**
 * Conversation Line Pool — short procedural dialog strings.
 *
 * For Batch 3i, conversations are decorative (speech bubbles to make the
 * world feel alive); a full branching dialog engine ships in a later batch.
 *
 * Lines are tagged by mood + relationship tier so the right vibe shows up.
 * Choose a line:
 *   pickLine(mood, bondTier) → string
 *
 * Categorization is loose; we randomly pick across mood + tier buckets that
 * apply.
 */

const LINES = Object.freeze({
  // Generic small-talk (any mood, any tier)
  smalltalk: [
    'Lovely day, isn\'t it?',
    'Did you see the fountain earlier?',
    'I think it\'s gonna rain.',
    'I love this part of town.',
    'What\'s for lunch?',
    'You always hum the same tune.',
    'I almost tripped on a leaf!',
    'Mira said she saw a butterfly.',
  ],
  happy: [
    'Such a wonderful day!',
    'Hehe, you\'re so funny.',
    'Tomorrow\'s gonna be even better.',
    'I had the best snack today.',
  ],
  tired: [
    'Ugh, my feet hurt.',
    'I need a nap...',
    'Long day, huh?',
    'When does this day end?',
  ],
  hungry: [
    'I\'m starving.',
    'Where\'s the food cart?',
    'Could eat a whole pie.',
    'My stomach is a bottomless pit.',
  ],
  lonely: [
    '...so glad you\'re here.',
    'I\'ve been a bit blue lately.',
    'Want to walk together?',
    'Wish I had more friends.',
  ],
  stressed: [
    'Too much going on today.',
    'I just need a minute.',
    'My head is spinning.',
    'Don\'t look at me like that.',
  ],

  // Relationship-flavored
  best: [
    'You\'re the best!',
    'I knew you\'d be here.',
    'We should hang out more.',
    'You always know what to say.',
  ],
  close: [
    'Good to see you.',
    'How\'ve you been?',
    'Always nice running into you.',
  ],
  acquaintance: [
    'Hey there.',
    'Nice afternoon.',
    'Catch you around.',
  ],
  cool: [
    'Oh. It\'s you.',
    'Hmph.',
    'Were you looking for something?',
  ],
  enemy: [
    'Don\'t even start.',
    'I have nothing to say.',
    'Walk away, please.',
  ],
});

/**
 * Pick a contextually appropriate line.
 * @param {string} mood     — emotion state ('happy'/'tired'/...) or 'neutral'
 * @param {string} bondTier — bond tier or null
 * @returns {string}
 */
export function pickLine(mood, bondTier) {
  const buckets = [];

  // Mood-specific lines weight 2x
  if (mood && LINES[mood]) buckets.push(LINES[mood], LINES[mood]);

  // Tier-specific
  if (bondTier && LINES[bondTier]) buckets.push(LINES[bondTier]);

  // Always include smalltalk fallback
  buckets.push(LINES.smalltalk);

  const flat = [].concat(...buckets);
  return flat[(Math.random() * flat.length) | 0] || '...';
}

export { LINES };
