import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CARDS,DEFAULT_DECK} from '../dist/engine.js?v=34';
import {prepareC4Transport} from '../dist/c4-wire-preparation.js?v=1';
import {C1_SERVICE,C4_SERVICE,serviceEnvelope} from '../dist/online-context.js?v=1';
import {c4SelectionFromLibrary} from '../dist/profile-selection.js?v=1';
import {updateLibrarySlot} from '../dist/deck-provenance.js?v=c4-editor-1';
import {RealtimeMatch} from '../realtime/src/match.js';
import {validQueuedDeck,continuesQueue} from '../realtime/src/selection.js';
await prepareC4Transport();
const request=()=>c4SelectionFromLibrary(updateLibrarySlot({version:1,updatedAt:1,slots:[['arcanine',...DEFAULT_DECK.slice(1)]]},0,0,'arcanine',{action:'accept',now:2}),0);
const players=()=>{const choice=request();return[{id:'a',tokenHash:'a',name:'A',deck:choice.deck,selection:choice.selection},{id:'b',tokenHash:'b',name:'B',deck:choice.deck,selection:choice.selection}];};
test('authority chooses C4 only under its explicit service and consented selection2',()=>{
 const p=players();assert.throws(()=>new RealtimeMatch({id:'x',players:p}));assert.throws(()=>new RealtimeMatch({id:'x',players:p,service:C4_SERVICE}));
 p[0].selection.slots[0]=null;assert.throws(()=>new RealtimeMatch({id:'x',players:p,service:C4_SERVICE,selectionVersion:2}));
});
test('C4 factory and stored match preserve cohort/Hog without changing the C1 default',()=>{
 const m=new RealtimeMatch({id:'x',players:players(),service:C4_SERVICE,selectionVersion:2,seed:4,now:1});
 assert.equal(m.game.cardFor('arcanine').damage,317);assert.equal(m.packet(0).protocol,5);assert.equal(m.packet(0).catalogRef,C4_SERVICE.catalogRef);assert.deepEqual(m.packet(0).game.hands[1],[]);
 m.game.start();assert.equal(m.game.deploy(0,0,240,500).ok,true);
 const stored=m.serialize(),before=structuredClone(stored),restored=new RealtimeMatch({stored,service:C4_SERVICE});assert.equal(restored.game.ruleset,'c4-1');assert.equal(restored.game.catalogRef,C4_SERVICE.catalogRef);assert.throws(()=>new RealtimeMatch({stored,service:C1_SERVICE}));assert.deepEqual(stored,before);
 const partial=structuredClone(stored),spawn=partial.events.find(entry=>entry.event.type==='spawn'&&entry.event.unit);assert.ok(spawn);spawn.event.unit.card={id:59};assert.throws(()=>new RealtimeMatch({stored:partial,service:C4_SERVICE}));
 const legacy=new RealtimeMatch({id:'old',players:[{id:'a',deck:DEFAULT_DECK},{id:'b',deck:DEFAULT_DECK}],seed:4});assert.equal(legacy.packet(0).protocol,4);assert.equal(legacy.game.cardFor('arcanine'),CARDS.arcanine);
});
test('persisted queue proof/context bind continuation and cannot cross C1/C4',()=>{
 const q=request(),row={joined:1,deck:JSON.stringify(q.keys),selection_version:2,profile_context:JSON.stringify(serviceEnvelope(C4_SERVICE)),c4_selection:JSON.stringify(q.selection)};
 assert.equal(validQueuedDeck(row,C4_SERVICE),true);assert.equal(validQueuedDeck(row,C1_SERVICE),false);assert.equal(continuesQueue(row,{mode:'search',deck:q.deck},C4_SERVICE),false);assert.equal(continuesQueue(row,{mode:'search',deck:q.deck,selection:q.selection},C4_SERVICE),true);
 assert.equal(validQueuedDeck({...row,profile_context:JSON.stringify({...serviceEnvelope(C4_SERVICE),catalogRef:'wrong'})},C4_SERVICE),false);
});

test('native stored matches validate all private state and events before adoption',async()=>{
 const native=JSON.parse(await readFile(new URL('fixtures/c4-native-consumer-shapes-v1.json',import.meta.url)));
 for(const sample of native.private){const stored=structuredClone(sample.stored),before=JSON.stringify(stored),match=new RealtimeMatch({stored,service:C4_SERVICE});assert.equal(match.game.ruleset,'c4-1');assert.equal(match.game.hands[0].length,4);assert.equal(JSON.stringify(stored),before);
  for(const corrupt of [value=>value.game.energy=null,value=>value.game.fields=null,value=>value.events=[{seq:0,event:{type:'burrow',hidden:true}}]]){const invalid=structuredClone(stored);corrupt(invalid);assert.throws(()=>new RealtimeMatch({stored:invalid,service:C4_SERVICE}),{code:'C4_SHAPE_INVALID'});}
 }
});
