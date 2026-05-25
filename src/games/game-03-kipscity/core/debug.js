/**
 * Debug Overlay — F3 / "?" to toggle.
 *
 * Renders a small key:value panel over the canvas. All updates are buffered
 * and flushed at most once per frame to avoid layout thrash.
 */

const STYLE = `
  position: absolute;
  top: 8px;
  left: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: #00ff95;
  background: rgba(0, 0, 0, 0.72);
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 149, 0.25);
  pointer-events: none;
  z-index: 1000;
  display: none;
  white-space: pre;
  text-shadow: 0 0 6px rgba(0, 255, 149, 0.3);
  user-select: none;
  max-width: 320px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
`;

export class DebugOverlay {
  constructor() {
    this.visible = false;
    this.el = null;
    this._metrics = new Map();
    this._dirty = false;
    this._onKey = null;
  }

  mount(parent) {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'kc-debug';
    this.el.style.cssText = STYLE;
    parent.appendChild(this.el);

    this._onKey = (e) => {
      // F3 or "?" toggles overlay
      if (e.key === 'F3' || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        this.toggle();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  show() {
    this.visible = true;
    if (this.el) this.el.style.display = 'block';
    this._dirty = true;
  }

  hide() {
    this.visible = false;
    if (this.el) this.el.style.display = 'none';
  }

  toggle() {
    if (this.visible) this.hide(); else this.show();
  }

  set(key, value) {
    if (this._metrics.get(key) === value) return;
    this._metrics.set(key, value);
    this._dirty = true;
  }

  /** Call once per frame; only flushes DOM if changed and visible. */
  render() {
    if (!this.visible || !this._dirty || !this.el) return;
    let txt = '';
    for (const [k, v] of this._metrics) txt += `${k}: ${v}\n`;
    this.el.textContent = txt.trimEnd();
    this._dirty = false;
  }

  destroy() {
    if (this._onKey) {
      window.removeEventListener('keydown', this._onKey);
      this._onKey = null;
    }
    this.el?.remove();
    this.el = null;
    this._metrics.clear();
  }
}
