/**
 * Service Worker — Games Studio 2026
 * Strategies:
 *   - App shell (HTML/CSS/JS/icons)  -> cache-first (precache)
 *   - games.json (catalog registry)  -> network-first, fallback cache
 *   - Game assets (src/games/**)     -> stale-while-revalidate (offline-ready)
 *   - Image/audio/font runtime       -> cache-first with size cap
 *
 * Versioning: bump SW_VERSION to invalidate old caches on deploy.
 */

const SW_VERSION = 'v1.1.0';
const SHELL_CACHE  = `gs2026-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `gs2026-runtime-${SW_VERSION}`;
const GAMES_CACHE   = `gs2026-games-${SW_VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/styles/variables.css',
  '/styles/reset.css',
  '/styles/layout.css',
  '/styles/catalog.css',
  '/styles/player.css',
  '/styles/animations.css',
  '/src/main.js',
  '/src/config/app.config.js',
  '/src/utils/device.js',
  '/src/utils/dom.js',
  '/src/utils/events.js',
  '/src/locales/loader.js',
  '/src/locales/en.json',
  '/src/ui/router.js',
  '/src/ui/transitions.js',
  '/src/ui/ripple.js',
  '/src/ui/lazy-image.js',
  '/src/ui/kinetic-scroll.js',
  '/src/ui/catalog.js',
  '/src/ui/game-detail.js',
  '/src/ui/library.js',
  '/src/ui/settings.js',
  '/src/ui/play.js',
  '/games.json'
];

const MAX_RUNTIME_ENTRIES = 80;

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] precache failed', err))
  );
});

// ---------- ACTIVATE: clean old caches ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, RUNTIME_CACHE, GAMES_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (e.g. ad networks) -> let the network handle it
  if (url.origin !== self.location.origin) return;

  // 1) Catalog registry -> network-first
  if (url.pathname.endsWith('/games.json')) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // 2) Game folders -> stale-while-revalidate
  if (url.pathname.startsWith('/src/games/')) {
    event.respondWith(staleWhileRevalidate(req, GAMES_CACHE));
    return;
  }

  // 3) HTML navigations -> network-first with shell fallback (offline support)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 4) Default: cache-first with runtime cap
  event.respondWith(cacheFirst(req, RUNTIME_CACHE));
});

// ---------- STRATEGIES ----------
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      cache.put(req, res.clone());
      trimCache(cacheName, MAX_RUNTIME_ENTRIES);
    }
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ---------- MAINTENANCE ----------
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Drop oldest entries
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

// Allow page to trigger immediate update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
