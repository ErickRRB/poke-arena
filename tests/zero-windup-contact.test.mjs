import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../dist/engine.js?v=26';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {attackAnimationFrame,emissionPoint,movementAnchor,emitterPart} from '../dist/sprite-motion.js?v=26';

const metadata=JSON.parse(readFileSync(new URL('../dist/assets/pokemon/manifest.json',import.meta.url)));
test('Sableye dash impact with zero preparation starts on its native contact, with recovery still visible',()=>{
  const profile=CARDS.sableye,meta=metadata[profile.id][profile.attackAnim],duration=.4;
  assert.equal(attackAnimationFrame(meta,0,duration,0,profile.attackFrames,profile),meta.hitFrame);
  assert.ok(attackAnimationFrame(meta,duration-1e-4,duration,0,profile.attackFrames,profile)>meta.hitFrame,'the zero windup must retain its recovery');
  for(let direction=0;direction<8;direction++){
    const angle=(2-direction)*Math.PI/4,actor={id:81,key:'sableye',card:profile,team:0,x:300,y:600,dx:Math.cos(angle),dy:Math.sin(angle),attack:duration,attackDuration:duration,attackWindup:0,attackAnim:profile.attackAnim};
    const points=SPRITE_GEOMETRY[profile.id][profile.attackAnim].points[direction][meta.hitFrame],scale=profile.scale;
    const anchor=profile.movementAnchor==='body'?movementAnchor(profile.id,profile.attackAnim,direction,meta.hitFrame,{x:points[0],y:points[1]}):{x:points[0],y:points[1]};
    assert.equal(emitterPart(profile),'head');
    const expected={x:actor.x+(points[4]-anchor.x+actor.dx*2)*scale,y:actor.y+(points[5]-anchor.y+actor.dy*2)*scale};
    const actual=emissionPoint(actor);
    assert.ok(Math.hypot(expected.x-actual.x,expected.y-actual.y)<1e-7,`direction${direction}: release must use the contact marker`);
  }
});
