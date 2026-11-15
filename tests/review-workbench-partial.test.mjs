import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runCase} from '../scripts/review-workbench.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url),'utf8'));
const contact=JSON.parse(await readFile(new URL('../tools/review/contact-zubat.case.json',import.meta.url),'utf8'));
async function failed(c){const tmp=await mkdtemp(path.join(tmpdir(),'review-partial-'));try{let caught;try{await runCase(c,{out:tmp});}catch(error){caught=error;}assert.ok(caught);return JSON.parse(await readFile(path.join(caught.runDirectory,'run.json')));}finally{await rm(tmp,{recursive:true,force:true});}}
test('entrada ausente conserva hashes parciales sin certificar inventario completo',async()=>{
 const r=await failed({...fixture,adapter:'tests/fixtures/workbench/does-not-exist.mjs'});
 assert.equal(r.status,'failed');assert.match(r.error,/ENOENT/);assert.equal(r.phases.inputs,'failed');assert.deepEqual(r.expectedInputs,['case','source','adapter','runner']);assert.deepEqual(r.inputs.map(i=>i.role),['case','source']);assert.deepEqual(r.missingInputs,['adapter','runner']);assert.ok(r.inputs.every(i=>i.sha256===i.finalSha256));
});
test('runtime identificado sin navegación no certifica inventario vacío',async()=>{
 const r=await failed({...contact,adapter:'tests/fixtures/workbench/does-not-exist.mjs'});
 assert.equal(r.status,'failed');assert.match(r.error,/ENOENT/);assert.equal(r.phases.runtime,'complete');assert.equal(r.runtime.identityVerification,'complete');assert.equal(r.runtime.sha,contact.runtime.sha);assert.deepEqual(r.runtime.servedFiles,[]);assert.equal(r.phases.resources,'failed');assert.equal(r.runtime.resourceVerification,'incomplete');assert.ok(r.errors.some(e=>e.phase==='resources'));
});
