/**
 * Entity Renderer — depth-sorted blits onto Layer 1 of the canvas stack.
 *
 * Dispatches by Sprite.kind:
 *   - 'avatar' → AvatarCache.get(id).blit(...)
 *   - 'object' → ObjectAtlas.get(id).blit(...)
 *
 * Inputs (per entity):
 *   - Transform (x, y, facing)
 *   - Sprite ({ kind, id, tint? })
 *   - Animator (state, frame)  ← objects can supply a fixed Animator
 *
 * Depth ordering: world-y ASC (greater y = nearer the camera = drawn last).
 *
 * Performance:
 *   - Reusable scratch arrays — zero allocation in the hot loop
 *   - View-frustum culling with margin
 */

import { C, SPRITE_KIND } from '../components/types.js';
import { AVATAR_SPRITE_DIMS } from './procedural-avatar.js';
import { frameToAtlasCol } from '../animation/sprite-anim.js';

const CULL_MARGIN_PX = 96;

export class EntityRenderer {
  /**
   * @param {object} deps
   * @param {import('./avatar-cache.js').AvatarCache} deps.avatarCache
   * @param {import('./object-atlas.js').ObjectAtlas}  [deps.objectAtlas]
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/camera.js').Camera} deps.camera
   */
  constructor({ avatarCache, objectAtlas, world, camera }) {
    this.avatarCache = avatarCache;
    this.objectAtlas = objectAtlas || null;
    this.world = world;
    this.camera = camera;
    this._scratch = [];
  }

  setObjectAtlas(atlas) { this.objectAtlas = atlas; }

  render(ctx) {
    const cam = this.camera;
    const halfW = cam.viewportW / 2 / cam.zoom + CULL_MARGIN_PX;
    const halfH = cam.viewportH / 2 / cam.zoom + CULL_MARGIN_PX;
    const minX = cam.x - halfW;
    const maxX = cam.x + halfW;
    const minY = cam.y - halfH;
    const maxY = cam.y + halfH;

    const list = this._scratch;
    list.length = 0;

    for (const e of this.world.query([C.Transform, C.Sprite, C.Animator])) {
      const t = e[C.Transform];
      if (t.x < minX || t.x > maxX || t.y < minY || t.y > maxY) continue;
      list.push(e);
    }
    list.sort(depthCompare);

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const t = e[C.Transform];
      const a = e[C.Animator];
      const s = e[C.Sprite];

      if (s.kind === SPRITE_KIND.OBJECT && this.objectAtlas) {
        this.objectAtlas.blit(ctx, s.id, t.x, t.y);
      } else {
        // Default: avatar
        const avatar = this.avatarCache.get(s.id);
        if (!avatar) continue;
        avatar.blit(ctx, t.x, t.y, t.facing, frameToAtlasCol(a));
      }
    }

    list.length = 0;
  }

  get spriteWidth() { return AVATAR_SPRITE_DIMS.width; }
  get spriteHeight() { return AVATAR_SPRITE_DIMS.height; }
}

function depthCompare(a, b) {
  const dy = a[C.Transform].y - b[C.Transform].y;
  if (dy !== 0) return dy;
  return a.id - b.id;
}
