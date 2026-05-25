/**
 * Settings View — language, audio toggle, data clear.
 * Full audio + storage wiring lands in Batch 4; this gives a working language
 * switcher and stubs the rest with safe local-only operations.
 */

import { el, applyI18n } from '../utils/dom.js';
import { t, getSupportedLocales, getLocale, setLocale } from '../locales/loader.js';
import { APP_CONFIG } from '../config/app.config.js';
import { bus, EVT } from '../utils/events.js';

const SETTINGS_KEY = APP_CONFIG.storage.settingsKey;

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}
function writeSettings(patch) {
  const cur = readSettings();
  const next = { ...cur, ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export default function settingsView({ mount }) {
  const teardowns = [];
  const settings = readSettings();

  const langSelect = el('select', { class: 'lang-select' });
  const labels = { en: 'English', id: 'Bahasa Indonesia', es: 'Español', fr: 'Français', ja: '日本語' };
  for (const code of getSupportedLocales()) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = labels[code] || code.toUpperCase();
    if (code === getLocale()) opt.selected = true;
    langSelect.appendChild(opt);
  }
  langSelect.addEventListener('change', async (e) => {
    await setLocale(e.target.value);
  });

  const soundToggle = el('input', {
    type: 'checkbox',
    class: 'switch',
    id: 'set-sound'
  });
  soundToggle.checked = settings.sound !== false;
  soundToggle.addEventListener('change', () => {
    writeSettings({ sound: soundToggle.checked });
  });

  const clearBtn = el('button', {
    type: 'button',
    class: 'btn btn--danger',
    'data-ripple': '',
    'data-i18n': 'settings.clearCache'
  }, ['Clear cache']);
  clearBtn.addEventListener('click', async () => {
    if (!confirm(t('settings.clearCache') + '?')) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      alert(t('common.ok'));
    } catch (e) {
      console.warn(e);
    }
  });

  const root = el('section', { class: 'view view--settings' }, [
    el('h1', { class: 'view__title', 'data-i18n': 'nav.settings' }, ['Settings']),
    el('div', { class: 'settings__group' }, [
      el('h2', { 'data-i18n': 'settings.language' }, ['Language']),
      langSelect
    ]),
    el('div', { class: 'settings__group' }, [
      el('h2', { 'data-i18n': 'settings.audio' }, ['Audio']),
      el('label', { class: 'settings__row', for: 'set-sound' }, [
        el('span', { 'data-i18n': 'common.soundOn' }, ['Sound On']),
        soundToggle
      ])
    ]),
    el('div', { class: 'settings__group' }, [
      el('h2', { 'data-i18n': 'settings.data' }, ['Data']),
      clearBtn
    ]),
    el('p', { class: 'settings__version' }, [
      t('settings.version'), ': ', el('code', {}, ['1.0.0'])
    ])
  ]);

  mount.appendChild(root);
  applyI18n(root, t);

  const offLang = bus.on(EVT.LANG_CHANGE, () => applyI18n(root, t));
  teardowns.push(offLang);

  return {
    async unmount() { teardowns.forEach((fn) => { try { fn(); } catch (_) {} }); }
  };
}
