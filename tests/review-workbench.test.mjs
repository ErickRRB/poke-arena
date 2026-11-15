import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
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
  const html=await readFile(path.join(a.directory,'index.html'),'utf8');assert.match(html,/Recorte fijo/);assert.match(html,/Contexto completo/);
  let failure;try {await runCase({...fixture,expectedEvent:'never-happens'},{out});} catch(e){failure=e;} assert.ok(failure);const failed=JSON.parse(await readFile(path.join(failure.runDirectory,'run.json')));assert.equal(failed.status,'failed');assert.match(failed.error,/expected event/); let mismatch; try {await runCase({...fixture,devForceMismatch:true},{out});} catch(e){mismatch=e;} assert.match(mismatch.message,/viewport or DPR/); let gapFailure; try {await runCase({...fixture,maxGapMs:0.001},{out});} catch(e){gapFailure=e;} assert.match(gapFailure.message,/maximum gap/);
 } finally {await rm(out,{recursive:true,force:true});}
});
