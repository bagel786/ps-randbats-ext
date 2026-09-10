import { tracker } from '../battle/BattleStateTracker';
import { initUI } from './ui-injector';
import '../styles/content.css';

const LOG = '[PSExt/content]';
console.log(LOG, 'LOADED');

// page-bridge.js is injected into MAIN world by the manifest as a separate
// content_script with world:"MAIN" and run_at:"document_start". This avoids
// PS's strict CSP, which blocks script.textContent inline injection.

let lineCount = 0;
document.addEventListener('ps-ext-line', (e: Event) => {
  const line = (e as CustomEvent<string>).detail;
  lineCount++;
  if (lineCount <= 5 || lineCount % 50 === 0) {
    console.log(LOG, `line #${lineCount}:`, line.slice(0, 120));
  }
  try {
    tracker.processLine(line);
  } catch (err) {
    console.error(LOG, 'tracker error on line:', line, err);
  }
});

function ready(): void {
  console.log(LOG, 'initializing UI');
  initUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ready, { once: true });
} else {
  ready();
}
