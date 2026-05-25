/**
 * Speech Bubble — short floating text above a Kip.
 *
 * Pool-managed: up to N bubbles can be visible simultaneously; when full,
 * the oldest is recycled. Each bubble:
 *   - Rises slightly while displayed
 *   - Fades in / out
 *   - Auto-removes after `ttl` seconds
 *
 * The bubble is a DOM element (cheap because there are very few alive at a
 * time and CSS handles the animation). Position is recomputed each frame
 * from the projected world coords of the speaking entity.
 */

const POOL_SIZE = 8;
const DEFAULT_TTL = 3.5;

const STYLE = `
  position: absolute;
  pointer-events: none;
  z-index: 5;
  transform: translate(-50%, -100%);
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.95);
  color: #1c1d2b;
  font-family: ui-rounded, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  border-bottom-left-radius: 3px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 200ms ease;
`;

export class SpeechBubbleHost {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {import('../world/camera.js').Camera} deps.camera
   */
  constructor({ world, camera }) {
    this.world = world;
    this.camera = camera;
    /** @type {Bubble[]} */
    this._pool = [];
    this._parent = null;
  }

  mount(parent) {
    this._parent = parent;
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.style.cssText = STYLE;
      el.style.display = 'none';
      parent.appendChild(el);
      this._pool.push({
        el,
        entityId: -1,
        ttl: 0,
        offsetY: 0,
      });
    }
  }

  /**
   * Show a bubble for the given entity. If the pool is exhausted, replaces
   * the oldest bubble.
   * @param {number} entityId
   * @param {string} text
   * @param {number} [ttl]
   */
  speak(entityId, text, ttl = DEFAULT_TTL) {
    if (!text || !this._parent) return;
    // Reuse existing bubble for this entity to avoid spam
    let slot = this._pool.find(s => s.entityId === entityId);
    if (!slot) {
      // Pick the oldest (lowest ttl)
      slot = this._pool.reduce((a, b) => (a.ttl < b.ttl ? a : b));
    }
    slot.entityId = entityId;
    slot.el.textContent = text;
    slot.el.style.display = 'block';
    slot.ttl = ttl;
    slot.offsetY = 0;
    requestAnimationFrame(() => { slot.el.style.opacity = '1'; });
  }

  /** Per-frame update: reposition + decay. dtReal seconds. */
  update(dt) {
    if (dt <= 0) return;
    for (const slot of this._pool) {
      if (slot.ttl <= 0) continue;
      slot.ttl -= dt;
      slot.offsetY -= 6 * dt;          // small float-up

      const t = this.world.getComponent(slot.entityId, 'Transform');
      if (!t) {
        this._hide(slot);
        continue;
      }
      // Project world → screen
      const screen = this.camera.worldToScreen(t.x, t.y - 64);
      slot.el.style.left = `${screen.x}px`;
      slot.el.style.top  = `${screen.y + slot.offsetY}px`;

      if (slot.ttl <= 0.4) slot.el.style.opacity = `${(slot.ttl / 0.4)}`;
      if (slot.ttl <= 0) this._hide(slot);
    }
  }

  _hide(slot) {
    slot.el.style.display = 'none';
    slot.el.style.opacity = '0';
    slot.entityId = -1;
    slot.ttl = 0;
  }

  destroy() {
    for (const slot of this._pool) slot.el.remove();
    this._pool.length = 0;
  }
}
