import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Match the engine URL used by Renderer and the public wire modules.
import {Game} from '../dist/engine.js?v=34';
import {Renderer} from '../dist/render.js';
import {publicEvent,publicSnapshot,unpackEvent} from '../dist/online-wire.js?v=34';
import {unpackGame,perspective} from '../dist/snapshot.js?v=34';
import {attackAnimationFrame} from '../dist/sprite-motion.js?v=26';

const metadata=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
for(const viewer of[0,1])for(const key of['tower-34','tower-31','tower-52','ampharos'])for(const automatic of[false,true]){
  test(`${key}: public15 contact survives delivery and cycle replacement, viewer${viewer}, ${automatic?'automatic':'direct'}`,()=>{
    const game=new Game({seed:833});game.state='playing';game.aiEnabled=false;
    let actor;
    if(key.startsWith('tower-')){
      const id=Number(key.slice(6));actor=game.towers.find(t=>t.team===0&&t.king===(id!==52));
      actor.guard={...actor.guard,id};actor.active=true;game.towers=[actor];
    }else{game.towers=[];actor=game.spawn(key,0,300,600,0);}
    const target=game.spawn('regice',1,actor.x,actor.y-60,0);
    target.card={...target.card,passive:true,speed:0,structure:true,lifetime:1e12};target.hp=target.maxHp=1e8;target.radius=4;
    actor.entryPending=target.entryPending=false;
    if(!automatic&&actor.card?.burrow){actor.cooldown=999;for(let step=0;step<6;step++)game.step(.1);}
    const renderer=Object.assign(Object.create(Renderer.prototype),{t:0,visualActors:new Map(),effects:[],particles:[]});
    let pending=[],view=game,starts=0,releases=0,replacedAtRelease=false;
    const previous=new Map();
    game.onEvent=event=>{
      if(!['attackStart','attackRelease'].includes(event.type)||event.attacker.id!==actor.id)return;
      pending.push(publicEvent(event));
      if(event.type==='attackStart'&&++starts>=(automatic?3:1))actor.cooldown=999;
    };
    if(!automatic){game.face(actor,target);game.attack(actor,target);}
    for(let frame=0;frame<480;frame++){
      if(frame&&frame%2===0)game.step(1/30);
      let delivered=[];
      if(frame%4===0){
        view=unpackGame(perspective(publicSnapshot(game,viewer),viewer));
        delivered=pending;pending=[];
        for(const packed of delivered)renderer.onEvent(perspective(unpackEvent(packed),viewer));
      }
      if(frame)renderer.t+=1/60;
      const logical=(actor.card?view.units:view.towers).find(a=>a.id===actor.id);
      const displayed=renderer.visualActor(logical,frame?1/60:0),age=displayed.attackDuration-displayed.attack;
      if(displayed.attack>0){
        assert.ok(age+1e-7>=(previous.get(displayed.attackSeq)??-Infinity),`${key} sequence${displayed.attackSeq} rewound`);
        previous.set(displayed.attackSeq,age);
      }
      for(const event of delivered.filter(e=>e.type==='attackRelease')){
        const source=unpackEvent(event).attacker,profile=source.card||source.guard,animation=source.attackAnim||profile.attackAnim;
        const expected=profile.attackGestures?.[event.shot%profile.attackGestures.length]?.contact??profile.attackContactFrame??metadata[profile.id][animation].hitFrame;
        const shown=attackAnimationFrame(metadata[profile.id][animation],age,displayed.attackDuration,displayed.attackWindup,profile.attackFrames,profile);
        assert.ok(displayed.attack>0,'release must still draw an attack');
        assert.equal(displayed.attackSeq,source.attackSeq,'the released cycle must remain visible');
        assert.equal(shown,expected,`${key} release must show the native contact`);
        replacedAtRelease||=logical.attackSeq!==source.attackSeq;releases++;
      }
    }
    assert.equal(releases,automatic?3:1);
    if(automatic&&key==='tower-52')assert.ok(replacedAtRelease,'fixture exercises release + next start in one packet');
  });
}
