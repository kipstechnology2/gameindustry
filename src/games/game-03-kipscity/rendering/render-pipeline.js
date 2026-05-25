/**
 * Render Pipeline — orchestrates per-frame drawing across the canvas stack.
 *
 * Layers:
 *   0 (world)   — sky background + tilemap + path debug + build-mode overlay
 *   1 (entities)— Kips, NPCs, ambient life, depth-sorted
 *   2 (world UI)— particles, ambient life (butterflies), placement preview
 *   3 (tint)    — day/night color overlay
 *
 * Strategy:
 *   - World layer: full clear + redraw of visible tiles.
 *   - Entity layer: cleared every frame; entity-renderer blits sprites.
 *   - World UI layer: cleared every frame; particles + ambient life.
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
   * @param {import('../effects/particle-system.js').ParticleSystem} [deps.particles]
   * @param {import('../effects/ambient-life.js').AmbientLife} [deps.ambientLife]
   * @param {import('../building/build-mode.js').BuildMode} [deps.buildMode]
   * @param {() => ({col:number,row:number}|null)} [deps.getDestTile]
   * @param {() => boolean} [deps.isDebug]
   */
  constructor({ stack, camera, time, tilemap, entityRenderer, particles,
                ambientLife, buildMode, getDestTile, isDebug }) {
    this.stack = stack;
    this.camera = camera;
    this.time = time;
    this.tilemap = tilemap;
    this.entityRenderer = entityRenderer || null;
    this.particles = particles || null;
    this.ambientLife = ambientLife || null;
    this.buildMode = buildMode || null;
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

    // Sky
    const sky = skyColor(time);
    wctx.fillStyle = sky;
    wctx.fillRect(0, 0, cssW, cssH);

    // Camera transform
    wctx.save();
    wctx.translate(cssW / 2, cssH / 2);
    wctx.scale(camera.zoom, camera.zoom);
    const shake = camera.getRenderOffset();
    wctx.translate(-camera.x + shake.x, -camera.y + shake.y);

    const halfW = cssW / 2 / camera.zoom;
    const halfH = cssH / 2 / camera.zoom;
    const viewBounds = {
      minX: camera.x - halfW,
      maxX: camera.x + halfW,
      minY: camera.y - halfH,
      maxY: camera.y + halfH,
    };

    drawTilemap(wctx, tilemap, viewBounds, time);

    // Path debug
    if (this.isDebug()) {
      const dest = this.getDestTile();
      if (dest && tilemap.inBounds(dest.col, dest.row)) {
        highlightTile(wctx, dest.col, dest.row, 'rgba(108, 140, 255, 0.45)');
      }
    }

    // Build mode hover overlay
    if (this.buildMode && this.buildMode.isActive() && this.buildMode.hoverTile) {
      const t = this.buildMode.hoverTile;
      const color = this.buildMode.hoverValid
        ? 'rgba(155, 214, 111, 0.45)'
        : 'rgba(255, 84, 112, 0.45)';
      highlightTile(wctx, t.col, t.row, color);
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

    // ---- Layer 2: world UI / particles / ambient ----
    const wui = stack.layer(2);
    if (wui) {
      const uctx = wui.ctx;
      uctx.clearRect(0, 0, cssW, cssH);
      uctx.save();
      uctx.translate(cssW / 2, cssH / 2);
      uctx.scale(camera.zoom, camera.zoom);
      uctx.translate(-camera.x + shake.x, -camera.y + shake.y);
      if (this.particles) this.particles.render(uctx);
      if (this.ambientLife) this.ambientLife.render(uctx);
      uctx.restore();
    }

    // ---- Layer 3: day/night tint ----
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

  invalidate() {
    this._tintDirty = true;
  }
}
