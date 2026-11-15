import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runCase} from '../scripts/review-workbench.mjs';
import {prepare} from '../tools/review/baseline-adapter.mjs';
const config=JSON.parse(await readFile(new URL('../tools/review/baseline-case.json',import.meta.url),'utf8'));
test('adapter rejects observations and seed it cannot provide',async()=>{
 await assert.rejects(prepare(null,{requiredObservations:['spriteFrame']}),/unsupported required observation/);
 await assert.rejects(prepare(null,{seed:42}),/seed injection is not supported/);
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
  assert.ok(result.samples.at(-1).gameTime>result.samples[0].gameTime);
  assert.ok(result.canvasVideo.pts.length>1);assert.ok(result.capture.frames.length>1);
  assert.match(await readFile(path.join(directory,'index.html'),'utf8'),/Contexto completo/);
 } finally {await rm(out,{recursive:true,force:true});}
});
