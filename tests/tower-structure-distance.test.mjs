import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
const fresh=()=>{const g=new Game({seed:42});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.cooldown=1e6);return g;};
function scene(key,offset){
 const g=fresh(),a=g.spawn(key,0,432,300,0),tower=g.towers.find(t=>t.team===1&&!t.king&&t.lane===1),b=g.spawn('regice',1,350,200,0);
 const center=128+b.radius-tower.radius+offset;b.y=a.y-Math.sqrt(center**2-(a.x-b.x)**2);return {g,a,tower,b};
}
for(const key of ['snorlax','pikachu','charizard'])for(const [label,offset,want] of [['closer',-1,'b'],['equal',0,'b'],['farther',1,'tower']])test(`${key}: ${label} structure at acquisition and retarget`,()=>{
 const s=scene(key,offset),{g,a,tower,b}=s;assert.equal(g.acquire(a),s[want]);
 a.target=tower;a.engaged=false;g.step(1/30);assert.equal(a.target,s[want]);
});
test('outside structure acquisition never pulls despite being closer than tower',()=>{
 const g=fresh(),a=g.spawn('snorlax',0,432,600,0),b=g.spawn('regice',1,432,300,0),tower=g.towers.find(t=>t.team===1&&!t.king&&t.lane===1);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>a.card.pullRange+a.radius+b.radius);assert.equal(g.acquire(a),tower);
});
test('enemy troop remains preferred by non building seeker',()=>{
 const {g,a}=scene('pikachu',-1),foe=g.spawn('machamp',1,432,270,0);assert.equal(g.acquire(a),foe);a.target=null;g.step(1/30);assert.equal(a.target,foe);
});
test('building-only units still ignore enemy troops',()=>{
 const {g,a,b}=scene('snorlax',-1);g.spawn('machamp',1,432,270,0);assert.equal(g.acquire(a),b);
});

test('a previously selected structure is released when it becomes farther than a tower',()=>{
 for(const key of ['snorlax','pikachu','charizard']){const {g,a,tower,b}=scene(key,1);a.target=b;a.engaged=false;g.step(1/30);assert.equal(a.target,tower,key);}
});
test('engaged attackers keep their existing combat lock',()=>{
 const {g,a,b}=scene('snorlax',1);a.target=b;a.engaged=true;a.attack=.5;a.attackDuration=.66;g.step(1/30);assert.equal(a.target,b);
});
test('non building attackers retain the acquisition gate',()=>{
 for(const key of ['pikachu','charizard']){const g=fresh(),a=g.spawn(key,0,432,600,0),b=g.spawn('regice',1,432,300,0),tower=g.towers.find(t=>t.team===1&&!t.king&&t.lane===1);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>a.card.sightRange+a.radius+b.radius);assert.equal(g.acquire(a),tower,key);}
});

