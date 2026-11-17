import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadDeckLibrary,saveDeckLibrary} from '../dist/deck-storage.js';
import {savedSlotProfile,updateLibrarySlot} from '../dist/deck-provenance.js';
const fixture=()=>({version:1,active:0,slots:[['arcanine','pikachu','snorlax','machamp','blastoiseCannon','zubat','charizard','fireball'],['arcanine','onix','rapidash','exeggutor',null,'unknown','registeel','rhydon'],['arcanine','arcanine',null],null],updatedAt:500,legacyPayload:{version:7,raw:['unrecognized',null]}});
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('old Arcanines remain legacy while unrelated positions and another deck change',()=>{
 const old=fixture(),edited=updateLibrarySlot(old,0,1,'eevee',{now:100});assert.deepEqual(edited.slots.slice(1),old.slots.slice(1));assert.equal(savedSlotProfile(edited,0,0).kind,'legacy');assert.equal(savedSlotProfile(edited,1,0).kind,'legacy');assert.equal(edited.slotProvenance,undefined);assert.deepEqual(old,fixture());
 const accepted=updateLibrarySlot(edited,0,0,'arcanine',{action:'accept',now:101});assert.equal(savedSlotProfile(accepted,0,0).kind,'hog');assert.equal(savedSlotProfile(accepted,1,0).kind,'legacy');assert.equal(savedSlotProfile(accepted,2,1).kind,'legacy');assert.deepEqual(accepted.slots,edited.slots);
 const stamp=accepted.slotProvenance.slots[0][0].acceptedAt,neighbor=updateLibrarySlot(accepted,0,1,null,{now:2000});assert.equal(neighbor.slotProvenance.slots[0][0].acceptedAt,stamp);assert.equal(savedSlotProfile(neighbor,0,0).kind,'hog');assert.equal(neighbor.slots[0][1],null);assert.deepEqual(neighbor.slots[0].slice(2),accepted.slots[0].slice(2));
 const removed=updateLibrarySlot(neighbor,0,0,null);assert.equal(removed.slotProvenance.slots[0][0],null);assert.equal(removed.slots[0][1],null);assert.equal(removed.slots[0].length,8);
});
test('replacement and collection record only their explicit position; unknown choices are preserved',()=>{
 let library=fixture();library.slotProvenance={version:1,opaque:'keep',slots:[[],[{key:'unknown',choice:'future'}],[],[]]};
 library=updateLibrarySlot(library,0,1,'arcanine',{action:'collection',now:600});assert.equal(savedSlotProfile(library,0,1).kind,'hog');assert.equal(savedSlotProfile(library,0,0).kind,'legacy');assert.deepEqual(library.slotProvenance.slots[1],[{key:'unknown',choice:'future'}]);
 const replaced=updateLibrarySlot(library,0,1,'thunder',{action:'replace',now:700});assert.equal(replaced.slotProvenance.slots[0][1],null);assert.equal(replaced.slotProvenance.opaque,'keep');assert.deepEqual(replaced.legacyPayload,fixture().legacyPayload);
});
test('storage and cookie reload preserve per-position choices and monotonically advance future clocks',()=>{
 const storage=memory();let cookie='';const old=fixture();storage.setItem('poke-arena:deck-slots',JSON.stringify(old));storage.setItem('poke-arena:deck','["old-single-payload"]');
 const loaded=loadDeckLibrary({storage,cookie});assert.equal(storage.getItem('poke-arena:deck-slots'),JSON.stringify(old));const accepted=updateLibrarySlot(loaded,0,0,'arcanine',{action:'accept',now:10});
 assert.ok(saveDeckLibrary(accepted,{storage,cookie,now:1,writeCookie:value=>cookie=value}));const first=loadDeckLibrary({storage,cookie});assert.ok(first.updatedAt>accepted.updatedAt);assert.equal(savedSlotProfile(first,0,0).kind,'hog');assert.deepEqual(first.slots,old.slots);assert.deepEqual(first.legacyPayload,old.legacyPayload);assert.equal(storage.getItem('poke-arena:deck'),'["old-single-payload"]');
 assert.deepEqual(loadDeckLibrary({storage:null,cookie}),first);const stamp=first.slotProvenance.slots[0][0].acceptedAt;first.active=1;saveDeckLibrary(first,{storage,cookie,now:1,writeCookie:value=>cookie=value});const second=loadDeckLibrary({storage,cookie});assert.ok(second.updatedAt>first.updatedAt);assert.equal(second.slotProvenance.slots[0][0].acceptedAt,stamp);assert.equal(savedSlotProfile(second,1,0).kind,'legacy');
});
test('tied divergent sources retain both payloads and do not silently authorize Hog',()=>{
 const accepted=updateLibrarySlot(fixture(),0,0,'arcanine',{action:'accept',now:800}),cookiePayload=structuredClone(accepted);cookiePayload.slots[1][0]='rapidash';const storage=memory();storage.setItem('poke-arena:deck-slots',JSON.stringify(accepted));const cookie='poke_arena_decks='+encodeURIComponent(JSON.stringify(cookiePayload));const result=loadDeckLibrary({storage,cookie});
 assert.equal(savedSlotProfile(result,0,0).kind,'conflict');assert.deepEqual(result.provenanceConflict.storage,accepted);assert.deepEqual(result.provenanceConflict.cookie,cookiePayload);assert.equal(storage.getItem('poke-arena:deck-slots'),JSON.stringify(accepted));const chosen=updateLibrarySlot(result,0,0,'arcanine',{action:'accept',now:1});assert.equal(savedSlotProfile(chosen,0,0).kind,'hog');assert.deepEqual(chosen.provenanceConflict,result.provenanceConflict);const unrelated=updateLibrarySlot(result,0,1,'eevee',{now:900});assert.deepEqual(unrelated.provenanceConflict,result.provenanceConflict);
 const reorderedKeys={updatedAt:accepted.updatedAt,slots:accepted.slots,active:accepted.active,version:accepted.version,legacyPayload:accepted.legacyPayload,slotProvenance:accepted.slotProvenance};assert.equal(loadDeckLibrary({storage,cookie:'poke_arena_decks='+encodeURIComponent(JSON.stringify(reorderedKeys))}).provenanceConflict,undefined);
});
test('a descriptor cannot accept a different key, unknown format or old producer with missing metadata',()=>{
 const accepted=updateLibrarySlot(fixture(),0,0,'arcanine',{action:'accept',now:900}),mismatch=structuredClone(accepted);mismatch.slots[0][0]='onix';assert.equal(savedSlotProfile(mismatch,0,0).kind,'conflict');assert.equal(updateLibrarySlot(mismatch,0,0,'arcanine',{action:'accept'}),null);
 const oldProducer=structuredClone(accepted);delete oldProducer.slotProvenance;assert.equal(savedSlotProfile(oldProducer,0,0).kind,'legacy');const unknown=structuredClone(accepted);unknown.slotProvenance.version=99;assert.equal(savedSlotProfile(unknown,0,0).kind,'conflict');assert.throws(()=>updateLibrarySlot(unknown,0,0,'arcanine',{action:'accept'}));assert.equal(unknown.slotProvenance.version,99);
});
