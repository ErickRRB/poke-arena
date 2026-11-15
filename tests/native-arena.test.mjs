import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js?v=34';
import {ARENA,DEPLOY_GRID,RIVER,LANES,KING_Y,worldToScreen,screenToWorld,snapToCell,arenaBits} from '../dist/arena-geometry.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
test('native arena has18x32 cells, two-tile river and bridges, and exact tower anchors',()=>{
 assert.deepEqual([DEPLOY_GRID.columns,DEPLOY_GRID.rows],[18,32]);
 assert.equal(RIVER.bottom-RIVER.top,48);assert.deepEqual(LANES,[168,432]);
 assert.ok(arenaBits(300,400)&32);assert.equal(arenaBits(168,400)&32,0);
 assert.deepEqual(KING_Y,[712,88]);
});
test('uniform camera and inverse preserve square cells across three real viewport ratios',()=>{
 for(const[w,h]of[[370,677],[768,1024],[643,860]])for(const p of[{x:96,y:28},{x:300,y:400},{x:504,y:772}]){
  const screen=worldToScreen(p,w,h),point=screenToWorld(screen,w,h);
  assert.ok(Math.hypot(point.x-p.x,point.y-p.y)<1e-7);
  const x=worldToScreen({x:p.x+24,y:p.y},w,h),y=worldToScreen({x:p.x,y:p.y+24},w,h);
  assert.ok(Math.abs((x.x-screen.x)-(y.y-screen.y))<1e-7);
 }
});
test('deployment obeys native closed water, tower territories and a legal last row behind both kings',()=>{
 const g=new Game({tutorial:true});
 for(const team of[0,1]){
  const back={x:300,y:team?28:772};assert.equal(g.canDeploy(team,'geodude',back.x,back.y),true);
  assert.equal(g.canDeploy(team,'geodude',300,team?52:748),false);
  assert.equal(g.canDeploy(team,'geodude',168,team?364:436),true);
  assert.equal(g.canDeploy(team,'geodude',168,400),false);
  assert.equal(g.canDeploy(team,'fireball',ARENA.left-1,400),false);
  const enemy=g.towers.find(t=>t.team!==team&&!t.king&&t.lane===(team?1:0));enemy.hp=0;
  assert.equal(g.canDeploy(team,'geodude',team?432:168,400),true);
  assert.equal(g.canDeploy(team,'geodude',team?432:168,team?508:292),true);
  assert.equal(g.canDeploy(team,'geodude',team?432:168,team?532:268),false);
  assert.equal(g.canDeploy(team,'ampharos',team?432:168,400),false);
 }
});
test('legacy snapshot migration maps tower, unit and projectile positions without scaling combat statistics',()=>{
 const g=new Game({tutorial:true}),data=packGame(g);delete data.boardVersion;
 data.towers.forEach(t=>{t.x=t.king?300:t.lane?442:158;t.y=t.king?(t.team?94:706):(t.team?172:628);});
 data.units=[{id:99,key:'rhydon',team:0,x:158,y:444,hp:100,radius:18,card:{...CARDS.rhydon},targetId:null}];
 data.projectiles=[{id:100,x:158,y:388,start:{x:158,y:628},impactPoint:{x:442,y:172},linear:true,dx:1,dy:0,speed:288}];
 const restored=unpackGame(data),p=restored.projectiles[0];
 assert.equal(restored.boardVersion,2);assert.deepEqual(restored.towers.filter(t=>t.king).map(t=>t.y),[712,88]);
 assert.equal(restored.units[0].x,168);assert.equal(restored.units[0].card.range,CARDS.rhydon.range);
 assert.deepEqual([p.x,p.y,p.start.x,p.impactPoint.x,p.dx,p.speed],[168,376,168,432,1,288]);
 assert.deepEqual(perspective(perspective(packGame(restored),1),1),packGame(restored));
});
test('mid-Graveyard perspective preserves relative spawn offsets and produces mirrored remaining skeletons',()=>{
 const a=new Game({tutorial:true,seed:11});a.towers.forEach(t=>t.hp=0);a.start();a.hands[0][0]='nightmare';a.energy[0]=10;
 assert.ok(a.deploy(0,0,240,280).ok);for(let i=0;i<90;i++)a.step(1/30);
 const before=packGame(a),mirror=perspective(before,1);assert.deepEqual(mirror.fields[0].spawnSchedule,before.fields[0].spawnSchedule);
 const b=unpackGame(mirror);a.onEvent=()=>{};const left=[],right=[];
 a.onEvent=e=>{if(e.type==='spawn')left.push({x:e.unit.x,y:e.unit.y});};b.onEvent=e=>{if(e.type==='spawn')right.push({x:e.unit.x,y:e.unit.y});};
 for(let i=0;i<200;i++){a.step(1/30);b.step(1/30);}
 assert.equal(left.length,10);assert.equal(right.length,10);
 left.forEach((p,i)=>assert.ok(Math.hypot(right[i].x-(600-p.x),right[i].y-(800-p.y))<1e-7));
});
