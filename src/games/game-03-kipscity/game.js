/**
 * KIPS CITY — Game Entry Point.
 *
 * Implements the Hub Game Interface:
 *   default export: factory({ mount, params, locale }) → controller
 *   controller:     { start, pause, resume, stop, destroy }
 *
 * The hub's play view calls factory() to mount the game, then start()
 * to begin the loop. On navigation away, it calls destroy() — every
 * subsystem must release its resources here for zero memory leaks.
 *
 * Batch 3a delivers:
 *   - Multi-rate loop with placeholder tracks for needs/AI/motion/weather
 *   - 4-layer canvas stack with adaptive quality
 *   - Isometric tilemap rendering with day/night lighting
 *   - Smooth pan/zoom/pinch input
 *   - In-game clock HUD + debug overlay (F3)
 *   - Time-speed controls (1: 1×, 2: 4×, 3: 16×, 0: pause)
 *   - Tab-hidden auto-pause
 */

import { GameLoop } from './core/loop.js';
import { TimeSystem } from './core/time.js';
import { ServiceLocator } from './core/service-locator.js';
import { Disposables } from './core/lifecycle.js';
import { DebugOverlay } from './core/debug.js';
import { createGameBus, KC_EVT } from './core/event-bus.js';

import { World } from './ecs/world.js';
import { SpatialHash } from './ecs/spatial-hash.js';

import { CanvasStack } from './rendering/canvas-stack.js';
import { RenderPipeline } from './rendering/render-pipeline.js';

import { Camera } from './world/camera.js';
import { buildStarterMap, getStarterSpawn, STARTER_MAP_COLS, STARTER_MAP_ROWS } from './world/world-builder.js';

import { Hud, HelpBanner } from './ui/hud.js';

import { FpsMonitor } from './optimization/fps-monitor.js';
import { QualityController } from './optimization/quality-tier.js';
import { VisibilityHandler } from './optimization/visibility.js';

import { InputRouter } from './utils/input-router.js';
import { RNG } from './utils/rng.js';
import { tileCenter } from './utils/iso-math.js';

const GAME_VERSION = '0.1.0-batch-3a';
const DEFAULT_SEED = 0xC1751EE; // "kipsie" :)
const PINCH_SENSITIVITY = 1.0;
const WHEEL_ZOOM_FACTOR = 1.12;

/**
 * Factory — called by the hub's play view.
 *
 * @param {object} ctx
 * @param {HTMLElement} ctx.mount   container the game mounts into (filled fully)
 * @param {object}      [ctx.params] route params ({ id })
 * @param {string}      [ctx.locale] active locale code (en/id/ja/ko/zh)
 */
export default function createKipsCity({ mount, params = {}, locale = 'en' } = {}) {
  if (!mount) throw new Error('Kips City: mount element required');

  // ---------------- Service container & disposables ----------------
  const services = new ServiceLocator();
  const disposables = new Disposables();
  const bus = createGameBus();

  // ---------------- Rendering surface ----------------
  const stack = new CanvasStack(mount, 4);
  disposables.add(stack);

  // ---------------- Core systems ----------------
  const loop = new GameLoop();
  const time = new TimeSystem({ startHour: 7 });
  const world = new World();
  const spatial = new SpatialHash(64);
  const rng = new RNG(DEFAULT_SEED);
  const fpsMonitor = new FpsMonitor();
  const quality = new QualityController();
  const visibility = new VisibilityHandler();
  const debug = new DebugOverlay();

  disposables.add(visibility);
  disposables.add(() => world.clear());
  disposables.add(() => spatial.clear());
  disposables.add(() => loop.stop());

  // ---------------- World content ----------------
  const tilemap = buildStarterMap(rng);
  const camera = new Camera(stack.cssW, stack.cssH);

  // Set camera bounds so we can't pan into the void; with a small buffer
  const halfMapW = (STARTER_MAP_COLS + STARTER_MAP_ROWS) * 32; // tile half-width × tiles
  const halfMapH = (STARTER_MAP_COLS + STARTER_MAP_ROWS) * 16;
  camera.setBounds(-halfMapW * 0.6, -halfMapH * 0.2, halfMapW * 0.6, halfMapH * 1.0);

  // Spawn point in the middle of the plaza
  const spawnTile = getStarterSpawn();
  const spawnPx = tileCenter(spawnTile.col, spawnTile.row);
  camera.snapTo(spawnPx.x, spawnPx.y, 1.0);

  // ---------------- Input ----------------
  const input = new InputRouter(stack.wrap);
  disposables.add(input);

  // ---------------- Render pipeline ----------------
  const pipeline = new RenderPipeline({ stack, camera, time, tilemap });

  // Resize → camera viewport + tint repaint
  const offResize = stack.onResize((w, h) => {
    camera.setViewport(w, h);
    pipeline.invalidate();
  });
  disposables.add(offResize);

  // ---------------- HUD ----------------
  const hud = new Hud();
  hud.mount(stack.wrap);
  disposables.add(hud);

  // ---------------- Debug overlay ----------------
  debug.mount(stack.wrap);
  disposables.add(debug);

  // ---------------- Help banner (auto-fades after 8s) ----------------
  const help = new HelpBanner(
    `<strong style="color:#fff">KIPS CITY · Batch 3a</strong><br>
     <span style="opacity:.85">Drag to pan · Wheel/pinch to zoom · F3 toggles debug · 1/2/3 sets time speed · 0 to pause</span>`
  );
  help.mount(stack.wrap);
  disposables.add(help);

  // ---------------- Service registration ----------------
  services.register('loop', loop);
  services.register('time', time);
  services.register('world', world);
  services.register('spatial', spatial);
  services.register('rng', rng);
  services.register('camera', camera);
  services.register('tilemap', tilemap);
  services.register('stack', stack);
  services.register('input', input);
  services.register('hud', hud);
  services.register('debug', debug);
  services.register('quality', quality);
  services.register('fps', fpsMonitor);
  services.register('bus', bus);

  // ---------------- Input wiring ----------------
  // Drag to pan: drag-direction matches content motion (drag right = world moves right)
  disposables.add(input.on('pan', (dx, dy) => {
    camera.panBy(-dx, -dy);
  }));

  disposables.add(input.on('wheel', (deltaY, x, y) => {
    const factor = deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    camera.zoomBy(factor, x, y);
  }));

  disposables.add(input.on('pinch', (scale, x, y) => {
    // Apply a tiny attenuation so pinch isn't twitchy
    const attenuated = 1 + (scale - 1) * PINCH_SENSITIVITY;
    camera.zoomBy(attenuated, x, y);
  }));

  // Time-speed shortcuts (also useful for QA)
  disposables.add(input.on('keydown', (key) => {
    switch (key) {
      case '0': loop.setTimeScale(0); break;
      case '1': loop.setTimeScale(1); break;
      case '2': loop.setTimeScale(4); break;
      case '3': loop.setTimeScale(16); break;
      case '+': case '=':
        camera.zoomBy(1.15, stack.cssW / 2, stack.cssH / 2); break;
      case '-':
        camera.zoomBy(1 / 1.15, stack.cssW / 2, stack.cssH / 2); break;
    }
  }));

  // ---------------- Time event bridge ----------------
  disposables.add(time.on('phaseChange', (p) => {
    bus.emit(KC_EVT.PHASE_CHANGE, p);
    pipeline.invalidate(); // tint changes — repaint top layer
  }));
  disposables.add(time.on('dayChange', (p) => bus.emit(KC_EVT.DAY_CHANGE, p)));
  disposables.add(time.on('seasonChange', (p) => bus.emit(KC_EVT.SEASON_CHANGE, p)));

  // ---------------- Visibility handling ----------------
  disposables.add(visibility.onChange((hidden) => {
    if (hidden) {
      loop.pause();
      bus.emit(KC_EVT.GAME_PAUSED, { reason: 'hidden' });
    } else {
      loop.resume();
      bus.emit(KC_EVT.GAME_RESUMED, { reason: 'visible' });
    }
  }));

  // ---------------- Quality change → invalidate layers ----------------
  disposables.add(quality.onChange((tier) => {
    bus.emit(KC_EVT.QUALITY_CHANGE, { tier });
    pipeline.invalidate();
  }));

  // ---------------- Loop tracks ----------------
  // Placeholders for now — they'll come alive in subsequent batches.
  // Registered today so the multi-rate scheduler is exercised end-to-end.

  // 30 Hz: motion (entity interpolation, pathfinding step) — empty for 3a
  loop.addFixedTrack('motion', 30, (_dt) => { /* batch 3b+ */ });

  // 4 Hz: AI utility re-evaluation — empty for 3a
  loop.addFixedTrack('ai', 4, (_dt) => { /* batch 3e+ */ });

  // 1 Hz: needs decay — empty for 3a
  loop.addFixedTrack('needs', 1, (_dt) => { /* batch 3d+ */ });

  // 0.1 Hz: weather, slow ambient changes
  loop.addFixedTrack('weather', 0.1, (_dt) => { /* batch 3j */ });

  // ECS sweep (purge destroyed entities) — runs at motion rate
  loop.addFixedTrack('ecs-sweep', 30, (_dt) => { world.sweep(); });

  // ---------------- Render callback ----------------
  loop.setRenderCallback((dtReal) => {
    // 1. Update time (scaled by loop.timeScale internally via fixed tracks above
    //    — but time also advances during the render pass for smooth in-game
    //    clock display when not paused)
    time.update(dtReal * loop.timeScale);

    // 2. Update camera with real dt (so panning feels native regardless of
    //    in-game time speed)
    camera.update(dtReal);

    // 3. FPS bookkeeping
    fpsMonitor.tick();
    quality.evaluate(fpsMonitor.fps, dtReal);

    // 4. Render
    pipeline.render();

    // 5. HUD
    hud.update(time);

    // 6. Debug overlay
    if (debug.visible) {
      const stats = fpsMonitor.getStats();
      debug.set('FPS',      `${stats.current}  (min ${stats.min}, max ${stats.max})`);
      debug.set('Quality',  quality.tier);
      debug.set('Speed',    `${loop.timeScale.toFixed(1)}×${loop.timeScale === 0 ? ' (paused)' : ''}`);
      debug.set('Time',     time.formatClock(false));
      debug.set('Phase',    time.phase);
      debug.set('Day',      `${time.day}  (${time.season} · Y${time.year})`);
      debug.set('Camera',   `(${Math.round(camera.x)}, ${Math.round(camera.y)})  z=${camera.zoom.toFixed(2)}`);
      debug.set('Map',      `${tilemap.cols}×${tilemap.rows} tiles`);
      debug.set('Entities', String(world.count()));
      debug.set('Frames',   String(loop.frameCount));
      debug.render();
    }
  });

  // ---------------- Controller surface ----------------
  bus.emit(KC_EVT.GAME_READY, { version: GAME_VERSION, locale });

  let started = false;
  let destroyed = false;

  return {
    /** Begin the game loop. Idempotent. */
    start() {
      if (destroyed || started) return;
      started = true;
      loop.start();
    },

    /** Pause the loop (e.g. game-level pause menu). */
    pause() {
      if (destroyed) return;
      loop.pause();
      bus.emit(KC_EVT.GAME_PAUSED, { reason: 'manual' });
    },

    /** Resume after pause(). */
    resume() {
      if (destroyed || !started) return;
      loop.resume();
      bus.emit(KC_EVT.GAME_RESUMED, { reason: 'manual' });
    },

    /** Soft stop — keeps DOM around in case of re-start. */
    stop() {
      if (destroyed) return;
      loop.pause();
      started = false;
    },

    /** Hard teardown — releases all resources. Called by the hub on unmount. */
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      bus.emit(KC_EVT.GAME_DESTROYED, {});
      bus.clear();
      await disposables.dispose();
      services.clear();
    },

    /** Read-only accessors — useful for tests / future tooling. */
    get version() { return GAME_VERSION; },
    get services() { return services; },
  };
}
