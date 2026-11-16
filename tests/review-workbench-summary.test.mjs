import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {summarizeRun,publicBuild} from '../scripts/review-workbench.mjs';
import {inventoryBuild} from '../scripts/publish-frontend.mjs';

test('public build inventory uses publisher ordering for mixed-case paths',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'build-order-'));
  try{
    const assets=path.join(dir,'build/workers/default/assets'),bundle=path.join(dir,'build/workers/default/bundle');await mkdir(assets,{recursive:true});await mkdir(bundle,{recursive:true});await mkdir(path.join(dir,'dist'));
    const blobs=new Map();for(const file of ['index.html','app.js','render.js','engine.js']){const data=Buffer.from(file);await writeFile(path.join(dir,'dist',file),data);await writeFile(path.join(assets,file),data);blobs.set('dist/'+file,createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex'));}
    await writeFile(path.join(bundle,'index.js'),'worker');await writeFile(path.join(dir,'build/Zebra'),'upper');await writeFile(path.join(dir,'build/alpha'),'lower');
    const build=await publicBuild({cwd:dir,blobs},'build'),publisher=inventoryBuild(path.join(dir,'build'));assert.deepEqual(build.files,publisher);assert.ok(build.files.findIndex(f=>f.path==='Zebra')<build.files.findIndex(f=>f.path==='alpha'));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('offline inspection separates identities, preserves unknowns and compares inventory by content',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'run-summary-'));
  try{
    const item={path:'Zebra',bytes:4,sha256:'a'.repeat(64)},other={path:'alpha',bytes:1,sha256:'b'.repeat(64)};
    const run={id:'case',git:{sha:'runner',tree:'runner-tree'},runtime:{sha:'rendered',tree:'rendered-tree'},publicResponses:[{},{}],errors:[],missingInputs:[],publicBuild:{files:[other,item]}};
    const manifest={buildOutput:{files:[item,other]}};
    const runFile=path.join(dir,'run.json'),manifestFile=path.join(dir,'manifest.json');await writeFile(runFile,JSON.stringify(run));await writeFile(manifestFile,JSON.stringify(manifest));
    const output=JSON.parse(execFileSync(process.execPath,['scripts/review-workbench.mjs','inspect-run',runFile,'--manifest',manifestFile],{encoding:'utf8'}));
    assert.deepEqual(output.runnerGit,{sha:'runner',tree:'runner-tree'});assert.deepEqual(output.renderedRuntime,{sha:'rendered',tree:'rendered-tree'});
    assert.deepEqual(output.counts,{publicResponses:2,errors:0,publicResponseErrors:null,missingInputs:0,changedInputs:null});assert.equal(output.inventoryComparison.status,'equal');
    const altered={buildOutput:{files:[{...item,bytes:5,sha256:'c'.repeat(64)},other]}};assert.equal(summarizeRun(run,altered).inventoryComparison.changed,1);
    assert.equal(summarizeRun(run,{buildOutput:{files:[item,item]}}).inventoryComparison.status,'unknown');
    assert.equal(summarizeRun({git:run.git}).renderedRuntime,null);
  }finally{await rm(dir,{recursive:true,force:true});}
});
