/**
 * Game Detail View — cinematic landing for one game.
 *
 * Shows banner, title, description, tags, controls, current highscore.
 * Primary action is "Play Now" -> /play/:id (Batch 5 implements the player).
 *
 * Highscore in Batch 4 will come from save-manager. For now we read a stub from
 * localStorage so the UI feels real.
 */

import { el, applyI18n } from '../utils/dom.js';
import { t } from '../locales/loader.js';
import { lazyImages } from './lazy-image.js';
import { Device } from '../utils/device.js';
import { bus, EVT } from '../utils/events.js';
import { APP_CONFIG } from '../config/app.config.js';

export default function gameDetailView({ mount, params, router }) {
  const catalog = window.__GS?.catalog?.() || { games: [] };
  const game = (catalog.games || []).find((g) => g.id === params.id);
  const teardowns = [];

  if (!game) {
    const node = el('section', { class: 'view view--detail' }, [
      el('p', { class: 'view__hint' }, [t('error.loadGame')]),
      backButton(router)
    ]);
    mount.appendChild(node);
    return { unmount() {} };
  }

  // ---------- HERO ----------
  const banner = el('img', {
    class: 'detail__banner',
    alt: game.title,
    'data-src': game.banner || game.thumbnail || ''
  });

  const playBtn = el('button', {
    class: 'btn btn--primary detail__cta',
    'data-ripple': '',
    type: 'button',
    'data-i18n': 'common.playNow'
  }, ['Play Now']);
  playBtn.addEventListener('click', () => router.navigate(`/play/${game.id}`));

  // ---------- META ----------
  const tags = (game.tags || []).map((tag) =>
    el('li', { class: 'chip' }, [tag])
  );
  const categories = (game.categories || []).map((c) =>
    el('li', { class: 'chip chip--accent' }, [t('category.' + c) || c])
  );

  const controlsLabel = Device.formFactor === 'desktop'
    ? (t('common.settings'), 'Keyboard')
    : (game.controls?.mobile === 'joystick' ? 'Joystick' : 'D-Pad');

  const highscore = readLocalHighscore(game.id);

  const meta = el('div', { class: 'detail__meta' }, [
    el('div', { class: 'detail__stat' }, [
      el('span', { class: 'detail__stat-label', 'data-i18n': 'common.highscore' }, ['Highscore']),
      el('strong', { class: 'detail__stat-value', 'data-hs': '' }, [String(highscore)])
    ]),
    el('div', { class: 'detail__stat' }, [
      el('span', { class: 'detail__stat-label', 'data-i18n': 'detail.controls' }, ['Controls']),
      el('strong', { class: 'detail__stat-value' }, [controlsLabel])
    ]),
    el('div', { class: 'detail__stat' }, [
      el('span', { class: 'detail__stat-label', 'data-i18n': 'detail.category' }, ['Category']),
      el('ul', { class: 'chips' }, categories)
    ])
  ]);

  // ---------- DESCRIPTION ----------
  const desc = el('section', { class: 'detail__about' }, [
    el('h2', { 'data-i18n': 'detail.description' }, ['About this game']),
    el('p', {}, [game.description || ''])
  ]);

  const tagsSection = tags.length
    ? el('section', { class: 'detail__tags' }, [
        el('h2', { 'data-i18n': 'detail.tags' }, ['Tags']),
        el('ul', { class: 'chips' }, tags)
      ])
    : null;

  // ---------- DETAIL BANNER AD SLOT ----------
  const adSlot = el('aside', {
    class: 'ad-slot ad-slot--banner',
    'data-ad-slot': APP_CONFIG.ads.slots.detailBanner,
    'aria-label': 'Advertisement'
  });

  // ---------- ROOT ----------
  const root = el('section', { class: 'view view--detail' }, [
    el('div', { class: 'detail__hero' }, [
      banner,
      el('div', { class: 'detail__hero-scrim' }),
      el('div', { class: 'detail__hero-content' }, [
        backButton(router),
        el('h1', { class: 'detail__title' }, [game.title]),
        el('p', { class: 'detail__subtitle' }, [game.description || '']),
        el('div', { class: 'detail__actions' }, [playBtn])
      ])
    ]),
    meta,
    desc,
    tagsSection,
    adSlot
  ].filter(Boolean));

  mount.appendChild(root);
  applyI18n(root, t);
  lazyImages.scan(root);

  // Update highscore live if event fires
  const offHs = bus.on(EVT.HIGHSCORE_UPDATE, ({ gameId, score }) => {
    if (gameId !== game.id) return;
    const hsEl = root.querySelector('[data-hs]');
    if (hsEl) hsEl.textContent = String(score);
  });
  teardowns.push(offHs);

  const offLang = bus.on(EVT.LANG_CHANGE, () => applyI18n(root, t));
  teardowns.push(offLang);

  return {
    async unmount() {
      teardowns.forEach((fn) => { try { fn(); } catch (_) {} });
    }
  };
}

// ----- helpers -----
function backButton(router) {
  const btn = el('button', {
    type: 'button',
    class: 'btn btn--ghost detail__back',
    'data-ripple': '',
    'aria-label': 'Back'
  }, ['‹ ', el('span', { 'data-i18n': 'common.back' }, ['Back'])]);
  btn.addEventListener('click', () => router.navigate('/'));
  return btn;
}

function readLocalHighscore(gameId) {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storage.keyPrefix + 'hs:' + gameId);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}
