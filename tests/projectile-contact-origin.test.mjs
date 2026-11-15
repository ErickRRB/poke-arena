import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
import {Renderer} from '../dist/render.js';
import {publicEvent,unpackEvent} from '../dist/online-wire.js?v=34';

for(const hz of [30,60])for(const key of ['treecko','beedrill','roselia','nuzleaf','centralElectrode','squirtle']){
  test(`${key} at ${hz} Hz: saved projectile origin matches the released native pose in all eight directions`,()=>{
    for(let direction=0;direction<8;direction++){
      const game=new Game({seed:937});game.start();game.aiEnabled=false;game.towers=[];
      const actor=game.spawn(key,0,300,600,0),angle=(2-direction)*Math.PI/4;
      const target=game.spawn('regice',1,300+Math.cos(angle)*60,600+Math.sin(angle)*60,0);
      target.card={...target.card,passive:true,structure:true,lifetime:1e12};target.hp=target.maxHp=1e8;actor.entryPending=target.entryPending=false;
      const renderer=Object.assign(Object.create(Renderer.prototype),{t:0,reduced:true,verticalScale:1,visualActors:new Map(),effects:[],particles:[]});
      let release;
      game.onEvent=event=>{
        if(!['attackStart','attackRelease'].includes(event.type)||event.attacker.id!==actor.id)return;
        const delivered=unpackEvent(publicEvent(event));renderer.onEvent(delivered);
        if(event.type==='attackRelease'){
          const shown=renderer.visualActor(delivered.attacker,0),point=renderer.visualEmission(shown,event.shot);
          assert.ok(Math.hypot(point.x-event.from.x,point.y-event.from.y)<1e-6,`${key} direction ${direction}: saved origin must use the displayed contact, not the previous preparation`);
          release=delivered;actor.cooldown=999;
        }
      };
      game.attack(actor,target);actor.cooldown=999;
      for(let tick=0;tick<hz*2&&!release;tick++)game.step(1/hz);
      assert.ok(release,`${key} direction ${direction} released`);
      const projectile=game.projectiles.find(p=>p.sourceId===actor.id);
      assert.ok(projectile,'the actual projectile remains visible after release');
      assert.ok(Math.hypot(projectile.startX+projectile.liftX-release.from.x,projectile.startY+projectile.liftY-release.from.y)<1e-6,'trajectory retains the contact origin after its first simulation step');
      assert.ok(Math.abs(game.elapsed-actor.card.windup)<=1/hz+1e-7,'correcting the pose must preserve the native release time');
    }
  });
}
