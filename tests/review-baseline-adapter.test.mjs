import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runCase} from '../scripts/review-workbench.mjs';
import {beforeNavigate,prepare} from '../tools/review/baseline-adapter.mjs';
const config=JSON.parse(await readFile(new URL('../tools/review/baseline-case.json',import.meta.url),'utf8'));
test('adapter rejects observations and seed it cannot provide',async()=>{
 await assert.rejects(prepare(null,{requiredObservations:['spriteFrame']}),/unsupported required observation/);
 await assert.rejects(prepare(null,{seed:42}),/seed injection is not supported/);
 await assert.rejects(beforeNavigate({},config),/WebSocket isolation unavailable/);
});
test('pre-navigation isolation blocks API, foreign HTTP and WebSocket before server receives them',async()=>{
 const received=[],server=createServer((req,res)=>{received.push(req.url);res.writeHead(200,{'content-type':'text/html'}).end('<html><body>fixture</body></html>');});let upgrades=0;server.on('upgrade',(_req,socket)=>{upgrades++;socket.destroy();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 const {chromium}=await import(pathToFileURL(path.resolve('../pokemon-arena/qa/node_modules/playwright/index.mjs')));const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
 try{const page=await browser.newPage();await beforeNavigate(page,{...config,source:'fixture.html'});await page.goto(origin+'/fixture.html');
  const outcomes=await page.evaluate(async()=>{const http=await Promise.all(['/api/probe','http://example.invalid/probe'].map(x=>fetch(x).then(()=>false,()=>true)));const ws=await new Promise(resolve=>{const s=new WebSocket(`ws://${location.host}/ws`);s.onopen=()=>resolve(false);s.onclose=()=>resolve(true);s.onerror=()=>resolve(true);setTimeout(()=>resolve(false),3000);});return{http,ws};});
  assert.deepEqual(outcomes.http,[true,true]);assert.equal(outcomes.ws,true);assert.deepEqual(received,['/fixture.html']);assert.equal(upgrades,0);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
test('real baseline app loop and UI deployment produce observed state and evidence',async()=>{
 const out=await mkdtemp(path.join(os.tmpdir(),'real-app-review-'));
 try {const {result,directory}=await runCase(config,{out});
  assert.equal(result.status,'complete');assert.ok(result.samples.length>2);
  assert.equal(result.samples[0].events.some(e=>e.type==='deploy'),false);
  const later=result.samples.find(s=>s.events.some(e=>e.type==='deploy'));
  assert.ok(later);assert.ok(later.pose.length>0);assert.ok(later.hp.some(u=>u.hp>0&&u.hp<=u.maxHp));
  assert.equal(later.state,'playing');assert.equal(later.instrumentation.lastStepDt,1/30);
  assert.ok(later.instrumentation.stepCalls>0&&later.instrumentation.drawCalls>0);
  assert.equal(later.instrumentation.network.requests[0].pathname,'/dist/index.html');
  assert.equal(later.instrumentation.network.webSocketIsolation,'blocked-before-navigation');
  assert.equal(later.instrumentation.network.webSockets.length,0);
  assert.ok(result.samples.at(-1).gameTime>result.samples[0].gameTime);
  assert.ok(result.canvasVideo.pts.length>1);assert.ok(result.capture.frames.length>1);
  assert.match(await readFile(path.join(directory,'index.html'),'utf8'),/Contexto completo/);
 } finally {await rm(out,{recursive:true,force:true});}
});
