/**
 * Quest Engine — lightweight state machine for adventure objectives.
 *
 * Each quest has:
 *   id        : unique key
 *   title     : displayed string
 *   summary   : short description
 *   trigger   : { day?:number, condition?:(ctx)=>boolean }  // when it appears
 *   steps     : Array<{ id, label, predicate(ctx)→bool }>   // ordered
 *   reward    : optional reward applied on completion (coins/items/relations)
 *
 * Quests are stored in three buckets: locked, active, completed.
 * Steps advance only forward; the predicate is checked each tick.
 *
 * For Batch 3j we ship 5 starter quests of varying flavor:
 *   - Rosa's welcome wave (talk to Rosa)
 *   - Decorate your home (place 3 furniture in build mode)
 *   - Wishing fountain (toss a coin)
 *   - Marketplace mingle (visit both food carts)
 *   - Dawn stroll (be outside between 5–7 AM)
 */

import { C, EMOTION } from '../components/types.js';

export class QuestEngine {
  /**
   * @param {object} deps
   * @param {import('../ecs/world.js').World} deps.world
   * @param {Array<Quest>} deps.questDefinitions
   * @param {() => object} deps.contextProvider — returns {day, time, ...} extras
   */
  constructor({ world, questDefinitions, contextProvider }) {
    this.world = world;
    this.contextProvider = contextProvider || (() => ({}));

    /** @type {Map<string, Quest>} */
    this.locked = new Map();
    this.active = new Map();
    this.completed = new Map();

    /** Per-quest state: { stepIndex, startedAt, completedAt } */
    this.state = new Map();
    this._listeners = [];

    for (const q of questDefinitions) this.locked.set(q.id, q);
  }

  /** Run on the slow track; checks triggers + step predicates. */
  tick(dt) {
    if (dt <= 0) return;
    const ctx = this._buildContext();

    // Promote locked → active when triggers fire
    for (const q of this.locked.values()) {
      if (this._triggerFires(q, ctx)) {
        this.locked.delete(q.id);
        this.active.set(q.id, q);
        this.state.set(q.id, { stepIndex: 0, startedAt: ctx.day, completedAt: null });
        this._notify({ type: 'questStarted', quest: q });
      }
    }

    // Advance active quests
    for (const q of this.active.values()) {
      const s = this.state.get(q.id);
      const step = q.steps[s.stepIndex];
      if (!step) continue;
      if (step.predicate(ctx)) {
        s.stepIndex++;
        this._notify({ type: 'stepComplete', quest: q, stepId: step.id });
        if (s.stepIndex >= q.steps.length) {
          // Done
          this.active.delete(q.id);
          this.completed.set(q.id, q);
          s.completedAt = ctx.day;
          this._notify({ type: 'questComplete', quest: q });
        }
      }
    }
  }

  /** External world events feed flags into ctx via flag(...). */
  flag(name, value = true) {
    if (!this._flags) this._flags = {};
    this._flags[name] = value;
  }

  consumeFlag(name) {
    if (!this._flags) return false;
    const v = !!this._flags[name];
    this._flags[name] = false;
    return v;
  }

  _buildContext() {
    const base = this.contextProvider();
    return {
      ...base,
      world: this.world,
      flag: (name) => this.consumeFlag(name),
      flagPersistent: (name) => !!(this._flags && this._flags[name]),
    };
  }

  _triggerFires(quest, ctx) {
    if (quest.trigger?.day != null && ctx.day < quest.trigger.day) return false;
    if (quest.trigger?.condition && !quest.trigger.condition(ctx)) return false;
    return true;
  }

  /** Subscribe to quest events. */
  on(fn) { this._listeners.push(fn); return () => this._off(fn); }
  _off(fn) {
    const idx = this._listeners.indexOf(fn);
    if (idx >= 0) this._listeners.splice(idx, 1);
  }
  _notify(payload) {
    for (const fn of this._listeners) {
      try { fn(payload); } catch (e) { console.error('[quest]', e); }
    }
  }

  /** Save/load: returns serializable state. */
  serialize() {
    return {
      active:    [...this.active.keys()],
      completed: [...this.completed.keys()],
      state:     [...this.state.entries()],
    };
  }

  deserialize(data) {
    if (!data) return;
    if (Array.isArray(data.active)) {
      for (const id of data.active) {
        const q = this.locked.get(id);
        if (q) {
          this.locked.delete(id);
          this.active.set(id, q);
        }
      }
    }
    if (Array.isArray(data.completed)) {
      for (const id of data.completed) {
        const q = this.locked.get(id);
        if (q) {
          this.locked.delete(id);
          this.completed.set(id, q);
        }
      }
    }
    if (Array.isArray(data.state)) {
      for (const [id, s] of data.state) this.state.set(id, s);
    }
  }
}

/**
 * @typedef {object} Quest
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {{ day?:number, condition?:(ctx:any)=>boolean }} [trigger]
 * @property {Array<{ id:string, label:string, predicate:(ctx:any)=>boolean }>} steps
 * @property {object} [reward]
 */
