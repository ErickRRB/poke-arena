import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import{CARDS}from'../dist/engine.js';import{attackVisualProfile,combatVisual}from'../dist/combat-visuals.js';
import{attackAnimationFrame,emissionPoint}from'../dist/sprite-motion.js';
import{Renderer}from'../dist/render.js';

test('Charizard restores the full preparation/contact/recovery without changing its native release or muzzle',()=>{
 const card=CARDS.charizard,saved=JSON.stringify(card),shown=attackVisualProfile(card),meta=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)))[6].Shoot;
 const frames=Array.from({length:60},(_,i)=>attackAnimationFrame(meta,card.attackDuration*i/60,card.attackDuration,card.windup,shown.attackFrames,shown));
 assert.ok(frames.includes(0)&&frames.includes(1)&&frames.includes(10));
 assert.equal(attackAnimationFrame(meta,card.windup,card.attackDuration,card.windup,shown.attackFrames,shown),2);
 for(let direction=0;direction<8;direction++){
  const a=(2-direction)*Math.PI/4,actor={id:10,x:300,y:500,card,dx:Math.cos(a),dy:Math.sin(a),attackDuration:card.attackDuration,attackWindup:card.windup,attack:card.attackDuration-card.windup};
  assert.deepEqual(emissionPoint({...actor,card:shown}),emissionPoint(actor));
 }
 assert.equal(JSON.stringify(card),saved);assert.ok(combatVisual(card).projectile>=26);
 assert.equal(attackVisualProfile(CARDS.nuzleaf),CARDS.nuzleaf);
});

test('the visible breath finishes its gesture after the physical recovery, without holding the game actor',()=>{
 const actor={id:7,x:300,y:500,dx:0,dy:-1,hp:100,card:CARDS.charizard,attackSeq:2,attackDuration:.46,attackWindup:.3,attack:.06,moving:false};
 const renderer=Object.assign(Object.create(Renderer.prototype),{t:1,visualActors:new Map()});
 renderer.visualActor(actor,0);actor.attack=0;const saved=JSON.stringify(actor);
 const shown=renderer.visualActor(actor,1/60);assert.ok(shown.attack>0);assert.equal(shown.attackDuration,.72);assert.equal(JSON.stringify(actor),saved);
 const paused=renderer.visualActor(actor,0);assert.equal(renderer.visualActor(actor,0).attack,paused.attack);
 actor.stun=.5;assert.equal(renderer.visualActor(actor,1/60).attack,0);
});
