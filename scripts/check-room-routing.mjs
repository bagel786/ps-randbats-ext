// Test both built manifest entries together, through actual bridge frame parsing.
// All room IDs and battle data here are synthetic; never paste a private URL.
import {chromium, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://play.pokemonshowdown.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><button name="chooseMove" data-move="Rock Blast">Rock Blast</button>'}));
  const hidden='battle-gen9randombattle-123-syntheticroomtokenpw';
  await page.goto('https://play.pokemonshowdown.com/'+hidden);
  await page.evaluate(()=>{window.WebSocket=class extends EventTarget {};});
  await page.addScriptTag({content:readFileSync('dist/page-bridge.js','utf8')});
  await page.addScriptTag({content:readFileSync('dist/content.js','utf8')});
  await page.addStyleTag({content:readFileSync('dist/content.css','utf8')});
  await page.evaluate(()=>{window.testSocket=new WebSocket('wss://synthetic.invalid');});
  const frame=async(payload)=>page.evaluate(payload=>window.testSocket.dispatchEvent(new MessageEvent('message',{data:'a'+JSON.stringify([payload])})),payload);
  const request='|request|'+JSON.stringify({side:{id:'p2',pokemon:[{ident:'p2: Cloyster',details:'Cloyster, L80, M',condition:'69/211',active:true,ability:'skilllink',baseAbility:'skilllink',item:'',moves:['rockblast','shellsmash','iciclespear']}]}});
  await frame('>'+hidden+'\n|init|battle\n|switch|p1a: Darkrai|Darkrai, L77|100/100\n|switch|p2a: Cloyster|Cloyster, L80, M|211/211\n'+request+'\n|-boost|p2a: Cloyster|atk|2\n|-boost|p2a: Cloyster|spa|2\n|-boost|p2a: Cloyster|spe|2\n|turn|2');
  await expect(page.getByRole('button',{name:/Battle notes/})).toContainText('Darkrai');
  await page.getByRole('button',{name:'Rock Blast',exact:true}).hover();
  await expect(page.getByRole('tooltip')).toContainText('+2 Atk');
  await expect(page.getByRole('tooltip')).not.toContainText('unavailable');
  // The same room through a hash route must keep working.
  await page.evaluate(room=>history.pushState({},'','/#'+room),hidden);
  await expect(page.getByRole('button',{name:/Battle notes/})).toContainText('Darkrai');
  // Rename hidden -> public without a new request. State must migrate intact.
  const publicRoom='battle-gen9randombattle-123';
  await frame(`>${hidden}\n|noinit|rename|${publicRoom}|Test battle`);
  await page.evaluate(room=>history.pushState({},'','/'+room),publicRoom);
  await expect(page.getByRole('button',{name:/Battle notes/})).toContainText('Darkrai');
  await frame(`>${publicRoom}\n|turn|3`);
  await expect(page.getByRole('button',{name:/Battle notes/})).toContainText('Turn 3');
  // Rename in the reverse direction, then confirm cleanup at battle end.
  await frame(`>${publicRoom}\n|noinit|rename|${hidden}|Test battle`);
  await page.evaluate(room=>history.pushState({},'','/'+room),hidden);
  await expect(page.getByRole('button',{name:/Battle notes/})).toContainText('Darkrai');
  await frame(`>${hidden}\n|win|Test opponent`);
  await expect(page.locator('.ps-board')).toHaveCount(0);
  assert.deepEqual(errors,[]);
  console.log('Public/hidden IDs, player 2, pre-request switches, hash routing, both rename directions, move tooltip, and game-end cleanup passed through the built bridge.');
} finally {await browser.close();}
