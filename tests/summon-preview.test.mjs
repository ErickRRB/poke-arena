import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=34';
test('barrel prediction is pure and matches actual summons with obstacles and both perspectives',()=>{
 for(const team of [0,1]){const game=new Game({seed:192});game.start();game.aiEnabled=false;const tower=game.towers.find(t=>t.team!==team&&!t.king),card=CARDS.sneaselAmbush,spell={card,team,x:tower.x,y:tower.y};const before=JSON.stringify({units:game.units,towers:game.towers,nextId:game.nextId});const predicted=game.summonSpellPositions(spell);assert.equal(JSON.stringify({units:game.units,towers:game.towers,nextId:game.nextId}),before);game.summonSpell(spell);assert.deepEqual(game.units.map(({x,y})=>({x,y})),predicted);assert.equal(predicted.length,3);}
});
test('summon preview accepts an explicit card resolver shared with its producer',()=>{
 const game=new Game({seed:192});game.start();game.aiEnabled=false;const tower=game.towers.find(t=>t.team===1&&!t.king),spell={card:CARDS.sneaselAmbush,team:0,x:tower.x,y:tower.y};let calls=0;
 const resolve=key=>{calls++;return key===spell.card.spawnKey?{...CARDS[key],radius:30}:CARDS[key]};
 const normal=game.summonSpellPositions(spell),predicted=game.summonSpellPositions(spell,resolve);assert.ok(calls>0);assert.notDeepEqual(predicted,normal);
 game.summonSpell(spell,resolve);assert.deepEqual(game.units.map(({x,y})=>({x,y})),predicted);
});
test('summon name clears the upper ghost while previews retain producer coordinates',async()=>{
 const {Renderer}=await import('../dist/render.js');const g=new Game({seed:192});g.start();g.aiEnabled=false;g.energy[0]=10;const p={x:168,y:172},ghosts=[],labels=[];
 const ctx=new Proxy({globalAlpha:1,measureText:()=>({width:120}),createRadialGradient:()=>({addColorStop(){}}),fillText:(label,x,y)=>labels.push({label,x,y})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const r=Object.assign(Object.create(Renderer.prototype),{selection:'sneaselAmbush',pointer:p,verticalScale:1,worldBounds:{left:60,top:-48,right:540},t:0,sprite:(c,u)=>ghosts.push({x:u.x,y:u.y}),capsule(){}});
 const before=JSON.stringify({units:g.units,towers:g.towers,energy:g.energy});r.drawPlacement(ctx,g);assert.equal(JSON.stringify({units:g.units,towers:g.towers,energy:g.energy}),before);
 const positions=g.summonSpellPositions({card:CARDS.sneaselAmbush,team:0,...p});assert.deepEqual(ghosts,positions);assert.equal(labels.length,1);assert.equal(labels[0].label,CARDS.sneaselAmbush.name);assert.ok(p.y+labels[0].y<=Math.min(...positions.map(v=>v.y))-32);
});
