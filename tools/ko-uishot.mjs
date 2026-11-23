import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const root = resolve('dist');
const types = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.css':'text/css' };
const server = createServer((req,res)=>{ let f=normalize(join(root,decodeURIComponent(new URL(req.url,'http://x').pathname))); if(existsSync(f)&&statSync(f).isDirectory()) f=join(f,'index.html'); if(!f.startsWith(root)||!existsSync(f)) return void res.writeHead(404).end(); res.writeHead(200,{'Content-Type':types[extname(f)]??'application/octet-stream'}); createReadStream(f).pipe(res); });
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const scene = process.argv[2] || 'aurora';
const url = `http://127.0.0.1:${server.address().port}/?scene=${scene}&quality=low`;
const browser = await chromium.launch({ headless:true, args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport:{width:1280,height:720} });
page.on('console', m => { if (m.type()==='error') console.log('CONSOLE-ERR:', m.text().slice(0,200)); });
page.on('pageerror', e => console.log('PAGE-ERR:', String(e).slice(0,300)));
await page.goto(url, { waitUntil:'domcontentloaded' });
await page.waitForTimeout(1500);
await page.screenshot({ path:`shots/ko-${scene}-loading.png`, timeout: 30000 });
console.log('loading shot ok');
try {
  await page.waitForFunction(() => window.__block && window.__block.ready, null, { timeout: 240000, polling: 1000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path:`shots/ko-${scene}-hint.png`, timeout: 60000 });
  console.log('hint shot ok');
} catch (e) { console.log('ready wait failed:', e.message.split('\n')[0]); }
await browser.close(); server.close();
