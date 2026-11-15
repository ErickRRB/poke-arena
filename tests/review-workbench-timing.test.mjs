import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {runCase,timestampAnomalies} from '../scripts/review-workbench.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url),'utf8'));
test('CDP ausente o descendente se identifica sin reemplazar ni reordenar marcas',()=>{
 const frames=[{timestamp:4},{timestamp:null},{timestamp:3},{timestamp:2}];const before=structuredClone(frames);
 assert.deepEqual(timestampAnomalies(frames),[{index:1,reason:'missing',value:null},{index:3,reason:'decreased',value:2,previous:3}]);assert.deepEqual(frames,before);
});
test('fixture CDP conserva metadata original y relojes de recepción separados',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'capture-timing-'));
 try{const {directory,result}=await runCase({...fixture,durationMs:5200},{out});const side=JSON.parse(await readFile(path.join(directory,'cdp-frames.json')));assert.ok(side.frames.length>2);assert.equal(side.frames.length,result.capture.frames.length);assert.deepEqual(timestampAnomalies(side.frames),[]);for(const f of side.frames){assert.equal(f.timestamp,f.metadata.timestamp??null);assert.ok(Number.isFinite(f.receivedAtEpochMs));assert.ok(Number.isFinite(f.receivedAtMonotonicMs));} }finally{await rm(out,{recursive:true,force:true});}
});
test('runtime equivocado falla antes de captura',async()=>{const out=await mkdtemp(path.join(tmpdir(),'runtime-'));try{await assert.rejects(runCase({...fixture,source:'dist/index.html',runtime:{root:'../pokemon-arena-small-sprites-integrated',sha:'0'.repeat(40),tree:'0'.repeat(40)}},{out}),/runtime SHA\/tree mismatch/);}finally{await rm(out,{recursive:true,force:true});}});
