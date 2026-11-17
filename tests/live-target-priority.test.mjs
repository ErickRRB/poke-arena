import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
const fresh=()=>{const g=new Game({seed:42});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.cooldown=1e6);return g;};
const setup=(team=0,key='pikachu',x=550)=>{const g=fresh(),y=team?500:300,ey=team?540:260,a=g.spawn(key,team,432,y,0),b=g.spawn('machamp',1-team,x,ey,0),t=g.towers.find(t=>t.team===1-team&&!t.king&&t.lane===1);a.spawn=b.spawn=0;b.card={...b.card,passive:true,speed:0};return{g,a,b,t};};
for(const team of [0,1])test(`tower versus troop and reverse, team ${team}`,()=>{let {g,a,b,t}=setup(team);assert.equal(g.acquire(a),t);a.target=b;g.step(1/30);assert.equal(a.target,t);({g,a,b,t}=setup(team,'pikachu',520));assert.equal(g.acquire(a),b);a.target=t;g.step(1/30);assert.equal(a.target,b);});
test('engaged attack holds troop target',()=>{const {g,a,b}=setup();a.target=b;a.engaged=true;a.attack=.5;a.attackDuration=.76;g.step(1/30);assert.equal(a.target,b)});
test('small differences retain previous target outside engagement',()=>{const {g,a,b,t}=setup(0,'pikachu',540);a.target=b;g.step(1/30);assert.equal(a.target,b);assert.equal(g.acquire(a),t)});
test('destroyed tower and air eligibility respected',()=>{let {g,a,b,t}=setup();t.hp=0;assert.equal(g.acquire(a),b);({g,a,b,t}=setup());b.card={...b.card,flying:true};a.card={...a.card,air:false};assert.equal(g.acquire(a),t)});
test('building seeker ignores troops',()=>{const {g,a,t}=setup(0,'snorlax');assert.equal(g.acquire(a),t)});

test('eligible troop literally behind the princess does not displace it',()=>{const g=fresh(),a=g.spawn('pikachu',0,432,300,0),b=g.spawn('machamp',1,470,150,0),t=g.towers.find(t=>t.team===1&&!t.king&&t.lane===1);a.spawn=b.spawn=0;b.card={...b.card,passive:true,speed:0};assert.ok(b.y<t.y&&t.y<a.y);assert.equal(g.validTarget(a,b),true);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<=a.card.sightRange+a.radius+b.radius);assert.equal(g.acquire(a),t);g.step(1/30);assert.equal(a.target,t)});
test('preserves original gap ordering between eligible structures',()=>{const g=fresh(),a=g.spawn('pikachu',0,432,300,0),t=g.towers.find(t=>t.team===1&&!t.king&&t.lane===1);assert.equal(g.canDeploy(1,'cloyster',303,300),true);assert.equal(g.canDeploy(1,'regice',500,189),true);const c=g.spawn('cloyster',1,303,300,0),r=g.spawn('regice',1,500,189,0);a.spawn=c.spawn=r.spawn=0;assert.ok(Math.hypot(a.x-c.x,a.y-c.y)>Math.hypot(a.x-t.x,a.y-t.y));assert.ok(Math.hypot(a.x-r.x,a.y-r.y)-r.radius<Math.hypot(a.x-c.x,a.y-c.y)-c.radius);assert.equal(g.acquire(a),r)});
