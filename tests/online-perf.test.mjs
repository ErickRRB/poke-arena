import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnlinePerf } from '../dist/perf.js';

test('disabled, bounded diagnostics retain only numeric aggregates and expire without a timer',()=>{
  let clock=0;const perf=new OnlinePerf(()=>clock),renderer={frameActors:new Map([[123,{x:5,y:8,logicalX:2,logicalY:4}]])};
  assert.equal(perf.report(),null);perf.snapshot({epoch:'private-epoch',version:1,seq:1},100);
  perf.start();perf.snapshot({epoch:'private-epoch',version:1,seq:10,name:'private-name',token:'private-token'},100);
  perf.ping();clock=20;perf.pong();clock=80;perf.snapshot({epoch:'private-epoch',version:4,seq:14,game:{name:'private-game'}},200);
  for(let i=0;i<8500;i++){clock+=1;perf.frame(clock-0.5,renderer);}
  let report=perf.report();assert.equal(report.frameGapMs.n,8192);assert.equal(report.rttMs.p50,20);assert.equal(report.snapshotGapMs.p50,80);
  assert.equal(report.versionSkips,2);assert.equal(report.seqAdvance,4);assert.equal(report.maxVisualDifferenceUnits.max,5);
  const serial=JSON.stringify(report);for(const forbidden of ['private-epoch','private-name','private-token','private-game','123'])assert.ok(!serial.includes(forbidden));
  clock=60001;perf.frame(clock,renderer);report=perf.report();assert.equal(report.active,false);assert.equal(report.stopReason,'limit');
  perf.start();assert.equal(perf.report().frameGapMs.n,0);assert.equal(perf.report().versionSkips,0);perf.stop();assert.equal(perf.report().stopReason,'manual');
});

test('epoch transition and outlier retain their correct meanings',()=>{
  let clock=0;const p=new OnlinePerf(()=>clock),r={frameActors:new Map()};p.start();p.snapshot({epoch:'a',version:1,seq:3},15);p.frame(0,r);
  clock=1600;p.snapshot({epoch:'b',version:2,seq:4},15);p.frame(clock,r);
  const s=p.report();assert.equal(s.epochChanges,1);assert.equal(s.versionSkips,0);assert.equal(s.seqAdvance,0);assert.equal(s.frameGapMs.atLeast1000,1);assert.equal(s.snapshotGapMs.max,1600);assert.equal(s.windows[1].snapshotGapMaxMs,1600);
});

test('overlapping pings quarantine ambiguous pongs until socket reset',()=>{
  let clock=0;const p=new OnlinePerf(()=>clock);p.start();p.ping();clock=2500;p.ping();clock=3100;p.pong();clock=3200;p.pong();
  let r=p.report();assert.equal(r.overlappingPings,1);assert.equal(r.ambiguousPongs,2);assert.equal(r.rttMs.n,0);assert.equal(r.rttQuarantined,true);
  clock=5000;p.ping();clock=5010;p.pong();r=p.report();assert.equal(r.rttMs.n,0);assert.equal(r.ambiguousPongs,3);
  p.reconnect();p.socketReset();clock=6000;p.ping();clock=8000;p.pong();r=p.report();assert.equal(r.reconnects,1);assert.equal(r.rttQuarantined,false);assert.equal(r.rttMs.n,1);assert.equal(r.rttMs.max,2000);assert.equal(r.rttMs.atLeast1000,1);
});

test('capture starting mid-flight never times a pre-capture ping',()=>{
  let clock=0;const p=new OnlinePerf(()=>clock);p.ping();clock=1000;p.start();clock=1700;p.pong();assert.equal(p.report().rttMs.n,0);
  clock=1800;p.ping();clock=1850;p.pong();assert.equal(p.report().rttMs.max,50);
  p.stop();clock=2000;p.ping();clock=4500;p.ping();p.start();clock=4700;p.pong();assert.equal(p.report().rttMs.n,0);assert.equal(p.report().ambiguousPongs,1);assert.equal(p.report().rttQuarantined,true);
});

test('capture limit expires from quarantined ping or pong without a frame or snapshot',()=>{
 for(const hook of ['ping','pong']){
  let clock=0;const p=new OnlinePerf(()=>clock);p.start();p.ping();clock=2500;p.ping();clock=60001;p[hook]();
  assert.equal(p.active,false,hook+' must expire before recording a late counter');
  const report=p.report();assert.equal(report.stopReason,'limit');assert.equal(report.overlappingPings,1);assert.equal(report.ambiguousPongs,0);assert.equal(report.rttMs.n,0);
 }
});

test('disabled collector hooks never read the clock or create a capture',()=>{
 const p=new OnlinePerf(()=>{throw Error('Disabled diagnostics read a clock');});
 p.ping();p.ping();p.pong();p.reconnect();p.snapshot({epoch:'private'},100);p.frame(0,{frameActors:new Map()});p.socketReset();p.ping();p.pong();
 assert.equal(p.report(),null);
});
