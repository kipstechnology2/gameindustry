/**
 * Service Locator — lightweight DI container.
 *
 * Used to hand modules their dependencies without cyclic imports.
 * Game.js registers the canonical instances; subsystems read them via
 * services.get('...').
 */

export class ServiceLocator {
  constructor() {
    this._map = new Map();
  }

  register(name, instance) {
    if (this._map.has(name)) {
      console.warn(`[services] re-registering "${name}"`);
    }
    this._map.set(name, instance);
    return instance;
  }

  get(name) {
    const s = this._map.get(name);
    if (s === undefined) throw new Error(`[services] not registered: ${name}`);
    return s;
  }

  tryGet(name) {
    return this._map.get(name);
  }

  has(name) {
    return this._map.has(name);
  }

  unregister(name) {
    this._map.delete(name);
  }

  clear() {
    this._map.clear();
  }
}
