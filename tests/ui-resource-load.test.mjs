import test from 'node:test';
import assert from 'node:assert/strict';
import {loadUiResources} from '../dist/ui-resource-load.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

test('hidden-state font keeps initial controls pending after graphics finish, with real combined progress',async()=>{
  const font=deferred(),assets=deferred(),layout=deferred(),fonts=new Set([{load:()=>font.promise}]);fonts.ready=layout.promise;
  const progress=[];let reportAssets,ready=false;
  const pending=loadUiResources(report=>{reportAssets=report;report(0,4);return assets.promise;},(...counts)=>progress.push(counts),fonts).then(()=>ready=true);
  await Promise.resolve();reportAssets(4,4);assets.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(ready,false);assert.deepEqual(progress.at(-1),[4,6]);
  font.resolve();await Promise.resolve();await Promise.resolve();assert.equal(ready,false,'font layout must also settle');assert.deepEqual(progress.at(-1),[5,6]);
  layout.resolve();await pending;assert.equal(ready,true);assert.deepEqual(progress.at(-1),[6,6]);
  assert.ok(progress.slice(0,-1).every(([loaded,total])=>loaded<total));
});
test('early cached fonts do not report100 before the graphics total is known',async()=>{
  const manifest=deferred(),progress=[],fonts=new Set([{load:async()=>{}}]);
  const pending=loadUiResources(async report=>{await manifest.promise;report(0,2);report(2,2);},(...counts)=>progress.push(counts),fonts);
  await Promise.resolve();await Promise.resolve();assert.deepEqual(progress,[]);
  manifest.resolve();await pending;assert.deepEqual(progress,[[1,4],[3,4],[4,4]]);
});
test('font failure reaches the existing caller error/retry path',async()=>{
  const failed=new Error('font download failed');
  await assert.rejects(loadUiResources(async report=>report(2,2),()=>{},new Set([{load:async()=>{throw failed;}}])),error=>error===failed);
});
test('no registered font faces preserves graphics progress and completion',async()=>{
  const progress=[];await loadUiResources(async report=>{report(0,2);report(1,2);report(2,2);},(...counts)=>progress.push(counts),new Set());
  assert.deepEqual(progress,[[0,3],[1,3],[2,3],[3,3]]);
});
test('last graphics callback cannot finish progress while the renderer promise remains pending',async()=>{
  const renderer=deferred(),progress=[];let ready=false;
  const pending=loadUiResources(report=>{report(1,1);return renderer.promise;},(...counts)=>progress.push(counts),new Set()).then(()=>ready=true);
  await Promise.resolve();await Promise.resolve();assert.equal(ready,false);assert.deepEqual(progress.at(-1),[1,2]);
  renderer.resolve();await pending;assert.equal(ready,true);assert.deepEqual(progress.at(-1),[2,2]);
});
test('font layout finalization alone keeps progress below100 after all load promises finish',async()=>{
  const layout=deferred(),fonts=new Set([{load:async()=>{}}]);fonts.ready=layout.promise;const progress=[];let ready=false;
  const pending=loadUiResources(async report=>report(1,1),(...counts)=>progress.push(counts),fonts).then(()=>ready=true);
  for(let i=0;i<5;i++)await Promise.resolve();assert.equal(ready,false);assert.deepEqual(progress.at(-1),[2,3]);
  layout.resolve();await pending;assert.equal(ready,true);assert.deepEqual(progress.at(-1),[3,3]);
});
