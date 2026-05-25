/**
 * Avatar presets — pre-defined Kip looks.
 *
 * Each preset is a complete AvatarConfig. The atlas is built once per preset
 * and shared across any Kips that pick the same preset (saves memory when
 * many NPCs are on screen).
 *
 * Add new presets freely — they're pure data.
 */

export const AVATAR_PRESETS = Object.freeze({
  // Default player look — warm, approachable
  player: {
    skin:      '#f5cdab',
    hair:      '#5a3825',
    outfit:    '#6c8cff',  // matches portal accent → cohesive branding
    accent:    '#3e547e',
    eyeColor:  '#1c1d2b',
    hairStyle: 'short',
  },

  // Cozy NPC variants for future batches
  rosa: {
    skin:      '#e6b48a',
    hair:      '#883b3b',
    outfit:    '#f29393',
    accent:    '#7a3a3a',
    eyeColor:  '#1c1d2b',
    hairStyle: 'pony',
  },

  bao: {
    skin:      '#e8c8a0',
    hair:      '#1f1f24',
    outfit:    '#2cd56b',
    accent:    '#1a7a3a',
    eyeColor:  '#1c1d2b',
    hairStyle: 'cap',
  },

  june: {
    skin:      '#f3d7c0',
    hair:      '#d8a85f',
    outfit:    '#b06bff',
    accent:    '#5a3a7a',
    eyeColor:  '#1c1d2b',
    hairStyle: 'tall',
  },

  niko: {
    skin:      '#c89472',
    hair:      '#26282e',
    outfit:    '#ffb84d',
    accent:    '#7a4a1a',
    eyeColor:  '#1c1d2b',
    hairStyle: 'short',
  },
});

/** All preset ids in stable order — useful for character creator UI. */
export const AVATAR_PRESET_IDS = Object.freeze(Object.keys(AVATAR_PRESETS));

/** Get a preset config; falls back to player. */
export function getAvatarPreset(id) {
  return AVATAR_PRESETS[id] || AVATAR_PRESETS.player;
}
