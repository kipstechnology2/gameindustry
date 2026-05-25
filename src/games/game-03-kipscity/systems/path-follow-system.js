/**
 * Path Follow System — moves entities along their Path waypoints.
 *
 * Per frame, for each entity with Transform + Motion + Path:
 *   1. If no path: zero velocity, return.
 *   2. Compute vector to current waypoint.
 *   3. If within an arrival epsilon, advance to next waypoint (or finish).
 *   4. Else move along the unit vector at motion.speed.
 *
 * Facing is derived from the *tile-step* between waypoints (cleaner than
 * world-pixel deltas in iso). The result is one of N/E/S/W to match the
 * 4-direction sprite atlas.
 *
 * Runs at the loop's render cadence (per-frame, real dt) so movement is
 * smooth at any framerate. Determinism isn't required; the multi-rate AI
 * tracks (4 Hz, 1 Hz) handle systems that need it.
 */

import { C, FACING } from '../components/types.js';

const ARRIVAL_EPSILON = 1.5; // world-px

export class PathFollowSystem {
  constructor({ world }) {
    this.world = world;
  }

  update(dt) {
    if (dt <= 0) return;

    for (const e of this.world.query([C.Transform, C.Motion, C.Path])) {
      const t = e[C.Transform];
      const m = e[C.Motion];
      const p = e[C.Path];

      if (!p.waypoints || p.index >= p.waypoints.length) {
        m.vx = 0;
        m.vy = 0;
        continue;
      }

      const wp = p.waypoints[p.index];
      const dx = wp.x - t.x;
      const dy = wp.y - t.y;
      const dist = Math.hypot(dx, dy);

      if (dist < ARRIVAL_EPSILON) {
        // Snap to waypoint center to avoid drift accumulation
        t.x = wp.x;
        t.y = wp.y;
        p.index++;
        if (p.index >= p.waypoints.length) {
          // Reached destination
          m.vx = 0;
          m.vy = 0;
          p.waypoints = null;
          p.index = 0;
          continue;
        }
        // Update facing for the *next* segment (tile-based: clean cardinal)
        const next = p.waypoints[p.index];
        t.facing = facingFromTileDelta(
          wp.col, wp.row, next.col, next.row
        );
      }

      // Move at constant speed toward waypoint
      const stepLen = m.speed * dt;
      if (stepLen >= dist) {
        // Will reach this frame
        t.x = wp.x;
        t.y = wp.y;
        m.vx = dx / dt; // last frame's effective velocity
        m.vy = dy / dt;
        // Mark waypoint reached for next frame
        p.index++;
        if (p.index >= p.waypoints.length) {
          m.vx = 0;
          m.vy = 0;
          p.waypoints = null;
          p.index = 0;
        } else {
          const next = p.waypoints[p.index];
          t.facing = facingFromTileDelta(
            wp.col, wp.row, next.col, next.row
          );
        }
      } else {
        const ux = dx / dist;
        const uy = dy / dist;
        t.x += ux * stepLen;
        t.y += uy * stepLen;
        m.vx = ux * m.speed;
        m.vy = uy * m.speed;

        // First-segment facing (initial waypoint hasn't been reached yet)
        if (!t._facingInitialized) {
          t._facingInitialized = true;
        }
        // Refresh facing every frame from tile delta to remain robust
        // even mid-segment.
        t.facing = facingFromCurrentSegment(t, p);
      }
    }
  }
}

/**
 * Cardinal facing from a tile-coord delta. A* uses 4-neighborhood so deltas
 * are always (±1, 0) or (0, ±1).
 */
function facingFromTileDelta(c1, r1, c2, r2) {
  const dc = c2 - c1;
  const dr = r2 - r1;
  if (dc > 0 && dr === 0) return FACING.E;
  if (dc < 0 && dr === 0) return FACING.W;
  if (dr > 0 && dc === 0) return FACING.S;
  if (dr < 0 && dc === 0) return FACING.N;
  // Diagonals (shouldn't happen with NEIGHBORS_4 but be defensive)
  if (Math.abs(dc) > Math.abs(dr)) return dc > 0 ? FACING.E : FACING.W;
  return dr > 0 ? FACING.S : FACING.N;
}

/**
 * Facing during a segment: derive from the previous-to-current waypoint
 * delta, or fall back to motion vector if at the very first waypoint.
 */
function facingFromCurrentSegment(transform, path) {
  const idx = path.index;
  const wp = path.waypoints[idx];
  if (idx === 0) {
    // No previous waypoint; use the segment from current position toward wp
    const dx = wp.x - transform.x;
    const dy = wp.y - transform.y;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) return dx > 0 ? FACING.E : FACING.W;
    return dy > 0 ? FACING.S : FACING.N;
  }
  const prev = path.waypoints[idx - 1];
  return facingFromTileDelta(prev.col, prev.row, wp.col, wp.row);
}
