import{test}from'node:test';
import assert from'node:assert/strict';
import{Game,CARDS}from'../dist/engine.js';
import{Renderer}from'../dist/render.js';
import{packGame,perspective,unpackGame}from'../dist/snapshot.js';
import{unitHealthVisible,layoutUnitHealth}from'../dist/unit-visibility.js';
const fresh=()=>{const g=new Game({tutorial:true});g.start();g.aiEnabled=false;g.towers.forEach(t=>t.active=false);return g;};

test('actual healthy15army and shield troop do not enter the HUD queue or obstruct an injured owner layout',()=>{
 const g=fresh();g.hands[0][0]='diglettHorde';g.energy[0]=10;g.deploy(0,0,288,508);assert.equal(g.units.length,15);
 const r=Object.assign(Object.create(Renderer.prototype),{unitHealthQueue:[]});for(const u of g.units){assert.equal(unitHealthVisible(u),false);r.queueUnitHealth({},u,u.x,u.y-20,30);}assert.equal(r.unitHealthQueue.length,0);
 const troop=g.spawn('skarmory',0,456,244,0);assert.equal(troop.shield,troop.maxShield);assert.equal(unitHealthVisible(troop),false);
 const entries=g.units.map(unit=>({unit,x:300,y:300,width:20,compact:true}));g.damage(g.units[0],1,1,{});
 const layout=layoutUnitHealth(entries);assert.equal(layout.length,1);assert.equal(layout[0].unit,g.units[0]);assert.equal(layout[0].x,300);assert.equal(layout[0].y,300,'Hidden healthy owners are not invisible obstacles.');
});

test('native damage to HP or shield shows the real meter and fully restored state hides it again',()=>{
 const g=fresh(),shield=g.spawn('skarmory',0,456,244,0),hp=g.spawn('raltsToken',0,168,600,0);
 g.damage(shield,192,1,{});assert.equal(shield.hp,shield.maxHp);assert.ok(shield.shield<shield.maxShield);assert.ok(shield.shield>0);assert.equal(unitHealthVisible(shield),true);
 g.damage(hp,1,1,{});assert.equal(unitHealthVisible(hp),true);
 assert.equal(unitHealthVisible({...hp,hp:hp.maxHp}),false);assert.equal(unitHealthVisible({...shield,shield:shield.maxShield}),false);
 assert.equal(unitHealthVisible({...shield,hit:0}),true);assert.equal(unitHealthVisible({...hp,hp:hp.maxHp,hit:.24}),false,'A flash without damage does not manufacture eligibility.');
});

test('unknown maxima are conservative and structures, hiddenTesla and tower roles keep health/lifetime',()=>{
 const full={hp:100,maxHp:100,shield:0,maxShield:0,card:{}};assert.equal(unitHealthVisible(full),false);
 for(const state of[{maxHp:undefined},{maxHp:0},{maxHp:Infinity},{maxShield:undefined},{shield:undefined}])assert.equal(unitHealthVisible({...full,...state}),true);
 assert.equal(unitHealthVisible({...full,card:{structure:true},lifetime:20}),true);assert.equal(unitHealthVisible({...full,card:CARDS.ampharos,burrowed:true}),true);
 assert.equal(unitHealthVisible({...full,king:false}),true);assert.equal(unitHealthVisible({...full,card:{structure:false,nativeReference:'MovingCannon'}}),false);
 assert.equal(unitHealthVisible({...full,card:{structure:true,nativeReference:'BrokenCannon'},lifetime:30}),true);assert.equal(unitHealthVisible({...full,hp:0,card:{structure:true}}),false);
});

test('direct HP, foreground shield readout and owner stems all share healthy visibility',()=>{
 const g=fresh(),u=g.spawn('skarmory',0,456,244,0),calls=[],c=new Proxy({},{get:(o,k)=>o[k]??(k==='fillRect'?((...v)=>calls.push(v)):(()=>{})),set:(o,k,v)=>(o[k]=v,true)});
 const r=Object.assign(Object.create(Renderer.prototype),{healthStates:new Map(),t:0});r.healthBar(c,u,100,100,30);r.healthReadout(c,u,100,100,30);r.compactHealth(c,u,100,100,20,{pixel:1,ownerX:100,ownerY:110},1);assert.equal(calls.length,0);assert.equal(r.healthStates.size,0);
 g.damage(u,192,1,{});r.healthBar(c,u,100,100,30);r.healthReadout(c,u,100,100,30);assert.ok(calls.length>0);assert.equal(u.hp,u.maxHp);
});

test('actual HP and shield maxima and eligibility survive native pack/restore and both perspectives',()=>{
 const g=fresh(),healthy=g.spawn('raltsToken',0,168,600,0),shield=g.spawn('skarmory',1,456,244,0),structure=g.spawn('raltsHut',0,168,508,0);g.damage(shield,192,0,{});
 for(const team of[0,1]){const restored=unpackGame(perspective(packGame(g),team));for(const original of[healthy,shield,structure]){const unit=restored.units.find(u=>u.id===original.id);assert.equal(unit.hp,original.hp);assert.equal(unit.maxHp,original.maxHp);assert.equal(unit.shield,original.shield);assert.equal(unit.maxShield,original.maxShield);assert.equal(unitHealthVisible(unit),unitHealthVisible(original));}}
});
