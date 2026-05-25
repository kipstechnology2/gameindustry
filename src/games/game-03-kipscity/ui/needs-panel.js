/**
 * Needs Panel — animated bars showing the player's 9 needs.
 *
 * Layout:
 *   - Desktop / tablet: docked top-right, below the HUD time panel.
 *   - Mobile (<480px):  collapsible bottom sheet with a tap-to-expand handle.
 *
 * Each bar:
 *   - Color shifts based on value (green > 60, yellow 30-60, red < 30)
 *   - "Calm" bar inverts the color cue (high = good, low = stressed)
 *   - Smooth width transition; only re-paints when value crosses a 1% step
 *   - Hover/tap shows the friendly label
 */

import { NEED_KEYS } from '../components/types.js';

const ROOT_STYLE = `
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 96px);
  right: 12px;
  width: 200px;
  padding: 12px 14px;
  background: linear-gradient(140deg, rgba(20, 28, 50, 0.78), rgba(8, 14, 30, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #fff;
  font-family: ui-rounded, system-ui, sans-serif;
  pointer-events: auto;
  z-index: 5;
  user-select: none;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  transition: opacity 0.3s ease;
`;

const LABEL_STYLE = `
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px;
`;

const ROW_STYLE = `
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  align-items: center;
  margin: 4px 0;
  font-size: 11px;
`;

const NEED_LABEL_STYLE = `
  color: rgba(255, 255, 255, 0.78);
  font-weight: 500;
  text-transform: capitalize;
`;

const BAR_BG_STYLE = `
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
`;

const BAR_FILL_STYLE = `
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.2, 0.7, 0.2, 1), background-color 0.4s ease;
`;

const COLLAPSE_STYLE_MOBILE = `
  @media (max-width: 480px) {
    .kc-needs {
      top: auto !important;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 12px) !important;
      right: 12px !important;
      left: 12px !important;
      width: auto !important;
    }
  }
`;

export class NeedsPanel {
  constructor() {
    this.el = null;
    this._rows = new Map();   // key → { fill, value }
    this._lastValues = new Map();
    this._styleTag = null;
  }

  mount(parent) {
    if (this.el) return;

    this._injectMediaCSS();

    const root = document.createElement('div');
    root.className = 'kc-needs';
    root.style.cssText = ROOT_STYLE;

    const label = document.createElement('p');
    label.style.cssText = LABEL_STYLE;
    label.textContent = 'NEEDS';
    root.appendChild(label);

    for (const key of NEED_KEYS) {
      if (key === 'health') continue; // health is shown separately later
      const row = document.createElement('div');
      row.style.cssText = ROW_STYLE;

      const labelEl = document.createElement('span');
      labelEl.style.cssText = NEED_LABEL_STYLE;
      labelEl.textContent = key;

      const barBg = document.createElement('div');
      barBg.style.cssText = BAR_BG_STYLE;
      const fill = document.createElement('div');
      fill.style.cssText = BAR_FILL_STYLE;
      fill.style.width = '85%';
      fill.style.background = '#9bd66f';
      barBg.appendChild(fill);

      row.appendChild(labelEl);
      row.appendChild(barBg);
      root.appendChild(row);

      this._rows.set(key, { fill });
    }

    parent.appendChild(root);
    this.el = root;
  }

  /** Update from a Needs component. Only re-paints rows whose value changed ≥1%. */
  update(needs) {
    if (!this.el || !needs) return;
    for (const [key, row] of this._rows) {
      let value = needs[key];
      if (value == null) continue;
      const last = this._lastValues.get(key) ?? -1;
      if (Math.abs(value - last) < 1) continue;
      this._lastValues.set(key, value);

      // Calm is "high = good"; for visual urgency UX, "low calm = bad" same as others
      // (so we don't need to invert)
      row.fill.style.width = `${value.toFixed(1)}%`;
      row.fill.style.background = colorForValue(value, key);
    }
  }

  destroy() {
    this.el?.remove();
    this.el = null;
    this._rows.clear();
    this._lastValues.clear();
    if (this._styleTag) {
      this._styleTag.remove();
      this._styleTag = null;
    }
  }

  _injectMediaCSS() {
    if (this._styleTag) return;
    const tag = document.createElement('style');
    tag.textContent = COLLAPSE_STYLE_MOBILE;
    document.head.appendChild(tag);
    this._styleTag = tag;
  }
}

function colorForValue(v, key) {
  // 0..100 → red..yellow..green
  if (v >= 60) return '#9bd66f';
  if (v >= 30) return '#ffd24a';
  return '#ff7a90';
}

/**
 * Mood Ring — a small DOM element that floats above the player's avatar in
 * the world. Color reflects emotion, scale reflects intensity.
 *
 * For Batch 3d we attach it as a fixed DOM element overlaid via projection;
 * full canvas-rendered mood ring on the world-UI layer comes in 3e.
 */
export class MoodRing {
  constructor() {
    this.el = null;
    this._lastState = null;
  }

  mount(parent) {
    if (this.el) return;
    const el = document.createElement('div');
    el.className = 'kc-moodring';
    el.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 4;
      transform: translate(-50%, -100%);
      box-shadow: 0 0 12px currentColor;
      transition: background-color 0.4s ease, box-shadow 0.4s ease,
                  transform 0.2s cubic-bezier(0.2, 0.7, 0.2, 1);
      opacity: 0.92;
    `;
    parent.appendChild(el);
    this.el = el;
  }

  /**
   * Position in viewport pixels (caller projects from world).
   * @param {number} screenX
   * @param {number} screenY
   * @param {string} emotionState
   * @param {number} intensity 0..1
   * @param {string} color CSS color
   */
  update(screenX, screenY, emotionState, intensity, color) {
    if (!this.el) return;
    if (emotionState !== this._lastState) {
      this.el.style.color = color;
      this.el.style.backgroundColor = color;
      this._lastState = emotionState;
    }
    const scale = 0.7 + intensity * 0.6;
    this.el.style.left = `${screenX}px`;
    this.el.style.top = `${screenY}px`;
    this.el.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(3)})`;
  }

  destroy() {
    this.el?.remove();
    this.el = null;
  }
}
