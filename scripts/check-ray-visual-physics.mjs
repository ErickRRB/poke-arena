import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { Game, CARDS } from '../dist/engine.js';
import { LEGAL_CAMERA_SCENARIOS, runLegalCameraScenario } from './native-camera-legal-scenarios.mjs';

const folder=new URL('../docs/visual-followup/native-camera/ray-anchor-review/',import.meta.url);
const label=process.argv.find(arg=>arg.startsWith('--label='))?.slice(8)||'candidate';assert.match(label,/^[a-z0-9_-]+$/i);
const baseline=JSON.parse(await readFile(new URL('physics-baseline.json',folder),'utf8'));
const fields=['cost','hp','damage','range','speed','interval','radius','mass','projectileSpeed','projectileRange','shotRadius','knockback','flying','air','splash','windup','attackDuration','attackContactFrame','style'];
const result={visual:{movementAnchor:CARDS.rayquaza.movementAnchor,scale:CARDS.rayquaza.scale},physicalProfile:Object.fromEntries(fields.filter(key=>key in CARDS.rayquaza).map(key=>[key,CARDS.rayquaza[key]])),cases:[]};
assert.deepEqual(result.physicalProfile,baseline.physicalProfile);
for(const scenario of LEGAL_CAMERA_SCENARIOS){
  const hash=createHash('sha256');
  runLegalCameraScenario({Game},scenario.name,{onFrame(game){hash.update(JSON.stringify({at:game.elapsed,units:game.units.map(u=>[u.id,u.key,u.x,u.y,u.dx,u.dy,u.hp,u.radius,u.attack,u.attackSeq,u.spawn,u.pushHurt??0]),towers:game.towers.map(t=>[t.id,t.hp,t.attack]),projectiles:game.projectiles.map(p=>[p.id,p.x,p.y,p.dx,p.dy,p.travelled,p.life,p.hitIds]),spells:game.spells.map(p=>[p.key,p.x,p.y,p.delay,p.travelRemaining,p.flightElapsed])}));}});
  const sha256=hash.digest('hex'),expected=baseline.cases.find(row=>row.name===scenario.name)?.sha256;assert.equal(sha256,expected,scenario.name+' physical trace');result.cases.push({name:scenario.name,sha256,identical:true});
}
await writeFile(new URL('physics-'+label+'.json',folder),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({visual:result.visual,physicalTraceMatches:result.cases.length}));
