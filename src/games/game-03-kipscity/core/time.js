/**
 * In-Game Time System — Kips City
 *
 * Maps real time to game time and exposes calendar state.
 *
 * Default ratio: 1 real minute = 2 in-game hours
 *   → 1 in-game day = 12 real minutes
 *
 * Calendar:
 *   - 1 day  = 24 in-game hours
 *   - 1 month = 28 days (4 weeks of 7)  ← simplified for sim balance
 *   - 1 year = 4 seasons × 28 days = 112 days
 *
 * Phases (for lighting / NPC schedules):
 *   - dawn   05:00 – 08:00
 *   - day    08:00 – 17:00
 *   - dusk   17:00 – 20:00
 *   - night  20:00 – 05:00
 *
 * NOTE: this module produces *state*; lighting/audio/NPC schedule modules
 * subscribe to phase changes via the event bus.
 */

export const REAL_MS_PER_GAME_DAY = 12 * 60 * 1000;      // 12 real minutes = 1 day
export const GAME_HOURS_PER_DAY = 24;
export const GAME_MINUTES_PER_HOUR = 60;
export const DAYS_PER_SEASON = 28;
export const SEASONS_PER_YEAR = 4;

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const PHASES = Object.freeze({
  DAWN: 'dawn',
  DAY: 'day',
  DUSK: 'dusk',
  NIGHT: 'night',
});

const MS_PER_DAY = GAME_HOURS_PER_DAY * GAME_MINUTES_PER_HOUR * 60 * 1000;
const REAL_MS_TO_GAME_MS = MS_PER_DAY / REAL_MS_PER_GAME_DAY;
// At default ratio: 1 real ms = 120 game ms

export class TimeSystem {
  constructor({ startHour = 7, startDay = 1, startSeason = 'spring' } = {}) {
    /** @type {number} cumulative ms since current day at 00:00 (in-game) */
    this.todayMs = startHour * 60 * 60 * 1000;
    this.day = startDay;
    this.year = 1;
    this.season = startSeason;
    this._phase = this._computePhase();
    this._listeners = { dayChange: [], phaseChange: [], seasonChange: [] };
  }

  /** @param {number} dt seconds (game-time scaled by loop's timeScale) */
  update(dt) {
    if (dt <= 0) return;

    const gameMsAdded = dt * 1000 * REAL_MS_TO_GAME_MS;
    this.todayMs += gameMsAdded;

    if (this.todayMs >= MS_PER_DAY) {
      this.todayMs -= MS_PER_DAY;
      this._advanceDay();
    }

    const newPhase = this._computePhase();
    if (newPhase !== this._phase) {
      const old = this._phase;
      this._phase = newPhase;
      this._emit('phaseChange', { previous: old, current: newPhase });
    }
  }

  _advanceDay() {
    const oldSeason = this.season;
    this.day++;
    const dayInYear = ((this.day - 1) % (DAYS_PER_SEASON * SEASONS_PER_YEAR));
    const seasonIdx = Math.floor(dayInYear / DAYS_PER_SEASON);
    this.season = SEASONS[seasonIdx];
    this.year = Math.floor((this.day - 1) / (DAYS_PER_SEASON * SEASONS_PER_YEAR)) + 1;

    this._emit('dayChange', { day: this.day, year: this.year, season: this.season });
    if (this.season !== oldSeason) {
      this._emit('seasonChange', { previous: oldSeason, current: this.season });
    }
  }

  _computePhase() {
    const h = this.hour;
    if (h >= 5 && h < 8) return PHASES.DAWN;
    if (h >= 8 && h < 17) return PHASES.DAY;
    if (h >= 17 && h < 20) return PHASES.DUSK;
    return PHASES.NIGHT;
  }

  // ---------- accessors ----------
  /** Continuous in-game hour [0..24) — useful for smooth lighting interpolation */
  get hourFloat() { return this.todayMs / (60 * 60 * 1000); }
  get hour() { return Math.floor(this.hourFloat); }
  get minute() { return Math.floor((this.todayMs / (60 * 1000)) % 60); }
  get phase() { return this._phase; }
  get dayOfSeason() { return ((this.day - 1) % DAYS_PER_SEASON) + 1; }

  /** "8:42 AM" */
  formatClock(opts = { ampm: true }) {
    const m = this.minute;
    if (opts.ampm) {
      const h12 = this.hour % 12 || 12;
      const ampm = this.hour < 12 ? 'AM' : 'PM';
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }
    return `${String(this.hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ---------- events ----------
  on(eventType, fn) {
    const arr = this._listeners[eventType];
    if (!arr) throw new Error(`Unknown time event: ${eventType}`);
    arr.push(fn);
    return () => {
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    };
  }

  _emit(eventType, payload) {
    const arr = this._listeners[eventType];
    if (!arr) return;
    for (const fn of arr) {
      try { fn(payload); } catch (e) { console.error(`[time] ${eventType} handler`, e); }
    }
  }

  // ---------- save/load ----------
  serialize() {
    return {
      todayMs: this.todayMs,
      day: this.day,
      year: this.year,
      season: this.season,
    };
  }

  static deserialize(data) {
    const t = new TimeSystem();
    t.todayMs = data.todayMs ?? t.todayMs;
    t.day = data.day ?? t.day;
    t.year = data.year ?? t.year;
    t.season = data.season ?? t.season;
    t._phase = t._computePhase();
    return t;
  }
}
