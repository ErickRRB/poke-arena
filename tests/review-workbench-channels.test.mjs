import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {captureChannels,validateCase,requiredChannelsComplete,ackTracker,timestampAnomalies,viewer} from '../scripts/review-workbench.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/workbench/case.json',import.meta.url)));
test('legacy and explicit surfaces require the correct channels',()=>{
  assert.deepEqual(captureChannels(fixture),{cdp:true,canvas:true});
  const {recordCanvas,...withoutCanvas}=fixture;
  assert.deepEqual(captureChannels(withoutCanvas),{cdp:true,canvas:false});
  assert.deepEqual(captureChannels({...fixture,captureSurface:'canvas'}),{cdp:false,canvas:true});
  assert.deepEqual(captureChannels({...withoutCanvas,captureSurface:'dom'}),{cdp:true,canvas:false});
  assert.deepEqual(captureChannels({...fixture,captureSurface:'both'}),{cdp:true,canvas:true});
  assert.throws(()=>validateCase({...withoutCanvas,captureSurface:'canvas'}),/requires recordCanvas/);
  assert.throws(()=>validateCase({...fixture,captureSurface:'dom'}),/cannot declare/);
  assert.throws(()=>validateCase({...fixture,captureSurface:'other'}),/captureSurface/);
});
test('DOM and both cannot pass on canvas alone; no failed required stream is relabelled',()=>{
  const phases={canvas:'complete',cdp:'failed'};
  assert.equal(requiredChannelsComplete(captureChannels({...fixture,captureSurface:'canvas'}),phases),true);
  assert.equal(requiredChannelsComplete(captureChannels({...fixture,captureSurface:'both'}),phases),false);
  const {recordCanvas,...dom}=fixture;
  assert.equal(requiredChannelsComplete(captureChannels({...dom,captureSurface:'dom'}),phases),false);
  assert.deepEqual(timestampAnomalies([{timestamp:3},{timestamp:2}]).map(x=>x.reason),['decreased']);
});
test('ACK failures are retained and drained even when completion is asynchronous',async()=>{
  let released;const hold=new Promise(resolve=>released=resolve),seen=[];
  const tracker=ackTracker(async id=>{seen.push(id);if(id===1)await hold;else throw Error('ack rejected');});
  tracker.ack(1);tracker.ack(2);const done=tracker.drain();released();
  await assert.rejects(done,/ack rejected/);assert.deepEqual(seen,[1,2]);
});
test('canvas viewer includes static full context and observed geometry without CDP',()=>{
  const result={samples:[{viewport:{width:390,height:844},dpr:1,canvas:{width:370,height:686},rects:{arena:[10,2,370,686]}}],observation:{firstGameTime:0},canvasCaptureStartEpochMs:123};
  const html=viewer({...fixture,captureSurface:'canvas'},[],result);
  assert.match(html,/context\.png/);assert.match(html,/canvas\.webm/);assert.match(html,/estática/);assert.match(html,/370/);assert.doesNotMatch(html,/frames\//);
});
