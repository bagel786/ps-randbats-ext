import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidebarPanel } from '../ui/SidebarPanel/SidebarPanel';
import { MoveTooltip } from '../ui/MoveTooltip/MoveTooltip';
import { calcDamage } from '../battle/DamageCalcBridge';
import { tracker } from '../battle/BattleStateTracker';
import { CalcResult } from '../battle/types';

// ── Sidebar (fixed-position floating panel) ───────────────────────────────

let sidebarRoot: ReactDOM.Root | null = null;

function injectSidebar(): void {
  if (document.getElementById('ps-ext-sidebar-root')) return;
  const container = document.createElement('div');
  container.id = 'ps-ext-sidebar-root';
  document.body.appendChild(container);
  sidebarRoot = ReactDOM.createRoot(container);
  sidebarRoot.render(React.createElement(SidebarPanel));
}

// ── Tooltip ───────────────────────────────────────────────────────────────

let tooltipContainer: HTMLDivElement | null = null;
let tooltipRoot: ReactDOM.Root | null = null;

function getTooltipRoot(): ReactDOM.Root {
  if (!tooltipContainer) {
    tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'ps-ext-tooltip-root';
    document.body.appendChild(tooltipContainer);
    tooltipRoot = ReactDOM.createRoot(tooltipContainer);
  }
  return tooltipRoot!;
}

function getMoveNameFromButton(btn: HTMLElement): string | null {
  // PS uses <button name="chooseMove" data-move="..."> or similar
  const dataMove = btn.getAttribute('data-move');
  if (dataMove) return dataMove;

  // Fallback: only trust an explicit move-name child node. textContent on the
  // whole button includes BP/PP digits which the calc would choke on.
  const strong = btn.querySelector('strong, .movename');
  if (strong?.textContent) return strong.textContent.trim();

  return null;
}

function showTooltip(moveName: string, rect: DOMRect): void {
  let result: CalcResult | null = null;
  try {
    result = calcDamage(tracker.state, moveName);
  } catch {
    // Some moves (status, multi-hit edge cases) can fail
  }
  getTooltipRoot().render(React.createElement(MoveTooltip, { moveName, result, anchorRect: rect }));
}

function hideTooltip(): void {
  tooltipRoot?.render(null);
  currentBtn?.removeAttribute('aria-describedby');
}

const MOVE_BTN_SELECTOR = 'button[name="chooseMove"], button.movebutton, .movemenu button';

function findMoveBtn(el: EventTarget | null): HTMLElement | null {
  if (!el || !(el instanceof Element)) return null;
  return el.closest<HTMLElement>(MOVE_BTN_SELECTOR);
}

let currentBtn: HTMLElement | null = null;
let listenersAttached = false;

function attachMoveHoverListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  document.addEventListener('focusin', e => {
    const btn = findMoveBtn(e.target);
    if (!btn) return;
    currentBtn = btn;
    const name = getMoveNameFromButton(btn);
    if (name) { btn.setAttribute('aria-describedby', 'ps-ext-tooltip'); showTooltip(name, btn.getBoundingClientRect()); }
  });
  document.addEventListener('focusout', () => { hideTooltip(); currentBtn = null; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideTooltip(); currentBtn = null; } });
  tracker.addEventListener('stateChange', () => {
    if (!currentBtn?.isConnected || !tracker.state.opponentActive) { hideTooltip(); currentBtn = null; return; }
    const name = getMoveNameFromButton(currentBtn);
    if (name) showTooltip(name, currentBtn.getBoundingClientRect());
  });
  window.addEventListener('resize', () => { hideTooltip(); currentBtn = null; });
  document.addEventListener('scroll', () => { hideTooltip(); currentBtn = null; }, true);
  document.addEventListener(
    'mouseover',
    (e) => {
      const btn = findMoveBtn(e.target);
      if (!btn || btn === currentBtn) return;
      currentBtn = btn;
      const moveName = getMoveNameFromButton(btn);
      if (moveName) showTooltip(moveName, btn.getBoundingClientRect());
    },
    true,
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      const fromBtn = findMoveBtn(e.target);
      if (!fromBtn) return;
      // relatedTarget = where the cursor went next. If it's still inside the
      // same button, ignore — moving between child elements within the button.
      const toBtn = findMoveBtn((e as MouseEvent).relatedTarget);
      if (toBtn === fromBtn) return;
      // Truly left this button.
      currentBtn = null;
      hideTooltip();
    },
    true,
  );

  // Belt-and-braces: if cursor leaves the document entirely
  document.addEventListener('mouseleave', () => {
    currentBtn = null;
    hideTooltip();
  });

  // Hide tooltip when a move is clicked — PS replaces the move buttons after
  // selection so mouseout never fires on them.
  document.addEventListener(
    'click',
    (e) => {
      const btn = findMoveBtn(e.target);
      if (btn) {
        currentBtn = null;
        hideTooltip();
      }
    },
    true,
  );
}

export function initUI(): void {
  injectSidebar();
  attachMoveHoverListeners();
}
