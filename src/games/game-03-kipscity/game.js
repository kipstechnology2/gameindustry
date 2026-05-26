/**
 * KIPS CITY — Game Entry Point.
 *
 * Implements the Hub Game Interface:
 *   default export: factory({ mount, params, locale }) → controller
 *   controller:     { start, pause, resume, stop, destroy }
 *
 * Batches delivered:
 *   3a — Multi-rate loop, canvas stack, day/night, pan/zoom, HUD.
 *   3b — A* pathfinder + room graph.
 *   3c — Procedural avatar, player Kip, animation, tap-to-walk, camera follow.
 *   3d — Needs (9-channel) + emotion + needs panel + mood ring overlay.
 *   3e — Personality, utility AI, intent SM, 5 autonomous NPCs.
 *   3f — Object affordances + action wheel + player-interaction system.
 *   3g — Particle pool, ambient emitters (fountain water, food cart steam),
 *        ambient life (butterflies), weather rain particles.
 *   3h — Workshop (build mode), placeable furniture, layout save/load.
 *   3i — Relationship system, memory, speech bubbles, dialog engine.
 *   3j — Weather state machine, quest engine, starter quests, journal UI.
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
import { ObjectAtlas } from './rendering/procedural-object.js';
import { EntityRenderer } from './rendering/entity-renderer.js';

import { Camera } from './world/camera.js';
import { buildStarterMap, getStarterSpawn, STARTER_MAP_COLS, STARTER_MAP_ROWS } from './world/world-builder.js';
import { Pathfinder } from './world/pathfinder.js';
import { RoomGraph } from './world/room-graph.js';

import { createPlayer } from './entities/player.js';
import { createNPC } from './entities/npc.js';
import { NPC_ROSTER } from './entities/npc-roster.js';
import { spawnStarterObjects } from './entities/objects.js';

import { InputSystem, INPUT_MODE } from './systems/input-system.js';
import { PathFollowSystem } from './systems/path-follow-system.js';
import { AnimationSystem } from './systems/animation-system.js';

import { NeedsSystem } from './simulation/needs-system.js';
import { EmotionSystem, EMOTION_COLOR } from './simulation/emotion-system.js';
import { AiDecisionSystem } from './simulation/ai-decision-system.js';
import { IntentExecutionSystem } from './simulation/intent-execution-system.js';
import { PlayerInteractionSystem } from './simulation/player-interaction-system.js';
import { AmbientEmitterSystem } from './simulation/ambient-emitter-system.js';
import { RelationshipSystem } from './simulation/relationship-system.js';
import { WeatherSystem, WEATHER } from './simulation/weather-system.js';

import { ParticleSystem } from './effects/particle-system.js';
import { AmbientLife } from './effects/ambient-life.js';

import { BuildMode, BUILD_STATE } from './building/build-mode.js';

import { DialogEngine } from './conversation/dialog-engine.js';

import { QuestEngine } from './adventure/quest-engine.js';
import { QuestTracker } from './adventure/quest-tracker.js';
import { STARTER_QUESTS } from './adventure/starter-quests.js';

import { Hud, HelpBanner } from './ui/hud.js';
import { NeedsPanel, MoodRing } from './ui/needs-panel.js';
import { ActionWheel } from './ui/action-wheel.js';
import { WorkshopUI } from './ui/workshop-ui.js';
import { SpeechBubbleHost } from './ui/speech-bubble.js';
import { JournalUI } from './ui/journal-ui.js';

import { FpsMonitor } from './optimization/fps-monitor.js';
import { QualityController, TIERS } from './optimization/quality-tier.js';
import { VisibilityHandler } from './optimization/visibility.js';

import { InputRouter } from './utils/input-router.js';
import { RNG } from './utils/rng.js';
import { tileCenter, screenToTile } from './utils/iso-math.js';
import { lerp } from './utils/grid-math.js';
import { C, EMOTION } from './components/types.js';

const GAME_VERSION = '0.10.0-batch-3j';
const DEFAULT_SEED = 0xC1751EE;
const PINCH_SENSITIVITY = 1.0;
const WHEEL_ZOOM_FACTOR = 1.12;
const CAMERA_FOLLOW_RATE = 6;
const CAMERA_FREE_TIMEOUT_MS = 2000;

// Particle pool caps per quality tier
const PARTICLE_CAP_BY_TIER = {
  ULTRA: 600,
  HIGH:  250,
  LOW:   80,
};

// Butterfly counts per tier
const BUTTERFLY_BY_TIER = {
  ULTRA: 6,
  HIGH:  3,
  LOW:   0,
};

export default function createKipsCity({ mount, params = {}, locale = 'en' } = {}) {
  if (!mount) throw new Error('Kips City: mount element required');

  const services = new ServiceLocator();
  const disposables = new Disposables();
  const bus = createGameBus();

  // ---------------- Rendering surface ----------------
  const stack = new CanvasStack(mount, 4);
  disposables.add(stack);

  // ---------------- Core ----------------
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

  // ---------------- World ----------------
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

  // ---------------- Sprites ----------------
  const avatarCache = new AvatarCache();
  const objectAtlas = new ObjectAtlas();
  disposables.add(avatarCache);
  disposables.add(objectAtlas);

  // ---------------- Effects (3g) ----------------
  const initialTier = quality.tier;
  const particles = new ParticleSystem(PARTICLE_CAP_BY_TIER[initialTier] || PARTICLE_CAP_BY_TIER.HIGH);
  const ambientLife = new AmbientLife();
  ambientLife.setMaxButterflies(BUTTERFLY_BY_TIER[initialTier] || BUTTERFLY_BY_TIER.HIGH);
  // Bound the butterfly drift area to the visible map
  ambientLife.setBounds(-halfMapW * 0.4, -halfMapH * 0.1, halfMapW * 0.4, halfMapH * 0.7);

  // ---------------- Entities ----------------
  const playerId = createPlayer(world, spawnTile, { avatarId: 'player' });

  /** Map<presetKey, entityId> — used by quest tracker to find Rosa, etc. */
  const npcIdByPresetKey = new Map();
  const npcIds = [];
  for (const def of NPC_ROSTER) {
    const id = createNPC(world, def);
    npcIds.push(id);
    npcIdByPresetKey.set(def.id, id);
  }

  // Interactable starter objects
  const objectIds = spawnStarterObjects(world);

  // ---------------- Input router ----------------
  const input = new InputRouter(stack.wrap);
  disposables.add(input);

  // ---------------- Build mode (3h) ----------------
  const buildMode = new BuildMode({ world, tilemap, pathfinder });
  disposables.add(buildMode);

  // ---------------- Speech bubbles + dialog (3i) ----------------
  const speechBubbles = new SpeechBubbleHost({ world, camera });
  speechBubbles.mount(stack.wrap);
  disposables.add(speechBubbles);

  const dialogEngine = new DialogEngine({ world, bubbles: speechBubbles });
  disposables.add(dialogEngine);

  // ---------------- Quest engine + tracker (3j) ----------------
  const questEngine = new QuestEngine({
    world,
    questDefinitions: STARTER_QUESTS,
    contextProvider: () => questTracker.buildContext({ time }),
  });

  const questTracker = new QuestTracker({
    world, questEngine,
    getPlayerId: () => playerId,
    npcIdByPresetKey,
  });

  // ---------------- Relationship system (3i) ----------------
  const relationshipSys = new RelationshipSystem({
    world,
    dayProvider: () => time.day,
    onSocialEvent: (event) => {
      questTracker.onSocialEvent(event);
      dialogEngine.onSocialEvent(event);
    },
  });

  // ---------------- Weather (3j) ----------------
  const weatherSys = new WeatherSystem({
    time, particles, camera,
    qualityTier: () => quality.tier,
    onChange: (payload) => {
      bus.emit('kc:weather-change', payload);
    },
  });

  // ---------------- Other systems ----------------
  const needsSys      = new NeedsSystem({ world, loop });
  const emotionSys    = new EmotionSystem({ world });
  const pathFollow    = new PathFollowSystem({ world });
  const animation     = new AnimationSystem({ world });
  const aiDecision    = new AiDecisionSystem({ world, pathfinder, tilemap });
  const intentExec    = new IntentExecutionSystem({ world, pathfinder });
  const ambientEmit   = new AmbientEmitterSystem({
    world, particles,
    qualityTier: () => quality.tier,
  });
  disposables.add(ambientEmit);

  const playerInter = new PlayerInteractionSystem({ world, pathfinder });

  // ---------------- UI ----------------
  const hud = new Hud();
  hud.mount(stack.wrap);
  disposables.add(hud);

  const needsPanel = new NeedsPanel();
  needsPanel.mount(stack.wrap);
  disposables.add(needsPanel);

  const moodRing = new MoodRing();
  moodRing.mount(stack.wrap);
  disposables.add(moodRing);

  const actionWheel = new ActionWheel();
  actionWheel.mount(stack.wrap);
  disposables.add(actionWheel);

  const workshopUI = new WorkshopUI({ buildMode });
  workshopUI.mount(stack.wrap);
  disposables.add(workshopUI);

  const journalUI = new JournalUI({
    questEngine,
    weatherProvider: () => weatherSys.current,
    dayProvider: () => ({ day: time.day, season: time.season }),
  });
  journalUI.mount(stack.wrap);
  disposables.add(journalUI);

  debug.mount(stack.wrap);
  disposables.add(debug);

  const help = new HelpBanner(
    `<strong style="color:#fff">KIPS CITY · Batch 3g–3j</strong><br>
     <span style="opacity:.85">Tap to walk · Tap object for actions · Workshop to build · Watch the city live.<br>
     Drag pan · Pinch/wheel zoom · F3 debug · 1/2/3 speed · F recenter</span>`
  );
  help.mount(stack.wrap);
  disposables.add(help);

  // ---------------- Input wiring ----------------
  let lastUserPanAt = 0;

  const inputSystem = new InputSystem({
    world, input, camera, pathfinder, tilemap,
    getPlayerId: () => playerId,
    onObjectTap: ({ objectEntityId, screenX, screenY }) => {
      // In build-select mode → delete (only player-placed)
      if (inputSystem.mode === INPUT_MODE.BUILD_SELECT) {
        const removed = buildMode.removeObject(objectEntityId);
        if (!removed) camera.shake(2);
        return;
      }
      // Default: open action wheel
      const interactable = world.getComponent(objectEntityId, C.Interactable);
      if (!interactable) return;
      actionWheel.show({
        affordanceIds: interactable.affordanceIds,
        screenX, screenY,
        objectEntityId,
        onPick: (affordanceId, oid) => {
          const ok = playerInter.apply(playerId, affordanceId, oid);
          if (ok) {
            questTracker.onPlayerAffordance(affordanceId, oid);
          } else {
            camera.shake(2);
          }
        },
      });
    },
    onTileTap: ({ col, row, screenX, screenY }) => {
      // In build-place mode → place at tile
      if (inputSystem.mode === INPUT_MODE.BUILD_PLACE) {
        buildMode.setHover(col, row);
        const placed = buildMode.placeAtHover();
        if (placed != null) {
          questTracker.onFurniturePlaced();
          // Stay in placing mode for rapid placement
        } else {
          camera.shake(2);
        }
      }
      // Otherwise: nothing (input-system already triggered the walk)
    },
  });
  disposables.add(inputSystem);

  // Sync InputSystem mode with BuildMode state
  disposables.add(buildMode.onStateChange((state) => {
    if (state === BUILD_STATE.PLACING) inputSystem.setMode(INPUT_MODE.BUILD_PLACE);
    else if (state === BUILD_STATE.SELECTING) inputSystem.setMode(INPUT_MODE.BUILD_SELECT);
    else inputSystem.setMode(INPUT_MODE.PLAY);
  }));

  // Pan / zoom / pinch
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
      case 'f': case 'F': {
        lastUserPanAt = 0;
        const t = world.getComponent(playerId, C.Transform);
        if (t) camera.snapTo(t.x, t.y, camera.targetZoom);
        break;
      }
      case 'b': case 'B':
        buildMode.toggle(); break;
      case 'Escape':
        if (buildMode.isActive()) buildMode.exit();
        break;
    }
  }));

  // Mouse hover during build-place → preview tile
  disposables.add(input.on('pan', () => {
    // pan already handled; we want hover but pan replaces it. Keep it simple
    // — hover is updated on tap which is mobile-friendly.
  }));

  // ---------------- Render pipeline ----------------
  const entityRenderer = new EntityRenderer({ avatarCache, objectAtlas, world, camera });
  const pipeline = new RenderPipeline({
    stack, camera, time, tilemap,
    entityRenderer,
    particles,
    ambientLife,
    buildMode,
    getDestTile: () => inputSystem.lastDest,
    isDebug: () => debug.visible,
  });

  const offResize = stack.onResize((w, h) => {
    camera.setViewport(w, h);
    pipeline.invalidate();
  });
  disposables.add(offResize);

  // ---------------- Time / phase / quality / visibility ----------------
  disposables.add(time.on('phaseChange', (p) => {
    bus.emit(KC_EVT.PHASE_CHANGE, p);
    pipeline.invalidate();
  }));
  disposables.add(time.on('dayChange', (p) => bus.emit(KC_EVT.DAY_CHANGE, p)));
  disposables.add(time.on('seasonChange', (p) => bus.emit(KC_EVT.SEASON_CHANGE, p)));

  disposables.add(visibility.onChange((hidden) => {
    if (hidden) {
      loop.pause();
      bus.emit(KC_EVT.GAME_PAUSED, { reason: 'hidden' });
    } else {
      loop.resume();
      bus.emit(KC_EVT.GAME_RESUMED, { reason: 'visible' });
    }
  }));

  // Quality tier changes → adjust particle / ambient population
  disposables.add(quality.onChange((tier) => {
    bus.emit(KC_EVT.QUALITY_CHANGE, { tier });
    particles.setMaxActive(PARTICLE_CAP_BY_TIER[tier] || PARTICLE_CAP_BY_TIER.HIGH);
    ambientLife.setMaxButterflies(BUTTERFLY_BY_TIER[tier] || BUTTERFLY_BY_TIER.HIGH);
    pipeline.invalidate();
  }));

  // ---------------- Service registry ----------------
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
  services.register('objectAtlas', objectAtlas);
  services.register('particles', particles);
  services.register('ambientLife', ambientLife);
  services.register('buildMode', buildMode);
  services.register('weather', weatherSys);
  services.register('quests', questEngine);
  services.register('questTracker', questTracker);
  services.register('dialog', dialogEngine);
  services.register('playerId', playerId);
  services.register('npcIds', npcIds);
  services.register('npcIdByPresetKey', npcIdByPresetKey);

  // ---------------- Loop tracks ----------------
  // 30 Hz: motion + animation + intents + spatial hash + particles + ambient emit
  loop.addFixedTrack('movement', 30, (dt) => {
    intentExec.update(dt);
    pathFollow.update(dt);
    animation.update(dt);

    // Particles + ambient (run at this cadence — render uses scratch state)
    particles.update(dt);
    ambientEmit.update(dt);
    ambientLife.update(dt);

    // Refresh spatial hash for Kips (skip objects)
    for (const e of world.query([C.Transform, C.Animator])) {
      const sprite = world.getComponent(e.id, C.Sprite);
      if (sprite && sprite.kind === 'object') continue;
      spatial.set(e.id, e[C.Transform].x, e[C.Transform].y);
    }
  });

  // 4 Hz: AI decision-making
  loop.addFixedTrack('ai', 4, (dt) => {
    aiDecision.update(dt);
  });

  // 1 Hz: needs + emotion + relationship + quest engine
  loop.addFixedTrack('social', 1, (dt) => {
    needsSys.update(dt);
    emotionSys.update(dt);
    relationshipSys.update(dt);
    questEngine.tick(dt);
  });

  // 0.1 Hz: weather state machine
  loop.addFixedTrack('weather', 0.1, (dt) => {
    weatherSys.tick(dt);
  });

  // ECS sweep
  loop.addFixedTrack('ecs-sweep', 30, (_dt) => { world.sweep(); });

  // ---------------- Render callback ----------------
  loop.setRenderCallback((dtReal) => {
    time.update(dtReal * loop.timeScale);

    // Camera follow
    const playerT = world.getComponent(playerId, C.Transform);
    if (playerT) {
      const sinceUserPan = performance.now() - lastUserPanAt;
      if (sinceUserPan > CAMERA_FREE_TIMEOUT_MS && !buildMode.isActive()) {
        const k = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dtReal);
        camera.targetX = lerp(camera.targetX, playerT.x, k);
        camera.targetY = lerp(camera.targetY, playerT.y, k);
      }
    }

    camera.update(dtReal);
    fpsMonitor.tick();
    quality.evaluate(fpsMonitor.fps, dtReal);

    // Weather particle emission scales with dt for smooth rain
    weatherSys.emit(dtReal);

    // Render
    pipeline.render();

    // HUD refresh
    hud.update(time);

    // Speech bubbles (positioning)
    speechBubbles.update(dtReal);

    // Journal
    journalUI.update();

    // Needs panel (player only)
    const playerNeeds = world.getComponent(playerId, C.Needs);
    if (playerNeeds) needsPanel.update(playerNeeds);

    // Mood ring above player
    if (playerT) {
      const playerEmotion = world.getComponent(playerId, C.Emotion);
      if (playerEmotion) {
        const screenPos = camera.worldToScreen(playerT.x, playerT.y - 64);
        moodRing.update(
          screenPos.x, screenPos.y,
          playerEmotion.state, playerEmotion.intensity,
          EMOTION_COLOR[playerEmotion.state] || '#fff'
        );
      }
    }

    // Debug overlay
    if (debug.visible) {
      const stats = fpsMonitor.getStats();
      debug.set('FPS',      `${stats.current}  (min ${stats.min}, max ${stats.max})`);
      debug.set('Quality',  quality.tier);
      debug.set('Speed',    `${loop.timeScale.toFixed(1)}×${loop.timeScale === 0 ? ' (paused)' : ''}`);
      debug.set('Time',     time.formatClock(false));
      debug.set('Phase',    time.phase);
      debug.set('Day',      `${time.day}  (${time.season} · Y${time.year})`);
      debug.set('Weather',  weatherSys.current);
      debug.set('Camera',   `(${Math.round(camera.x)}, ${Math.round(camera.y)})  z=${camera.zoom.toFixed(2)}`);
      debug.set('Map',      `${tilemap.cols}×${tilemap.rows}  (${roomGraph.regionCount} regions)`);
      debug.set('Entities', `${world.count()} (1 player + ${npcIds.length} NPC + ${objectIds.length}+ obj)`);
      debug.set('Particles', `${particles.count}/${particles.maxActive}`);
      debug.set('Build',    buildMode.state);
      const em = world.getComponent(playerId, C.Emotion);
      if (em) debug.set('Emotion', `${em.state}  i=${em.intensity.toFixed(2)}`);
      debug.set('Quests', `${questEngine.active.size} active · ${questEngine.completed.size} done`);
      if (npcIds.length > 0) {
        const i = world.getComponent(npcIds[0], C.Intent);
        if (i) debug.set(`AI[${NPC_ROSTER[0].name}]`, `${i.actionId || 'idle'} · ${i.phase}`);
      }
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
