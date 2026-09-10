// Runs in MAIN world (injected via <script> textContent from content.ts).
//
// IMPORTANT: this file must remain free of `import` statements. Vite emits
// it as a self-contained ES module today, but we install it as an inline
// classic script — any future `import` would throw at runtime. If shared
// code is needed, inline it here or build this entry as IIFE.
//
// Intercepts all WebSocket traffic to PS, parses each payload, and relays
// each protocol line to the isolated-world content script via a CustomEvent.

console.log('[PSExt/page-bridge] LOADED');

const EVENT_NAME = 'ps-ext-line';

function log(...args: unknown[]): void {
  console.log('[PSExt/page-bridge]', ...args);
}

function relayLine(line: string): void {
  if (!line) return;
  document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: line }));
}

function processPayload(payload: string): void {
  for (const line of payload.split('\n')) {
    if (line) relayLine(line);
  }
}

function processSockJSFrame(data: string): void {
  if (!data) return;
  const type = data[0];
  try {
    if (type === 'a') {
      const arr = JSON.parse(data.slice(1));
      if (Array.isArray(arr)) {
        for (const msg of arr) if (typeof msg === 'string') processPayload(msg);
      }
    } else if (type === 'm') {
      const msg = JSON.parse(data.slice(1));
      if (typeof msg === 'string') processPayload(msg);
    } else if (type === '|' || type === '>') {
      // Already a raw protocol line
      processPayload(data);
    }
  } catch {
    processPayload(data);
  }
}

let intercepted = 0;

try {
  const OriginalWebSocket = window.WebSocket;

  const handler: ProxyHandler<typeof WebSocket> = {
    construct(target, args, newTarget) {
      log('WebSocket created:', args[0]);
      const ws = Reflect.construct(target, args, newTarget) as WebSocket;
      ws.addEventListener('message', (e: MessageEvent) => {
        if (typeof e.data !== 'string') return;
        intercepted++;
        if (intercepted <= 3) log('intercepted #' + intercepted, e.data.slice(0, 100));
        processSockJSFrame(e.data);
      });
      return ws;
    },
  };

  (window as unknown as { WebSocket: typeof WebSocket }).WebSocket = new Proxy(
    OriginalWebSocket,
    handler,
  );

  log('WebSocket patched via Proxy');
} catch (err) {
  console.error('[PSExt/page-bridge] failed to patch WebSocket:', err);
}
