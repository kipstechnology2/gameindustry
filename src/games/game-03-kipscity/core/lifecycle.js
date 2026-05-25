/**
 * Lifecycle utilities.
 *
 * Provides a hierarchical disposable container so the game can guarantee
 * full teardown when the hub navigates away — every subsystem registers
 * its disposable here, and destroy() calls them in reverse order.
 */

/** Safely invoke an optional async method on an object. */
export async function safeCall(obj, method, ...args) {
  if (!obj || typeof obj[method] !== 'function') return undefined;
  try {
    return await obj[method](...args);
  } catch (e) {
    console.error(`[lifecycle] ${method}() threw`, e);
    return undefined;
  }
}

/**
 * A composable disposable host.
 * Children are disposed in reverse-registration order (LIFO) for correctness.
 */
export class Disposables {
  constructor() {
    /** @type {Array<{kind:'fn'|'obj', payload:any}>} */
    this._stack = [];
    this._disposed = false;
  }

  /** Register a teardown function. */
  add(fnOrObj) {
    if (this._disposed) {
      // Disposing a child after the host is dead — run immediately
      this._runOne({ kind: typeof fnOrObj === 'function' ? 'fn' : 'obj', payload: fnOrObj });
      return fnOrObj;
    }
    const kind = typeof fnOrObj === 'function' ? 'fn' : 'obj';
    this._stack.push({ kind, payload: fnOrObj });
    return fnOrObj;
  }

  async dispose() {
    if (this._disposed) return;
    this._disposed = true;
    while (this._stack.length) {
      const item = this._stack.pop();
      // eslint-disable-next-line no-await-in-loop
      await this._runOne(item);
    }
  }

  async _runOne(item) {
    if (item.kind === 'fn') {
      try { await item.payload(); } catch (e) { console.error('[lifecycle] dispose fn threw', e); }
    } else {
      await safeCall(item.payload, 'dispose');
      await safeCall(item.payload, 'destroy');
    }
  }
}
