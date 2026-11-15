import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{Game,CARDS,DEFAULT_DECK}from'../dist/engine.js';import{packGame,unpackGame,migrateLegacyCardIdentity}from'../dist/snapshot.js';
const native=JSON.parse(readFileSync(new URL('../docs/CR-NATIVE-2026-11-03.json',import.meta.url))),row=native.cards.find(c=>c.name==='Cannon');
const make=()=>{const events=[];let game;game=new Game({seed:775,deck:['blastoiseCannon',...DEFAULT_DECK.filter(k=>k!=='blastoiseCannon')],onEvent:e=>events.push({event:e,at:game.elapsed})});game.start();game.aiEnabled=false;for(const t of game.towers)t.active=false;return{game,events}};
const run=(g,s)=>{for(let i=0;i<Math.round(s*30);i++)g.step(1/30)};
test('Blastoise has the complete native Cannon contract, without inherited mobile or area mechanics',()=>{
 const c=CARDS.blastoiseCannon;assert.equal(c.id,9);assert.equal(c.nativeReference,'Cannon');assert.equal(c.cost,row.elixir);assert.equal(c.cost,3);assert.equal(c.hp,Math.floor(row.hitpoints*2.56));assert.equal(c.damage,Math.floor(row.damage*2.56));assert.equal(c.interval,row.hit_speed_ms/1000);assert.equal(c.windup,(row.hit_speed_ms-row.load_time_ms)/1000);assert.equal(c.range,row.range_milli*.024);assert.equal(c.radius,row.collision_radius_milli*.024);assert.equal(c.lifetime,30);assert.equal(c.deployTime,1);assert.equal(c.projectileSpeed,row.projectile.speed*.48);assert.equal(c.projectileStart,24);assert.equal(c.structure,true);assert.equal(c.air,false);assert.equal(c.speed,0);assert.equal(c.splash,0);assert.equal(c.burst,1);assert.equal(c.burrow,false);
 assert.deepEqual(Object.entries(CARDS).filter(([,c])=>c.id===9).map(([k])=>k),['blastoiseCannon']);
});
test('a paid Cannon deploy waits for deployment and its native first load, then releases one shot per cycle',()=>{
 const{game:g,events}=make(),enemy=g.spawn('geodude',1,300,508,0);enemy.card={...enemy.card,speed:0,damage:0,passive:true};enemy.hp=enemy.maxHp=1e6;g.energy[0]=10;assert.equal(g.deploy(0,0,300,580).ok,true);run(g,5);
 const releases=events.filter(e=>e.event.type==='attackRelease'&&e.event.attacker.key==='blastoiseCannon');assert.ok(releases.length>=3);assert.ok(releases[0].at>=1.9-1e-8&&releases[0].at<=2.01);for(let i=1;i<releases.length;i++)assert.ok(Math.abs(releases[i].at-releases[i-1].at-1)<=1/30+1e-7);assert.ok(releases.every(e=>!e.event.shot));
});
test('Cannon stays still and does not acquire or damage an airborne target',()=>{
 const{game:g,events}=make(),c=g.spawn('blastoiseCannon',0,300,580,0),air=g.spawn('zubat',1,300,520,0);air.card={...air.card,speed:0,damage:0,passive:true};const hp=air.hp;run(g,4);assert.equal(air.hp,hp);assert.equal(c.x,300);assert.equal(c.y,580);assert.equal(events.filter(e=>e.event.type==='attackRelease'&&e.event.attacker.id===c.id).length,0);
});
test('Cannon loses health over its thirty active seconds and expires normally',()=>{
 const{game:g}=make(),c=g.spawn('blastoiseCannon',0,300,580,0);run(g,3);assert.ok(Math.abs(c.hp-CARDS.blastoiseCannon.hp*.9)<1e-6);run(g,27);assert.equal(c.hp,0);
});
test('Octillery preserves the previous mobile Blastoise budget and targets',()=>{
 const c=CARDS.octillery;for(const[k,v]of Object.entries({id:224,cost:4,hp:1400,damage:170,interval:1.8,windup:.3,range:120,speed:26,radius:19,air:true,structure:false,lifetime:0,burst:1}))assert.equal(c[k],v,k);assert.equal(CARDS.blastoise,undefined);
});
test('legacy decks, entity references, pending shots and event identities restore as the original mobile role',()=>{
 const oldDeck=DEFAULT_DECK.map(k=>k==='blastoiseCannon'?'blastoise':k),g=new Game({seed:8,deck:oldDeck});assert.equal(g.hands[0][3],'octillery');const u=g.spawn('blastoise',0,300,500,0),data=packGame(g),saved=data.units.find(x=>x.id===u.id);saved.key='blastoise';saved.card={...saved.card,name:'Blastoise',id:9};data.hands[0][3]='blastoise';data.projectiles.push({id:999,key:'blastoise',sourceKey:'blastoise',impactPoint:{x:300,y:400},x:300,y:490});const restored=unpackGame(data),unit=restored.units.find(x=>x.id===u.id);assert.equal(restored.hands[0][3],'octillery');assert.equal(unit.key,'octillery');assert.equal(unit.card.id,224);assert.equal(unit.hp,u.hp);assert.equal(unit.card.damage,170);assert.equal(restored.projectiles[0].key,'octillery');assert.equal(data.units[0].key,'blastoise','wire input remains unchanged');
 const event=migrateLegacyCardIdentity({type:'attackRelease',key:'blastoise',attacker:{key:'blastoise',card:{...CARDS.octillery,id:9,name:'Blastoise'}}});assert.equal(event.key,'octillery');assert.equal(event.attacker.card.id,224);
});
