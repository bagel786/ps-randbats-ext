// MAIN-world bridge, bundled without imports. Only battle protocol is relayed;
// lobby/chat/account traffic is never forwarded or logged.
const EVENT_NAME = 'ps-ext-line';
// Hidden rooms append a capability suffix, even when the other player chose
// privacy. Keep the full ID; it identifies this room, not another battle.
// Mirrored in index.ts so both manifest entries stay standalone bundles.
const BATTLE_ROOM = /^battle-gen9randombattle-\d+(?:-[a-z0-9]+pw)?$/;
function processPayload(payload: string): void {
  let room = '';
  for (const line of payload.split('\n')) {
    if (line.startsWith('>')) { room = line.slice(1).trim(); continue; }
    if (!BATTLE_ROOM.test(room)) continue;
    if (!/^\|(?:request|init|win|tie|deinit|noinit|switch|drag|replace|move|cant|faint|turn|detailschange|-)/.test(line)) continue;
    document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { room, line } }));
  }
}
function processFrame(data: string): void {
  try {
    if (data[0] === 'a') {
      const messages: unknown = JSON.parse(data.slice(1));
      if (Array.isArray(messages)) for (const message of messages) if (typeof message === 'string') processPayload(message);
    } else if (data[0] === 'm') {
      const message: unknown = JSON.parse(data.slice(1));
      if (typeof message === 'string') processPayload(message);
    } else if (data.startsWith('>')) processPayload(data);
  } catch { /* Ignore malformed frames. */ }
}
const OriginalWebSocket = window.WebSocket;
window.WebSocket = new Proxy(OriginalWebSocket, {
  construct(target, args, newTarget) {
    const ws = Reflect.construct(target, args, newTarget) as WebSocket;
    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof event.data === 'string') processFrame(event.data);
    });
    return ws;
  },
});
