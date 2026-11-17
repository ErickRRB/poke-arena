import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {packGame,unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {publicSnapshot} from '../dist/online-wire.js?v=34';
import {electricUnitState,drawElectricAura} from '../dist/electric-lore.js';

function encounter(){
  const events=[],g=new Game({onEvent:e=>events.push({type:e.type,key:e.key??e.unit?.key??e.attacker?.key,at:g.elapsed})});g.start();g.aiEnabled=false;
  for(const [key,team,x,y] of [['fireSpiritToken',0,144,720],['voltorb',0,432,700],['centralElectrode',0,216,700],['pikachu',0,480,720],['snorlax',1,168,300],['snorlax',1,432,300],['snorlax',1,432,220]])
    g.spawn(key,team,x,y,key==='fireSpiritToken'?CARDS.centralElectrode.summonDeployTime:CARDS[key].deployTime,null,key==='fireSpiritToken'?'summon':undefined);
  return {g,events};
}

test('FB60 native long approach: every actual child is quiet outside real preparation; normal Voltorb and Pikachu gain no body layer',()=>{
  const {g,events}=encounter(),rows=new Map();
  for(let tick=0;tick<480;tick++){
    g.step(1/30);
    for(const u of g.units){
      if(!['fireSpiritToken','centralElectrode','voltorb','pikachu'].includes(u.key))continue;
      const r=rows.get(u.id)||{key:u.key,parentId:u.parentId,total:0,walk:0,electric:0};rows.set(u.id,r);r.total++;
      const before=structuredClone(u),fx=electricUnitState(u);assert.deepEqual(u,before,'presentation cannot mutate native entities/cards');
      if(u.moving&&!u.leap)r.walk++;
      if(['voltorb','pikachu'].includes(u.key)){assert.equal(fx,null,'unchanged roles must not inherit token body electricity');continue;}
      if(fx){r.electric++;assert.ok(u.spawn<=0&&u.hp>0&&u.stun<=0);if(u.key==='fireSpiritToken')assert.ok(u.leap?.prepare>0);else assert.ok(u.attack>0&&u.attackDuration-u.attack>=0&&u.attackDuration-u.attack<u.attackWindup);}
      if(u.spawn>0||!u.attack&&!u.leap||u.leap?.prepare===0||u.moving&&!u.leap)assert.equal(fx,null);
    }
  }
  const first=rows.get(7);assert.ok(first.walk>100);assert.equal(first.total,168);assert.equal(first.electric,6,'only the native0.2s preparation, not168ticks of ambient electricity');
  assert.ok([...rows.values()].filter(r=>r.parentId===9).every(r=>r.electric===6),'actual periodic children use the same phase policy');
  assert.equal(events.filter(e=>e.type==='beam'&&e.key==='voltorb').length,2);
  assert.ok(events.some(e=>e.type==='beam'&&e.key==='pikachu'));
  assert.ok(events.some(e=>e.type==='deathBurst'&&e.key==='fireSpiritToken'));
  assert.equal(events.filter(e=>e.type==='deathBurst'&&e.key==='voltorb').length,0);
});

test('FB60 live preparation survives exact restore, pause and both wire views without a spawned/walking replay',()=>{
  const {g}=encounter(),seen=new Set();
  for(let tick=1;tick<=205;tick++){
    g.step(1/30);if(![6,90,152,160,174,187].includes(tick))continue;
    const clone=unpackGame(JSON.parse(JSON.stringify(packGame(g))));
    for(const u of g.units.filter(u=>['fireSpiritToken','centralElectrode','voltorb','pikachu'].includes(u.key))){
      const fx=electricUnitState(u);assert.deepEqual(electricUnitState(clone.units.find(v=>v.id===u.id)),fx);
      if(u.id===7)seen.add(u.spawn>0?'spawn':u.leap?.prepare>0?'prepare':u.leap?'flight':'walk');
      for(const viewer of [0,1]){
        const wire=unpackGame(perspective(publicSnapshot(g,viewer),viewer)),other=electricUnitState(wire.units.find(v=>v.id===u.id));
        assert.equal(other?.phase,fx?.phase);if(fx)assert.ok(Math.abs(other.energy-fx.energy)<.005,'wire rounding does not restart an aura');
      }
    }
    g.pause();const before=JSON.stringify(packGame(g)),shown=g.units.map(electricUnitState);g.step(.4);assert.equal(JSON.stringify(packGame(g)),before);assert.deepEqual(g.units.map(electricUnitState),shown);g.resume();
  }
  assert.deepEqual([...seen].sort(),['flight','prepare','spawn','walk']);
});

test('FB60 interrupted and noncombat actors cannot keep the child cue; parent summon countdown is not an attack',()=>{
  const {g}=encounter();for(let i=0;i<152;i++)g.step(1/30);const child=g.units.find(u=>u.id===7);assert.ok(electricUnitState(child));
  for(const change of [{leap:null,attack:0},{stun:.2},{hp:0},{preview:true},{mounted:true},{spawn:.1}])assert.equal(electricUnitState({...child,...change}),null);
  const parent=g.units.find(u=>u.id===9);assert.equal(electricUnitState({...parent,attack:0,summonActive:true,summonClock:.15}),null);
});

for(const reduced of [false,true])test(`FB60 child preparation has close, opaque warm/white pixels without an ambient clock, reduced ${reduced}`,()=>{
  const trace=()=>{const calls=[],c=new Proxy({globalAlpha:.3},{get:(o,k)=>o[k]??((...a)=>calls.push({op:k,args:a,color:o.fillStyle,alpha:o.globalAlpha})),set:(o,k,v)=>(o[k]=v,true)});return{c,calls};};
  const a=trace(),b=trace(),options={x:10,y:20,radius:9,energy:.625,seed:14,preparation:true,reduced};
  drawElectricAura(a.c,{...options,age:0});drawElectricAura(b.c,{...options,age:20});assert.deepEqual(a.calls,b.calls,'the short cue cannot orbit or flicker on a global clock');
  const pixels=a.calls.filter(c=>c.op==='fillRect');assert.ok(pixels.length>0);assert.ok(pixels.every(c=>c.alpha===1));
  assert.deepEqual([...new Set(pixels.map(c=>c.color))],['#402f28','#ffd34d','#fff9e6']);
  assert.ok(pixels.every(c=>Math.abs(c.args[0])<=options.radius+5&&Math.abs(c.args[1])<=7),'forks stay beside the body');
  assert.equal(a.calls.some(c=>c.op==='stroke'),false,'no long branches toward other actors');
});
