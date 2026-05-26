# Kips Game Studio

Premium HTML5 Game Portal by **KIPS TECHNOLOGY** — a vanilla-JS, modular, **offline-first PWA** that hosts unlimited HTML5 games under one cinematic, mobile-first hub. Built to ship to **Web (AdSense)**, **Google Play (TWA / Capacitor)**, and **App Store (Capacitor)**.

> Status: scaffolding in progress. See "Roadmap" below.

---

## Highlights

- **100% pure client-side**: no React, no Vue, no Firebase, no backend. HTML5 + CSS3 + Vanilla JS modules.
- **Offline-first PWA** with full Service Worker (cache-first shell, stale-while-revalidate game assets, network-first registry).
- **Plug-and-play game architecture**: drop a folder under `src/games/` and add an entry to `games.json`. The engine picks it up.
- **Adaptive performance**: rAF + delta-time game loop, frame-budget controller, object pooling, automatic cache eviction. Targets 60 FPS, survives 4GB-RAM Android.
- **Smart i18n**: auto-detect from device, manual dropdown, EN fallback, modular JSON dictionaries.
- **Monetization-ready**: AdSense (web) + AdMob bridge (mobile wrapper) with banner / interstitial / rewarded slots.
- **SEO-friendly**: semantic HTML, full meta + OG + Twitter cards + JSON-LD.

---

## Project Structure

```
/
├── index.html                  # SPA shell
├── manifest.webmanifest        # PWA manifest
├── service-worker.js           # Offline cache strategies
├── games.json                  # Game registry (plug-and-play)
├── pages/                      # Privacy / Terms / Contact (Batch 8)
├── styles/                     # Design tokens + per-feature CSS
├── src/
│   ├── main.js                 # Bootloader (async, non-blocking)
│   ├── config/                 # App + ads config
│   ├── engine/                 # Game loop, frame-budget, pools, renderer (Batch 3)
│   ├── physics/                # AABB collisions (Batch 3)
│   ├── audio/                  # WebAudio manager (Batch 4)
│   ├── ui/                     # Router, catalog, transitions, ripple (Batch 2)
│   ├── virtual-pad/            # D-Pad / joystick / buttons (Batch 5)
│   ├── games/                  # One folder per game (plug-and-play)
│   ├── storage/                # LocalStorage + IndexedDB save (Batch 4)
│   ├── ads-manager/            # AdSense + AdMob bridge (Batch 6)
│   ├── locales/                # Modular JSON dictionaries
│   └── utils/                  # Tiny helpers (DOM, events, device)
├── vendor/                     # Local fallback for any 3rd-party game lib
└── assets/                     # Icons, fonts, images
```

---

## Adding a New Game (Plug-and-Play)

1. Create `src/games/game-NN-yourname/` containing at minimum:
   - `game.js` — entry module that exports `default { init(ctx), start(), pause(), resume(), stop(), destroy() }`
   - `thumb.svg` — catalog thumbnail
   - `banner.svg` — detail banner
2. Append an entry to `games.json`:
   ```json
   {
     "id": "game-NN-yourname",
     "title": "Your Game Title",
     "categories": ["arcade"],
     "thumbnail": "/src/games/game-NN-yourname/thumb.svg",
     "entry": "/src/games/game-NN-yourname/game.js",
     "version": "1.0.0",
     "controls": { "mobile": "dpad", "desktop": "keyboard" }
   }
   ```
3. That's it. The engine will lazy-load it the first time the user clicks **Play**.

---

## Running Locally

This is a static site. Any HTTP server works:

```bash
# Python 3
python3 -m http.server 8080

# Node (npx serve)
npx serve -p 8080 .
```

Then visit `http://localhost:8080`.

> Service Worker requires HTTPS in production (or `localhost` in dev). It will gracefully no-op on `file://`.

---

## Mobile Packaging

- **Android (Play Store)** — wrap with [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/) or Capacitor.
- **iOS (App Store)** — wrap with [Capacitor](https://capacitorjs.com/).
- Replace AdSense calls with AdMob via the bridge in `src/ads-manager/admob-bridge.js` (Batch 6).

---

## Roadmap (Batch Progress)

- [x] **Batch 1** — Foundation: PWA shell, manifest, SW, bootloader, i18n, design tokens
- [ ] **Batch 2** — SPA router, Netflix-style catalog, game detail, ripple, transitions
- [ ] **Batch 3** — Engine core, frame-budget, object pool, physics
- [ ] **Batch 4** — Audio, storage (LocalStorage + IndexedDB), settings
- [ ] **Batch 5** — Virtual pad, pause overlay, immersive game player
- [ ] **Batch 6** — Ads manager (AdSense + AdMob bridge)
- [ ] **Batch 7** — Sample games (Snake, Block Jump)
- [ ] **Batch 8** — Privacy / Terms / Contact, robots.txt, sitemap, more locales

---

## License & Branding

© 2026 KIPS TECHNOLOGY. All rights reserved.
Contact: `support@kipstechnology.com`
