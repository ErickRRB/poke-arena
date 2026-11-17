import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import esbuild from '../realtime/node_modules/esbuild/lib/main.js';
import {C4_SERVICE,serviceEnvelope} from '../dist/online-context.js?v=1';
import {DEFAULT_DECK} from '../dist/engine.js?v=34';
import {c4SelectionFromLibrary} from '../dist/profile-selection.js?v=1';
import {updateLibrarySlot} from '../dist/deck-provenance.js?v=c4-editor-1';

// Route focals execute the real Lobby methods and SQLite. Only the Workers
// base/transport and Room RPC are controlled here; this is not workerd evidence.
const root=fileURLToPath(new URL('../',import.meta.url)),source=await readFile(new URL('../realtime/src/index.js',import.meta.url),'utf8');
async function loadLobby(contents){
 const result=await esbuild.build({stdin:{contents,resolveDir:root+'realtime/src',sourcefile:'index.js'},bundle:true,write:false,platform:'node',format:'esm',target:'node22',plugins:[{name:'local-durable-base',setup(build){build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'local-base'}));build.onLoad({filter:/.*/,namespace:'local-base'},()=>({contents:'export class DurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env;}}'}));}}]});
 return(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).ArenaLobby;
}
const ArenaLobby=await loadLobby(source),OldLobby=await loadLobby(execFileSync('git',['show','9ba3a327b0693c4756443f6b91c0550c755b52ae:realtime/src/index.js'],{cwd:root,encoding:'utf8'}));
const originalPair=globalThis.WebSocketRequestResponsePair;globalThis.WebSocketRequestResponsePair=class{};
test.after(()=>{if(originalPair===undefined)delete globalThis.WebSocketRequestResponsePair;else globalThis.WebSocketRequestResponsePair=originalPair;});
const A='a'.repeat(64),B='b'.repeat(64),R='d521bab0-5618-404e-96dc-5b73fcb51b77';
const selection=c4SelectionFromLibrary(updateLibrarySlot({version:1,updatedAt:1,slots:[['arcanine',...DEFAULT_DECK.slice(1)]]},0,0,'arcanine',{action:'accept',now:2}),0);
const intent=(token=A,mode='search-intent',extra={})=>({type:'hello',...serviceEnvelope(C4_SERVICE),c4SearchVersion:1,mode,token,name:'A',deck:selection.deck,selection:selection.selection,...extra});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
async function setup(t,{Class=ArenaLobby,c1=false,roomFactory}={}){
 const database=new DatabaseSync(':memory:'),sockets=[],background=[],rooms=new Map(),ledger=[];
 const sql={exec(query,...args){const rows=database.prepare(query).all(...args);return{toArray:()=>rows,[Symbol.iterator]:()=>rows[Symbol.iterator]()};}};
 const ctx={storage:{sql,getAlarm:async()=>null,setAlarm:async()=>{}},blockConcurrencyWhile:fn=>fn(),waitUntil:value=>background.push(value),getWebSockets:()=>sockets,setWebSocketAutoResponse(){},getWebSocketAutoResponseTimestamp:()=>null};
 const env={...(c1?{}:{LOCAL_C4_TEST:'1'}),ARENAS:{getByName:id=>{
  if(!rooms.has(id))rooms.set(id,roomFactory?.(id,ledger)||{state:'playing',calls:[],async create(){return{state:this.state};},async summary(){return{state:this.state};},async abandon(playerId){this.calls.push(playerId);ledger.push('abandon');this.state='ended';return true;}});return rooms.get(id);
 }}};
 const lobby=new Class(ctx,env);await lobby.ready;
 const connect=()=>{const waits=[],ws={readyState:1,packets:[],state:{authed:false,connectedAt:Date.now(),...(c1?{}:{service:'c4'})},serializeAttachment(value){this.state=structuredClone(value);},deserializeAttachment(){return this.state;},send(data){const packet=JSON.parse(data);this.packets.push(packet);ledger.push(packet.type);for(const wait of [...waits])if(wait.check(packet)){waits.splice(waits.indexOf(wait),1);wait.resolve(packet);}},close(code){this.readyState=3;this.closeCode=code;},next(check){const found=this.packets.find(check);if(found)return Promise.resolve(found);const wait=deferred();wait.check=check;waits.push(wait);return wait.promise;}};sockets.push(ws);return ws;};
 t.after(async()=>{await Promise.allSettled(background);database.close();});
 return{lobby,sql,rooms,ledger,connect,rows:()=>sql.exec('SELECT * FROM sessions ORDER BY id').toArray(),hello:(ws,packet)=>lobby.webSocketMessage(ws,JSON.stringify(packet))};
}

test('old authority rejects both new modes before any session INSERT',async t=>{
 const s=await setup(t,{Class:OldLobby});
 for(const mode of ['search-intent','cancel-intent']){const ws=s.connect();await s.hello(ws,intent(A,mode));assert.equal(ws.packets.at(-1).code,'protocol');assert.equal(s.rows().length,0);assert.ok(!ws.packets.some(p=>p.type==='welcome'));}
});

test('same credential/request resumes exactly one queue without rewriting joined or opaque context',async t=>{
 const s=await setup(t),a=s.connect();await s.hello(a,intent());const before=s.rows()[0],context={...JSON.parse(before.profile_context),opaque:{key:'blastoise',counter:12}};s.sql.exec('UPDATE sessions SET profile_context=? WHERE id=?',JSON.stringify(context),before.id);
 const first=s.connect(),second=s.connect();await Promise.all([s.hello(first,intent()),s.hello(second,intent())]);const rows=s.rows();assert.equal(rows.length,1);assert.equal(rows[0].id,before.id);assert.equal(rows[0].joined,before.joined);assert.deepEqual(JSON.parse(rows[0].profile_context),context);assert.equal(a.closeCode,4001);assert.ok(second.packets.some(p=>p.type==='searching'&&p.joined===before.joined));
 const wrong=s.connect();await s.hello(wrong,intent(A,'search-intent',{name:'another request'}));assert.equal(wrong.packets.at(-1).code,'session');assert.equal(JSON.stringify(s.rows()),JSON.stringify(rows));
 const stats=s.connect();await s.hello(stats,intent(A,'search-intent',{stats:{damage:1}}));assert.equal(stats.packets.at(-1).code,'deck');assert.equal(JSON.stringify(s.rows()),JSON.stringify(rows));
});

test('unversioned C4 searches and noncanonical credentials cannot create a row',async t=>{
 const s=await setup(t);
 for(const packet of [intent(A,'search'),intent(A,'search-intent',{c4SearchVersion:undefined}),intent('A'.repeat(64)),intent([A])]){const ws=s.connect();await s.hello(ws,packet);assert.equal(s.rows().length,0);assert.equal(ws.packets.at(-1).code,'protocol');}
});

test('a pre-INSERT cancellation leaves a terminal identity that a delayed search cannot resurrect',async t=>{
 const s=await setup(t),cancel=s.connect();await s.hello(cancel,intent(A,'cancel-intent'));const row=s.rows()[0];assert.equal(row.joined,null);assert.equal(row.room_id,null);assert.equal(row.selection_notice,'c4-search-cancelled');assert.equal(cancel.packets.at(-1).searchState,'cancelled');
 const delayed=s.connect();await s.hello(delayed,intent());assert.equal(s.rows().length,1);assert.equal(s.rows()[0].id,row.id);assert.equal(s.rows()[0].joined,null);assert.equal(delayed.packets.at(-1).searchState,'cancelled');assert.ok(!delayed.packets.some(p=>p.type==='searching'||p.type==='matched'));
});

test('a failed abandon keeps its own room reference and cancellation durable until a real retry succeeds',async t=>{
 let fail=true;const calls=[];const s=await setup(t,{roomFactory:()=>({state:'playing',async summary(){return{state:this.state};},async abandon(id){calls.push(id);if(fail)throw Error('controlled abandon RPC failure');this.state='ended';return true;}})});
 const ws=s.connect();await s.hello(ws,intent());const own=s.rows()[0];s.sql.exec('UPDATE sessions SET room_id=?,joined=NULL WHERE id=?',R,own.id);
 // An unrelated confirmed credential is present but never used for cancelling A.
 const other={...own,id:'other-confirmed',token_hash:'other-hash',joined:null,room_id:'other-room'};s.sql.exec('INSERT INTO sessions(id,token_hash,name,deck,room_id,joined,updated,selection_version,profile_context,c4_selection) VALUES(?,?,?,?,?,?,?,?,?,?)',other.id,other.token_hash,other.name,other.deck,other.room_id,other.joined,other.updated,other.selection_version,other.profile_context,other.c4_selection);
 const cancel=s.connect();await s.hello(cancel,intent(A,'cancel-intent'));const pending=s.rows().find(r=>r.id===own.id);assert.equal(pending.selection_notice,'c4-search-cancelling');assert.equal(pending.room_id,R);assert.ok(!cancel.packets.some(p=>p.type==='idle'));assert.equal(cancel.packets.at(-1).code,'server');assert.equal(s.rows().find(r=>r.id===other.id).room_id,'other-room');
 fail=false;const retry=s.connect();await s.hello(retry,intent(A,'resume'));const ended=s.rows().find(r=>r.id===own.id);assert.equal(ended.selection_notice,'c4-search-cancelled');assert.equal(ended.room_id,null);assert.equal(retry.packets.at(-1).searchState,'cancelled');assert.deepEqual(calls,[own.id,own.id]);
});

test('handoff cancellation cannot acknowledge idle until create and effective abandon complete in that order',async t=>{
 const created=deferred(),releaseCreate=deferred(),releaseAbandon=deferred(),abandonStarted=deferred();
 const s=await setup(t,{roomFactory:(id,ledger)=>({state:null,async create(){created.resolve(id);await releaseCreate.promise;this.state='playing';ledger.push('create-complete');return{state:'ready'};},async summary(){return{state:this.state};},async abandon(){abandonStarted.resolve();await releaseAbandon.promise;this.state='ended';ledger.push('abandon-complete');return true;}})});
 const a=s.connect();await s.hello(a,intent());const b=s.connect(),joining=s.hello(b,intent(B));const roomId=await created.promise;
 const cancel=s.connect(),cancelling=s.hello(cancel,intent(A,'cancel-intent'));await cancel.next(p=>p.type==='welcome');assert.equal(s.rows().find(row=>row.id===a.state.playerId).room_id,roomId);assert.equal(s.rows().find(row=>row.id===a.state.playerId).selection_notice,'c4-search-cancelling');assert.ok(!cancel.packets.some(p=>p.type==='idle'));
 releaseCreate.resolve();await abandonStarted.promise;assert.ok(!cancel.packets.some(p=>p.type==='idle'));assert.equal(s.rows().find(row=>row.id===a.state.playerId).room_id,roomId);releaseAbandon.resolve();await Promise.all([joining,cancelling]);assert.equal(cancel.packets.at(-1).searchState,'cancelled');assert.equal(s.rows().find(row=>row.id===a.state.playerId).room_id,null);assert.ok(s.ledger.indexOf('create-complete')<s.ledger.indexOf('abandon-complete'));assert.ok(s.ledger.indexOf('abandon-complete')<s.ledger.lastIndexOf('idle'));
});

test('false abandon with a live room stays pending; an ended summary can settle the retry',async t=>{
 let state='playing';const s=await setup(t,{roomFactory:()=>({async summary(){return{state};},async abandon(){return false;}})}),a=s.connect();await s.hello(a,intent());const row=s.rows()[0];s.sql.exec('UPDATE sessions SET room_id=?,joined=NULL WHERE id=?',R,row.id);
 const cancel=s.connect();await s.hello(cancel,intent(A,'cancel-intent'));assert.equal(s.rows()[0].room_id,R);assert.ok(!cancel.packets.some(p=>p.type==='idle'));
 state='ended';const retry=s.connect();await s.hello(retry,intent(A,'resume'));assert.equal(s.rows()[0].room_id,null);assert.equal(retry.packets.at(-1).searchState,'cancelled');
});

test('resume of a missing v1 identity expires only that attempt and never creates a queue',async t=>{
 const s=await setup(t),ws=s.connect();await s.hello(ws,intent(A,'resume'));assert.equal(s.rows().length,0);const idle=ws.packets.at(-1);assert.equal(idle.type,'idle');assert.equal(idle.c4SearchVersion,1);assert.equal(idle.token,A);assert.equal(idle.expired,true);assert.equal(idle.searchState,'expired');
});

test('old confirmed C4 credentials can still resume their own room without the search capability',async t=>{
 const s=await setup(t),ws=s.connect();await s.hello(ws,intent());const row=s.rows()[0];
 s.sql.exec('UPDATE sessions SET profile_context=?,room_id=?,joined=NULL WHERE id=?',JSON.stringify(serviceEnvelope(C4_SERVICE)),R,row.id);
 const legacy=s.connect();await s.hello(legacy,{type:'hello',...serviceEnvelope(C4_SERVICE),mode:'resume',token:A});assert.ok(legacy.packets.some(p=>p.type==='matched'&&p.roomId===R));assert.ok(legacy.packets.every(p=>p.c4SearchVersion===undefined));assert.equal(s.rows().length,1);assert.equal(s.rows()[0].room_id,R);
});

test('C1 still uses its existing search route and emits no C4 envelope or capability',async t=>{
 const s=await setup(t,{c1:true}),ws=s.connect();await s.hello(ws,{type:'hello',protocol:4,mode:'search',name:'A',deck:['diglett','voltorb','slowbro','eevee','geodude','roselia','fireball','thunder']});assert.equal(s.rows().length,1);assert.ok(ws.packets.some(p=>p.type==='welcome'&&p.token));assert.ok(ws.packets.some(p=>p.type==='searching'));assert.ok(ws.packets.every(p=>p.service===undefined&&p.c4SearchVersion===undefined));
});
