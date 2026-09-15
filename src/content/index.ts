import { BattleStateTracker, tracker } from '../battle/BattleStateTracker';
import { initUI } from './ui-injector';
import '../styles/content.css';

const rooms = new Map<string, BattleStateTracker>();
function publish(): void {
  const room = location.pathname.slice(1) || location.hash.slice(1);
  const current = rooms.get(room);
  if (current) tracker.state = current.state;
  else tracker.reset();
  tracker.dispatchEvent(new CustomEvent('stateChange', { detail: structuredClone(tracker.state) }));
}
document.addEventListener('ps-ext-line', (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (!detail || typeof detail.room !== 'string' || typeof detail.line !== 'string') return;
  if (!/^battle-gen9randombattle-\d+$/.test(detail.room) || detail.line.length > 100000) return;
  let roomTracker = rooms.get(detail.room);
  if (!roomTracker) {
    // Bound memory even when a client keeps completed rooms around.
    if (rooms.size >= 20) rooms.delete(rooms.keys().next().value!);
    roomTracker = new BattleStateTracker();
    rooms.set(detail.room, roomTracker);
  }
  try { roomTracker.processLine(detail.line); } catch { return; }
  if (detail.line === '|deinit') rooms.delete(detail.room);
  publish();
});
window.addEventListener('popstate', publish);
window.addEventListener('hashchange', publish);
// Showdown uses pushState for room tabs, which does not emit popstate.
let lastPath = location.pathname + location.hash;
setInterval(() => {
  const path = location.pathname + location.hash;
  if (path !== lastPath) { lastPath = path; publish(); }
}, 250);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI, { once: true });
else initUI();
