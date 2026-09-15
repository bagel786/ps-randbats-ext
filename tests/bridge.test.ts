import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
test('bridge isolates supported rooms, handles frames, and excludes private chat', () => {
  const events: {detail:{room:string,line:string}}[]=[];
  class FakeSocket extends EventTarget {}
  const context = vm.createContext({window:{WebSocket:FakeSocket}, document:{dispatchEvent:(e: any)=>events.push(e)},CustomEvent});
  vm.runInContext(transformSync(readFileSync('src/content/page-bridge.ts','utf8'),{loader:'ts'}).code,context);
  const ws = new context.window.WebSocket();
  const payload = '>battle-gen9randombattle-123\n|-boost|p2a: Deer|atk|2\n|c|User|private chat\n>battle-gen9ou-456\n|turn|5';
  ws.dispatchEvent(new MessageEvent('message',{data:'a'+JSON.stringify([payload])}));
  assert.equal(events.length,1);
  assert.equal(events[0].detail.room,'battle-gen9randombattle-123');
  assert.equal(events[0].detail.line,'|-boost|p2a: Deer|atk|2');
  ws.dispatchEvent(new MessageEvent('message',{data:'>battle-gen9randombattle-789\n|turn|7'}));
  assert.equal(events[1].detail.room,'battle-gen9randombattle-789');
  ws.dispatchEvent(new MessageEvent('message',{data:'a[malformed'}));
  assert.equal(events.length,2);
});
