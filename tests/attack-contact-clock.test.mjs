import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,CARDS} from '../dist/engine.js';
import {Renderer} from '../dist/render.js';
import {packGame,unpackGame,packEvent} from '../dist/snapshot.js';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {attackAnimationFrame} from '../dist/sprite-motion.js';

const keys=Object.keys(CARDS).filter(key=>CARDS[key].attackGestures||Number.isFinite(CARDS[key].attackContactFrame));
for(const mode of['local30','local60','snapshots15'])test(`${mode}: each delivered hit shares its native contact and the attack clock never rewinds`,()=>{
  for(const key of keys){
    const renderer=Object.assign(Object.create(Renderer.prototype),{t:0,visualActors:new Map(),effects:[],particles:[]});
    const game=new Game({seed:414});game.state='playing';game.aiEnabled=false;game.towers=[];
    const actor=game.spawn(key,0,300,520,0),target=game.spawn('regice',1,300,490,0);
    target.card={...target.card,passive:true};target.hp=target.maxHp=1e6;
    let events=[],view=game,previous=-Infinity,seen=0;
    game.onEvent=event=>{if(['attackStart','attackRelease'].includes(event.type)&&event.attacker.id===actor.id){if(mode==='snapshots15')events.push(packEvent(event));else{renderer.onEvent(event);events.push(event);}}};
    game.attack(actor,target);actor.cooldown=10000;
    const rate=mode==='local60'?60:30;
    for(let frame=0;frame<=Math.ceil((actor.card.attackDuration+.2)*60);frame++){
      if(frame&&frame%(60/rate)===0)game.step(1/rate);
      let delivered=[];
      if(mode==='snapshots15'){
        if(frame%4===0){view=unpackGame(packGame(game));delivered=events;events=[];for(const event of delivered)renderer.onEvent(event);}
      }else{delivered=events;events=[];}
      const dt=frame?1/60:0;renderer.t+=dt;
      const displayed=renderer.visualActor(view.units.find(unit=>unit.id===actor.id),dt),duration=actor.card.attackDuration,age=duration-displayed.attack;
      assert.ok(age+1e-7>=previous,`${key}: ${age} followed ${previous}`);previous=age;
      for(const event of delivered.filter(event=>event.type==='attackRelease')){
        const meta=SPRITE_GEOMETRY[actor.card.id][actor.card.attackAnim];
        const frameIndex=attackAnimationFrame(meta,age,duration,actor.card.windup,actor.card.attackFrames,actor.card);
        assert.equal(frameIndex,actor.card.attackGestures?actor.card.attackGestures[event.shot%actor.card.attackGestures.length].contact:actor.card.attackContactFrame,`${key} hit ${event.shot}`);
        seen++;
      }
    }
    assert.equal(seen,actor.card.burst||1,key+' all hits delivered');
    assert.equal(previous,actor.card.attackDuration,key+' recovers to rest');
  }
});

test('a new actor starts at its authoritative pose without consuming another render step',()=>{
  const renderer=Object.assign(Object.create(Renderer.prototype),{visualActors:new Map()});
  const actor={id:1,x:300,y:500,attackSeq:2,attack:.6,dx:0,dy:-1};
  assert.equal(renderer.visualActor(actor,1/60).attack,.6);
  assert.equal(renderer.visualActor({...actor,attackSeq:3,attack:.8},1/60).attack,.8);
});
