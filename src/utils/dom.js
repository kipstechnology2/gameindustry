/**
 * Tiny DOM helpers — no framework, just sugar.
 */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

/** Apply translations to all [data-i18n] descendants of root. */
export function applyI18n(root, t) {
  $$('[data-i18n]', root).forEach((node) => {
    const key = node.getAttribute('data-i18n');
    const value = t(key);
    if (value && value !== key) node.textContent = value;
  });
  $$('[data-i18n-attr]', root).forEach((node) => {
    // Format: "attr:key,attr:key"
    const spec = node.getAttribute('data-i18n-attr') || '';
    spec.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s && s.trim());
      if (attr && key) {
        const value = t(key);
        if (value) node.setAttribute(attr, value);
      }
    });
  });
}

/** rAF-debounced layout-safe operation. */
export function nextFrame(fn) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      fn?.();
      resolve();
    });
  });
}
