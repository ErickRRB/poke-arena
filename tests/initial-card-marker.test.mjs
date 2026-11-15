import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';

function fixture(){
 const markers=[],group={id:11,x:300,y:532,duration:1,startAt:0,spawnCause:'card',cardKey:'diglettHorde'};
 const renderer=Object.assign(Object.create(Renderer.prototype),{verticalScale:1,bodyHeights:new Map(),deploymentIndicator:(_,marker,progress)=>markers.push({...marker,progress})});
 const unit=(id,cause='card',spawnGroup=group)=>({id,card:CARDS.diglettHorde,spawnCause:cause,spawnGroup,hp:81,spawn:.5,x:300,y:532});
 return{renderer,markers,group,unit};
}
test('one shared initial card group has one marker, even with a companion in the same group',()=>{
 const{renderer,markers,unit}=fixture();renderer.drawDeployments(null,{elapsed:.5,units:[unit(1),unit(2),unit(3,'companion')]});
 assert.equal(markers.length,1);assert.equal(markers[0].progress,.5);
});
for(const cause of['generated','companion','summon','death','spell','field','clone',undefined])test(`${cause||'historical'} units never borrow the initial card marker`,()=>{
 const{renderer,markers,unit}=fixture();const generated=unit(1,cause);if(cause===undefined)delete generated.spawnCause;
 renderer.drawDeployments(null,{elapsed:.5,units:[generated]});assert.equal(markers.length,0);
});
test('both the unit and group must identify a current direct deployment',()=>{
 for(const groupCause of[undefined,'summon','field']){
  const{renderer,markers,group,unit}=fixture();renderer.drawDeployments(null,{elapsed:.5,units:[unit(1,'card',{...group,spawnCause:groupCause})]});assert.equal(markers.length,0);
 }
 const{renderer,markers,group,unit}=fixture();renderer.drawDeployments(null,{elapsed:1,units:[unit(1,'card',group)]});assert.equal(markers.length,0,'a transformed or delayed body cannot resurrect an expired card group');
});
test('spawn events preload the Pokemon without queuing another appearance or recharge overlay',()=>{
 const{unit}=fixture(),r=Object.assign(Object.create(Renderer.prototype),{effects:[],ensureSpecies:async()=>{}});
 for(const cause of['card','summon','death','spell','field'])r.onEvent({type:'spawn',unit:unit(1,cause)});
 assert.deepEqual(r.effects,[]);
});
