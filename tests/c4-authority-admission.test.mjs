import test from 'node:test';import assert from 'node:assert/strict';
import {CARDS,DEFAULT_DECK} from '../dist/engine.js?v=34';
import {prepareC4Catalog} from '../dist/c4-catalog.js?v=1';
import {C1_SERVICE,C4_SERVICE,serviceEnvelope} from '../dist/online-context.js?v=1';
import {c4SelectionFromLibrary} from '../dist/profile-selection.js?v=1';
import {updateLibrarySlot} from '../dist/deck-provenance.js?v=c4-editor-1';
import {RealtimeMatch} from '../realtime/src/match.js';
import {validQueuedDeck,continuesQueue} from '../realtime/src/selection.js';
await prepareC4Catalog(CARDS);
const request=()=>c4SelectionFromLibrary(updateLibrarySlot({version:1,updatedAt:1,slots:[['arcanine',...DEFAULT_DECK.slice(1)]]},0,0,'arcanine',{action:'accept',now:2}),0);
const players=()=>{const choice=request();return[{id:'a',tokenHash:'a',name:'A',deck:choice.deck,selection:choice.selection},{id:'b',tokenHash:'b',name:'B',deck:choice.deck,selection:choice.selection}];};
test('authority chooses C4 only under its explicit service and consented selection2',()=>{
 const p=players();assert.throws(()=>new RealtimeMatch({id:'x',players:p}));assert.throws(()=>new RealtimeMatch({id:'x',players:p,service:C4_SERVICE}));
 p[0].selection.slots[0]=null;assert.throws(()=>new RealtimeMatch({id:'x',players:p,service:C4_SERVICE,selectionVersion:2}));
});
test('C4 factory and stored match preserve cohort/Hog without changing the C1 default',()=>{
 const m=new RealtimeMatch({id:'x',players:players(),service:C4_SERVICE,selectionVersion:2,seed:4,now:1});
 assert.equal(m.game.cardFor('arcanine').damage,317);assert.equal(m.packet(0).protocol,5);assert.equal(m.packet(0).catalogRef,C4_SERVICE.catalogRef);assert.deepEqual(m.packet(0).game.hands[1],[]);
 const stored=m.serialize(),restored=new RealtimeMatch({stored,service:C4_SERVICE});assert.equal(restored.game.ruleset,'c4-1');assert.equal(restored.game.catalogRef,C4_SERVICE.catalogRef);assert.throws(()=>new RealtimeMatch({stored,service:C1_SERVICE}));
 const legacy=new RealtimeMatch({id:'old',players:[{id:'a',deck:DEFAULT_DECK},{id:'b',deck:DEFAULT_DECK}],seed:4});assert.equal(legacy.packet(0).protocol,4);assert.equal(legacy.game.cardFor('arcanine'),CARDS.arcanine);
});
test('persisted queue proof/context bind continuation and cannot cross C1/C4',()=>{
 const q=request(),row={joined:1,deck:JSON.stringify(q.keys),selection_version:2,profile_context:JSON.stringify(serviceEnvelope(C4_SERVICE)),c4_selection:JSON.stringify(q.selection)};
 assert.equal(validQueuedDeck(row,C4_SERVICE),true);assert.equal(validQueuedDeck(row,C1_SERVICE),false);assert.equal(continuesQueue(row,{mode:'search',deck:q.deck},C4_SERVICE),false);assert.equal(continuesQueue(row,{mode:'search',deck:q.deck,selection:q.selection},C4_SERVICE),true);
 assert.equal(validQueuedDeck({...row,profile_context:JSON.stringify({...serviceEnvelope(C4_SERVICE),catalogRef:'wrong'})},C4_SERVICE),false);
});
