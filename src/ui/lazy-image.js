/**
 * Lazy image loader — IntersectionObserver based.
 * Use: <img data-src="/path/to/thumb.svg" alt="…" />
 *      lazyImages.observe(img);  (or scope-wide: lazyImages.scan(rootEl))
 *
 * Falls back to native loading="lazy" when IO is unavailable.
 */

const IO_OPTS = { rootMargin: '300px 0px', threshold: 0.01 };

class LazyImageRegistry {
  constructor() {
    this.io = null;
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this._load(entry.target);
            this.io.unobserve(entry.target);
          }
        }
      }, IO_OPTS);
    }
  }

  observe(img) {
    if (!img || img.dataset.lazyBound === '1') return;
    img.dataset.lazyBound = '1';
    img.classList.add('lazy-img');
    if (!this.io) {
      // Fallback: load immediately, browser handles native lazy
      img.loading = 'lazy';
      this._load(img);
      return;
    }
    this.io.observe(img);
  }

  scan(root = document) {
    root.querySelectorAll('img[data-src]').forEach((img) => this.observe(img));
  }

  _load(img) {
    const src = img.dataset.src;
    if (!src) return;
    const onLoad = () => img.classList.add('is-loaded');
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', () => img.classList.add('is-failed'), { once: true });
    img.src = src;
    img.removeAttribute('data-src');
  }

  destroy() {
    this.io?.disconnect();
    this.io = null;
  }
}

export const lazyImages = new LazyImageRegistry();
