/**
 * Game-Internal Event Bus.
 *
 * The hub has its own bus (src/utils/events.js) for navigation/i18n/etc.
 * This bus is scoped to one game instance so events don't leak between
 * the hub and the game. Each game gets its own bus on init.
 */

import { EventBus } from '../../../utils/events.js';

/** Standard event names used inside Kips City. */
export const KC_EVT = Object.freeze({
  // Lifecycle
  GAME_READY: 'kc:game-ready',
  GAME_PAUSED: 'kc:game-paused',
  GAME_RESUMED: 'kc:game-resumed',
  GAME_DESTROYED: 'kc:game-destroyed',

  // Time
  DAY_CHANGE: 'kc:day-change',
  PHASE_CHANGE: 'kc:phase-change',
  SEASON_CHANGE: 'kc:season-change',

  // Quality / performance
  QUALITY_CHANGE: 'kc:quality-change',
  PERF_DEGRADE: 'kc:perf-degrade',
  PERF_RECOVER: 'kc:perf-recover',

  // ECS
  ENTITY_CREATED: 'kc:entity-created',
  ENTITY_DESTROYED: 'kc:entity-destroyed',

  // Camera
  CAMERA_MOVED: 'kc:camera-moved',
  CAMERA_ZOOMED: 'kc:camera-zoomed',

  // Save
  SAVE_START: 'kc:save-start',
  SAVE_DONE: 'kc:save-done',
  LOAD_DONE: 'kc:load-done',
});

export function createGameBus() {
  return new EventBus();
}

export { EventBus };
