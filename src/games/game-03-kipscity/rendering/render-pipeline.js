/**
 * Render Pipeline — orchestrates per-frame drawing across the canvas stack.
 *
 * Layers:
 *   0 (world)   — sky background + tilemap + path debug (in world-space)
 *   1 (entities)— Kips, NPCs, ambient life (depth-sorted)
 *   2 (world UI)— mood rings, speech bubbles (Batch 3e+)
 *   3 (tint)    — day/night color overlay
 *
 * Strategy:
 *   - World layer: full clear + redraw of visible tiles.
 *   - Entity layer: cleared every frame; entity-renderer blits sprites.
 *   - Tint layer: dirty-flag, only repainted when the tint string changed.
 */

import { skyColor, tintOverlay } from './lighting.js';
import { drawTilemap, highlightTile } from './tile-renderer.js';

export class RenderPipeline {
  /**
   * @param {object} deps
   * @param {import('./canvas-stack.js').CanvasStack} deps.stack
   * @param {import('../world/camera.js').Camera} deps.camera
   * @param {import('../core/time.js').TimeSystem} deps.time
   * @param {import('../world/tilemap.js').Tilemap} deps.tilemap
   * @param {import('./entity-renderer.js').EntityRenderer} [deps.entityRenderer]
   * @param {() => ({col:number,row:number}|null)} [deps.getDestTile]  optional path-debug source
   * @param {() => boolean} [deps.isDebug]                              show debug helpers
   */
  constructor({ stack, camera, time, tilemap, entityRenderer, getDestTile, isDebug }) {
    this.stack = stack;
    this.camera = camera;
    this.time = time;
    this.tilemap = tilemap;
    this.entityRenderer = entityRenderer || null;
    this.getDestTile = getDestTile || (() => null);
    this.isDebug = isDebug || (() => false);

    this._lastTint = null;
    this._tintDirty = true;
  }

  setEntityRenderer(er) { this.entityRenderer = er; }

  render() {
    const { stack, camera, time, tilemap } = this;
    const cssW = stack.cssW;
    const cssH = stack.cssH;

    // ---- Layer 0: world ----
    const world = stack.layer(0);
    if (!world) return;
    const wctx = world.ctx;

    // Sky (paint as opaque fill)
    const sky = skyColor(time);
    wctx.fillStyle = sky;
    wctx.fillRect(0, 0, cssW, cssH);

    // Apply camera transform
    wctx.save();
    wctx.translate(cssW / 2, cssH / 2);
    wctx.scale(camera.zoom, camera.zoom);
    const shake = camera.getRenderOffset();
    wctx.translate(-camera.x + shake.x, -camera.y + shake.y);

    // Visible bounds (world-space)
    const halfW = cssW / 2 / camera.zoom;
    const halfH = cssH / 2 / camera.zoom;
    const viewBounds = {
      minX: camera.x - halfW,
      maxX: camera.x + halfW,
      minY: camera.y - halfH,
      maxY: camera.y + halfH,
    };

    drawTilemap(wctx, tilemap, viewBounds, time);

    // Path-debug highlight when debug overlay is on
    if (this.isDebug()) {
      const dest = this.getDestTile();
      if (dest && tilemap.inBounds(dest.col, dest.row)) {
        highlightTile(wctx, dest.col, dest.row, 'rgba(108, 140, 255, 0.45)');
      }
    }

    wctx.restore();

    // ---- Layer 1: entities ----
    const ent = stack.layer(1);
    if (ent) {
      const ectx = ent.ctx;
      ectx.clearRect(0, 0, cssW, cssH);
      if (this.entityRenderer) {
        ectx.save();
        ectx.translate(cssW / 2, cssH / 2);
        ectx.scale(camera.zoom, camera.zoom);
        ectx.translate(-camera.x + shake.x, -camera.y + shake.y);
        this.entityRenderer.render(ectx);
        ectx.restore();
      }
    }

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
