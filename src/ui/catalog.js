/**
 * Catalog View — Netflix-style horizontal rails + featured hero.
 *
 * Reads the in-memory catalog (loaded by main.js into window.__GS.catalog())
 * and renders one rail per category, plus a featured hero at the top.
 *
 * Exports a default factory so the router can lazy-import this module.
 */

import { el, applyI18n } from '../utils/dom.js';
import { t } from '../locales/loader.js';
import { lazyImages } from './lazy-image.js';
import { attachKineticScroll } from './kinetic-scroll.js';
import { bus, EVT } from '../utils/events.js';

export default function catalogView({ mount, router }) {
  const catalog = window.__GS?.catalog?.() || { categories: [], games: [] };
  const teardowns = [];

  // ---------- HERO ----------
  const featured = pickFeatured(catalog);
  const hero = buildHero(featured, router);

  // ---------- RAILS ----------
  const railsWrap = el('div', { class: 'rails' });
  const sortedCategories = (catalog.categories || [])
    .slice()
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  for (const category of sortedCategories) {
    const games = (catalog.games || []).filter((g) => g.categories?.includes(category.id));
    if (!games.length) continue;
    const rail = buildRail(category, games, router);
    railsWrap.appendChild(rail.node);
    teardowns.push(rail.teardown);
  }

  if (!sortedCategories.length || !railsWrap.children.length) {
    railsWrap.appendChild(el('p', { class: 'view__hint' }, [t('error.loadCatalog')]));
  }

  // ---------- MOUNT ----------
  const root = el('section', { class: 'view view--catalog' }, [hero, railsWrap]);
  mount.appendChild(root);
  applyI18n(root, t);
  lazyImages.scan(root);

  // Re-translate on language change while view is mounted
  const offLang = bus.on(EVT.LANG_CHANGE, () => applyI18n(root, t));
  teardowns.push(offLang);

  return {
    async unmount() {
      teardowns.forEach((fn) => { try { fn(); } catch (_) {} });
    }
  };
}

// ============================================================
// HERO
// ============================================================
function pickFeatured(catalog) {
  const featured = (catalog.games || []).filter((g) => g.categories?.includes('featured'));
  return featured[0] || (catalog.games || [])[0] || null;
}

function buildHero(game, router) {
  if (!game) {
    return el('header', { class: 'hero hero--empty' }, [
      el('h1', { class: 'hero__title', 'data-i18n': 'home.title' }, ['Premium HTML5 Games']),
      el('p', { class: 'hero__subtitle', 'data-i18n': 'home.subtitle' }, [
        'Play instantly. No download. Works offline.'
      ])
    ]);
  }
  const img = el('img', {
    class: 'hero__image',
    alt: game.title,
    'data-src': game.banner || game.thumbnail || ''
  });
  const playBtn = el('button', {
    class: 'btn btn--primary hero__cta',
    'data-ripple': '',
    'data-i18n': 'common.playNow',
    type: 'button'
  }, ['Play Now']);
  playBtn.addEventListener('click', () => router.navigate(`/game/${game.id}`));

  const detailBtn = el('button', {
    class: 'btn btn--ghost',
    'data-ripple': '',
    type: 'button'
  }, [t('detail.description') || 'Details']);
  detailBtn.addEventListener('click', () => router.navigate(`/game/${game.id}`));

  return el('header', { class: 'hero' }, [
    el('div', { class: 'hero__media' }, [
      img,
      el('div', { class: 'hero__scrim' })
    ]),
    el('div', { class: 'hero__content' }, [
      el('p', { class: 'hero__eyebrow', 'data-i18n': 'category.featured' }, ['Featured']),
      el('h1', { class: 'hero__title' }, [game.title]),
      el('p', { class: 'hero__subtitle' }, [game.description || '']),
      el('div', { class: 'hero__actions' }, [playBtn, detailBtn])
    ])
  ]);
}

// ============================================================
// RAIL
// ============================================================
function buildRail(category, games, router) {
  const title = el('h2', { class: 'rail__title', 'data-i18n': category.i18nKey }, [
    t(category.i18nKey) || category.id
  ]);

  const track = el('div', { class: 'rail__track', role: 'list' });
  for (const game of games) {
    track.appendChild(buildCard(game, router));
  }

  // Scroll arrow buttons (desktop)
  const left = arrowBtn('‹', () => track.scrollBy({ left: -track.clientWidth * 0.85, behavior: 'smooth' }), 'rail__arrow rail__arrow--left');
  const right = arrowBtn('›', () => track.scrollBy({ left:  track.clientWidth * 0.85, behavior: 'smooth' }), 'rail__arrow rail__arrow--right');

  const node = el('section', { class: 'rail', 'data-category': category.id }, [
    title,
    el('div', { class: 'rail__viewport' }, [left, track, right])
  ]);

  const teardown = attachKineticScroll(track);
  return { node, teardown };
}

function arrowBtn(label, onClick, cls) {
  const b = el('button', {
    type: 'button',
    class: cls,
    'aria-label': label === '‹' ? 'Scroll left' : 'Scroll right'
  }, [label]);
  b.addEventListener('click', onClick);
  return b;
}

// ============================================================
// CARD
// ============================================================
function buildCard(game, router) {
  const card = el('article', {
    class: 'game-card',
    role: 'listitem',
    'data-game-id': game.id,
    'data-ripple': '',
    tabindex: '0',
    'aria-label': game.title
  }, [
    el('div', { class: 'game-card__media' }, [
      el('img', {
        class: 'game-card__thumb',
        alt: game.title,
        'data-src': game.thumbnail || game.banner || ''
      }),
      el('div', { class: 'game-card__overlay' }, [
        el('span', { class: 'game-card__play', 'aria-hidden': 'true' }, ['▶'])
      ])
    ]),
    el('div', { class: 'game-card__meta' }, [
      el('h3', { class: 'game-card__title' }, [game.title]),
      el('p', { class: 'game-card__sub' }, [
        (game.categories || []).slice(0, 2).map((c) => t('category.' + c) || c).join(' • ')
      ])
    ])
  ]);

  const open = () => router.navigate(`/game/${game.id}`);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return card;
}
