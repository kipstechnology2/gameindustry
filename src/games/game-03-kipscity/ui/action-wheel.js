/**
 * Action Wheel — radial menu shown when the player taps an interactable object.
 *
 * Visual: glassy panel anchored above the tapped object's screen position,
 * containing 1–4 buttons (one per affordance the object offers). Tap a
 * button → fires an `onPick` callback with the affordance id.
 *
 * UX:
 *   - Pops in with a soft scale animation (200ms).
 *   - Auto-dismisses on outside-tap, ESC, or after picking.
 *   - Repositions on viewport resize so it never goes off-screen.
 *
 * Implementation:
 *   - DOM (not canvas) so buttons get free hit-testing and accessibility.
 *   - Single root container reused across opens (no per-open allocation).
 *   - Buttons are recreated per-open (cheap, max 4 of them).
 */

import { AFFORDANCES } from '../interactions/affordance-catalog.js';

const ROOT_STYLE = `
  position: absolute;
  pointer-events: auto;
  z-index: 9;
  transform: translate(-50%, -100%) scale(0.9);
  opacity: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(140deg, rgba(20, 28, 50, 0.92), rgba(8, 14, 30, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.45),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: #fff;
  font-family: ui-rounded, system-ui, sans-serif;
  user-select: none;
  -webkit-user-select: none;
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  transition: opacity 200ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
  display: none;
`;

const BUTTON_STYLE = `
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 64px;
  min-height: 64px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, transform 100ms ease;
  text-align: center;
`;

const ICON_STYLE = `
  font-size: 20px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
`;

export class ActionWheel {
  constructor() {
    this.el = null;
    this.open = false;
    this._objectEntityId = null;
    this._onPick = null;
    this._onOutsideTap = null;
    this._onKey = null;
    this._buttons = [];
  }

  mount(parent) {
    if (this.el) return;
    const root = document.createElement('div');
    root.className = 'kc-action-wheel';
    root.style.cssText = ROOT_STYLE;
    parent.appendChild(root);
    this.el = root;
  }

  /**
   * Show the wheel for an interactable object.
   * @param {object} cfg
   * @param {string[]} cfg.affordanceIds — list of affordance keys
   * @param {number} cfg.screenX
   * @param {number} cfg.screenY
   * @param {number} cfg.objectEntityId
   * @param {(affordanceId:string, objectEntityId:number) => void} cfg.onPick
   */
  show({ affordanceIds, screenX, screenY, objectEntityId, onPick }) {
    if (!this.el) return;
    this.hide();

    this._objectEntityId = objectEntityId;
    this._onPick = onPick;

    // Build buttons
    this.el.innerHTML = '';
    this._buttons = [];
    for (const id of affordanceIds) {
      const aff = AFFORDANCES[id];
      if (!aff) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = BUTTON_STYLE;
      btn.setAttribute('aria-label', aff.label);

      const icon = document.createElement('span');
      icon.style.cssText = ICON_STYLE;
      icon.textContent = aff.icon || '·';

      const label = document.createElement('span');
      label.textContent = aff.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.12)');
      btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.06)');
      btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
      btn.addEventListener('mouseup',   () => btn.style.transform = 'scale(1)');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cb = this._onPick;
        const oid = this._objectEntityId;
        this.hide();
        if (cb) cb(id, oid);
      });
      this.el.appendChild(btn);
      this._buttons.push(btn);
    }

    // Position above the object — clamp to viewport edges
    this._position(screenX, screenY);

    // Pop in
    this.el.style.display = 'flex';
    requestAnimationFrame(() => {
      this.el.style.opacity = '1';
      this.el.style.transform = 'translate(-50%, -100%) scale(1)';
    });
    this.open = true;

    // Outside-tap dismissal
    this._onOutsideTap = (e) => {
      if (!this.el.contains(e.target)) this.hide();
    };
    setTimeout(() => {
      document.addEventListener('pointerdown', this._onOutsideTap, true);
    }, 0);

    // Esc dismissal
    this._onKey = (e) => { if (e.key === 'Escape') this.hide(); };
    document.addEventListener('keydown', this._onKey);
  }

  hide() {
    if (!this.el || !this.open) return;
    this.el.style.opacity = '0';
    this.el.style.transform = 'translate(-50%, -100%) scale(0.9)';
    setTimeout(() => {
      if (!this.open) this.el.style.display = 'none';
    }, 200);
    if (this._onOutsideTap) {
      document.removeEventListener('pointerdown', this._onOutsideTap, true);
      this._onOutsideTap = null;
    }
    if (this._onKey) {
      document.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    this.open = false;
    this._objectEntityId = null;
    this._onPick = null;
  }

  destroy() {
    this.hide();
    this.el?.remove();
    this.el = null;
    this._buttons.length = 0;
  }

  _position(screenX, screenY) {
    if (!this.el) return;
    // Render off-screen briefly so we can measure
    this.el.style.left = '-9999px';
    this.el.style.top = '-9999px';
    this.el.style.display = 'flex';
    const rect = this.el.getBoundingClientRect();
    const parentRect = this.el.parentElement.getBoundingClientRect();
    const margin = 12;
    const halfW = rect.width / 2;

    // Anchor 16px above the tapped point
    let x = screenX;
    let y = screenY - 16;

    // Clamp horizontally
    if (x - halfW < margin) x = margin + halfW;
    if (x + halfW > parentRect.width - margin) x = parentRect.width - margin - halfW;

    // If too close to top, flip below the object
    if (y - rect.height < margin) {
      y = screenY + 56; // below
      this.el.style.transform = 'translate(-50%, 0) scale(0.9)';
    } else {
      this.el.style.transform = 'translate(-50%, -100%) scale(0.9)';
    }

    this.el.style.left = `${x}px`;
    this.el.style.top  = `${y}px`;
  }
}
