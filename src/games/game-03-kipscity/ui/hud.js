/**
 * HUD — Top-Right Time + Day Panel.
 *
 * Renders an animated, glassy panel showing in-game clock, day, season,
 * and a small phase indicator (sun/moon icon).
 *
 * Updates only when displayed values change (cheap DOM diffing).
 *
 * In Batch 3a this is the only HUD element. Needs panel, action wheel,
 * money display, etc. arrive in 3d–3i.
 */

const ROOT_STYLE = `
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: linear-gradient(140deg, rgba(20, 28, 50, 0.78), rgba(8, 14, 30, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #fff;
  font-family: ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif;
  pointer-events: none;
  z-index: 6;
  user-select: none;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  min-width: 160px;
`;

const LABEL_STYLE = `
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const CLOCK_STYLE = `
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin: 2px 0 0;
  letter-spacing: 0.01em;
`;

const META_STYLE = `
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PHASE_DOT_STYLE = `
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-shadow: 0 0 6px currentColor;
  flex-shrink: 0;
`;

const PHASE_COLORS = {
  dawn:  '#ffb375',
  day:   '#ffd64a',
  dusk:  '#ff7a90',
  night: '#7a8cff',
};

const SEASON_EMOJI = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

export class Hud {
  constructor() {
    this.el = null;
    this._lastClock = '';
    this._lastDay = -1;
    this._lastSeason = '';
    this._lastPhase = '';
  }

  mount(parent) {
    if (this.el) return;

    const root = document.createElement('div');
    root.className = 'kc-hud';
    root.style.cssText = ROOT_STYLE;

    const label = document.createElement('p');
    label.style.cssText = LABEL_STYLE;
    label.textContent = 'KIPS CITY';

    const clockRow = document.createElement('div');
    clockRow.style.cssText = CLOCK_STYLE;
    const phaseDot = document.createElement('span');
    phaseDot.className = 'kc-hud__phase';
    phaseDot.style.cssText = PHASE_DOT_STYLE;
    const clockText = document.createElement('span');
    clockText.className = 'kc-hud__clock';
    clockText.textContent = '—:—';
    clockRow.appendChild(phaseDot);
    clockRow.appendChild(clockText);

    const meta = document.createElement('p');
    meta.className = 'kc-hud__meta';
    meta.style.cssText = META_STYLE;
    meta.textContent = '—';

    root.appendChild(label);
    root.appendChild(clockRow);
    root.appendChild(meta);

    parent.appendChild(root);
    this.el = root;
    this._clockEl = clockText;
    this._phaseEl = phaseDot;
    this._metaEl = meta;
  }

  /** Call once per frame — diffs and only writes DOM on change. */
  update(time) {
    if (!this.el) return;

    const clock = time.formatClock();
    if (clock !== this._lastClock) {
      this._clockEl.textContent = clock;
      this._lastClock = clock;
    }

    if (time.phase !== this._lastPhase) {
      this._phaseEl.style.color = PHASE_COLORS[time.phase] || '#fff';
      this._lastPhase = time.phase;
    }

    if (time.day !== this._lastDay || time.season !== this._lastSeason) {
      const seasonName = capitalize(time.season);
      const emoji = SEASON_EMOJI[time.season] || '·';
      this._metaEl.textContent = `${emoji} Day ${time.day} · ${seasonName}`;
      this._lastDay = time.day;
      this._lastSeason = time.season;
    }
  }

  destroy() {
    this.el?.remove();
    this.el = null;
    this._clockEl = null;
    this._phaseEl = null;
    this._metaEl = null;
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * Help banner — small bottom-center hint that auto-fades after 8s.
 * Useful in Batch 3a so the player discovers controls.
 */
export class HelpBanner {
  constructor(message) {
    this.message = message;
    this.el = null;
  }

  mount(parent) {
    const el = document.createElement('div');
    el.className = 'kc-help-banner';
    el.style.cssText = `
      position: absolute;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
      left: 50%;
      transform: translateX(-50%);
      max-width: 92vw;
      padding: 10px 16px;
      background: rgba(8, 14, 30, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #cdd5e3;
      font-family: ui-rounded, system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.55;
      text-align: center;
      pointer-events: none;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      z-index: 6;
      user-select: none;
      transition: opacity 0.8s ease, transform 0.8s ease;
    `;
    el.innerHTML = this.message;
    parent.appendChild(el);
    this.el = el;

    setTimeout(() => {
      if (!this.el) return;
      this.el.style.opacity = '0';
      this.el.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => this.destroy(), 900);
    }, 8000);
  }

  destroy() {
    this.el?.remove();
    this.el = null;
  }
}
