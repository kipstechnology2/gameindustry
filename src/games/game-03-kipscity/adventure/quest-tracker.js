/**
 * Quest Tracker — bridges in-game events to quest engine flags + counters.
 *
 * Subscribes to:
 *   - relationship-system social events (sets 'met-rosa' when player+rosa pair)
 *   - player-interaction-system affordance picks (sets 'tossed-coin', etc.)
 *   - build-mode placements (increments placedFurnitureCount)
 *   - food cart visits (increments foodCartsVisited, with set-based dedup)
 *
 * The contextProvider passed to QuestEngine reads from this tracker.
 */

import { C } from '../components/types.js';

export class QuestTracker {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../adventure/quest-engine.js').QuestEngine} deps.questEngine
   * @param {() => number} deps.getPlayerId
   * @param {Map<string, number>} deps.npcIdByPresetKey  e.g. { rosa: <id>, ... }
   */
  constructor({ world, questEngine, getPlayerId, npcIdByPresetKey }) {
    this.world = world;
    this.questEngine = questEngine;
    this.getPlayerId = getPlayerId;
    this.npcIdByPresetKey = npcIdByPresetKey;

    /** Counters consumed by quest predicates. */
    this.placedFurnitureCount = 0;
    this._foodCartsVisited = new Set();
  }

  /** Hook for relationship-system.onSocialEvent. */
  onSocialEvent({ a, b }) {
    const player = this.getPlayerId();
    if (player == null) return;
    const rosaId = this.npcIdByPresetKey.get('rosa');

    if (rosaId != null && (
      (a === player && b === rosaId) || (b === player && a === rosaId)
    )) {
      this.questEngine.flag('met-rosa', true);
    }
  }

  /** Hook for player-interaction-system: called when player picks an affordance. */
  onPlayerAffordance(affordanceId, objectEntityId) {
    if (affordanceId === 'fountain.toss-coin') {
      this.questEngine.flag('tossed-coin', true);
    }
    if (affordanceId === 'food_cart.snack' || affordanceId === 'food_cart.meal') {
      this._foodCartsVisited.add(objectEntityId);
    }
  }

  /** Hook for build-mode.placeAtHover. */
  onFurniturePlaced() {
    this.placedFurnitureCount++;
  }

  /** Provide context to quest engine. */
  buildContext({ time }) {
    return {
      day: time?.day ?? 0,
      phase: time?.phase ?? 'day',
      placedFurnitureCount: this.placedFurnitureCount,
      foodCartsVisited: this._foodCartsVisited.size,
    };
  }

  serialize() {
    return {
      placedFurnitureCount: this.placedFurnitureCount,
      foodCartsVisited: [...this._foodCartsVisited],
    };
  }

  deserialize(data) {
    if (!data) return;
    this.placedFurnitureCount = data.placedFurnitureCount || 0;
    this._foodCartsVisited = new Set(data.foodCartsVisited || []);
  }
}
