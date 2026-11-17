import test from 'node:test';
import assert from 'node:assert/strict';
import {saveDeckLibrary,loadDeckLibrary} from '../dist/deck-storage.js';
const key='poke-arena:deck-slots',library=()=>({version:1,active:0,slots:[['arcanine','onix',null],null,[],null],updatedAt:100,opaque:{retain:true},slotProvenance:{version:1,slots:[[{key:'arcanine',choice:'hog-arcanine',catalogVersion:4,ruleset:'c4-1',acceptedAt:90,action:'accept'}],[],[],[]]}});
const memory=()=>{const map=new Map();return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('total write failure returns false and does not mutate the proposed envelope',()=>{
 const value=library(),before=structuredClone(value),blocked={getItem:()=>null,setItem(){throw Error('blocked');}};
 assert.equal(saveDeckLibrary(value,{storage:blocked,cookie:'',writeCookie(){throw Error('blocked');},readCookie:()=>'',now:200}),false);assert.deepEqual(value,before);
});
test('silently ignored storage and cookie writes cannot report success',()=>{
 const storage={getItem:()=>null,setItem(){}};
 assert.equal(saveDeckLibrary(library(),{storage,cookie:'',writeCookie(){},readCookie:()=>'',now:200}),false);
});
test('storage alone commits a verified envelope when cookie is silently blocked',()=>{
 const storage=memory(),value=library();assert.equal(saveDeckLibrary(value,{storage,cookie:'',writeCookie(){},readCookie:()=>'',now:200}),true);
 const saved=JSON.parse(storage.getItem(key));assert.deepEqual(saved.slots,value.slots);assert.deepEqual(saved.opaque,value.opaque);assert.deepEqual(saved.slotProvenance,value.slotProvenance);assert.equal(saved.updatedAt,200);
});
test('cookie alone commits after actual readback when storage throws',()=>{
 let cookie='';const blocked={getItem:()=>null,setItem(){throw Error('blocked');}},value=library();
 assert.equal(saveDeckLibrary(value,{storage:blocked,cookie,writeCookie:v=>{cookie=v;},readCookie:()=>cookie,now:200}),true);
 const saved=loadDeckLibrary({storage:blocked,cookie});assert.deepEqual(saved.slots,value.slots);assert.deepEqual(saved.slotProvenance,value.slotProvenance);assert.deepEqual(saved.opaque,value.opaque);assert.equal(saved.updatedAt,200);
});
test('calling an injected cookie writer without an effective readback is not persistence',()=>{
 let attempted=false;assert.equal(saveDeckLibrary(library(),{storage:null,cookie:'',writeCookie:()=>{attempted=true;},readCookie:()=>'',now:200}),false);assert.equal(attempted,true);
});
