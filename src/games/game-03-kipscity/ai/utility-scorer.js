/**
 * Utility Scorer — picks the best action for a Kip.
 *
 * For each action in the catalog:
 *   1. Call action.score(ctx) → numeric utility
 *   2. Call action.target(ctx) → null if unavailable, else { x, y, ... }
 *   3. If both ok, keep highest score
 *
 * Tie-breaking: prefer the same action the Kip is already executing
 * (avoid thrash where two actions oscillate at similar scores).
 *
 * Performance: O(actions × cost-of-target). targets() may walk world
 * queries — keep them cheap. The decision system runs at 4 Hz.
 */

import { ACTIONS, ACTION_IDS } from './action-catalog.js';

const STICKY_BONUS = 8;

/**
 * @param {object} ctx — see ai/action-catalog.js ActionCtx
 * @param {string|null} currentActionId — id of action currently executing (sticky bonus)
 * @returns {{ action: object, target: object } | null}
 */
export function pickBestAction(ctx, currentActionId = null) {
  let best = null;
  let bestScore = -Infinity;
  let bestTarget = null;

  for (const id of ACTION_IDS) {
    const action = ACTIONS[id];
    let score;
    try { score = action.score(ctx); }
    catch (e) { console.warn(`[utility] score(${id}) threw`, e); continue; }
    if (score == null || score < 0) continue;

    if (currentActionId === id) score += STICKY_BONUS;
    if (score <= bestScore) continue;

    let target;
    try { target = action.target(ctx); }
    catch (e) { console.warn(`[utility] target(${id}) threw`, e); continue; }
    if (!target) continue;

    best = action;
    bestScore = score;
    bestTarget = target;
  }

  return best ? { action: best, target: bestTarget, score: bestScore } : null;
}
