import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../dist/render.js';
import { Game, CARDS } from '../dist/engine.js';
import {spellPreviewTargets} from '../dist/spell-preview.js';
function drawing(key){
  const calls=[];const ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>calls.push({method:k,args})),set:(o,k,v)=>(o[k]=v,true)});
  const game=new Game({seed:433});game.start();game.aiEnabled=false;game.energy[0]=10;game.deploymentThreats=()=>[];
  const renderer=Object.assign(Object.create(Renderer.prototype),{selection:key,pointer:{x:300,y:500},t:0,reduced:true,sprite(){}});
  return{game,renderer,ctx,calls};
}
test('a troop preview draws one range circle and a cell marker, without a second footprint circle',()=>{
  const{game,renderer,ctx,calls}=drawing('pikachu');renderer.drawPlacement(ctx,game);
  assert.deepEqual(calls.filter(c=>c.method==='arc').map(c=>c.args[2]),[CARDS.pikachu.range]);assert.equal(calls.filter(c=>c.method==='ellipse').length,0);assert.ok(calls.some(c=>c.method==='strokeRect'));
});
test('after placement no old hover or preview can draw a placement indicator',()=>{
  const{game,renderer,ctx,calls}=drawing(null);renderer.deploymentPreview={key:'pikachu',x:300,y:500,until:50};renderer.drawPlacement(ctx,game);assert.deepEqual(calls,[]);
});
test('only ranged attacks show a troop range circle, including the ranged members of a mixed squad',()=>{
  for(const[key,radii]of[['centralElectrode',[]],['voltorb',[]],['pandilla',[120]],['meganium',[CARDS.meganium.range]],['regice',[CARDS.regice.range]]]){const{game,renderer,ctx,calls}=drawing(key);renderer.drawPlacement(ctx,game);assert.deepEqual(calls.filter(c=>c.method==='arc').map(c=>c.args[2]),radii,key);}
});
test('melee troops never show explosion, jump, splash or short attack reach as a range circle',()=>{
  for(const[key,card]of Object.entries(CARDS).filter(([,c])=>!c.spell&&!c.squad&&c.range<50)){
    const{game,renderer,ctx,calls}=drawing(key);renderer.drawPlacement(ctx,game);assert.equal(calls.filter(c=>c.method==='arc').length,0,key);
  }
});
test('a spell has one target boundary and Rueda Fuego has no circular area',()=>{
  for(const[key,radii]of[['spikes',[CARDS.spikes.splash]],['log',[]]]){const{game,renderer,ctx,calls}=drawing(key);renderer.drawPlacement(ctx,game);assert.deepEqual(calls.filter(c=>c.method==='arc').map(c=>c.args[2]),radii);}
});

test('Rueda Fuego previews only its deployment cell, with no path, corridor or snap connector in either perspective',()=>{
  for(const team of[0,1]){
    const{game,renderer,ctx,calls}=drawing('log');
    game.energy[team]=10;renderer.placementTeam=team;renderer.pointer={x:310,y:team?380:420};
    const anchor=game.resolveDeployment(team,'log',renderer.pointer.x,renderer.pointer.y);
    assert.ok(anchor);assert.ok(Math.hypot(anchor.x-renderer.pointer.x,anchor.y-renderer.pointer.y)>24);
    renderer.drawPlacement(ctx,game);
    assert.deepEqual(calls.filter(c=>c.method==='fillRect').map(c=>c.args),[[anchor.x-12,anchor.y-12,24,24]]);
    assert.equal(calls.filter(c=>['arc','ellipse','strokeRect','setLineDash','closePath'].includes(c.method)).length,0);
    const points=calls.filter(c=>['moveTo','lineTo'].includes(c.method));
    assert.equal(points.length,16);
    for(const {args:[x,y]}of points){assert.ok(Math.abs(x-anchor.x)<=12);assert.ok(Math.abs(y-anchor.y)<=12);}
  }
});

test('spell previews exclude allies, defeated enemies, deploying troops and out-of-area targets',()=>{
  const{game}=drawing(null);game.towers=[];
  const ground=game.spawn('squirtle',1,300,300,0),air=game.spawn('zubat',1,320,300,0);
  game.spawn('squirtle',0,300,300,0);game.spawn('squirtle',1,500,300,0);game.spawn('squirtle',1,300,300,.5);game.spawn('squirtle',1,300,300,0).hp=0;
  assert.deepEqual(spellPreviewTargets(game,CARDS.thunder,{x:300,y:300}).map(t=>t.id),[ground.id,air.id]);
  assert.deepEqual(spellPreviewTargets(game,CARDS.spikes,{x:300,y:300}).map(t=>t.id),[ground.id]);
});

test('selective lightning previews only the three highest-health enemies, including towers',()=>{
  const{game}=drawing(null);game.towers=game.towers.filter(t=>t.team===1&&!t.king&&t.lane===0);const tower=game.towers[0];
  const units=[100,900,500,900].map(hp=>{const u=game.spawn('squirtle',1,tower.x,tower.y,0);u.hp=hp;return u;});
  assert.deepEqual(spellPreviewTargets(game,CARDS.lightning,tower).map(t=>t.id),[tower.id,units[1].id,units[3].id]);
});

test('persistent damage fields only mark the types they can affect and summon spells have no direct targets',()=>{
  const{game}=drawing(null);game.towers=game.towers.filter(t=>t.team===1&&!t.king&&t.lane===0);const tower=game.towers[0];
  const ground=game.spawn('squirtle',1,tower.x,tower.y,0),air=game.spawn('zubat',1,tower.x,tower.y,0),structure=game.spawn('regice',1,tower.x,tower.y,0);
  assert.deepEqual(spellPreviewTargets(game,CARDS.stealthRock,tower).map(t=>t.id),[ground.id,air.id,structure.id]);
  assert.deepEqual(spellPreviewTargets(game,CARDS.earthquake,tower).map(t=>t.id),[ground.id,structure.id,tower.id]);
  assert.deepEqual(spellPreviewTargets(game,CARDS.nightmare,tower),[]);
});

test('rolling previews follow the whole corridor and its target radii in either direction',()=>{
  for(const team of[0,1]){
    const{game}=drawing(null);game.towers=[];const y=team?280:520,direction=team?1:-1;
    const inside=game.spawn('squirtle',1-team,340,y+direction*150,0);
    game.spawn('zubat',1-team,300,y+direction*150,0);game.spawn('squirtle',1-team,400,y+direction*150,0);game.spawn('squirtle',1-team,300,y-direction*100,0);
    assert.deepEqual(spellPreviewTargets(game,CARDS.log,{x:300,y},team).map(t=>t.id),[inside.id]);
  }
});

test('each damage spell previews the enemies actually hit in a stationary combat sandbox',()=>{
  for(const[key,card]of Object.entries(CARDS).filter(([,c])=>c.spell)){
    const events=[],game=new Game({seed:383,onEvent:e=>events.push(e)});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);
    const point=card.rolling?{x:300,y:520}:{x:158,y:172},center=card.rolling?{x:300,y:350}:point;
    for(const[k,x,y]of[['squirtle',center.x,center.y],['zubat',center.x+20,center.y],['regice',center.x-20,center.y+10],['snorlax',center.x+35,center.y]]){
      const u=game.spawn(k,1,x,y,0);u.card={...u.card,speed:0};u.cooldown=999;
    }
    const expected=spellPreviewTargets(game,card,point).map(t=>t.id).sort((a,b)=>a-b);
    game.hands[0][0]=key;game.energy[0]=10;assert.equal(game.deploy(0,0,point.x,point.y).ok,true,key);
    for(let i=0;i<150;i++)game.step(1/60);
    const actual=[...new Set(events.filter(e=>e.type==='damage'&&e.sourceKey===key).map(e=>e.target.id))].sort((a,b)=>a-b);
    assert.deepEqual(actual,expected,key);
  }
});

test('hover targets update immediately and clear on pointer exit, cancellation, casting or pause',()=>{
  const{game,renderer}=drawing('thunder');const unit=game.spawn('squirtle',1,300,500,0);renderer.updateSpellTargets(game);assert.ok(renderer.spellTargets.has(unit.id));
  renderer.pointer={x:50,y:50};renderer.updateSpellTargets(game);assert.equal(renderer.spellTargets.size,0);
  for(const change of[r=>r.pointer=null,r=>r.selection=null,r=>r.selection='voltorb',()=>game.state='paused']){
    renderer.selection='thunder';renderer.pointer={x:300,y:500};game.state='playing';renderer.updateSpellTargets(game);assert.ok(renderer.spellTargets.size>0);change(renderer);renderer.updateSpellTargets(game);assert.equal(renderer.spellTargets.size,0);
  }
});

test('Rueda Fuego keeps red target feedback in both perspectives and clears it on exit or release',()=>{
  for(const team of[0,1]){
    const{game,renderer}=drawing('log');game.energy[team]=10;game.towers=[];
    renderer.placementTeam=team;renderer.pointer={x:300,y:team?280:520};
    const point=game.resolveDeployment(team,'log',renderer.pointer.x,renderer.pointer.y),direction=team?1:-1;
    const target=game.spawn('squirtle',1-team,point.x,point.y+direction*100,0);
    renderer.updateSpellTargets(game);assert.ok(renderer.spellTargets.has(target.id));
    renderer.pointer=null;renderer.updateSpellTargets(game);assert.equal(renderer.spellTargets.size,0);
    renderer.pointer=point;renderer.updateSpellTargets(game);assert.ok(renderer.spellTargets.has(target.id));
    renderer.selection=null;renderer.updateSpellTargets(game);assert.equal(renderer.spellTargets.size,0);
  }
});
