import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,LANES,RIVER,directionRow} from '../dist/engine.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js';

function scene(kind,team=0,lane=0){
 const g=new Game({seed:42});g.start();g.aiEnabled=false;g.towers.forEach(t=>{t.active=false;t.hp=t.maxHp=1e8;});
 const x=LANES[lane],y=value=>team?800-value:value,target=g.towers.find(t=>t.team!==team&&t.lane===lane),unit=g.spawn(kind==='air'?'celebi':'snorlax',team,x,y(kind==='tower'?300:500),0),bodies=[];
 if(kind==='swarm')for(let i=0;i<9;i++){const body=g.spawn('diglett',1-team,x+(i%3-1)*18,y(430+Math.floor(i/3)*18),0);body.card={...body.card,speed:0,passive:true};bodies.push(body);}
 if(kind==='tower')for(let i=0;i<5;i++)bodies.push(g.spawn('machamp',team,x+(i%3-1)*21,y(226+Math.floor(i/3)*20),0));
 if(kind==='crowd'||kind==='air')for(let i=0;i<6;i++)bodies.push(g.spawn(kind==='air'?'charizard':'snorlax',team,x+(i%3-1)*15,y(440+Math.floor(i/3)*20),0));
 return{g,unit,target,bodies};
}
function follow(s,seconds=20){
 const start=s.unit.y;let lastSign=0,reversals=0,lastRow=null,turns=0;
 for(let i=0;i<seconds*60;i++){
  for(const body of s.bodies)if(body.card.speed&&Math.hypot(body.x-s.target.x,body.y-s.target.y)>body.card.range+s.target.radius)s.g.move(body,s.target,1/60);
  if(Math.hypot(s.unit.x-s.target.x,s.unit.y-s.target.y)>s.unit.card.range+s.target.radius)s.g.move(s.unit,s.target,1/60);
  const sign=Math.abs(s.unit.dx)>.15?Math.sign(s.unit.dx):0,row=directionRow(s.unit.dx,s.unit.dy);
  if(sign&&lastSign&&sign!==lastSign)reversals++;if(sign)lastSign=sign;if(lastRow!==null&&row!==lastRow)turns++;lastRow=row;
  for(const u of[s.unit,...s.bodies])if(!u.card.flying&&u.y>=RIVER.top&&u.y<=RIVER.bottom)assert.ok(Math.abs(u.x-LANES[u.lane])<=30,'body pushed off bridge');
 }
 return{advance:(s.unit.team?1:-1)*(s.unit.y-start),reversals,turns};
}
test('an enemy swarm slows a tower seeker without trapping it or rapidly flipping its direction',()=>{
 for(const team of[0,1])for(const lane of[0,1]){
  const blocked=follow(scene('swarm',team,lane)),clear=follow(scene('empty',team,lane));
  assert.ok(blocked.advance>120,JSON.stringify(blocked));assert.ok(blocked.advance<clear.advance-35,'swarm should still slow the tank');assert.ok(blocked.reversals<12);assert.ok(blocked.turns<24);
 }
});
test('nearby large allies and airborne crowds pass each other with stable headings',()=>{
 for(const kind of['crowd','air'])for(const team of[0,1])for(const lane of[0,1]){const result=follow(scene(kind,team,lane));assert.ok(result.advance>200,JSON.stringify({kind,...result}));assert.ok(result.reversals<8);assert.ok(result.turns<14);}
});
test('a stationary friendly front line near either princess does not cause side-to-side oscillation',()=>{
 for(const team of[0,1])for(const lane of[0,1]){const result=follow(scene('tower',team,lane));assert.ok(result.advance>65);assert.ok(result.reversals<4);assert.ok(result.turns<8);}
});
test('actual combat ticks keep a win condition advancing through a harmless enemy swarm',()=>{
 const s=scene('swarm'),start=s.unit.y;let reversals=0,last=0;
 for(let i=0;i<20*60;i++){s.g.step(1/60);const sign=Math.abs(s.unit.dx)>.15?Math.sign(s.unit.dx):0;if(sign&&last&&sign!==last)reversals++;if(sign)last=sign;}
 assert.ok(start-s.unit.y>120);assert.ok(reversals<14);assert.equal(s.unit.target,s.target);
});
test('crowd steering and separation survive serialization and reverse with the online perspective',()=>{
 const s=scene('swarm');follow(s,2);const packed=packGame(s.g),mirrored=perspective(packed,1),a=packed.units[0],b=mirrored.units[0];
 for(const key of['steerX','steerY','separateX','separateY'])assert.equal(b[key],-a[key],key);
 const clone=unpackGame(JSON.parse(JSON.stringify(packed))),copy={g:clone,unit:clone.units[0],target:clone.towers.find(t=>t.id===s.target.id),bodies:clone.units.slice(1)};
 follow(s,3);follow(copy,3);assert.ok(Math.abs(copy.unit.x-s.unit.x)<1e-8);assert.ok(Math.abs(copy.unit.y-s.unit.y)<1e-8);
});
