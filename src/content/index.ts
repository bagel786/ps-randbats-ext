import { BattleStateTracker, tracker } from '../battle/BattleStateTracker';
import { initUI } from './ui-injector';
import '../styles/content.css';

// Match Showdown's public AND hidden room IDs. Do not drop the suffix.
// Mirrored in page-bridge.ts; sharing a runtime import would split the bundles.
const BATTLE_ROOM = /^battle-gen9randombattle-\d+(?:-[a-z0-9]+pw)?$/;
const rooms = new Map<string, BattleStateTracker>();
function publish(): void {
  const path = location.pathname.replace(/^\/|\/$/g, '');
  const hash = location.hash.replace(/^#\/?/, '');
  const room = BATTLE_ROOM.test(hash) ? hash : path;
  const current = rooms.get(room);
  if (current) tracker.state = current.state;
  else tracker.reset();
  tracker.dispatchEvent(new CustomEvent('stateChange', { detail: structuredClone(tracker.state) }));
}
document.addEventListener('ps-ext-line', (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (!detail || typeof detail.room !== 'string' || typeof detail.line !== 'string') return;
  if (!BATTLE_ROOM.test(detail.room) || detail.line.length > 100000) return;
  // A privacy change can rename an existing room without replaying a request.
  // Move its state under the new full ID before normal line processing.
  const parts = detail.line.split('|');
  if (parts[1] === 'noinit' && parts[2] === 'rename') {
    const nextRoom = parts[3];
    const previous = rooms.get(detail.room);
    if (BATTLE_ROOM.test(nextRoom) && previous) {
      rooms.set(nextRoom, previous);
      rooms.delete(detail.room);
    }
    publish();
    return;
  }
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
