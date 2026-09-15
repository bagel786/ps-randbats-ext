import {chromium} from '@playwright/test';
import {readFileSync, mkdirSync} from 'node:fs';
const browser=await chromium.launch();
const page=await browser.newPage();
for(const size of [16,48,128]) {
  await page.setViewportSize({width:size,height:size});
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${readFileSync('public/icons/mark.svg','utf8')}`);
  await page.screenshot({path:`public/icons/icon${size}.png`,omitBackground:true});
}
mkdirSync('artifacts/store', {recursive:true});
await page.setViewportSize({width:440,height:280});
await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#245dc1}body{display:grid;place-items:center}svg{width:210px;height:210px}</style>${readFileSync('public/icons/mark.svg','utf8')}`);
await page.screenshot({path:'artifacts/store/promo-440x280.png'});
await browser.close();
