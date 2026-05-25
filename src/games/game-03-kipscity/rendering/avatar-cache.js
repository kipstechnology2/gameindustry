/**
 * Avatar Cache — keeps one ProceduralAvatar atlas per preset id.
 *
 * Multiple Kips that share the same preset reuse the same canvas atlas, so
 * memory cost is O(unique-presets), not O(NPCs).
 *
 * Atlases are built lazily on first request (first time a Kip with that
 * preset enters the world). On destroy() we free all GPU canvases.
 */

import { ProceduralAvatar } from './procedural-avatar.js';
import { AVATAR_PRESETS } from '../entities/avatar-presets.js';

export class AvatarCache {
  constructor() {
    /** @type {Map<string, ProceduralAvatar>} */
    this._cache = new Map();
  }

  /**
   * Return (or build on first call) the atlas for a preset id.
   * Falls back to 'player' preset on unknown id.
   */
  get(presetId) {
    let av = this._cache.get(presetId);
    if (av) return av;

    const config = AVATAR_PRESETS[presetId] || AVATAR_PRESETS.player;
    av = new ProceduralAvatar(config);
    this._cache.set(presetId, av);
    return av;
  }

  /** Total number of unique atlases currently held. */
  size() { return this._cache.size; }

  /** Free every atlas (canvas backing store). */
  destroy() {
    for (const av of this._cache.values()) av.destroy();
    this._cache.clear();
  }
}
