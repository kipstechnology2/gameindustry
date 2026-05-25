/**
 * Emotion System — derives current emotion from needs + decays over time.
 *
 * Strategy: scan needs, find the most urgent one. Map it to a primary
 * emotion. If all needs are healthy, default to HAPPY or NEUTRAL based on
 * average satisfaction.
 *
 * Manual emotion injections (e.g. social-system pushing EXCITED on a great
 * conversation) win over derived emotions while their timer > 0.
 */

import { C, EMOTION } from '../components/types.js';
import { CRITICAL_THRESHOLD } from './needs-system.js';

// Need → emotion mapping when that need is most urgent
const NEED_TO_EMOTION = Object.freeze({
  hunger:  EMOTION.HUNGRY,
  energy:  EMOTION.TIRED,
  social:  EMOTION.LONELY,
  fun:     EMOTION.SAD,
  comfort: EMOTION.SAD,
  hygiene: EMOTION.SAD,
  calm:    EMOTION.STRESSED,
  bladder: EMOTION.STRESSED,
  health:  EMOTION.SAD,
});

const HAPPY_THRESHOLD = 70;   // average needs above this → happy
const EXCITED_THRESHOLD = 90; // exceptional satisfaction → excited

export class EmotionSystem {
  constructor({ world }) {
    this.world = world;
  }

  /** dt seconds (real). */
  update(dt) {
    for (const e of this.world.query([C.Emotion, C.Needs])) {
      const em = e[C.Emotion];
      const n = e[C.Needs];

      // Decay manual emotions
      if (em.timer > 0) {
        em.timer -= dt;
        if (em.timer <= 0) {
          em.timer = 0;
          // Derive a fresh emotion from current state on next pass
          em.intensity = 0;
        } else {
          continue; // keep manual emotion until timer expires
        }
      }

      // Find most urgent need
      const urgent = pickMostUrgentNeed(n);

      if (urgent.value < CRITICAL_THRESHOLD) {
        em.state = NEED_TO_EMOTION[urgent.key] || EMOTION.SAD;
        em.intensity = clamp01(1 - urgent.value / CRITICAL_THRESHOLD);
      } else {
        const avg = averageNeeds(n);
        if (avg >= EXCITED_THRESHOLD) {
          em.state = EMOTION.EXCITED;
          em.intensity = clamp01((avg - EXCITED_THRESHOLD) / 10 + 0.6);
        } else if (avg >= HAPPY_THRESHOLD) {
          em.state = EMOTION.HAPPY;
          em.intensity = clamp01((avg - HAPPY_THRESHOLD) / (EXCITED_THRESHOLD - HAPPY_THRESHOLD));
        } else {
          em.state = EMOTION.NEUTRAL;
          em.intensity = 0.3;
        }
      }
    }
  }

  /** Inject a manual emotion (event response). */
  static set(emotion, state, intensity = 0.7, durationSec = 6) {
    emotion.state = state;
    emotion.intensity = intensity;
    emotion.timer = durationSec;
  }
}

function pickMostUrgentNeed(n) {
  let lowestKey = 'hunger';
  let lowest = n.hunger;
  // Skip health (computed indirectly)
  const checkKeys = ['hunger', 'energy', 'hygiene', 'social', 'fun',
                     'comfort', 'bladder', 'calm'];
  for (const k of checkKeys) {
    if (n[k] < lowest) { lowest = n[k]; lowestKey = k; }
  }
  return { key: lowestKey, value: lowest };
}

function averageNeeds(n) {
  return (n.hunger + n.energy + n.hygiene + n.social + n.fun
        + n.comfort + n.bladder + n.calm) / 8;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Mood ring color for a given emotion + intensity. */
export const EMOTION_COLOR = Object.freeze({
  neutral:  '#9aa3b8',
  happy:    '#ffd24a',
  excited:  '#ff8a4a',
  sad:      '#7a8cff',
  tired:    '#6b7388',
  hungry:   '#ff7a4a',
  lonely:   '#8c7aff',
  stressed: '#ff5470',
  inspired: '#00d4ff',
});
