/**
 * Play View — stub for the immersive game player.
 * Batch 5 implements: full-screen canvas, virtual gamepad overlay, pause menu,
 * dynamic game loader. For now, this view shows a placeholder and a working
 * Back-to-detail control so navigation flows are testable end-to-end.
 */

import { el, applyI18n } from '../utils/dom.js';
import { t } from '../locales/loader.js';

export default function playView({ mount, params, router }) {
  const catalog = window.__GS?.catalog?.() || { games: [] };
  const game = (catalog.games || []).find((g) => g.id === params.id);

  const back = el('button', {
    type: 'button',
    class: 'btn btn--ghost',
    'data-ripple': '',
    'data-i18n': 'common.back'
  }, ['Back']);
  back.addEventListener('click', () => router.navigate(game ? `/game/${game.id}` : '/'));

  const root = el('section', { class: 'view view--play' }, [
    el('div', { class: 'play__placeholder' }, [
      el('h1', { class: 'view__title' }, [game?.title || 'Game']),
      el('p', { class: 'view__subtitle' }, [
        'The immersive game player (canvas + virtual gamepad + pause menu) ships in Batch 5.'
      ]),
      back
    ])
  ]);

  mount.appendChild(root);
  applyI18n(root, t);

  return { unmount() {} };
}
