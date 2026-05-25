/**
 * Journal UI — "Today's Story" panel (left edge).
 *
 * Shows:
 *   - Current weather + day
 *   - Active quests (with current step label)
 *   - Recently completed quests (greyed out, drop after a while)
 *
 * Implementation: DOM. Re-renders only when content actually changes (we
 * cache a hash of the displayed text).
 */

const ROOT_STYLE = `
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 96px);
  left: 12px;
  width: 220px;
  max-height: 60vh;
  padding: 12px 14px;
  background: linear-gradient(140deg, rgba(20, 28, 50, 0.78), rgba(8, 14, 30, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  color: #fff;
  font-family: ui-rounded, system-ui, sans-serif;
  z-index: 5;
  user-select: none;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  pointer-events: auto;
  overflow-y: auto;
  scrollbar-width: none;
`;

const LABEL_STYLE = `
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const SECTION_HEADING_STYLE = `
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  margin: 12px 0 4px;
`;

const QUEST_ROW_STYLE = `
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.86);
  padding: 6px 0 6px 14px;
  position: relative;
  border-left: 2px solid rgba(108, 140, 255, 0.5);
  margin-left: 2px;
  transition: color 240ms ease, border-color 240ms ease;
`;

const COMPLETED_ROW_STYLE = `
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.4);
  padding: 4px 0 4px 14px;
  border-left: 2px solid rgba(155, 214, 111, 0.5);
  margin-left: 2px;
  text-decoration: line-through;
`;

const WEATHER_ROW_STYLE = `
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.86);
`;

const WEATHER_ICON = {
  sunny:  '☀️',
  cloudy: '☁️',
  rain:   '🌧️',
  snow:   '❄️',
};

export class JournalUI {
  /**
   * @param {object} deps
   * @param {import('../adventure/quest-engine.js').QuestEngine} deps.questEngine
   * @param {() => string} deps.weatherProvider
   * @param {() => {day:number, season:string}} deps.dayProvider
   */
  constructor({ questEngine, weatherProvider, dayProvider }) {
    this.questEngine = questEngine;
    this.weatherProvider = weatherProvider;
    this.dayProvider = dayProvider;
    this.el = null;
    this._lastSig = null;
  }

  mount(parent) {
    if (this.el) return;
    const root = document.createElement('div');
    root.className = 'kc-journal';
    root.style.cssText = ROOT_STYLE;

    const label = document.createElement('p');
    label.style.cssText = LABEL_STYLE;
    label.textContent = "Today's Story";
    root.appendChild(label);

    const day = document.createElement('div');
    day.className = 'kc-journal__day';
    day.style.cssText = WEATHER_ROW_STYLE;
    root.appendChild(day);

    const activeHeading = document.createElement('p');
    activeHeading.style.cssText = SECTION_HEADING_STYLE;
    activeHeading.textContent = 'Quests';
    root.appendChild(activeHeading);

    const activeList = document.createElement('div');
    activeList.className = 'kc-journal__active';
    root.appendChild(activeList);

    const completedHeading = document.createElement('p');
    completedHeading.style.cssText = SECTION_HEADING_STYLE;
    completedHeading.textContent = 'Done';
    completedHeading.style.display = 'none';
    root.appendChild(completedHeading);

    const completedList = document.createElement('div');
    completedList.className = 'kc-journal__done';
    root.appendChild(completedList);

    parent.appendChild(root);
    this.el = root;
    this._dayEl = day;
    this._activeListEl = activeList;
    this._completedListEl = completedList;
    this._completedHeadingEl = completedHeading;
  }

  /** Call from render loop. Cheap diff via signature. */
  update() {
    if (!this.el) return;
    const sig = this._signature();
    if (sig === this._lastSig) return;
    this._lastSig = sig;

    // Day + weather
    const d = this.dayProvider();
    const w = this.weatherProvider();
    this._dayEl.textContent = `${WEATHER_ICON[w] || '·'} Day ${d.day} · ${capitalize(d.season)}`;

    // Active quests
    this._activeListEl.innerHTML = '';
    const active = [...this.questEngine.active.values()];
    if (active.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = QUEST_ROW_STYLE + 'opacity: 0.6; font-style: italic;';
      empty.textContent = 'No active quests. Explore the city!';
      this._activeListEl.appendChild(empty);
    } else {
      for (const q of active) {
        const state = this.questEngine.state.get(q.id);
        const stepIdx = state ? state.stepIndex : 0;
        const step = q.steps[stepIdx];

        const row = document.createElement('div');
        row.style.cssText = QUEST_ROW_STYLE;
        row.innerHTML = `
          <strong style="display:block;color:#fff;">${escapeHtml(q.title)}</strong>
          <span style="color:rgba(255,255,255,0.66);">${escapeHtml(step?.label || 'Working on it…')}</span>
        `;
        this._activeListEl.appendChild(row);
      }
    }

    // Completed quests (last 3)
    this._completedListEl.innerHTML = '';
    const completed = [...this.questEngine.completed.values()].slice(-3);
    if (completed.length > 0) {
      this._completedHeadingEl.style.display = 'block';
      for (const q of completed) {
        const row = document.createElement('div');
        row.style.cssText = COMPLETED_ROW_STYLE;
        row.textContent = q.title;
        this._completedListEl.appendChild(row);
      }
    } else {
      this._completedHeadingEl.style.display = 'none';
    }
  }

  destroy() {
    this.el?.remove();
    this.el = null;
  }

  _signature() {
    // Cheap: stringify just the ids + state per quest + weather/day
    const d = this.dayProvider();
    const w = this.weatherProvider();
    const active = [...this.questEngine.active.values()].map((q) => {
      const s = this.questEngine.state.get(q.id);
      return `${q.id}:${s ? s.stepIndex : 0}`;
    }).join('|');
    const done = [...this.questEngine.completed.keys()].slice(-3).join('|');
    return `${d.day}/${d.season}/${w}/${active}/${done}`;
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
