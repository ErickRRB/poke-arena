import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/engine.js';
import {SPRITE_GEOMETRY} from '../dist/sprite-geometry.js';
import {attackAnimationFrame,emissionPoint} from '../dist/sprite-motion.js';
import {FlightWings} from '../dist/wing-motion.js';

// Contacts chosen by reviewing original eight-direction rasters, not HitFrame
// metadata (several original HitFrames repeat a preparation drawing).
const CONTACTS={machamp:[4,4,4,4],scyther:[6,6],nidoking:[7,7],scizor:[4,8],dragonite:[5,5,5],salamence:[3,3,3],blaziken:[2,2,2],crobat:[6,8],gardevoir:[4],treecko:[6],raltsTrio:[3],raltsToken:[3]};
test('every reviewed hit displays its contact pose at the first 30/60 Hz simulation release',()=>{
  for(const[key,contacts]of Object.entries(CONTACTS))for(const hz of[30,60]){
    const card=CARDS[key],meta=SPRITE_GEOMETRY[card.id][card.attackAnim];
    contacts.forEach((expected,shot)=>{
      const release=card.windup+shot*(card.burstSpacing||0),sample=Math.ceil((release-1e-8)*hz)/hz;
      assert.equal(attackAnimationFrame(meta,sample,card.attackDuration,card.windup,card.attackFrames,card),expected,`${key} hit ${shot} at ${hz} Hz`);
    });
    const before=attackAnimationFrame(meta,Math.max(0,card.windup-1/hz),card.attackDuration,card.windup,card.attackFrames,card);
    assert.notEqual(before,contacts[0],`${key} prepares before contact`);
    for(let elapsed=0;elapsed<card.attackDuration;elapsed+=1/60){
      const frame=attackAnimationFrame(meta,elapsed,card.attackDuration,card.windup,card.attackFrames,card);
      assert.ok(frame>=0&&frame<meta.durations.length,`${key} valid recovery`);
    }
  }
});
test('lead-hand emission chooses the forward native marker in both perspectives, without changing cannon alternation',()=>{
  for(const key of['machamp','nidoking','scizor','gardevoir','treecko'])for(let direction=0;direction<8;direction++){
    const card=CARDS[key],angle=(2-direction)*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle),meta=SPRITE_GEOMETRY[card.id][card.attackAnim];
    for(let shot=0;shot<(card.burst||1);shot++){
      const elapsed=card.windup+shot*(card.burstSpacing||0),frame=CONTACTS[key][shot],points=meta.points[direction][frame];
      const actor={id:7,card,x:300,y:500,dx,dy,attack:card.attackDuration-elapsed,attackDuration:card.attackDuration,attackWindup:card.windup};
      const p=emissionPoint(actor,shot),forward=(points[6]-points[8])*dx+(points[7]-points[9])*dy>=0?6:8;
      assert.ok(Math.abs(p.x-(actor.x+(points[forward]-points[0]+dx)*card.scale))<1e-7,key+' forward hand x');
      assert.ok(Number.isFinite(p.y));
    }
  }
  const card=CARDS.blastoise,actor={id:1,card,x:300,y:500,dx:0,dy:-1,attack:card.attackDuration-card.windup,attackDuration:card.attackDuration,attackWindup:card.windup};
  assert.notDeepEqual(emissionPoint(actor,0),emissionPoint(actor,1),'two native cannons remain distinct');
});
test('flight clock freezes at its current phase and resumes continuously without returning to native rest',()=>{
  const wings=new FlightWings();
  assert.equal(wings.clock(1,.2),.2);
  for(let frame=1;frame<=60;frame++)assert.equal(wings.clock(1,.2+frame/60,true),.2);
  assert.ok(Math.abs(wings.clock(1,1.2+1/60)-(.2+1/60))<1e-10);
  assert.equal(wings.clock(2,1.3),1.3,'another unit keeps its own phase');
  assert.equal(wings.clock(1,.05),.05,'a new match may reset the render clock');
  assert.equal(wings.clock(1,.05),.05,'paused draws do not advance');
});
