import{test}from'node:test';
import assert from'node:assert/strict';
import{Game,CARDS,W,H}from'../dist/engine.js';
import{ARENA,TILE}from'../dist/arena-geometry.js';
import{packGame,unpackGame,perspective}from'../dist/snapshot.js';
import{resolvePlacementInput,PLACEMENT_INPUT_TILES}from'../dist/placement-input.js';
import{Renderer}from'../dist/render.js';

const fresh=()=>{const game=new Game({tutorial:true});game.start();game.aiEnabled=false;game.towers.forEach(t=>t.active=false);return game;};
const destroy=(game,team,lane)=>{const tower=game.towers.find(t=>t.team===1-team&&!t.king&&t.lane===lane);game.damage(tower,tower.hp,team);};

test('an eight-cell pointer overshoot shows a legal edge that the unchanged deploy validator accepts',()=>{
  for(const team of[0,1]){
    const g=fresh(),pointer={x:team?W-158:158,y:team?H-244:244},expected={x:team?432:168,y:team?364:436};
    assert.equal(g.resolveDeployment(team,'roselia',pointer.x,pointer.y),null,'The authoritative raw-input resolver is unchanged.');
    const point=resolvePlacementInput(g,team,'roselia',pointer.x,pointer.y);assert.deepEqual(point,expected);
    assert.ok(g.canDeploy(team,'roselia',point.x,point.y));g.hands[team][0]='roselia';g.energy[team]=10;
    const result=g.deploy(team,0,point.x,point.y);assert.ok(result.ok);assert.equal(result.x,point.x);assert.equal(result.y,point.y);
    assert.equal(g.energy[team],10-CARDS.roselia.cost);
  }
});

test('the nearest edge follows the destroyed princess lane and the king protection boundary',()=>{
  const g=fresh();destroy(g,0,1);
  assert.deepEqual(resolvePlacementInput(g,0,'roselia',300,148),{x:312,y:292});
  assert.deepEqual(resolvePlacementInput(g,0,'roselia',432,100),{x:432,y:292});
  destroy(g,0,0);assert.deepEqual(resolvePlacementInput(g,0,'roselia',300,100),{x:288,y:292});
  assert.equal(g.canDeploy(0,'roselia',300,100),false,'The pointer remains forbidden territory; only its final cell is legal.');
});

test('CPU and a mirrored online perspective resolve and submit the same final cell',()=>{
  const server=fresh();server.hands[1][0]='roselia';server.energy[1]=10;destroy(server,1,0);
  const client=unpackGame(perspective(packGame(server),1));
  const point=resolvePlacementInput(client,0,'roselia',300,148);assert.deepEqual(point,{x:312,y:292});
  const sent={x:W-point.x,y:H-point.y},result=server.deploy(1,0,sent.x,sent.y);
  assert.ok(result.ok);assert.deepEqual({x:result.x,y:result.y},sent);
});

test('lateral overshoot reaches the outer legal column for both teams and card types',()=>{
  for(const team of[0,1])for(const side of['left','right'])for(const key of['roselia','ampharos','log','diglettHorde','fireball']){
    const g=fresh(),x=side==='left'?ARENA.left-4*TILE:ARENA.right+4*TILE,y=team?268:532;
    const expected={x:side==='left'?96:504,y};
    assert.equal(g.resolveDeployment(team,key,x,y),null,'Raw out-of-arena coordinates stay illegal in the native validator.');
    const point=resolvePlacementInput(g,team,key,x,y);assert.deepEqual(point,expected,`${team}/${side}/${key}`);
    g.hands[team][0]=key;g.energy[team]=10;const result=g.deploy(team,0,point.x,point.y);
    assert.ok(result.ok);assert.deepEqual({x:result.x,y:result.y},expected);assert.equal(g.energy[team],10-CARDS[key].cost);
  }
});

test('lateral assistance also respects a destroyed enemy lane and mirrored submission',()=>{
  for(const team of[0,1])for(const lane of[0,1]){
    const g=fresh();destroy(g,team,lane);
    const x=lane?ARENA.right+2*TILE:ARENA.left-2*TILE,y=team?652:148;
    assert.deepEqual(resolvePlacementInput(g,team,'roselia',x,y),{x:lane?504:96,y:team?508:292});
  }
  const server=fresh();server.hands[1][0]='roselia';server.energy[1]=10;
  const client=unpackGame(perspective(packGame(server),1)),point=resolvePlacementInput(client,0,'roselia',ARENA.left-2*TILE,532);
  assert.deepEqual(point,{x:96,y:532});const sent={x:W-point.x,y:H-point.y},result=server.deploy(1,0,sent.x,sent.y);
  assert.ok(result.ok);assert.deepEqual({x:result.x,y:result.y},{x:504,y:268});
});

test('structures, rolling spells and swarms retain their real placement and one card cost',()=>{
  for(const key of['ampharos','log','diglettHorde']){
    const g=fresh(),point=resolvePlacementInput(g,0,key,158,244);assert.ok(point,key);
    assert.ok(g.canDeploy(0,key,point.x,point.y));g.hands[0][0]=key;g.energy[0]=10;
    const result=g.deploy(0,0,point.x,point.y);assert.ok(result.ok,key);assert.equal(g.energy[0],10-CARDS[key].cost);
    if(CARDS[key].spell)assert.deepEqual({x:g.spells[0].x,y:g.spells[0].y},point);
    else{const units=g.units.filter(u=>u.spawnGroup?.cardKey===key);assert.equal(units.length,CARDS[key].count||1);assert.ok(units.every(u=>u.spawnGroup.x===point.x&&u.spawnGroup.y===point.y));}
  }
});

test('legal spells are preserved and distant, vertical-outside and malformed pointers cancel',()=>{
  const g=fresh();assert.deepEqual(resolvePlacementInput(g,0,'fireball',168,172),g.resolveDeployment(0,'fireball',168,172));
  for(const[x,y]of[[158,220],[ARENA.left-(PLACEMENT_INPUT_TILES+1)*TILE,600],[ARENA.right+(PLACEMENT_INPUT_TILES+1)*TILE,600],[300,ARENA.top],[300,ARENA.bottom],[NaN,500],[Infinity,500],[300,Infinity]])assert.equal(resolvePlacementInput(g,0,'roselia',x,y),null);
  assert.equal(resolvePlacementInput(g,0,'missing-card',168,300),null);
  const match={resolveDeployment:()=>null,canDeploy:(team,key,x,y)=>team===0&&key==='room-profile'&&x===168&&y===436};
  assert.deepEqual(resolvePlacementInput(match,0,'room-profile',158,244),{x:168,y:436},'Input follows the actual match validity API, not a separate global catalogue.');
});

test('the visible troop ghost uses the exact assisted point consumed by deployment',()=>{
  for(const pointer of[{x:158,y:244},{x:36,y:532},{x:564,y:532}]){
  const game=fresh(),ghosts=[],context=new Proxy({globalAlpha:1,createRadialGradient:()=>({addColorStop(){}})},{get:(o,key)=>o[key]??(()=>{}),set:(o,key,value)=>(o[key]=value,true)});
  const r=Object.assign(Object.create(Renderer.prototype),{selection:'roselia',pointer,bodyHeights:new Map(),sprite:(c,u)=>ghosts.push({x:u.x,y:u.y})});
  r.drawPlacement(context,game);const point=resolvePlacementInput(game,0,'roselia',pointer.x,pointer.y);
  assert.deepEqual(ghosts,[point]);game.hands[0][0]='roselia';game.energy[0]=10;const result=game.deploy(0,0,point.x,point.y);
  assert.deepEqual({x:result.x,y:result.y},ghosts[0]);
  }
});
