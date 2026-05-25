/**
 * Visibility Handler — pauses the game when the tab is hidden.
 *
 * - Listens to `visibilitychange`
 * - Notifies subscribers (game.js wires this to loop.pause/resume + audio)
 * - Provides isHidden() for one-shot checks
 *
 * Why? Background CPU/audio is bad citizenship; also avoids huge dt spikes
 * when the tab returns. The loop already clamps dt, but pausing is cleaner.
 */

export class VisibilityHandler {
  constructor() {
    this._hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    this._listeners = [];
    this._onChange = () => {
      const newHidden = document.visibilityState === 'hidden';
      if (newHidden === this._hidden) return;
      this._hidden = newHidden;
      for (const fn of this._listeners) {
        try { fn(this._hidden); } catch (e) { console.error('[visibility]', e); }
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._onChange);
    }
  }

  isHidden() { return this._hidden; }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      const idx = this._listeners.indexOf(fn);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._onChange);
    }
    this._listeners.length = 0;
  }
}
