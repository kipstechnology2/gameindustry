/**
 * Bootloader — Kips Game Studio (KIPS TECHNOLOGY)
 *
 * Order of operations (NEVER block the main thread):
 *  1. Render shell skeleton (already in HTML).
 *  2. Async: register Service Worker (offline support).
 *  3. Async: load i18n fallback + user locale, apply translations.
 *  4. Async: fetch /games.json (catalog registry).
 *  5. Mount SPA router with lazy-imported views.
 *  6. Heavy game assets are downloaded only when the user clicks "Play".
 */

import { APP_CONFIG } from './config/app.config.js';
import { Device } from './utils/device.js';
import { $, applyI18n, nextFrame } from './utils/dom.js';
import { bus, EVT } from './utils/events.js';
import { initLocales, t, getLocale, getSupportedLocales, setLocale } from './locales/loader.js';
import { Router } from './ui/router.js';
import { installRipple } from './ui/ripple.js';

const PERF_BUDGET_MS = 4000;

const state = {
  catalog: null,
  ready: false,
  router: null
};

/** ---------- 1. Service Worker ---------- */
function registerServiceWorker() {
  if (!APP_CONFIG.features.serviceWorker) return;
  if (!('serviceWorker' in navigator)) return;
  // Defer until after first paint to avoid contending with shell.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((e) => {
      console.warn('[boot] SW registration failed', e);
    });
  });
}

/** ---------- 2. Catalog ---------- */
async function loadCatalog() {
  try {
    const res = await fetch('/games.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.catalog = await res.json();
  } catch (e) {
    console.error('[boot] catalog load failed', e);
    state.catalog = { version: 0, categories: [], games: [] };
  }
  bus.emit(EVT.CATALOG_READY, state.catalog);
}

/** ---------- 3. Language picker (header) ---------- */
function buildLanguagePicker() {
  const sel = $('#lang-select');
  if (!sel) return;
  const labels = {
    en: 'English', id: 'Bahasa Indonesia', es: 'Español', fr: 'Français', ja: '日本語'
  };
  sel.innerHTML = '';
  for (const code of getSupportedLocales()) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = labels[code] || code.toUpperCase();
    if (code === getLocale()) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', async (e) => {
    await setLocale(e.target.value);
    applyI18n(document, t);
  });
}

/** ---------- 4. Router ---------- */
function startRouter() {
  const mount = $('#main');
  if (!mount) return;
  // Clear placeholder shell content
  mount.innerHTML = '';

  state.router = new Router(mount, [
    { name: 'home',     path: '/',           view: () => import('./ui/catalog.js') },
    { name: 'library',  path: '/library',    view: () => import('./ui/library.js') },
    { name: 'settings', path: '/settings',   view: () => import('./ui/settings.js') },
    { name: 'detail',   path: '/game/:id',   view: () => import('./ui/game-detail.js') },
    { name: 'play',     path: '/play/:id',   view: () => import('./ui/play.js') }
  ]);
  state.router.start();
}

/** ---------- 5. Hide splash, reveal app ---------- */
async function revealAppShell() {
  const splash = $('#boot-splash');
  const app = $('#app');
  if (!app) return;
  app.hidden = false;
  await nextFrame();
  if (splash) {
    splash.classList.add('boot-splash--hide');
    setTimeout(() => splash.remove(), 400);
  }
}

/** ---------- Boot sequence ---------- */
async function boot() {
  registerServiceWorker();
  installRipple(document);

  await initLocales();
  applyI18n(document, t);
  buildLanguagePicker();

  await loadCatalog();

  // Expose debug surface BEFORE views mount, so they can read window.__GS.catalog()
  window.__GS = Object.freeze({
    config: APP_CONFIG,
    device: Device,
    catalog: () => state.catalog,
    locale: getLocale,
    setLocale,
    t,
    router: () => state.router,
    bus
  });

  startRouter();

  bus.on(EVT.LANG_CHANGE, () => applyI18n(document, t));

  state.ready = true;
  await revealAppShell();
}

// Hard timeout safety net: if anything stalls, still show the shell
setTimeout(() => {
  if (!state.ready) revealAppShell().catch(() => {});
}, PERF_BUDGET_MS);

boot().catch((e) => {
  console.error('[boot] fatal', e);
  revealAppShell();
});
