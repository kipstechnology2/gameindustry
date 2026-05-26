/**
 * Economy System — coins, income, expenses.
 *
 * Simplistic for Batch 3n:
 *   - Player earns coins from quest rewards + daily passive income.
 *   - Coins spent on furniture placement (future: build-mode charges).
 *   - Bills deducted every 7 days (maintenance cost for owned furniture).
 *
 * All state lives in a single EconomyState object that the save manager
 * serializes. No ECS component needed — there's only one economy per game.
 */

export class EconomySystem {
  constructor() {
    this.state = {
      coins: 100,          // starting coins
      totalEarned: 0,
      totalSpent: 0,
      lastBillDay: 0,
      billAmount: 10,      // flat per 7 days
    };
    this._listeners = [];
  }

  get coins() { return this.state.coins; }

  /** Add coins (quest reward, daily income, etc.). */
  earn(amount, reason = '') {
    if (amount <= 0) return;
    this.state.coins += amount;
    this.state.totalEarned += amount;
    this._notify({ type: 'earn', amount, reason, balance: this.state.coins });
  }

  /** Spend coins. Returns true if affordable, false otherwise. */
  spend(amount, reason = '') {
    if (amount <= 0) return true;
    if (this.state.coins < amount) return false;
    this.state.coins -= amount;
    this.state.totalSpent += amount;
    this._notify({ type: 'spend', amount, reason, balance: this.state.coins });
    return true;
  }

  canAfford(amount) {
    return this.state.coins >= amount;
  }

  /** Called once per in-game day by the game loop. Handles passive income + bills. */
  onDayChange(day) {
    // Daily passive income: +5 coins per day just for playing
    this.earn(5, 'daily');

    // Bills every 7 days
    if (day - this.state.lastBillDay >= 7) {
      this.state.lastBillDay = day;
      if (this.state.coins >= this.state.billAmount) {
        this.spend(this.state.billAmount, 'bills');
      }
      // If can't afford, no penalty (yet). Future: happiness penalty.
    }
  }

  /** Subscribe to economy events. */
  on(fn) {
    this._listeners.push(fn);
    return () => {
      const idx = this._listeners.indexOf(fn);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  _notify(payload) {
    for (const fn of this._listeners) {
      try { fn(payload); } catch (e) { console.error('[economy]', e); }
    }
  }

  // Save/load
  serialize() { return { ...this.state }; }
  deserialize(data) {
    if (!data) return;
    Object.assign(this.state, data);
  }
}
