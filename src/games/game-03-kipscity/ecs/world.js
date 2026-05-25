/**
 * ECS World — archetype-based Entity-Component-System.
 *
 * Why archetypes?
 *   Plain "entity has Map<componentName, data>" works but querying for
 *   entities-with-(A,B,C) means iterating all entities. With archetypes we
 *   group entities by exact component-set; queries iterate only matching
 *   archetypes — O(matching entities), not O(total entities).
 *
 * Limits:
 *   - Up to 30 component types per world (uses 32-bit mask, 2 bits reserved).
 *     Plenty for a life-sim (we'll use ~20).
 *
 * Iteration safety:
 *   - Add/remove during iteration is allowed; we snapshot archetypes per
 *     query so live mutations don't break iteration. New entities created
 *     mid-tick are picked up next tick.
 */

const MAX_COMPONENT_TYPES = 30;

export class World {
  constructor() {
    this._nextId = 1;
    /** @type {Set<number>} live entities */
    this.entities = new Set();
    /** @type {Map<string, Map<number, any>>} type → entityId → component */
    this._components = new Map();
    /** @type {Map<string, number>} type → bit */
    this._typeBits = new Map();
    this._nextBit = 0;
    /** @type {Map<number, number>} entityId → archetype mask */
    this._entityMask = new Map();
    /** @type {Map<number, Set<number>>} archetype mask → entityIds */
    this._archetypes = new Map();
    /** @type {Set<number>} entities scheduled for deletion at next sweep */
    this._pendingDestroy = new Set();
  }

  // ---------- entity lifecycle ----------
  createEntity() {
    const id = this._nextId++;
    this.entities.add(id);
    this._entityMask.set(id, 0);
    this._archetypeBucket(0).add(id);
    return id;
  }

  /** Schedules removal; actually purged at sweep() (called by ECS systems frame). */
  destroyEntity(id) {
    if (!this.entities.has(id)) return;
    this._pendingDestroy.add(id);
  }

  hasEntity(id) {
    return this.entities.has(id) && !this._pendingDestroy.has(id);
  }

  /** Remove all pending-destroy entities. Call once per frame after systems run. */
  sweep() {
    if (this._pendingDestroy.size === 0) return 0;
    let count = 0;
    for (const id of this._pendingDestroy) {
      const mask = this._entityMask.get(id);
      if (mask !== undefined) this._archetypes.get(mask)?.delete(id);
      for (const compMap of this._components.values()) compMap.delete(id);
      this._entityMask.delete(id);
      this.entities.delete(id);
      count++;
    }
    this._pendingDestroy.clear();
    return count;
  }

  // ---------- components ----------
  addComponent(id, type, data = {}) {
    if (!this.entities.has(id)) throw new Error(`addComponent: dead entity ${id}`);
    let bit = this._typeBits.get(type);
    if (bit === undefined) {
      if (this._nextBit >= MAX_COMPONENT_TYPES) {
        throw new Error(`Exceeded max ${MAX_COMPONENT_TYPES} component types`);
      }
      bit = 1 << this._nextBit++;
      this._typeBits.set(type, bit);
    }

    let map = this._components.get(type);
    if (!map) { map = new Map(); this._components.set(type, map); }
    map.set(id, data);

    const oldMask = this._entityMask.get(id) || 0;
    const newMask = oldMask | bit;
    if (newMask !== oldMask) {
      this._archetypes.get(oldMask)?.delete(id);
      this._archetypeBucket(newMask).add(id);
      this._entityMask.set(id, newMask);
    }
    return data;
  }

  removeComponent(id, type) {
    const bit = this._typeBits.get(type);
    if (bit === undefined) return;
    const map = this._components.get(type);
    if (!map || !map.has(id)) return;
    map.delete(id);

    const oldMask = this._entityMask.get(id) || 0;
    const newMask = oldMask & ~bit;
    this._archetypes.get(oldMask)?.delete(id);
    this._archetypeBucket(newMask).add(id);
    this._entityMask.set(id, newMask);
  }

  getComponent(id, type) {
    return this._components.get(type)?.get(id);
  }

  hasComponent(id, type) {
    return this._components.get(type)?.has(id) ?? false;
  }

  // ---------- queries ----------
  /**
   * Iterate entities that have ALL given component types.
   * Yields { id, [type1]: data, [type2]: data, ... }.
   * Snapshots matching archetypes so add/remove during iteration is safe.
   */
  *query(types) {
    let required = 0;
    for (const t of types) {
      const bit = this._typeBits.get(t);
      if (bit === undefined) return; // an unknown type means zero matches
      required |= bit;
    }

    // Snapshot list of matching archetype buckets
    const buckets = [];
    for (const [mask, set] of this._archetypes) {
      if ((mask & required) === required && set.size > 0) buckets.push(set);
    }

    for (const bucket of buckets) {
      // Snapshot ids to allow mutation
      const ids = [...bucket];
      for (const id of ids) {
        if (this._pendingDestroy.has(id)) continue;
        const out = { id };
        for (const t of types) out[t] = this._components.get(t).get(id);
        yield out;
      }
    }
  }

  /** Cheap count of entities matching all given types. */
  countMatching(types) {
    let required = 0;
    for (const t of types) {
      const bit = this._typeBits.get(t);
      if (bit === undefined) return 0;
      required |= bit;
    }
    let n = 0;
    for (const [mask, set] of this._archetypes) {
      if ((mask & required) === required) n += set.size;
    }
    return n;
  }

  count() { return this.entities.size; }

  // ---------- internals ----------
  _archetypeBucket(mask) {
    let s = this._archetypes.get(mask);
    if (!s) { s = new Set(); this._archetypes.set(mask, s); }
    return s;
  }

  clear() {
    this._components.clear();
    this._archetypes.clear();
    this._entityMask.clear();
    this.entities.clear();
    this._pendingDestroy.clear();
    this._typeBits.clear();
    this._nextBit = 0;
    this._nextId = 1;
  }
}
