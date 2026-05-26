/**
 * Workshop UI — bottom drawer + top-right toggle button.
 *
 * Layout:
 *   - Top right: "Workshop" pill button (toggles build mode on/off)
 *   - When ACTIVE: bottom drawer slides up with furniture cards
 *     and an "Exit" button. Tap a card → BuildMode.pickKind(kind).
 *   - During PLACING: instructional banner at top-center; tap canvas to
 *     place, tap drawer 'Cancel' to back out.
 *
 * Visual is glassy + cinematic to match the rest of the HUD.
 */

import { OBJECT_CATALOG } from '../interactions/affordance-catalog.js';
import { BUILD_STATE } from '../building/build-mode.js';

const BTN_STYLE = `
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  right: calc(228px + 12px);   /* left of needs panel/HUD */
  padding: 8px 14px;
  font-family: ui-rounded, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(140deg, rgba(20, 28, 50, 0.78), rgba(8, 14, 30, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  z-index: 7;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 120ms ease, background 200ms ease, border-color 200ms ease;
`;

const DRAWER_STYLE = `
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  left: 12px;
  right: 12px;
  padding: 12px;
  background: linear-gradient(140deg, rgba(20, 28, 50, 0.86), rgba(8, 14, 30, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  z-index: 7;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  pointer-events: auto;
  user-select: none;
  display: none;
  transform: translateY(20px);
  opacity: 0;
  transition: transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 220ms ease;
`;

const CARDS_STYLE = `
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
`;

const CARD_STYLE = `
  flex: 0 0 96px;
  height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #fff;
  font-family: ui-rounded, system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, transform 100ms ease, border-color 160ms ease;
`;

const HEADER_ROW_STYLE = `
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-family: ui-rounded, system-ui, sans-serif;
`;

const BANNER_STYLE = `
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 64px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 14px;
  background: rgba(108, 140, 255, 0.18);
  color: #cdd5e3;
  border: 1px solid rgba(108, 140, 255, 0.4);
  border-radius: 10px;
  font-family: ui-rounded, system-ui, sans-serif;
  font-size: 11px;
  pointer-events: none;
  z-index: 8;
  white-space: nowrap;
`;

/**
 * Furniture kinds the player may place. (Subset of OBJECT_CATALOG; the
 * starter map already has fountains, those aren't "furniture".)
 */
const PLACEABLE_KINDS = ['bed', 'bench', 'food_cart', 'fountain'];

const ICONS = {
  bed: '🛏️', bench: '🪑', food_cart: '🍱', fountain: '💧',
};

export class WorkshopUI {
  constructor({ buildMode }) {
    this.buildMode = buildMode;
    this.btn = null;
    this.drawer = null;
    this.banner = null;
    this._unsubscribe = null;
  }

  mount(parent) {
    if (this.btn) return;

    // Toggle button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kc-workshop-btn';
    btn.style.cssText = BTN_STYLE;
    btn.textContent = '🛠 Workshop';
    btn.addEventListener('click', () => this.buildMode.toggle());
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(20,28,50,0.92)');
    btn.addEventListener('mouseleave', () => this._refreshBtn());
    parent.appendChild(btn);
    this.btn = btn;

    // Drawer
    const drawer = document.createElement('div');
    drawer.className = 'kc-workshop-drawer';
    drawer.style.cssText = DRAWER_STYLE;

    const header = document.createElement('div');
    header.style.cssText = HEADER_ROW_STYLE;

    const title = document.createElement('strong');
    title.textContent = 'Workshop';
    title.style.cssText = 'font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:#fff;';

    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.textContent = '✕ Exit';
    exitBtn.style.cssText = `
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #cdd5e3;
      background: rgba(255, 84, 112, 0.16);
      border: 1px solid rgba(255, 84, 112, 0.3);
      border-radius: 8px;
      cursor: pointer;
    `;
    exitBtn.addEventListener('click', () => this.buildMode.exit());

    header.appendChild(title);
    header.appendChild(exitBtn);
    drawer.appendChild(header);

    const cards = document.createElement('div');
    cards.style.cssText = CARDS_STYLE;
    for (const kind of PLACEABLE_KINDS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.style.cssText = CARD_STYLE;
      card.dataset.kind = kind;
      card.innerHTML = `
        <span style="font-size:32px;line-height:1;">${ICONS[kind] || '·'}</span>
        <span>${OBJECT_CATALOG[kind]?.label || kind}</span>
      `;
      card.addEventListener('mouseenter', () => {
        card.style.background = 'rgba(255,255,255,0.12)';
        card.style.borderColor = 'rgba(108, 140, 255, 0.4)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.background = 'rgba(255,255,255,0.06)';
        card.style.borderColor = 'rgba(255,255,255,0.08)';
        this._refreshCardSelection();
      });
      card.addEventListener('click', () => this.buildMode.pickKind(kind));
      cards.appendChild(card);
    }
    drawer.appendChild(cards);
    parent.appendChild(drawer);
    this.drawer = drawer;

    // Banner (only visible during PLACING)
    const banner = document.createElement('div');
    banner.style.cssText = BANNER_STYLE;
    banner.style.display = 'none';
    parent.appendChild(banner);
    this.banner = banner;

    this._unsubscribe = this.buildMode.onStateChange(() => this._refresh());
    this._refresh();
  }

  _refresh() {
    this._refreshBtn();
    this._refreshDrawer();
    this._refreshBanner();
    this._refreshCardSelection();
  }

  _refreshBtn() {
    if (!this.btn) return;
    if (this.buildMode.isActive()) {
      this.btn.style.background = 'linear-gradient(140deg, rgba(108,140,255,0.4), rgba(176,107,255,0.4))';
      this.btn.style.borderColor = 'rgba(108, 140, 255, 0.6)';
      this.btn.textContent = '🛠 Workshop · ON';
    } else {
      this.btn.style.background = 'linear-gradient(140deg, rgba(20, 28, 50, 0.78), rgba(8, 14, 30, 0.86))';
      this.btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      this.btn.textContent = '🛠 Workshop';
    }
  }

  _refreshDrawer() {
    if (!this.drawer) return;
    if (this.buildMode.isActive()) {
      this.drawer.style.display = 'block';
      requestAnimationFrame(() => {
        this.drawer.style.opacity = '1';
        this.drawer.style.transform = 'translateY(0)';
      });
    } else {
      this.drawer.style.opacity = '0';
      this.drawer.style.transform = 'translateY(20px)';
      setTimeout(() => {
        if (!this.buildMode.isActive()) this.drawer.style.display = 'none';
      }, 240);
    }
  }

  _refreshBanner() {
    if (!this.banner) return;
    if (this.buildMode.state === BUILD_STATE.PLACING && this.buildMode.heldKind) {
      const kind = this.buildMode.heldKind;
      this.banner.textContent =
        `Placing ${OBJECT_CATALOG[kind]?.label || kind} — tap a tile to place, tap drawer to cancel`;
      this.banner.style.display = 'block';
    } else if (this.buildMode.state === BUILD_STATE.SELECTING) {
      this.banner.textContent = 'Pick a piece from the drawer below — or tap an item to remove it';
      this.banner.style.display = 'block';
    } else {
      this.banner.style.display = 'none';
    }
  }

  _refreshCardSelection() {
    if (!this.drawer) return;
    const cards = this.drawer.querySelectorAll('[data-kind]');
    for (const card of cards) {
      const isHeld = this.buildMode.heldKind === card.dataset.kind;
      card.style.background = isHeld
        ? 'linear-gradient(140deg, rgba(108,140,255,0.4), rgba(176,107,255,0.4))'
        : 'rgba(255,255,255,0.06)';
      card.style.borderColor = isHeld
        ? 'rgba(108, 140, 255, 0.6)'
        : 'rgba(255,255,255,0.08)';
    }
  }

  destroy() {
    if (this._unsubscribe) this._unsubscribe();
    this.btn?.remove();
    this.drawer?.remove();
    this.banner?.remove();
    this.btn = null;
    this.drawer = null;
    this.banner = null;
  }
}
