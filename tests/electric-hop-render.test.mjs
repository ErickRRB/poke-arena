import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../dist/render.js';
import {CARDS} from '../dist/engine.js';

function fixture(){
 const art=[],beams=[],c=new Proxy({globalAlpha:1},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const r=Object.assign(Object.create(Renderer.prototype),{frameActors:new Map(),visualProjectiles:new Map(),t:0,drawDt:1/60,gameElapsed:0,verticalScale:1,reduced:false,effects:[],numbers:[],combatArt:(_,name,x,y)=>art.push({name,x,y}),battleArt:{beam:(...args)=>beams.push(args)}});
 const p={id:'100:1:hop1',electricChain:true,key:'voltorb',sourceId:100,chainFromId:101,hop:1,card:CARDS.voltorb,target:{id:102,x:300,y:500},lastPoint:{x:300,y:500},startX:200,startY:500,x:200,y:500,liftX:0,liftY:-15,endLiftY:-15,totalDistance:100,travelled:0,speed:480,flyAt:.15,nextStepAt:.2};
 return{r,p,c,art,beams};
}
test('a pending native electric hop has no carrier or full beam before its flight begins',()=>{
 const{r,p,c,art,beams}=fixture();r.gameElapsed=.149;r.projectile(c,p);assert.deepEqual(art,[]);assert.deepEqual(beams,[]);
 r.gameElapsed=.15;r.projectile(c,p);assert.deepEqual(art.map(a=>a.name),['electricHop']);assert.deepEqual(beams,[]);
});
test('electric flight survives a missing source and a removed target using its saved last point',()=>{
 const{r,p,c,art}=fixture();r.gameElapsed=.3;p.target=undefined;p.x=248;p.travelled=48;r.projectile(c,p);
 assert.equal(art.length,1);assert.ok(Number.isFinite(art[0].x)&&Number.isFinite(art[0].y));assert.equal(art[0].name,'electricHop');
});
for(const reduced of[false,true])test(`each real arrival creates only its own short contact flash, reduced=${reduced}`,()=>{
 const{r}=fixture();r.reduced=reduced;
 r.onEvent({type:'beam',key:'voltorb',style:'lightning',hop:1,from:{x:200,y:485},to:{x:300,y:485},chainFromId:101,targetId:102});
 assert.equal(r.effects.length,1);assert.equal(r.effects[0].life,.18);
 r.onEvent({type:'beam',key:'voltorb',style:'lightning',hop:2,missed:true,from:{x:300,y:485},to:{x:350,y:485}});assert.equal(r.effects.length,1,'a missed arrival does not pretend to hit');
});
test('15Hz authoritative electric positions advance over the intervening display frames without early full links',()=>{
 const{r,p,c,art,beams}=fixture();p.target.x=700;p.lastPoint.x=700;p.totalDistance=500;p.flyAt=0;const points=[];
 for(let frame=0;frame<30;frame++){
  p.travelled=Math.floor(frame/4)*p.speed/15;p.x=200+p.travelled;r.t=frame/60;r.gameElapsed=Math.floor(frame/4)/15;art.length=0;r.projectile(c,p);points.push(art[0]);
 }
 assert.equal(beams.length,0);assert.ok(points.slice(1).filter((p,i)=>p.x>points[i].x).length>=26);
 const before=points.at(-1);r.drawDt=0;art.length=0;r.projectile(c,p);assert.deepEqual(art[0],before,'pause freezes the carrier at its current phase');
});
test('Lightning draws only each actual vertical target beam, while Zap retains its instant area effect',()=>{
 const{r}=fixture();r.onEvent({type:'spellHit',key:'lightning',x:300,y:268,radius:84,team:0});assert.equal(r.effects.length,0,'no full-area burst pretends that the three-target spell hit every body');
 r.onEvent({type:'beam',key:'lightning',style:'lightning',from:{x:300,y:80},to:{x:300,y:250},team:0});assert.equal(r.effects.length,1);assert.equal(r.effects[0].kind,'beam');
 r.onEvent({type:'spellHit',key:'thunder',x:300,y:268,radius:60,team:0});assert.equal(r.effects.at(-1).kind,'entry');
});
