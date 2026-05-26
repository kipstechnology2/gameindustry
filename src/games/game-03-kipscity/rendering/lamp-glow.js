/**
 * Lamp Glow — paints warm halos around lampposts at night.
 *
 * Runs on the FX canvas (Layer 2) AFTER the entity blit pass. Each lamppost
 * gets a radial gradient that fades smoothly. Only renders when ambient
 * brightness is below daylight threshold (so it stays invisible at noon).
 *
 * Cheap: ~10-30 gradient fills per frame. No allocation.
 */

import { C } from '../components/types.js';
import { ambientBrightness } from './lighting.js';

const NIGHT_THRESHOLD = 0.75; // ambient brightness below which lamps glow
const GLOW_RADIUS = 80;       // world-px

export function drawLampGlow(ctx, world, time) {
  const brightness = ambientBrightness(time);
  if (brightness >= NIGHT_THRESHOLD) return; // daylight — no glow needed

  // Map brightness 0.45..0.75 → glow strength 1..0
  const strength = Math.max(0, Math.min(1,
    (NIGHT_THRESHOLD - brightness) / (NIGHT_THRESHOLD - 0.45)
  ));
  if (strength <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; // additive — accumulates nicely

  for (const e of world.query([C.Transform, C.Sprite])) {
    const sprite = e[C.Sprite];
    if (sprite.kind !== 'object' || sprite.id !== 'lamppost') continue;

    const t = e[C.Transform];
    // Lamp head is ~80 px above the base in world coords
    const lampX = t.x;
    const lampY = t.y - 84;

    const grad = ctx.createRadialGradient(lampX, lampY, 4, lampX, lampY, GLOW_RADIUS);
    grad.addColorStop(0, `rgba(255, 233, 163, ${0.55 * strength})`);
    grad.addColorStop(0.5, `rgba(255, 200, 130, ${0.25 * strength})`);
    grad.addColorStop(1, 'rgba(255, 200, 130, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lampX, lampY, GLOW_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
