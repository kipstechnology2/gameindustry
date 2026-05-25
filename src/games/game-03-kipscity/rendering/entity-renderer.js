/**
 * Entity Renderer — depth-sorted blits onto Layer 1 of the canvas stack.
 *
 * Inputs (per entity):
 *   - Transform (x, y, facing)
 *   - Sprite (avatarId)
 *   - Animator (state, frame)
 *
 * Depth ordering: entities are sorted by world-y so a Kip standing closer
 * to the camera (larger y) renders in front. Stable sort by entityId secondary.
 *
 * Performance:
 *   - Reusable scratch arrays (no allocation in the hot loop)
 *   - View-frustum culling: skip entities outside the camera bounds + margin
 *
 * Lighting:
 *   - Multiplies sprite by ambient brightness (cheap globalCompositeOperation
 *     trick): we tint with a multiplicative dark overlay on the layer once,
 *     not per-sprite, because the day/night tint layer (Layer 3) already
 *     darkens everything. The entity layer just needs a slight ambient
 *     darkening for night so Kips don't glow in pitch dark — handled by
 *     the existing tint overlay above.
 */

import { C } from '../components/types.js';
import { AVATAR_SPRITE_DIMS } from './procedural-avatar.js';
import { frameToAtlasCol } from '../animation/sprite-anim.js';

const CULL_MARGIN_PX = 64;

export class EntityRenderer {
  /**
   * @param {object} deps
   * @param {import('./avatar-cache.js').AvatarCache} deps.avatarCache
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/camera.js').Camera} deps.camera
   */
  constructor({ avatarCache, world, camera }) {
    this.avatarCache = avatarCache;
    this.world = world;
    this.camera = camera;
    this._scratch = []; // reused each frame
  }

  /**
   * Render visible entities into the given context.
   * Caller must apply camera transform first (renderer uses world coords).
   */
  render(ctx) {
    const cam = this.camera;
    const halfW = cam.viewportW / 2 / cam.zoom + CULL_MARGIN_PX;
    const halfH = cam.viewportH / 2 / cam.zoom + CULL_MARGIN_PX;
    const minX = cam.x - halfW;
    const maxX = cam.x + halfW;
    const minY = cam.y - halfH;
    const maxY = cam.y + halfH;

    // 1. Collect visible entities into scratch
    const list = this._scratch;
    list.length = 0;

    for (const e of this.world.query([C.Transform, C.Sprite, C.Animator])) {
      const t = e[C.Transform];
      // Cull outside view (with a generous margin so sprite doesn't pop)
      if (t.x < minX || t.x > maxX || t.y < minY || t.y > maxY) continue;
      list.push(e);
    }

    // 2. Depth sort by world-y (greater y = nearer = drawn last)
    list.sort(depthCompare);

    // 3. Blit
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const t = e[C.Transform];
      const a = e[C.Animator];
      const s = e[C.Sprite];

      const avatar = this.avatarCache.get(s.avatarId);
      if (!avatar) continue;

      avatar.blit(ctx, t.x, t.y, t.facing, frameToAtlasCol(a));
    }

    // Clear scratch refs so we don't pin old component objects
    list.length = 0;
  }

  /** Sprite footprint width — useful for input hit-testing later. */
  get spriteWidth() { return AVATAR_SPRITE_DIMS.width; }
  get spriteHeight() { return AVATAR_SPRITE_DIMS.height; }
}

function depthCompare(a, b) {
  const dy = a[C.Transform].y - b[C.Transform].y;
  if (dy !== 0) return dy;
  return a.id - b.id; // stable
}
