/**
 * Save Manager — auto-save + manual slots.
 *
 * Dual-write strategy:
 *   - Primary: localStorage (fast reads)
 *   - Mirror: IndexedDB (durable, survives cache-clear)
 *
 * On load, the most-recent snapshot wins (compared by updatedAt timestamp).
 *
 * Slots:
 *   - 'autosave' — written every 30s + on visibility change + on critical events
 *   - 'slot1', 'slot2', 'slot3' — manual (future UI in settings)
 *
 * Schema versioning:
 *   - Each snapshot carries a `schemaVersion` integer.
 *   - On load, migrations are applied in sequence if snapshot is older.
 */

const SCHEMA_VERSION = 1;
const LS_PREFIX = 'kc:save:';
const IDB_NAME = 'kipscity-saves';
const IDB_STORE = 'snapshots';

export class SaveManager {
  /**
   * @param {object} deps
   * @param {() => object} deps.serialize   — returns the full game state snapshot
   * @param {(snap: object) => void} deps.deserialize — restores game state from snapshot
   */
  constructor({ serialize, deserialize }) {
    this._serialize = serialize;
    this._deserialize = deserialize;
    this._db = null;
    this._autoTimer = null;
    this._disposed = false;
  }

  async init() {
    try {
      this._db = await openIDB();
    } catch (e) {
      console.warn('[save] IndexedDB unavailable', e);
    }
  }

  /** Write a snapshot to the given slot (both LS + IDB). */
  async save(slotId = 'autosave') {
    if (this._disposed) return;
    const snapshot = this._serialize();
    if (!snapshot) return;
    snapshot._meta = {
      slot: slotId,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: Date.now(),
    };

    // LocalStorage
    try {
      localStorage.setItem(LS_PREFIX + slotId, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('[save] LS write failed', e);
    }

    // IndexedDB mirror
    if (this._db) {
      try {
        const tx = this._db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(snapshot, slotId);
      } catch (e) {
        console.warn('[save] IDB write failed', e);
      }
    }
  }

  /** Load the most recent snapshot from a slot. Tries LS first, falls back to IDB. */
  async load(slotId = 'autosave') {
    let lsSnap = null;
    let idbSnap = null;

    // LocalStorage
    try {
      const raw = localStorage.getItem(LS_PREFIX + slotId);
      if (raw) lsSnap = JSON.parse(raw);
    } catch {}

    // IndexedDB
    if (this._db) {
      try {
        idbSnap = await new Promise((resolve, reject) => {
          const tx = this._db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).get(slotId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } catch {}
    }

    // Pick the newest
    const snap = pickNewest(lsSnap, idbSnap);
    if (!snap) return false;

    // Migrate if needed
    migrate(snap);

    this._deserialize(snap);
    return true;
  }

  /** Start the auto-save interval (every 30s). */
  startAutoSave(intervalMs = 30_000) {
    this.stopAutoSave();
    this._autoTimer = setInterval(() => this.save('autosave'), intervalMs);
  }

  stopAutoSave() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
  }

  /** Check whether a slot has data. */
  hasSlot(slotId = 'autosave') {
    return !!localStorage.getItem(LS_PREFIX + slotId);
  }

  /** Delete a slot from both stores. */
  async deleteSlot(slotId) {
    try { localStorage.removeItem(LS_PREFIX + slotId); } catch {}
    if (this._db) {
      try {
        const tx = this._db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(slotId);
      } catch {}
    }
  }

  destroy() {
    this._disposed = true;
    this.stopAutoSave();
    if (this._db) { this._db.close(); this._db = null; }
  }
}

// ============================================================
// IndexedDB helpers
// ============================================================

function openIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no IDB')); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function pickNewest(a, b) {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return (a._meta?.updatedAt || 0) >= (b._meta?.updatedAt || 0) ? a : b;
}

/** Apply schema migrations in sequence. Mutates `snap` in-place. */
function migrate(snap) {
  const v = snap._meta?.schemaVersion || 0;
  // Currently v1 — no migrations yet. Future:
  // if (v < 2) { ... transform ... snap._meta.schemaVersion = 2; }
}
