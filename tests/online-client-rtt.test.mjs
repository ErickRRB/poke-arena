import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnlineClient } from '../dist/online.js';
import { onlinePerf } from '../dist/perf.js?v=1';

test('actual heartbeat discards overlapping pong and resumes timing on replacement socket',async t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval']});let wall=100000,clock=0;
  t.mock.method(Date,'now',()=>wall);t.mock.method(performance,'now',()=>clock);
  const sockets=[],storage=new Map([['poke-arena:ws-token','session-for-local-test']]),original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  const client=new OnlineClient({serverUrl:'https://local.invalid',onSnapshot(){},onSearch(){},onConnection(){},createSocket(){const ws={readyState:0,send(){},close(){this.readyState=3;},open(){this.readyState=1;this.onopen();},pong(){this.onmessage({data:'pong'});},disconnect(){this.readyState=3;this.onclose({code:1006});}};sockets.push(ws);return ws;}});
  t.after(()=>{client.suspend();onlinePerf.stop();if(original)Object.defineProperty(globalThis,'sessionStorage',original);else delete globalThis.sessionStorage;});
  const advance=ms=>{wall+=ms;clock+=ms;t.mock.timers.tick(ms);};
  await client.resume();sockets[0].open();onlinePerf.start();advance(2500);advance(2500);advance(100);sockets[0].pong();sockets[0].pong();
  let report=onlinePerf.report();assert.equal(report.rttMs.n,0);assert.equal(report.overlappingPings,1);assert.equal(report.ambiguousPongs,2);assert.equal(report.rttQuarantined,true);
  sockets[0].disconnect();advance(250);sockets[1].open();advance(2500);advance(1800);sockets[1].pong();
  report=onlinePerf.report();assert.equal(report.reconnects,1);assert.equal(report.rttQuarantined,false);assert.equal(report.rttMs.max,1800);assert.equal(report.rttMs.atLeast1000,1);
});
