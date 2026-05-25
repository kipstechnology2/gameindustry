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
 * Batch 3a delivered:
 *   ✓ Multi-rate loop, 4-layer canvas, day/night, pan/zoom/pinch, HUD.
 *
 * Batch 3b–3c add:
 *   ✓ Tile pathfinder (A*) + room-graph for connectivity
 *   ✓ Procedural avatar atlas (zero PNG dependency)
 *   ✓ Player Kip with idle/walk animation state machine
 *   ✓ Tap-to-move with cinematic camera follow
 *   ✓ Entity renderer with depth sorting
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
import { AvatarCache } from './rendering/avatar-cache.js';
import { EntityRenderer } from './rendering/entity-renderer.js';

import { Camera } from './world/camera.js';
import { buildStarterMap, getStarterSpawn, STARTER_MAP_COLS, STARTER_MAP_ROWS } from './world/world-builder.js';
import { Pathfinder } from './world/pathfinder.js';
import { RoomGraph } from './world/room-graph.js';

import { createPlayer } from './entities/player.js';

import { InputSystem } from './systems/input-system.js';
import { PathFollowSystem } from './systems/path-follow-system.js';
import { AnimationSystem } from './systems/animation-system.js';

import { Hud, HelpBanner } from './ui/hud.js';

import { FpsMonitor } from './optimization/fps-monitor.js';
import { QualityController } from './optimization/quality-tier.js';
import { VisibilityHandler } from './optimization/visibility.js';

import { InputRouter } from './utils/input-router.js';
import { RNG } from './utils/rng.js';
import { tileCenter } from './utils/iso-math.js';
import { lerp } from './utils/grid-math.js';
import { C } from './components/types.js';

const GAME_VERSION = '0.3.0-batch-3c';
const DEFAULT_SEED = 0xC1751EE;
const PINCH_SENSITIVITY = 1.0;
const WHEEL_ZOOM_FACTOR = 1.12;

// Camera-follow configuration
const CAMERA_FOLLOW_RATE = 6;        // higher = snappier follow
const CAMERA_FREE_TIMEOUT_MS = 2000; // user-pan disables follow for this long

/**
 * Factory — called by the hub's play view.
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
  const roomGraph = new RoomGraph(tilemap);
  const pathfinder = new Pathfinder(tilemap, { roomGraph });

  const camera = new Camera(stack.cssW, stack.cssH);
  const halfMapW = (STARTER_MAP_COLS + STARTER_MAP_ROWS) * 32;
  const halfMapH = (STARTER_MAP_COLS + STARTER_MAP_ROWS) * 16;
  camera.setBounds(-halfMapW * 0.6, -halfMapH * 0.2, halfMapW * 0.6, halfMapH * 1.0);

  const spawnTile = getStarterSpawn();
  const spawnPx = tileCenter(spawnTile.col, spawnTile.row);
  camera.snapTo(spawnPx.x, spawnPx.y, 1.2);

  // ---------------- Avatar cache + player ----------------
  const avatarCache = new AvatarCache();
  disposables.add(avatarCache);

  const playerId = createPlayer(world, spawnTile, { avatarId: 'player' });

  // ---------------- Input ----------------
  const input = new InputRouter(stack.wrap);
  disposables.add(input);

  // ---------------- Entity renderer + pipeline ----------------
  const entityRenderer = new EntityRenderer({ avatarCache, world, camera });
  const pipeline = new RenderPipeline({
    stack, camera, time, tilemap,
    entityRenderer,
    getDestTile: () => inputSystem ? inputSystem.lastDest : null,
    isDebug: () => debug.visible,
  });

  // Resize → camera viewport + tint repaint
  const offResize = stack.onResize((w, h) => {
    camera.setViewport(w, h);
    pipeline.invalidate();
  });
  disposables.add(offResize);

  // ---------------- Game systems ----------------
  const pathFollow = new PathFollowSystem({ world });
  const animation = new AnimationSystem({ world });
  const inputSystem = new InputSystem({
    world, input, camera, pathfinder, tilemap,
    getPlayerId: () => playerId,
  });
  disposables.add(inputSystem);

  // ---------------- HUD ----------------
  const hud = new Hud();
  hud.mount(stack.wrap);
  disposables.add(hud);

  // ---------------- Debug overlay ----------------
  debug.mount(stack.wrap);
  disposables.add(debug);

  // ---------------- Help banner ----------------
  const help = new HelpBanner(
    `<strong style="color:#fff">KIPS CITY · Batch 3c</strong><br>
     <span style="opacity:.85">Tap to walk · drag to pan · pinch/wheel to zoom · F3 debug · 1/2/3 speed · 0 pause</span>`
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
  services.register('roomGraph', roomGraph);
  services.register('pathfinder', pathfinder);
  services.register('stack', stack);
  services.register('input', input);
  services.register('hud', hud);
  services.register('debug', debug);
  services.register('quality', quality);
  services.register('fps', fpsMonitor);
  services.register('bus', bus);
  services.register('avatarCache', avatarCache);
  services.register('playerId', playerId);

  // ---------------- Camera follow logic ----------------
  let lastUserPanAt = 0;

  // Drag = user pan; disables follow temporarily
  disposables.add(input.on('pan', (dx, dy) => {
    camera.panBy(-dx, -dy);
    lastUserPanAt = performance.now();
  }));

  disposables.add(input.on('wheel', (deltaY, x, y) => {
    const factor = deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    camera.zoomBy(factor, x, y);
  }));

  disposables.add(input.on('pinch', (scale, x, y) => {
    const attenuated = 1 + (scale - 1) * PINCH_SENSITIVITY;
    camera.zoomBy(attenuated, x, y);
  }));

  // Time-speed shortcuts + camera quick zoom
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
      case 'f': case 'F':
        // Snap camera to player (force-follow override)
        lastUserPanAt = 0;
        const t = world.getComponent(playerId, C.Transform);
        if (t) camera.snapTo(t.x, t.y, camera.targetZoom);
        break;
    }
  }));

  // ---------------- Time event bridge ----------------
  disposables.add(time.on('phaseChange', (p) => {
    bus.emit(KC_EVT.PHASE_CHANGE, p);
    pipeline.invalidate();
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
  // 30 Hz: motion + path follow + animation
  loop.addFixedTrack('movement', 30, (dt) => {
    pathFollow.update(dt);
    animation.update(dt);

    // Update spatial hash for the player so future systems (NPCs, social,
    // interaction) can run radius queries cheaply.
    const t = world.getComponent(playerId, C.Transform);
    if (t) spatial.set(playerId, t.x, t.y);
  });

  // 4 Hz: AI utility re-evaluation — empty for 3c
  loop.addFixedTrack('ai', 4, (_dt) => { /* batch 3e+ */ });

  // 1 Hz: needs decay — empty for 3c
  loop.addFixedTrack('needs', 1, (_dt) => { /* batch 3d+ */ });

  // 0.1 Hz: weather, slow ambient changes
  loop.addFixedTrack('weather', 0.1, (_dt) => { /* batch 3j */ });

  // ECS sweep
  loop.addFixedTrack('ecs-sweep', 30, (_dt) => { world.sweep(); });

  // ---------------- Render callback ----------------
  loop.setRenderCallback((dtReal) => {
    // Time advances during render so the clock keeps moving
    time.update(dtReal * loop.timeScale);

    // Camera follow: smoothly track player unless the user is panning
    const t = world.getComponent(playerId, C.Transform);
    if (t) {
      const sinceUserPan = performance.now() - lastUserPanAt;
      if (sinceUserPan > CAMERA_FREE_TIMEOUT_MS) {
        // Lerp camera target toward player position
        const k = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dtReal);
        camera.targetX = lerp(camera.targetX, t.x, k);
        camera.targetY = lerp(camera.targetY, t.y, k);
      }
    }

    camera.update(dtReal);

    // FPS bookkeeping → adaptive quality
    fpsMonitor.tick();
    quality.evaluate(fpsMonitor.fps, dtReal);

    // Render
    pipeline.render();

    // HUD
    hud.update(time);

    // Debug overlay
    if (debug.visible) {
      const stats = fpsMonitor.getStats();
      debug.set('FPS',      `${stats.current}  (min ${stats.min}, max ${stats.max})`);
      debug.set('Quality',  quality.tier);
      debug.set('Speed',    `${loop.timeScale.toFixed(1)}×${loop.timeScale === 0 ? ' (paused)' : ''}`);
      debug.set('Time',     time.formatClock(false));
      debug.set('Phase',    time.phase);
      debug.set('Day',      `${time.day}  (${time.season} · Y${time.year})`);
      debug.set('Camera',   `(${Math.round(camera.x)}, ${Math.round(camera.y)})  z=${camera.zoom.toFixed(2)}`);
      debug.set('Map',      `${tilemap.cols}×${tilemap.rows}  (${roomGraph.regionCount} regions)`);
      debug.set('Entities', String(world.count()));
      const player = world.getComponent(playerId, C.Transform);
      if (player) {
        debug.set('Player',   `(${Math.round(player.x)}, ${Math.round(player.y)})  ${player.facing}`);
      }
      const pComp = world.getComponent(playerId, C.Path);
      if (pComp && pComp.waypoints) {
        debug.set('Path',     `${pComp.index}/${pComp.waypoints.length} waypoints`);
      } else {
        debug.set('Path',     '—');
      }
      debug.set('Frames',   String(loop.frameCount));
      debug.render();
    }
  });

  // ---------------- Controller surface ----------------
  bus.emit(KC_EVT.GAME_READY, { version: GAME_VERSION, locale });

  let started = false;
  let destroyed = false;

  return {
    start() {
      if (destroyed || started) return;
      started = true;
      loop.start();
    },

    pause() {
      if (destroyed) return;
      loop.pause();
      bus.emit(KC_EVT.GAME_PAUSED, { reason: 'manual' });
    },

    resume() {
      if (destroyed || !started) return;
      loop.resume();
      bus.emit(KC_EVT.GAME_RESUMED, { reason: 'manual' });
    },

    stop() {
      if (destroyed) return;
      loop.pause();
      started = false;
    },

    async destroy() {
      if (destroyed) return;
      destroyed = true;
      bus.emit(KC_EVT.GAME_DESTROYED, {});
      bus.clear();
      await disposables.dispose();
      services.clear();
    },

    get version() { return GAME_VERSION; },
    get services() { return services; },
  };
}
