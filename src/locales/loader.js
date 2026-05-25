/**
 * Smart Localization Engine.
 * - Auto-detects from navigator
 * - Manual override via setLocale() (persisted in localStorage)
 * - Falls back to English universally
 * - All locale files are JSON in /src/locales/{code}.json
 */

import { APP_CONFIG } from '../config/app.config.js';
import { bus, EVT } from '../utils/events.js';

const STORAGE_KEY = APP_CONFIG.storage.keyPrefix + 'lang';

const state = {
  current: APP_CONFIG.i18n.fallback,
  dict: {},
  fallbackDict: null
};

/** Pick the best supported locale based on user preference + navigator. */
function resolveInitialLocale() {
  // 1) explicit user override
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && APP_CONFIG.i18n.supported.includes(saved)) return saved;
  } catch (_) { /* private mode */ }

  // 2) navigator
  const nav = (navigator.languages || [navigator.language || 'en']).map((l) => l.toLowerCase());
  for (const lang of nav) {
    const exact = APP_CONFIG.i18n.supported.find((s) => s.toLowerCase() === lang);
    if (exact) return exact;
    const base = lang.split('-')[0];
    const partial = APP_CONFIG.i18n.supported.find((s) => s.toLowerCase() === base);
    if (partial) return partial;
  }
  return APP_CONFIG.i18n.fallback;
}

async function fetchDict(code) {
  const res = await fetch(`/src/locales/${code}.json`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Locale "${code}" not found (${res.status})`);
  return res.json();
}

function lookup(dict, key) {
  if (!dict) return undefined;
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key]; // flat key
  // dotted key: nav.home
  return key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict);
}

function format(template, vars) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

/** Public translator. Returns `key` itself if not found (helps spot missing keys). */
export function t(key, vars) {
  const v = lookup(state.dict, key) ?? lookup(state.fallbackDict, key);
  return v != null ? format(v, vars) : key;
}

export function getLocale() {
  return state.current;
}

export function getSupportedLocales() {
  return APP_CONFIG.i18n.supported.slice();
}

export async function setLocale(code) {
  if (!APP_CONFIG.i18n.supported.includes(code)) code = APP_CONFIG.i18n.fallback;
  if (code === state.current && state.dict && Object.keys(state.dict).length) return state.current;

  try {
    state.dict = await fetchDict(code);
  } catch (e) {
    console.warn('[i18n] failed to load', code, '— using fallback');
    state.dict = state.fallbackDict || {};
    code = APP_CONFIG.i18n.fallback;
  }
  state.current = code;
  document.documentElement.lang = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch (_) {}
  bus.emit(EVT.LANG_CHANGE, { locale: code });
  return code;
}

/** Initialize: load fallback (EN) + auto-detected locale. */
export async function initLocales() {
  // fallback always available
  state.fallbackDict = await fetchDict(APP_CONFIG.i18n.fallback);
  const initial = resolveInitialLocale();
  await setLocale(initial);
  return state.current;
}
