import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareC4Catalog} from '../dist/c4-catalog.js?v=1';
import {Game,CARDS,DEFAULT_DECK} from '../dist/engine.js?v=target-c1-1';
import {LIGHT_EEVEE_RULESET,LIGHT_EEVEE_PRODUCER} from '../dist/arena-profile-producers.js?v=1';
import {EEVEE_LIGHT_SELECTION_REF as reference} from '../dist/arena-selection-profiles.js';
import {savedSlotProfile,updateLibrarySlot} from '../dist/deck-provenance.js';
import {checkArenaLibraryDeck,arenaSelectionFromLibrary,admitArenaSelection} from '../dist/arena-profile-selection.js';
import {c4SelectionFromLibrary} from '../dist/profile-selection.js';
import {checkCpuDeck} from '../dist/local-cpu-profile.js';
import {loadDeckLibrary,saveDeckLibrary} from '../dist/deck-storage.js';
import {cardForEditor} from '../dist/deck-editor-profile.js';
import {cardEquivalentLabel} from '../dist/card-equivalents.js';

await prepareC4Catalog();
const raw=()=>({version:1,active:0,updatedAt:100,slots:[['arcanine','eevee','pikachu','snorlax','zubat','charizard','fireball','machamp'],['espeon','eevee',null,'arcanine'],DEFAULT_DECK.slice(),null],opaque:{keep:['espeon','eevee']}});
const hog=()=>updateLibrarySlot(raw(),0,0,'arcanine',{action:'accept',now:200});
const converted=()=>updateLibrarySlot(hog(),0,1,'eevee',{action:'accept',profileChoice:'eevee-light-v1',now:300});
const memory=()=>{const map=new Map();return{getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};

test('unrelated edits preserve historical Eevee and Hog consent; conversion changes exactly one position',()=>{
 const original=hog(),before=structuredClone(original),oldGame=new Game({catalogVersion:4,ruleset:'c4-1'});
 const edit=updateLibrarySlot(original,0,2,'geodude',{now:250});
 assert.equal(c4SelectionFromLibrary(edit,0).ok,true);
 assert.equal(savedSlotProfile(edit,0,0).kind,'hog');assert.equal(savedSlotProfile(edit,0,1).kind,'legacy');
 assert.equal(checkArenaLibraryDeck(edit,0,{producer:LIGHT_EEVEE_PRODUCER}).reason,'acceptance-required');
 assert.deepEqual(original,before);assert.equal(oldGame.cardFor('eevee').cost,5);
 const next=updateLibrarySlot(edit,0,1,'eevee',{action:'accept',profileChoice:'eevee-light-v1',now:300});
 assert.deepEqual(next.slots[0].filter((_,i)=>i!==1),edit.slots[0].filter((_,i)=>i!==1));assert.deepEqual(next.slots.slice(1),edit.slots.slice(1));assert.deepEqual(next.opaque,edit.opaque);
 assert.deepEqual(next.slotProvenance.slots[0][0],edit.slotProvenance.slots[0][0]);assert.equal(next.slots[0][1],reference);
 const choice=checkCpuDeck(next,0);assert.equal(choice.ok,true);assert.equal(choice.ruleset,LIGHT_EEVEE_RULESET);assert.equal(choice.arenaProfileProducer,LIGHT_EEVEE_PRODUCER);
 const game=new Game({...choice,deck:choice.keys,cpuDeck:choice.keys});
 assert.equal(game.cardFor('eevee').cost,2);assert.equal(game.cardFor('eevee').damage,100);assert.equal(game.cardFor('arcanine').damage,317);
 assert.equal(game.cardFor('espeon'),oldGame.cardFor('espeon'));assert.equal(oldGame.cardFor('eevee').cost,5);assert.equal(CARDS.eevee.cost,5);
});

test('versioned selection roundtrips through the authority guard without accepting legacy or client profiles',()=>{
 const library=converted(),wire=arenaSelectionFromLibrary(library,0),before=structuredClone(library);
 assert.equal(wire.selection.version,3);assert.deepEqual(admitArenaSelection(wire.deck,JSON.parse(JSON.stringify(wire.selection))),checkArenaLibraryDeck(library,0));assert.deepEqual(library,before);
 assert.equal(c4SelectionFromLibrary(library,0).ok,false);
 for(const change of [
  s=>{s.arenaProfileProducer+=':unknown';},s=>{s.stats={damage:9999};},s=>{s.slots[1].ruleset='c4-1';},s=>{s.slots[1].choice='future';},s=>{s.slots[1].acceptedAt='300';},s=>{s.conflictClock=999;},s=>{delete s.slots[1].action;}
 ]){const selection=structuredClone(wire.selection);change(selection);assert.equal(admitArenaSelection(wire.deck,selection).ok,false);}
 assert.equal(admitArenaSelection(wire.deck.map(key=>key===reference?'eevee':key),wire.selection).ok,false);
 const legacy=c4SelectionFromLibrary(hog(),0);assert.deepEqual(admitArenaSelection(legacy.deck,legacy.selection),{ok:true,keys:legacy.keys,catalogVersion:4,ruleset:'c4-1'});
 const unknown=structuredClone(library);unknown.slots[0][1]='arena:espeon-single-v1';assert.equal(checkCpuDeck(unknown,0).ok,false);
 const duplicate=structuredClone(library);duplicate.slots[0][2]=reference;assert.equal(checkCpuDeck(duplicate,0).ok,false);
});

test('explicit new references preserve saved libraries and require resolving positional conflicts',()=>{
 const storage=memory(),fresh=loadDeckLibrary({storage,cookie:''});assert.deepEqual(fresh.slots[0],DEFAULT_DECK);
 const added=updateLibrarySlot(fresh,0,0,'eevee',{action:'collection',profileChoice:'eevee-light-v1',now:200});assert.equal(added.slots[0][0],reference);assert.equal(checkCpuDeck(added,0).ok,true);
 const explicit=structuredClone(added);delete explicit.slotProvenance;assert.equal(checkCpuDeck(explicit,0).ok,true);
 storage.setItem('poke-arena:deck',JSON.stringify(DEFAULT_DECK));assert.deepEqual(loadDeckLibrary({storage,cookie:''}).slots[0],DEFAULT_DECK);
 const value=converted();let cookie='';assert.equal(saveDeckLibrary(value,{storage,cookie,writeCookie:v=>cookie=v,readCookie:()=>cookie,now:400}),true);
 const restored=loadDeckLibrary({storage,cookie});assert.deepEqual(restored.slots,value.slots);assert.deepEqual(restored.slotProvenance,value.slotProvenance);assert.equal(checkCpuDeck(restored,0).ok,true);
 const conflicted=structuredClone(explicit);conflicted.provenanceConflict={updatedAt:500,storage:explicit,cookie:{...explicit,active:1}};assert.equal(checkCpuDeck(conflicted,0).reason,'profile-conflict');
 const accepted=updateLibrarySlot(conflicted,0,0,'eevee',{action:'accept',profileChoice:'eevee-light-v1',now:100});assert.equal(checkCpuDeck(accepted,0).ok,true);assert.deepEqual(accepted.provenanceConflict,conflicted.provenanceConflict);
});

test('Info and collection resolve the selected profile without mutating the historical card or Espeon',()=>{
 const old=hog(),next=converted(),editor=(library,slotIndex)=>cardForEditor({key:'eevee',cards:CARDS,library,deckIndex:0,slotIndex,preview:true});
 assert.equal(editor(old,1),CARDS.eevee);assert.equal(editor(next,1).cost,2);assert.equal(editor(old,null).cost,2);assert.equal(cardEquivalentLabel('eevee',editor(next,1)),'Ciclo · presión');assert.equal(cardEquivalentLabel('eevee',CARDS.eevee),'Príncipe');
 const actual=new Game({catalogVersion:4,ruleset:LIGHT_EEVEE_RULESET}).cardFor('eevee');for(const key of ['id','name','cost','hp','damage','interval','range','speed','role','description','charge','riverJump','style','scale','attackAnim','windup','attackDuration'])assert.deepEqual(editor(next,1)[key],actual[key],key);
 const conflict=structuredClone(next);conflict.slotProvenance.slots[0][1].choice='unknown';assert.equal(checkCpuDeck(conflict,0).ok,false);assert.equal(editor(conflict,1).cost,2);
 const original=JSON.stringify(CARDS.espeon);assert.equal(cardForEditor({key:'espeon',cards:CARDS,library:next,deckIndex:1,slotIndex:0,preview:true}),CARDS.espeon);assert.equal(JSON.stringify(CARDS.espeon),original);
 assert.equal(updateLibrarySlot(old,0,0,'eevee',{action:'accept',profileChoice:'eevee-light-v1'}),null);
});
