import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.POKE_ARENA_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.POKE_ARENA_PLAYWRIGHT_MODULE).href : 'playwright');
import { readFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=process.env.POKE_ARENA_TEST_URL || 'http://127.0.0.1:4173/';
const ids=['arena-frame','hand','energy-bar','settings-dialog'];
const rects=page=>page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,[r.x,r.y,r.width,r.height]]})),ids);
const equal=(a,b)=>{for(const id of ids)for(let i=0;i<4;i++)assert.ok(Math.abs(a[id][i]-b[id][i])<0.1,`${id} moved: ${a[id]} / ${b[id]}`)};
try {
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>!!window.pokeArenaPerf);assert.equal(await page.locator('.perf-access').count(),0);assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report()),null);
 await page.goto(url+'?perf=1');await page.waitForFunction(()=>!!window.pokeArenaPerf);await page.waitForFunction(()=>!document.querySelector('#start-btn').disabled);assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report()),null);
 assert.equal(await page.locator('.perf-toggle').getAttribute('aria-expanded'),'false');
 await page.locator('#start-btn').click();
 const networks=[];page.on('request',r=>networks.push(new URL(r.url()).pathname));
 for(const v of [{width:390,height:844},{width:768,height:1024},{width:1440,height:980}]){
   await page.setViewportSize(v);await page.evaluate(()=>new Promise(requestAnimationFrame));const before=await rects(page);
   await page.locator('.perf-toggle').click();equal(before,await rects(page));assert.equal(await page.locator('.perf-toggle').getAttribute('aria-expanded'),'true');
   if(v.width===390){await page.locator('.perf-start').click();assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report().active),true);equal(before,await rects(page));
     await page.locator('.perf-close').click();assert.equal(await page.evaluate(()=>document.activeElement.className),'perf-toggle');equal(before,await rects(page));
     await page.locator('.perf-toggle').click();await page.locator('.perf-stop').click();const data=JSON.parse(await page.locator('.perf-output').inputValue());assert.equal(data.active,false);assert.equal(data.stopReason,'manual');assert.equal(data.limitMs,60000);assert.equal(data.capacity,8192);equal(before,await rects(page));
     await page.locator('.perf-output').focus();assert.equal(await page.evaluate(()=>{const t=document.querySelector('.perf-output');return t.selectionStart===0&&t.selectionEnd===t.value.length}),true);
     const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.perf-save').click()]);assert.equal(JSON.parse(await readFile(await download.path(),'utf8')).schema,1);
     if(process.env.POKE_ARENA_PERF_SCREENSHOT)await page.screenshot({path:process.env.POKE_ARENA_PERF_SCREENSHOT});
   }
   await page.evaluate(()=>document.querySelector('#settings-dialog').showModal());const settingsOpen=await rects(page);await page.evaluate(()=>document.querySelector('#settings-dialog').close());await page.locator('.perf-close').click();equal(before,await rects(page));await page.evaluate(()=>document.querySelector('#settings-dialog').showModal());equal(settingsOpen,await rects(page));await page.evaluate(()=>document.querySelector('#settings-dialog').close());
 }
  await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.__perfTimeout=null;const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>ms===60000?(window.__perfTimeout=fn,123456):original(fn,ms,...args)});
 await page.locator('.perf-toggle').click();await page.locator('.perf-start').click();
 await page.evaluate(async()=>{const {onlinePerf}=await import('/perf.js?v=1');onlinePerf.started-=60001;window.__perfTimeout()});
 assert.equal(await page.locator('.perf-status').textContent(),'Finalizado (60 segundos)');assert.equal(JSON.parse(await page.locator('.perf-output').inputValue()).stopReason,'limit');
 await page.locator('.perf-close').click();
 assert.deepEqual(networks.filter(p=>p!=='/favicon.svg'&&!p.startsWith('/assets/fonts/')),[]);await page.evaluate(()=>document.querySelector('#settings-dialog').showModal());const settingsBefore=await rects(page);assert.ok(settingsBefore['settings-dialog'][2]>0);await page.evaluate(()=>document.querySelector('#settings-dialog').close());await page.locator('.perf-toggle').click();await page.evaluate(()=>document.querySelector('#settings-dialog').showModal());equal(settingsBefore,await rects(page));await page.evaluate(()=>document.querySelector('#settings-dialog').close());await page.locator('.perf-close').click();
 const hit=await page.evaluate(()=>{let seen=false;const canvas=document.querySelector('#arena');if(!canvas)return 'missing';canvas.addEventListener('pointerdown',()=>seen=true,{once:true});const r=canvas.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.bottom-40);return {canvas:el===canvas,tag:el?.tagName}});assert.notEqual(hit,'missing');assert.equal(hit.canvas,true);await page.locator('#arena').click({position:{x:150,y:500}});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({defaultOff:true,queryDefaultOff:true,manualStartStop:true,downloadJSON:true,selectableFallback:true,layout:['390x844','768x1024','1440x980'],reducedMotion:'reduce',newRequestsDuringPanelExceptStaticAssets:0,automaticLimit:true,canvasHit:true,settingsOpened:true,errors}));
 await page.close();
} finally {await browser.close()}
