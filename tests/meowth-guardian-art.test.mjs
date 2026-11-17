import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js?v=34';
import {emissionPoint,TOWER_MOUNTS} from '../dist/sprite-motion.js?v=34';
import {towerGuardianScale,guardianEmitterPoint} from '../dist/tower-guardian-art.js';

test('the modest Meowth enlargement preserves its foot and matches native sprite geometry in eight views',()=>{
  const game=new Game({seed:21});
  for(const tower of game.towers.filter(t=>!t.king))for(let direction=0;direction<8;direction++){
    const angle=direction*Math.PI/4,pose={...tower,dx:Math.cos(angle),dy:Math.sin(angle),attack:.2,attackDuration:.6,attackWindup:.4};
    const before=JSON.stringify(pose),native=emissionPoint(pose),actual=guardianEmitterPoint(pose,native),mount=pose.y-TOWER_MOUNTS.princess;
    const mounted={id:pose.id,x:pose.x,y:mount,card:{...pose.guard},scale:towerGuardianScale(pose),dx:pose.dx,dy:pose.dy,attack:pose.attack,attackDuration:pose.attackDuration,attackWindup:pose.attackWindup};
    const expected=emissionPoint(mounted);
    assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-9,'live/saved emission follows the larger native sprite');
    assert.deepEqual(guardianEmitterPoint(pose,{x:pose.x,y:mount}),{x:pose.x,y:mount});
    assert.equal(towerGuardianScale(pose),1.45);assert.equal(JSON.stringify(pose),before,'presentation does not mutate native tower/guard');
  }
});

test('royal guards retain their approved scale/mount and other identities are unchanged',()=>{
  const point={x:307,y:42};
  for(const id of [31,34]){
    const tower={x:300,y:88,king:true,guard:{id}};assert.equal(towerGuardianScale(tower),1.32);
    const foot={x:300,y:88-TOWER_MOUNTS.king};assert.deepEqual(guardianEmitterPoint(tower,foot),foot);
  }
  for(const tower of [{king:false,guard:{id:25}},{king:true,guard:{id:52}},{card:{id:52}}])assert.equal(guardianEmitterPoint(tower,point),point);
  assert.equal(guardianEmitterPoint(undefined,point),point);
});
