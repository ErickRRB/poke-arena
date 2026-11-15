import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { runCase, selectFrames, validateCase } from '../scripts/review-workbench.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url)));
const hash=b=>createHash('sha256').update(b).digest('hex');
test('configuración y selección de cuadros existentes',()=>{validateCase(fixture);assert.throws(()=>validateCase({...fixture,crop:{x:300,y:0,width:30,height:40}}));assert.deepEqual(selectFrames([0,.04,.09,.13,.21],.1),[{index:0,pts:0},{index:3,pts:.13}]);});
test('captura real dev conserva evidencia, repeticiones y falla sin evento',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'workbench-'));
 try {
  const a=await runCase(fixture,{out}), b=await runCase(fixture,{out}); assert.notEqual(a.directory,b.directory);
  const run=JSON.parse(await readFile(path.join(a.directory,'run.json'))); assert.equal(run.status,'complete'); assert.ok(run.samples.some(s=>s.events.some(e=>e.type==='impact'))); assert.ok(run.capture.frames.length>1); assert.ok(run.canvasVideo.pts.length>1); assert.ok(run.canvasVideo.pts.every((t,i,a)=>!i||t>=a[i-1])); assert.equal(hash(await readFile(path.join(a.directory,run.canvasVideo.path))),run.canvasVideo.sha256); assert.ok(run.capture.observedCadence.gapsSeconds.length>0);
  for(const selected of run.capture.selected){const frame=run.capture.frames[selected.index];assert.equal(selected.path,frame.path);assert.ok(Math.abs(selected.pts-(frame.timestamp-run.capture.origin))<1e-9);assert.equal(hash(await readFile(path.join(a.directory,frame.path))),frame.sha256);}
  const html=await readFile(path.join(a.directory,'index.html'),'utf8');assert.match(html,/Recorte fijo/);assert.match(html,/Contexto completo/); assert.match(html,/Condiciones y cadencia observadas/); assert.match(html,/Tiempos, poses, HP y eventos observados/); assert.ok(html.includes(String(run.samples[0].epochMs)));
  const {chromium}=await import(pathToFileURL(path.resolve('../pokemon-arena/qa/node_modules/playwright/index.mjs')).href); const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
  try {const page=await browser.newPage({viewport:{width:900,height:800}}); await page.goto(pathToFileURL(path.join(a.directory,'index.html')).href); await page.locator('details').evaluateAll(nodes=>nodes.forEach(el=>el.open=true)); const rects=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,full:document.querySelector('.full img').getBoundingClientRect().width,crop:document.querySelector('.crop').getBoundingClientRect().width})); assert.equal(rects.scroll,rects.client); assert.equal(rects.full,fixture.viewport.width); assert.equal(rects.crop,fixture.crop.width); } finally {await browser.close();}
  assert.equal(run.observation.events.length,run.samples.reduce((n,s)=>n+s.events.length,0)); assert.ok(run.observation.events.length>1);
  let failure;try {await runCase({...fixture,expectedEvent:'never-happens'},{out});} catch(e){failure=e;} assert.ok(failure);const failed=JSON.parse(await readFile(path.join(failure.runDirectory,'run.json')));assert.equal(failed.status,'failed');assert.match(failed.error,/expected event/); let mismatch; try {await runCase({...fixture,devForceMismatch:true},{out});} catch(e){mismatch=e;} assert.match(mismatch.message,/viewport or DPR/); let gapFailure; try {await runCase({...fixture,maxGapMs:0.001},{out});} catch(e){gapFailure=e;} assert.match(gapFailure.message,/maximum gap/);
 } finally {await rm(out,{recursive:true,force:true});}
});

test('observe respeta duración explícita y hook intercepta navegación inicial',async()=>{
 const c={...fixture,adapter:'tests/fixtures/workbench/hook-adapter.mjs'};
 const r=await runCase(c,{mode:'observe',headless:true,observeDurationMs:2700}); assert.equal(r.result.status,'complete'); assert.ok(r.result.observation.durationMs>=2500); assert.ok(r.result.observation.events.some(e=>e.event.type==='impact'));
 await assert.rejects(()=>runCase(c,{mode:'capture',observeDurationMs:500}),/only applies/);
});

test('resumen conserva eventos incrementales sin confundirlos con acumulados',async()=>{
 const r=await runCase({...fixture,devIncremental:true},{mode:'observe',headless:true,observeDurationMs:2200});
 assert.deepEqual(r.result.samples.at(-1).events,[]); assert.equal(r.result.observation.events.length,1);
 const event=r.result.observation.events[0], sample=r.result.samples[event.sampleIndex]; assert.equal(event.event.type,'impact'); assert.deepEqual(event.event,sample.events[0]); assert.equal(event.epochMs,sample.epochMs); assert.equal(event.gameTime,sample.gameTime);
});
