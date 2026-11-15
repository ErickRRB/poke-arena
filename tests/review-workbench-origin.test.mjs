import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateCase,validatePublicOrigin,publicBuild,collectPublicResponse,drainResponses,isolatePublicPage,finishPublicPage} from '../scripts/review-workbench.mjs';
import {beforeNavigate} from '../tools/review/baseline-adapter.mjs';

const origin='https://review.example.invalid';
const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url)));

test('public origin is explicit HTTPS and requires a frozen source/build, local defaults stay valid',()=>{
  validateCase(fixture);assert.equal(validatePublicOrigin(origin),origin);
  for(const value of['http://review.example.invalid',origin+'/',origin+'/app',origin+'?x=1',origin+'#x','https://user:pass@review.example.invalid','not a URL'])assert.throws(()=>validatePublicOrigin(value),/HTTPS origin/);
  assert.throws(()=>validateCase({...fixture,publicOrigin:origin}),/frozen runtime/);
  const c={...fixture,source:'dist/index.html',publicOrigin:origin,runtime:{root:'frozen',sha:'a'.repeat(40),tree:'b'.repeat(40)}};
  assert.throws(()=>validateCase(c),/buildOutput/);validateCase({...c,runtime:{...c.runtime,buildOutput:'build'}});
});

async function withBuild(fn){
  const directory=await mkdtemp(path.join(tmpdir(),'review-origin-'));
  try{
    const assets=path.join(directory,'build/workers/default/assets');await mkdir(assets,{recursive:true});await mkdir(path.join(directory,'dist'));await mkdir(path.join(directory,'build/workers/default/bundle'));
    for(const file of['index.html','app.js','render.js','engine.js']){const data=Buffer.from(file+' fixture bytes\n');await writeFile(path.join(directory,'dist',file),data);await writeFile(path.join(assets,file),data);}
    await writeFile(path.join(directory,'build/workers/default/bundle/index.js'),'worker fixture');
    const git=(...a)=>execFileSync('git',a,{cwd:directory,encoding:'utf8'}).trim();git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('add','dist');git('commit','-q','-m','fixture');
    const blobs=new Map(git('ls-tree','-r','HEAD','--','dist').split(/\r?\n/).map(line=>{const m=/^\d+ blob (\w+)\t(.+)$/.exec(line);return[m[2],m[1]];})),runtime={cwd:directory,blobs,served:new Map(),errors:[]};
    const build=await publicBuild(runtime,'build'),remote={origin,build,jobs:[],responses:[],errors:[],network:{requests:[],blocked:[],webSockets:[],pageErrors:[]}};
    await fn({directory,runtime,remote});
  }finally{assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'review-origin-')));await rm(directory,{recursive:true,force:true});}
}
const response=(file,bytes,{status=200,range}={})=>({url:()=>origin+'/'+file,status:()=>status,headers:()=>range?{'content-range':range}:{},body:async()=>bytes});

test('full Build Output binds source blobs and detects asset and bundle changes',()=>withBuild(async({directory,runtime,remote})=>{
  assert.equal(remote.build.files.length,5);assert.equal(remote.build.assets.size,4);
  await assert.rejects(publicBuild(runtime,'../escape'),/inside frozen/);
  await writeFile(path.join(directory,'build/workers/default/bundle/index.js'),'changed worker');
  assert.notEqual((await publicBuild(runtime,'build')).sha256,remote.build.sha256,'bundle participates in immutable inventory');
  await writeFile(path.join(directory,'build/workers/default/assets/app.js'),'different app');
  await assert.rejects(publicBuild(runtime,'build'),/build\/source bytes differ/);
}));

test('actual response jobs verify bytes and ranges, preserve mismatches and do not certify partial as full',()=>withBuild(async({runtime,remote})=>{
  const bytes=await readFile(remote.build.assets.get('app.js').absolute);
  collectPublicResponse(response('app.js',bytes),remote,runtime);
  collectPublicResponse(response('app.js',bytes.subarray(2,6),{status:206,range:`bytes 2-5/${bytes.length}`}),remote,runtime);
  await drainResponses(remote.jobs);assert.equal(remote.responses.length,2);assert.equal(remote.errors.length,0);
  assert.equal(remote.responses[0].range,null);assert.deepEqual(remote.responses[1].range,{start:2,end:5,total:bytes.length});assert.equal(remote.responses[1].bytes,4);
  assert.equal(runtime.served.get('dist/app.js').publicResponses.length,2);
  collectPublicResponse(response('app.js',Buffer.from('wrong')),remote,runtime);
  collectPublicResponse(response('app.js',bytes,{status:206,range:'bytes 0-999/1000'}),remote,runtime);
  collectPublicResponse(response('missing.js',bytes),remote,runtime);
  await drainResponses(remote.jobs);assert.equal(remote.responses.length,2);assert.equal(remote.errors.length,3);
  assert.match(remote.errors.join(' '),/mismatch/);assert.match(remote.errors.join(' '),/content-range/);assert.match(remote.errors.join(' '),/unexpected public response/);
}));

test('finally closes page and drains real late jobs on success and failure, without calling an observer',()=>withBuild(async({runtime,remote})=>{
  const bytes=await readFile(remote.build.assets.get('app.js').absolute),order=[];
  const page={waitForLoadState:async()=>{order.push('idle');collectPublicResponse(response('app.js',bytes),remote,runtime);},close:async()=>{order.push('page-close');collectPublicResponse(response('render.js',await readFile(remote.build.assets.get('render.js').absolute)),remote,runtime);}};
  await finishPublicPage(page,remote);assert.deepEqual(order,['idle','page-close']);assert.equal(remote.responses.length,2);
  const failure={...page,waitForLoadState:async()=>{throw Error('original idle failure');},close:async()=>{order.push('failed-page-close');collectPublicResponse(response('engine.js',Buffer.from('late mismatch')),remote,runtime);}};
  await assert.rejects(finishPublicPage(failure,remote),/original idle failure/);assert.equal(order.at(-1),'failed-page-close');assert.equal(remote.errors.length,1,'late body error retained despite earlier finalization error');
  // Context/browser closure can enqueue another response after page finalization.
  collectPublicResponse(response('index.html',await readFile(remote.build.assets.get('index.html').absolute)),remote,runtime);await drainResponses(remote.jobs);
  assert.equal(remote.responses.length,3);assert.equal(remote.jobs.length,4);
}));

test('public isolation blocks API, foreign HTTP and WebSocket; baseline recognizes the same public navigation',async()=>{
  const routes=[],remote={origin,network:{requests:[],blocked:[],webSockets:[],pageErrors:[]}},frame={},page={on(){},mainFrame:()=>frame,routeWebSocket:async(_pattern,handler)=>{page.ws=handler;},route:async(_pattern,handler)=>routes.push(handler)};
  await beforeNavigate(page,{...fixture,source:'dist/index.html',publicOrigin:origin});const baseline=routes.at(-1);
  let continued=0;await baseline({request:()=>({url:()=>origin+'/',isNavigationRequest:()=>true,frame:()=>frame}),continue:()=>{continued++;}});assert.equal(continued,1);
  await isolatePublicPage(page,remote);const core=routes.at(-1),seen=[];
  for(const url of[origin+'/app.js',origin+'/api',origin+'/api/private','https://foreign.example.invalid/x'])await core({request:()=>({url:()=>url}),fallback:()=>seen.push('allowed'),abort:()=>seen.push('blocked')});
  assert.deepEqual(seen,['allowed','blocked','blocked','blocked']);assert.equal(remote.network.blocked.length,3);
  let closed=false;await page.ws({url:()=>'wss://review.example.invalid/ws',close:async()=>{closed=true;}});assert.ok(closed);assert.equal(remote.network.webSockets.length,1);
});
