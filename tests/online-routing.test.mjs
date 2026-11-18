import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineRouting,allowedC4Server,C4_CANONICAL_ORIGIN,C4_PRODUCTION_ENDPOINT,C4_CANONICAL_SEARCH_CUTOVER} from '../dist/online-routing.js?v=c4-online-1';
import {OnlineClient} from '../dist/online.js';
import {C4_SERVICE} from '../dist/online-context.js?v=1';

test('canonical default searches use C4 while an explicit pre-cutover fixture preserves recovery, independently of URL flags',()=>{
 assert.equal(C4_CANONICAL_SEARCH_CUTOVER,true);
 for(const suffix of ['/', '/?preview=c4-wire-1&realtime=wss://evil.example','/?realtime=http://localhost:4180']){
  const inactive=onlineRouting(C4_CANONICAL_ORIGIN+suffix,false);assert.equal(inactive.c4Recovery,C4_PRODUCTION_ENDPOINT);assert.equal(inactive.c4Search,null);assert.equal(inactive.localC4,null);
  const active=onlineRouting(C4_CANONICAL_ORIGIN+suffix);assert.equal(active.c4Search,C4_PRODUCTION_ENDPOINT);assert.equal(active.c4Recovery,C4_PRODUCTION_ENDPOINT);assert.equal(active.localC4,null);
 }
});

test('production C4 is unavailable outside the exact canonical origin, and loopback flags stay local',()=>{
 for(const value of ['http://poke-arena-web.eriickramiirez.workers.dev/','https://poke-arena-web.eriickramiirez.workers.dev:444/','https://poke-arena-web.eriickramiirez.workers.dev.evil/','https://version-poke-arena-web.eriickramiirez.workers.dev/','https://poke-arena-erick.eriqrb.chatgpt.site/?preview=c4-wire-1&realtime=http://localhost:4180'])assert.deepEqual(onlineRouting(value,true),{localC4:null,c4Recovery:null,c4Search:null});
 const local=onlineRouting('http://127.0.0.1:4173/?preview=c4-wire-1&realtime=http://localhost:4180');assert.equal(local.localC4,'http://localhost:4180/');assert.equal(local.c4Search,local.localC4);assert.equal(local.c4Recovery,local.localC4);
 for(const endpoint of ['https://evil.example','http://u:p@localhost:4180','http://localhost.evil/'])assert.equal(onlineRouting('http://localhost/?preview=c4-wire-1&realtime='+encodeURIComponent(endpoint)).c4Search,null);
});

test('C4 transport accepts only the pinned WSS at canonical origin or local endpoints on loopback',t=>{
 assert.equal(allowedC4Server(C4_PRODUCTION_ENDPOINT,C4_CANONICAL_ORIGIN),true);assert.equal(allowedC4Server('http://localhost:4180','http://localhost:4173'),true);
 for(const[server,page]of [[C4_PRODUCTION_ENDPOINT,'https://elsewhere.example'],[C4_PRODUCTION_ENDPOINT,'http://localhost'],['https://poke-arena-realtime-c4.eriickramiirez.workers.dev',C4_CANONICAL_ORIGIN],['wss://evil.example',C4_CANONICAL_ORIGIN],['http://localhost:4180',C4_CANONICAL_ORIGIN],[C4_PRODUCTION_ENDPOINT+'/other',C4_CANONICAL_ORIGIN],[C4_PRODUCTION_ENDPOINT+'/?token=x',C4_CANONICAL_ORIGIN]])assert.equal(allowedC4Server(server,page),false);
 const original=Object.getOwnPropertyDescriptor(globalThis,'location');Object.defineProperty(globalThis,'location',{configurable:true,value:{href:C4_CANONICAL_ORIGIN}});t.after(()=>{if(original)Object.defineProperty(globalThis,'location',original);else delete globalThis.location;});
 const options={service:C4_SERVICE,serverUrl:C4_PRODUCTION_ENDPOINT,onSnapshot(){},onConnection(){},onSearch(){}};assert.doesNotThrow(()=>new OnlineClient(options));assert.throws(()=>new OnlineClient({...options,serverUrl:'wss://evil.example'}));
});
