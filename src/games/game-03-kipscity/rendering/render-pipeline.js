/**
 * Render Pipeline — orchestrates per-frame drawing across the canvas stack.
 *
 * Layers:
 *   0 (world)   — sky background + tilemap (in world-space transform)
 *   1 (entities)— Kips, NPCs, ambient life (Batch 3c+)
 *   2 (world UI)— mood rings, speech bubbles (Batch 3e+)
 *   3 (tint)    — day/night color overlay
 *
 * Strategy:
 *   - World layer: full clear + redraw of visible tiles (cheap).
 *     Future: cache to offscreen by chunk and reuse if camera unchanged.
 *   - Entity / world-UI layers: cleared every frame; we always draw.
 *   - Tint layer: only repainted when the tint string actually changed
 *     (dirty-flag) — saves ~1ms/frame on low-end phones.
 */

import { skyColor, tintOverlay } from './lighting.js';
import { drawTilemap } from './tile-renderer.js';

export class RenderPipeline {
  constructor({ stack, camera, time, tilemap }) {
    this.stack = stack;
    this.camera = camera;
    this.time = time;
    this.tilemap = tilemap;

    this._lastSky = null;
    this._lastTint = null;
    this._tintDirty = true;
  }

  render() {
    const { stack, camera, time, tilemap } = this;
    const cssW = stack.cssW;
    const cssH = stack.cssH;

    // ---- Layer 0: world ----
    const world = stack.layer(0);
    if (!world) return;
    const wctx = world.ctx;

    // Sky (paint as fill — opaque background)
    const sky = skyColor(time);
    wctx.fillStyle = sky;
    wctx.fillRect(0, 0, cssW, cssH);

    // Apply camera transform: translate to viewport center, scale by zoom,
    // translate by -camera (so camera point lands at viewport center).
    wctx.save();
    wctx.translate(cssW / 2, cssH / 2);
    wctx.scale(camera.zoom, camera.zoom);
    const shake = camera.getRenderOffset();
    wctx.translate(-camera.x + shake.x, -camera.y + shake.y);

    // Compute world-space bounds of the viewport for culling
    const halfW = cssW / 2 / camera.zoom;
    const halfH = cssH / 2 / camera.zoom;
    const viewBounds = {
      minX: camera.x - halfW,
      maxX: camera.x + halfW,
      minY: camera.y - halfH,
      maxY: camera.y + halfH,
    };

    drawTilemap(wctx, tilemap, viewBounds, time);

    wctx.restore();

    // ---- Layer 1: entities (placeholder — batch 3c) ----
    const ent = stack.layer(1);
    if (ent) ent.ctx.clearRect(0, 0, cssW, cssH);

    // ---- Layer 2: world UI (placeholder — batch 3e) ----
    const wui = stack.layer(2);
    if (wui) wui.ctx.clearRect(0, 0, cssW, cssH);

    // ---- Layer 3: day/night tint (only when changed) ----
    const tint = tintOverlay(time);
    if (tint !== this._lastTint) {
      this._lastTint = tint;
      this._tintDirty = true;
    }
    if (this._tintDirty) {
      const tintLayer = stack.layer(3);
      if (tintLayer) {
        tintLayer.ctx.clearRect(0, 0, cssW, cssH);
        if (tint) {
          tintLayer.ctx.fillStyle = tint;
          tintLayer.ctx.fillRect(0, 0, cssW, cssH);
        }
      }
      this._tintDirty = false;
    }
  }

  /** Force tint layer repaint (e.g. after canvas resize). */
  invalidate() {
    this._tintDirty = true;
  }
}
