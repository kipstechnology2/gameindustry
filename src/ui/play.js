/**
 * Play View — Fullscreen Game Host.
 *
 * Responsibilities:
 *   1. Look up the requested game in the catalog (by route param `id`).
 *   2. Create a fullscreen overlay container (independent of the hub's
 *      max-width main column).
 *   3. Show a cinematic loading state while the game module lazy-loads.
 *   4. Lazy-import the game's `entry` module and call its default factory
 *      with `{ mount, params, locale }`.
 *   5. Call `controller.start()` and wire up `Exit` button.
 *   6. On unmount: call `controller.destroy()` for clean teardown.
 *
 * Game contract (every game module exports default factory):
 *   factory({ mount, params, locale }) → {
 *     start(), pause(), resume(), stop(), destroy()
 *   }
 *
 * The hub never assumes more than this — games can be vanilla JS, Phaser,
 * or any other approach as long as they implement the contract.
 */

import { el, applyI18n } from '../utils/dom.js';
import { t, getLocale } from '../locales/loader.js';

export default async function playView({ mount, params, router }) {
  const catalog = window.__GS?.catalog?.() || { games: [] };
  const game = (catalog.games || []).find((g) => g.id === params.id);

  // ---------- Game not found ----------
  if (!game) {
    const root = el('section', { class: 'view view--play-error' }, [
      el('h1', {}, ['Game not found']),
      el('p', {}, ['The requested game is not in the catalog.']),
      buildBackBtn(() => router.navigate('/'), 'Back to Library'),
    ]);
    mount.appendChild(root);
    return { unmount() { root.remove(); } };
  }

  // ---------- Fullscreen container ----------
  const root = el('div', { class: 'kc-play-root', role: 'application', 'aria-label': game.title });

  const gameContainer = el('div', { class: 'kc-play-game' });
  root.appendChild(gameContainer);

  // ---------- Exit button ----------
  const exitBtn = el('button', {
    type: 'button',
    class: 'kc-play-exit',
    'data-ripple': '',
    'aria-label': 'Exit game',
  }, ['‹ ', el('span', { 'data-i18n': 'common.exit' }, [t('common.exit') || 'Exit'])]);
  exitBtn.addEventListener('click', () => router.navigate(`/game/${game.id}`));
  root.appendChild(exitBtn);
  applyI18n(exitBtn, t);

  // ---------- Loading overlay ----------
  const loading = el('div', { class: 'kc-play-loading' }, [
    el('div', { class: 'kc-play-loading__spinner', 'aria-hidden': 'true' }),
    el('h2', { class: 'kc-play-loading__title' }, [game.title]),
    el('p', { class: 'kc-play-loading__sub' }, [
      t('common.loading') || 'Loading…',
    ]),
  ]);
  root.appendChild(loading);

  mount.appendChild(root);

  // ---------- Lazy-load + mount the game ----------
  let controller = null;
  let unmounted = false;

  try {
    if (!game.entry) throw new Error('Game manifest missing "entry"');

    // The dynamic import path comes from the catalog, which is JSON we control —
    // safe. The /* @vite-ignore */ keeps build tools from trying to inline-bundle.
    const mod = await import(/* @vite-ignore */ game.entry);
    if (unmounted) return earlyExit();

    const factory = mod.default || mod.create || mod.createGame;
    if (typeof factory !== 'function') {
      throw new Error('Game module must export a default factory function');
    }

    controller = factory({
      mount: gameContainer,
      params,
      locale: getLocale(),
    });

    if (controller && typeof controller.start === 'function') {
      await controller.start();
    }

    // Smooth fade-out of the loading overlay
    loading.dataset.fading = '1';
    setTimeout(() => loading.remove(), 450);
  } catch (e) {
    console.error('[play] failed to load game', e);
    loading.innerHTML = '';
    loading.appendChild(el('h2', { class: 'kc-play-loading__title' }, [game.title]));
    loading.appendChild(el('p', { class: 'kc-play-loading__error' }, [
      `Could not load this game.`, el('br', {}, []), String(e?.message || e),
    ]));
    loading.appendChild(buildBackBtn(() => router.navigate(`/game/${game.id}`), 'Back'));
  }

  function earlyExit() {
    return { unmount() { root.remove(); } };
  }

  return {
    async unmount() {
      unmounted = true;
      if (controller && typeof controller.destroy === 'function') {
        try { await controller.destroy(); } catch (e) { console.warn('[play] destroy threw', e); }
      }
      controller = null;
      root.remove();
    },
  };
}

function buildBackBtn(onClick, label = 'Back') {
  const btn = el('button', {
    type: 'button',
    class: 'btn btn--ghost',
    'data-ripple': '',
    style: 'margin-top: 1rem;',
  }, [label]);
  btn.addEventListener('click', onClick);
  return btn;
}
