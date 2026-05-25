/**
 * Library View — flat grid of every game, with category filter chips.
 * Useful as a search/discovery alternative to the rails on Home.
 */

import { el, applyI18n } from '../utils/dom.js';
import { t } from '../locales/loader.js';
import { lazyImages } from './lazy-image.js';
import { bus, EVT } from '../utils/events.js';

export default function libraryView({ mount, router }) {
  const catalog = window.__GS?.catalog?.() || { categories: [], games: [] };
  const teardowns = [];
  let activeFilter = 'all';

  // ---- header + filters ----
  const header = el('header', { class: 'library__header' }, [
    el('h1', { class: 'view__title', 'data-i18n': 'nav.library' }, ['Library']),
    el('p', { class: 'view__subtitle' }, [
      `${(catalog.games || []).length} ${t('nav.library')}`
    ])
  ]);

  const filtersWrap = el('div', { class: 'library__filters', role: 'tablist' });
  const grid = el('div', { class: 'library__grid' });

  const renderGrid = () => {
    grid.innerHTML = '';
    const list = (catalog.games || []).filter((g) =>
      activeFilter === 'all' ? true : (g.categories || []).includes(activeFilter)
    );
    if (!list.length) {
      grid.appendChild(el('p', { class: 'view__hint' }, [t('error.loadCatalog')]));
      return;
    }
    list.forEach((game) => grid.appendChild(buildGridCard(game, router)));
    lazyImages.scan(grid);
  };

  const filters = [{ id: 'all', i18nKey: 'nav.library' }, ...(catalog.categories || [])];
  filters.forEach((cat) => {
    const btn = el('button', {
      type: 'button',
      class: 'chip chip--filter',
      'data-ripple': '',
      role: 'tab',
      'aria-selected': cat.id === activeFilter ? 'true' : 'false',
      'data-i18n': cat.i18nKey
    }, [t(cat.i18nKey) || cat.id]);
    btn.addEventListener('click', () => {
      activeFilter = cat.id;
      filtersWrap.querySelectorAll('[role="tab"]').forEach((b) =>
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false')
      );
      renderGrid();
    });
    filtersWrap.appendChild(btn);
  });

  const root = el('section', { class: 'view view--library' }, [header, filtersWrap, grid]);
  mount.appendChild(root);
  applyI18n(root, t);
  renderGrid();

  const offLang = bus.on(EVT.LANG_CHANGE, () => applyI18n(root, t));
  teardowns.push(offLang);

  return {
    async unmount() {
      teardowns.forEach((fn) => { try { fn(); } catch (_) {} });
    }
  };
}

function buildGridCard(game, router) {
  const card = el('article', {
    class: 'game-card game-card--grid',
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
        el('span', { class: 'game-card__play' }, ['▶'])
      ])
    ]),
    el('div', { class: 'game-card__meta' }, [
      el('h3', { class: 'game-card__title' }, [game.title]),
      el('p', { class: 'game-card__sub' }, [game.description || ''])
    ])
  ]);
  const open = () => router.navigate(`/game/${game.id}`);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return card;
}
