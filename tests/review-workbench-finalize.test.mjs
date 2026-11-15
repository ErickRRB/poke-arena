import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {runCase,timestampAnomalies} from '../scripts/review-workbench.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url),'utf8'));
test('un fallo CDP inyectado preserva captura, relojes e inventario verificado',async()=>{
 const tmp=await mkdtemp(path.join(tmpdir(),'workbench-finalize-')),runtime=path.join(tmp,'runtime'),out=path.join(tmp,'runs');
 try {
  await mkdir(path.join(runtime,'dist'),{recursive:true});await writeFile(path.join(runtime,'dist/index.html'),await readFile(new URL('./fixtures/workbench/fixture.html',import.meta.url)));
  const git=(...args)=>execFileSync('git',args,{cwd:runtime,encoding:'utf8',windowsHide:true}).trim();
  git('init','-q');git('config','user.email','fixture@example.invalid');git('config','user.name','Fixture');git('add','dist/index.html');git('commit','-q','-m','fixture');
  const c={...fixture,source:'dist/index.html',runtime:{root:runtime,sha:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')}};
  let error;try{await runCase(c,{out,additionalCdpAnomalies:()=>[{index:1,reason:'injected-test'}]});}catch(e){error=e;}assert.ok(error);assert.match(error.message,/missing or unordered original CDP timestamps/);
  const result=JSON.parse(await readFile(path.join(error.runDirectory,'run.json'))),meta=JSON.parse(await readFile(path.join(error.runDirectory,'cdp-frames.json')));
  assert.equal(result.status,'failed');assert.equal(result.phases.cdp,'failed');for(const name of ['observation','canvas','runtime','resources','inputs','metadata'])assert.equal(result.phases[name],'complete',name);
  assert.equal(result.runtime.sha,c.runtime.sha);assert.equal(result.runtime.tree,c.runtime.tree);assert.equal(result.runtime.identityVerification,'complete');assert.equal(result.runtime.resourceVerification,'complete');assert.ok(result.runtime.servedFiles.some(f=>f.path==='dist/index.html'&&f.sha256));assert.ok(result.inputs.every(f=>f.finalSha256===f.sha256));
  assert.ok(result.samples.length>1);assert.ok(result.observation.lastGameTime>result.observation.firstGameTime);assert.ok(result.canvasVideo.pts.length>1);assert.ok(meta.frames.length>1);assert.deepEqual(timestampAnomalies(meta.frames),[]);assert.equal(result.captureDebug.anomalies[0].reason,'injected-test');assert.equal(result.captureDebug.metadataPath,'cdp-frames.json');
 } finally {await rm(tmp,{recursive:true,force:true});}
});
