/**
 * Hash-based SPA Router.
 * Why hash? Works on any static host + offline PWA without server rewrites.
 *
 * Usage:
 *   const router = new Router(mountEl, [
 *     { path: '/',          view: () => import('./home.js') },
 *     { path: '/game/:id',  view: () => import('./game-detail.js') }
 *   ]);
 *   router.start();
 *   router.navigate('/game/snake');
 */

import { bus, EVT } from '../utils/events.js';
import { clear } from '../utils/dom.js';
import { runEnter, runExit } from './transitions.js';

export class Router {
  constructor(mountEl, routes = []) {
    this.mount = mountEl;
    this.routes = routes.map(compileRoute);
    this.current = null;        // { route, params, view, controller }
    this._onHashChange = this._onHashChange.bind(this);
  }

  start() {
    window.addEventListener('hashchange', this._onHashChange);
    // Resolve initial route
    if (!location.hash || location.hash === '#') location.hash = '#/';
    else this._onHashChange();
  }

  stop() {
    window.removeEventListener('hashchange', this._onHashChange);
  }

  navigate(path, { replace = false } = {}) {
    const target = '#' + normalize(path);
    if (replace) location.replace(target);
    else if (location.hash !== target) location.hash = target;
    else this._onHashChange(); // re-trigger if same hash
  }

  back() { history.back(); }

  /** Internal */
  async _onHashChange() {
    const path = normalize(location.hash.replace(/^#/, '') || '/');
    const match = this._match(path);
    if (!match) {
      console.warn('[router] no route for', path);
      this.navigate('/', { replace: true });
      return;
    }

    const { route, params } = match;

    // Tear down previous view
    if (this.current?.controller?.unmount) {
      try { await this.current.controller.unmount(); } catch (e) { console.warn(e); }
    }
    await runExit(this.mount);
    clear(this.mount);

    // Load + mount new view (lazy import enables code splitting)
    let mod;
    try {
      mod = await route.view();
    } catch (e) {
      console.error('[router] view load failed', e);
      this.mount.innerHTML = '<p class="view__hint">Could not load this view.</p>';
      return;
    }

    const factory = mod.default || mod.view || mod;
    const controller = (typeof factory === 'function')
      ? await factory({ mount: this.mount, params, router: this })
      : factory;

    this.current = { route, params, controller };
    runEnter(this.mount);

    // Update nav active state
    document.querySelectorAll('[data-route]').forEach((a) => {
      a.removeAttribute('aria-current');
    });
    const activeNav = document.querySelector(`[data-route="${route.name}"]`);
    if (activeNav) activeNav.setAttribute('aria-current', 'page');

    bus.emit(EVT.ROUTE_CHANGE, { path, route: route.name, params });
  }

  _match(path) {
    for (const route of this.routes) {
      const m = path.match(route.regex);
      if (m) {
        const params = {};
        route.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { route, params };
      }
    }
    return null;
  }
}

// ---------- helpers ----------
function normalize(p) {
  if (!p.startsWith('/')) p = '/' + p;
  // collapse double slashes, remove trailing slash (except root)
  p = p.replace(/\/+/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function compileRoute(r) {
  const keys = [];
  const regex = new RegExp(
    '^' + r.path.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'
  );
  return {
    name: r.name || r.path.replace(/^\//, '').split('/')[0] || 'home',
    path: r.path,
    view: r.view,
    regex,
    keys
  };
}
