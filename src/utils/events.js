/**
 * Tiny pub/sub event bus.
 * Used for decoupling: router -> views, engine -> ui, ads -> game lifecycle, etc.
 */

export class EventBus {
  constructor() {
    this._map = new Map();
  }
  on(type, fn) {
    if (!this._map.has(type)) this._map.set(type, new Set());
    this._map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  once(type, fn) {
    const off = this.on(type, (payload) => { off(); fn(payload); });
    return off;
  }
  off(type, fn) {
    this._map.get(type)?.delete(fn);
  }
  emit(type, payload) {
    const subs = this._map.get(type);
    if (!subs) return;
    // Snapshot to allow off() during emit
    [...subs].forEach((fn) => {
      try { fn(payload); } catch (e) { console.error(`[bus] handler for "${type}" threw`, e); }
    });
  }
  clear(type) {
    if (type) this._map.delete(type);
    else this._map.clear();
  }
}

// Shared global bus
export const bus = new EventBus();

// Standardized event names
export const EVT = Object.freeze({
  ROUTE_CHANGE:   'route:change',
  LANG_CHANGE:    'lang:change',
  CATALOG_READY:  'catalog:ready',
  GAME_LAUNCH:    'game:launch',
  GAME_EXIT:      'game:exit',
  GAME_PAUSE:     'game:pause',
  GAME_RESUME:    'game:resume',
  GAME_OVER:      'game:over',
  HIGHSCORE_UPDATE: 'score:update',
  AD_REQUEST:     'ad:request',
  AD_SHOWN:       'ad:shown',
  AD_DISMISSED:   'ad:dismissed',
  AD_REWARDED:    'ad:rewarded',
  PERF_DEGRADE:   'perf:degrade',
  PERF_RECOVER:   'perf:recover'
});
