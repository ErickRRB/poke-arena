import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {Game,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {getC4BaseCard} from '../dist/c4-catalog.js?v=1';
import {prepareC4Transport} from '../dist/c4-packet.js?v=1';
import {publicSnapshot,publicEvent,unpackEvent,ONLINE_PROTOCOL} from '../dist/online-wire.js?v=target-c1-1';
import {C4_SERVICE,localC4Endpoint} from '../dist/online-context.js?v=1';
import {c4SelectionFromLibrary,admitC4Selection} from '../dist/profile-selection.js?v=1';
import {updateLibrarySlot} from '../dist/deck-provenance.js?v=c4-editor-1';
await prepareC4Transport();
const library=()=>({version:1,active:0,updatedAt:1,slots:[['arcanine',...DEFAULT_DECK.slice(1)],['arcanine'],[],[]]});

test('wire transport preparation rejects old arguments explicitly',async()=>{
 await assert.rejects(prepareC4Transport({}),TypeError);
});
test('wire selection projects only the selected positions and rejects legacy/conflicting/stat declarations',()=>{
 const saved=updateLibrarySlot(library(),0,0,'arcanine',{action:'accept',now:3}),before=structuredClone(saved),request=c4SelectionFromLibrary(saved,0);
 assert.equal(request.ok,true);assert.equal(admitC4Selection(request.deck,request.selection).ok,true);assert.equal(c4SelectionFromLibrary(saved,1).ok,false);assert.deepEqual(saved,before);assert.ok(!('library'in request));
 const fake=structuredClone(request.selection);fake.slots[0].damage=99999;assert.equal(admitC4Selection(request.deck,fake).ok,false);
 const stale=structuredClone(request.selection);stale.conflictClock=3;assert.equal(admitC4Selection(request.deck,stale).ok,false);
 assert.equal(admitC4Selection(request.deck,{...request.selection,slots:Array(8).fill(null)}).ok,false);
});
test('C4 is an explicit loopback variant and P4 remains the default',()=>{
 assert.equal(ONLINE_PROTOCOL,4);assert.equal(C4_SERVICE.protocol,5);
 assert.ok(localC4Endpoint('http://127.0.0.1:4173/?preview=c4-wire-1&realtime=http://localhost:4180'));
 for(const url of ['https://public.example/?preview=c4-wire-1&realtime=http://localhost:4180','http://localhost/?preview=c4-wire-1&realtime=https://public.example','http://localhost/?preview=c4-wire-1&realtime=http://u:p@localhost:4180','http://localhost/?preview=c4-wire-1&realtime=http://localhost.evil/'])assert.equal(localC4Endpoint(url),null);
});
test('C4 preserves exact profile/state numbers, a mutable override and opponent privacy',()=>{
 const g=new Game({catalogVersion:4,ruleset:'c4-1',seed:3});const u=g.spawn('voltorb',0,200.123456789,500,0),card={...getC4BaseCard('voltorb')};u.card=card;
 const first=publicSnapshot(g,0);assert.equal(first.units[0].card,undefined);card.damage+=.123456789;
 const second=publicSnapshot(g,0);assert.equal(second.units[0].card.damage,card.damage);assert.equal(second.units[0].x,200.123456789);assert.deepEqual(second.hands[1],[]);assert.deepEqual(second.queues[1],[]);assert.equal(Object.hasOwn(second,'cpuDeck'),false);
 const e={type:'hit',key:'voltorb',sourceKey:'voltorb',sourceCard:card,x:200.123456789};assert.deepEqual(publicEvent(e,g),e);
});
test('C4 compaction distinguishes omitted canonical cards from present null, partial and complete overrides',()=>{
 const g=new Game({catalogVersion:4,ruleset:'c4-1',seed:3}),unit=g.spawn('arcanine',0,200,500,0);
 assert.equal(Object.hasOwn(publicEvent({type:'spawn',unit},g).unit,'card'),false);
 for(const card of [null,{id:59},{...unit.card,damage:317.123456789,extra:{card:{opaque:true}}}]){
  const encoded=JSON.parse(JSON.stringify(publicEvent({type:'spawn',unit:{...unit,card}},g)));
  assert.equal(Object.hasOwn(encoded.unit,'card'),true);assert.deepEqual(encoded.unit.card,card);
 }
});
test('P4 snapshot/event representation stays byte-compatible with the frozen input wire',async()=>{
 const cwd=new URL('..',import.meta.url),original=execFileSync('git',['show','4f884ed04d80e31f9e315ce7bb7bce6f96c7bb04:dist/online-wire.js'],{cwd,encoding:'utf8',windowsHide:true});
 const code=original.replaceAll("'./engine.js?v=target-c1-1'",JSON.stringify(new URL('../dist/engine.js?v=target-c1-1',import.meta.url).href)).replaceAll("'./snapshot.js?v=target-c1-1'",JSON.stringify(new URL('../dist/snapshot.js?v=target-c1-1',import.meta.url).href)),previous=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const g=new Game({seed:4}),u=g.spawn('pikachu',0,200.123456789,500,0);u.card={...u.card,damage:u.card.damage+.123456789};
 assert.equal(JSON.stringify(publicSnapshot(g,0)),JSON.stringify(previous.publicSnapshot(g,0)));
 const event={type:'spawn',unit:u};assert.deepEqual(publicEvent(event),previous.publicEvent(event));assert.deepEqual(unpackEvent(publicEvent(event)),previous.unpackEvent(previous.publicEvent(event)));
});
