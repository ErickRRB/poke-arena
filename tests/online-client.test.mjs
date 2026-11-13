import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OnlineClient} from '../dist/online.js';

function setup(t,token='existing-session'){
  const storage=new Map(token?[['poke-arena:online-token',token]]:[]),requests=[],snapshots=[],statuses=[];
  const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}});
  t.after(()=>{if(originalStorage)Object.defineProperty(globalThis,'sessionStorage',originalStorage);else delete globalThis.sessionStorage;});
  t.mock.timers.enable({apis:['setTimeout']});
  const packet={status:'matched',version:5,seq:8,roomId:'same-room',events:[],game:{state:'playing'}};
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return Response.json(url==='/api/cancel'?{ok:true}:packet);});
  let idle=0;
  const client=new OnlineClient({onSnapshot:p=>snapshots.push(p),onConnection:s=>statuses.push(s),onSearch:()=>{},onIdle:()=>idle++});
  t.after(()=>client.suspend());
  return{client,requests,snapshots,statuses,storage,packet,get idle(){return idle}};
}

test('a fresh visit does not create a session or join the queue',async t=>{
  const{client,requests}=setup(t,null);assert.equal(await client.resume(),false);assert.deepEqual(requests,[]);
});

test('resume restores the existing session and page suspension never abandons the match',async t=>{
  const{client,requests,snapshots}=setup(t);assert.equal(await client.resume(),true);
  assert.equal(requests[0].url,'/api/resume');assert.equal(requests[0].options.headers.Authorization,'Bearer existing-session');
  assert.equal(snapshots[0].roomId,'same-room');assert.equal(client.mode,'battle');
  client.suspend();t.mock.timers.tick(2000);assert.equal(requests.length,1);
  await client.resume();assert.equal(requests.at(-1).url,'/api/resume');assert.equal(JSON.parse(requests.at(-1).options.body).after,8);
  assert.ok(requests.every(r=>!['/api/cancel','/api/queue','/api/session'].includes(r.url)));
});

test('an idle or expired session returns to the menu without queueing',async t=>{
  const state=setup(t);t.mock.method(globalThis,'fetch',async()=>Response.json({status:'idle'}));
  assert.equal(await state.client.resume(),false);assert.equal(state.idle,1);
  t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Expired'},{status:401}));
  assert.equal(await state.client.resume(),false);assert.equal(state.idle,2);assert.equal(state.storage.size,0);
});

test('a failed reconnection retries the existing match instead of creating a new search',async t=>{
  const{client,requests,statuses,packet}=setup(t);let fail=true;
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return fail?Response.json({error:'Offline'},{status:503}):Response.json(packet);});
  assert.equal(await client.resume(),true);assert.equal(client.mode,'resume');assert.equal(statuses.at(-1),'Reconectando…');
  fail=false;await client.tick();assert.equal(client.mode,'battle');assert.ok(requests.every(r=>r.url==='/api/resume'));
});

test('resume can continue an already queued search using the same token',async t=>{
  const{client,requests}=setup(t);let elapsed;
  client.onSearch=ms=>elapsed=ms;
  t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return Response.json({status:'searching',joined:Date.now()-4000});});
  assert.equal(await client.resume(),true);assert.equal(client.mode,'search');assert.ok(elapsed>=4000);
  await client.tick();assert.deepEqual(requests.map(r=>r.url),['/api/resume','/api/queue']);assert.deepEqual(JSON.parse(requests[1].options.body),{});
});
