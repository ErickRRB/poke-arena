import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js';
import {isLocalC4EditorPreview,cardForEditor,editorCardRole} from '../dist/deck-editor-profile.js';
import {updateLibrarySlot} from '../dist/deck-provenance.js';
const library=()=>({version:1,active:0,slots:[['arcanine','pikachu'],['arcanine'],['arcanine','arcanine'],null],updatedAt:100});
const card=(value,deckIndex=0,slotIndex=0,preview=true)=>cardForEditor({key:'arcanine',cards:CARDS,library:value,deckIndex,slotIndex,preview});

test('C4 presentation requires an explicit local URL and never enables on a public host',()=>{
 for(const host of ['localhost','127.0.0.1','[::1]'])assert.equal(isLocalC4EditorPreview('http://'+host+':3000/?preview=c4-editor-1'),true);
 for(const url of ['http://localhost:3000/','http://localhost:3000/?preview=1','https://poke-arena-web.eriickramiirez.workers.dev/?preview=c4-editor-1','https://localhost.example/?preview=c4-editor-1','file:///tmp/?preview=c4-editor-1'])assert.equal(isLocalC4EditorPreview(url),false);
});
test('accepting one saved position changes only its Info profile and leaves the C1 catalogue intact',()=>{
 const old=library(),original=JSON.stringify(CARDS.arcanine);assert.equal(card(old),CARDS.arcanine);assert.ok(card(old).charge>0&&card(old).burn>0);
 const accepted=updateLibrarySlot(old,0,0,'arcanine',{action:'accept',now:200}),hog=card(accepted);assert.equal(hog.nativeReference,'HogRider');assert.equal(hog.charge,0);assert.equal(hog.burn,0);assert.equal(hog.building,true);assert.equal(hog.riverJump,true);assert.equal(editorCardRole(hog,''),'Montapuercos');
 assert.equal(card(accepted,1),CARDS.arcanine);assert.equal(card(accepted,2,1),CARDS.arcanine);assert.equal(card(accepted,0,0,false),CARDS.arcanine);assert.equal(JSON.stringify(CARDS.arcanine),original);assert.deepEqual(old,library());
});
test('collection choice cannot be inferred from a missing or contradictory saved descriptor',()=>{
 const accepted=updateLibrarySlot(library(),0,0,'arcanine',{action:'accept',now:200}),conflict=structuredClone(accepted);conflict.slotProvenance.slots[0][0].key='onix';assert.equal(card(conflict),CARDS.arcanine);assert.equal(card(accepted,0,'0'),CARDS.arcanine);assert.equal(card(accepted,0,0,'true'),CARDS.arcanine);
 const missing=structuredClone(accepted);delete missing.slotProvenance;assert.equal(card(missing),CARDS.arcanine);assert.equal(card(missing,0,null).nativeReference,'HogRider');assert.equal(card(missing,0,null,false),CARDS.arcanine);
});
