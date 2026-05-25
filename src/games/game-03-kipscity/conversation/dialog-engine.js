/**
 * Dialog Engine — fires speech bubbles based on social events.
 *
 * For Batch 3i this is a thin orchestrator: when relationship-system reports
 * a high-valence pair, both Kips emit a speech bubble with a contextually
 * appropriate line (mood + bond tier). Cooldowns prevent spam.
 *
 * Future batches: branching player↔NPC conversations, NPC↔NPC structured
 * dialog with topic memory, and quest-relevant lines.
 */

import { C } from '../components/types.js';
import { pickLine } from './line-pool.js';

const DEFAULT_COOLDOWN_MS = 8_000;

export class DialogEngine {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../ui/speech-bubble.js').SpeechBubbleHost} deps.bubbles
   */
  constructor({ world, bubbles }) {
    this.world = world;
    this.bubbles = bubbles;
    /** Map<entityId, lastSpeakAtMs> */
    this._cooldowns = new Map();
  }

  /** Called by relationship-system on each social event. */
  onSocialEvent({ a, b, valence }) {
    const now = performance.now();

    // Only the more-positive social moments produce dialog (don't spam).
    if (valence < -0.1) return; // skip awkward silence
    if (Math.random() < 0.4) return;

    if (this._canSpeak(a, now)) {
      const line = this._lineFor(a, b);
      if (line) {
        this.bubbles.speak(a, line);
        this._cooldowns.set(a, now);
      }
    }
    // 50% chance the other Kip also says something a moment later
    if (Math.random() < 0.5 && this._canSpeak(b, now + 600)) {
      setTimeout(() => {
        const line = this._lineFor(b, a);
        if (line) this.bubbles.speak(b, line);
        this._cooldowns.set(b, performance.now());
      }, 700);
    }
  }

  _canSpeak(entityId, now) {
    const last = this._cooldowns.get(entityId) || 0;
    return now - last >= DEFAULT_COOLDOWN_MS;
  }

  _lineFor(speakerId, listenerId) {
    const em = this.world.getComponent(speakerId, C.Emotion);
    const rel = this.world.getComponent(speakerId, C.Relations);
    const bond = rel?.bonds.get(listenerId);
    return pickLine(em?.state || 'neutral', bond?.tier || 'acquaintance');
  }

  destroy() { this._cooldowns.clear(); }
}
