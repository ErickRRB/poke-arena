import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {CARDS,LANES,attackReach} from '../dist/engine.js';
import {SandboxGame} from '../dist/sandbox.js';
const canonical=name=>fs.readFileSync('dist/'+name+'.js','utf8').replace(/\r\n/g,'\n');
const dependencyNames=new Set();
function include(name){
 if(dependencyNames.has(name))return;dependencyNames.add(name);
 for(const match of canonical(name).matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)){
  const relative=match[1].split('?')[0];if(!relative.endsWith('.js'))continue;
  const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(name),relative)).slice(0,-3);
  if(dependency.startsWith('../'))throw Error('Unexpected external runtime dependency '+dependency);include(dependency);
 }
}
include('engine');include('sandbox');const inputs=[...dependencyNames].sort();
const methodFingerprint=createHash('sha256').update(fs.readFileSync(new URL(import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex');
const fingerprints=Object.fromEntries(inputs.map(name=>[name,createHash('sha256').update(canonical(name)).digest('hex')]));
const sourceBlobs=Object.fromEntries(inputs.map(name=>{const bytes=Buffer.from(canonical(name));return[name,createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')];}));
const keys=Object.keys(CARDS).filter(key=>!CARDS[key].token&&!CARDS[key].spell&&(!CARDS[key].structure||!CARDS[key].passive&&CARDS[key].damage>0)),references=['geodude','princess','golem','rhydon'],rows=[];
const canTarget=(a,b)=>a.damage>0&&!a.passive&&!a.building&&(!b.flying||a.air),round=n=>Math.round(n*1000)/1000;
for(const key of keys)for(const reference of references){
 const hits=[],bodies=new Map(),g=new SandboxGame({mode:reference==='princess'?'princess':'duel',towerFire:reference==='princess',seed:930,onEvent:e=>{if(e.type==='damage')hits.push({at:round(g.elapsed),victimTeam:e.target.team,sourceId:e.sourceId||null,source:e.sourceKey,amount:round(e.amount),tower:'king'in e.target,id:e.target.id});}});
 if(reference==='princess')g.preparedTeams.add(1);else{if(!g.place(1,reference,LANES[0],304).ok)throw Error(reference);for(const u of g.units)u.spawn=0;}
 const placement=g.place(0,key,LANES[0],472);if(!placement.ok)throw Error(key+': '+placement.reason);
 const targetTower=reference==='princess'?g.visibleTowers[0]:null,roots=[0,1].map(team=>new Set(g.units.filter(u=>u.team===team).map(u=>u.id))),families=roots.map(s=>new Set(s));
 const blueCanTargetRef=targetTower?CARDS[key].damage>0&&!CARDS[key].passive:canTarget(CARDS[key],CARDS[reference]),refCanTargetBlue=targetTower?true:canTarget(CARDS[reference],CARDS[key]);
 const capture=()=>{
  for(const u of g.units)bodies.set(u.id,u);
  let changed=true;while(changed){changed=false;for(const u of bodies.values())if(u.parentId&&!families[u.team].has(u.id)&&families[u.team].has(u.parentId)){families[u.team].add(u.id);changed=true;}}
  const side=team=>{const all=[...bodies.values()].filter(u=>families[team].has(u.id)),alive=all.filter(u=>u.hp>0);return{rootIds:[...roots[team]],descendantIds:[...families[team]].filter(id=>!roots[team].has(id)),alive:alive.length,hp:round(alive.reduce((n,u)=>n+u.hp+(u.shield||0),0)),bodies:all.map(u=>({id:u.id,key:u.key,x:round(u.x),y:round(u.y),hp:round(u.hp),shield:round(u.shield||0)}))};};
  return{at:round(g.elapsed),blue:side(0),reference:targetTower?{towerId:targetTower.id,hp:round(targetTower.hp),maxHp:targetTower.maxHp,alive:targetTower.hp>0}:side(1)};
 };
 const initial=capture();let end=null,endHitIndex=0,maxUnits=g.units.length;
 if(!blueCanTargetRef&&!refCanTargetBlue)end={...capture(),reason:'neither-body-targets-the-other'};
 const blue=g.units.find(u=>u.team===0),red=targetTower||g.units.find(u=>u.team===1),gap=Math.hypot(blue.x-red.x,blue.y-red.y);
 if(!end&&CARDS[key].structure&&(targetTower||CARDS[reference].structure)&&gap>attackReach(blue,red)&&gap>attackReach(red,blue))end={...capture(),reason:'both-stationary-outside-attack-range'};
 g.resume();
 for(let frame=0;frame<45*30;frame++){
  g.step(1/30);maxUnits=Math.max(maxUnits,g.units.length);const state=capture();
  if(g.units.some(u=>![u.x,u.y,u.hp,u.maxHp].every(Number.isFinite)))throw Error('Non-finite '+key+'/'+reference);
  if(!end){const reason=!state.blue.alive?'blue-family-defeated':targetTower?!state.reference.alive?'reference-tower-destroyed':null:!state.reference.alive?'reference-family-defeated':null;if(reason){end={...state,reason};endHitIndex=hits.length;}}
  if(!state.blue.alive&&!g.projectiles.some(p=>p.team===0))break;
 }
 if(!end){end={...capture(),reason:'45-second-observation-limit'};endHitIndex=hits.length;}
 const trade=hits.slice(0,endHitIndex),push=hits.slice(endHitIndex),refIds=targetTower?new Set([targetTower.id]):families[1],sum=(events,predicate)=>round(events.filter(predicate).reduce((n,h)=>n+h.amount,0));
 rows.push({key,name:CARDS[key].name,structure:!!CARDS[key].structure,reference,native:CARDS[key].nativeReference||null,cost:CARDS[key].cost,blueCanTargetRef,refCanTargetBlue,deathAreaCanHit:!!CARDS[key].deathDamage||!!CARDS[reference]?.deathDamage,initial,trade:end,damageToReference:sum(trade,h=>h.victimTeam===1&&refIds.has(h.id)),referenceHits:trade.filter(h=>h.victimTeam===1&&refIds.has(h.id)).length,receivedInTrade:sum(trade,h=>h.victimTeam===0&&families[0].has(h.id)),otherTowerDamageDuringTrade:sum(trade,h=>h.victimTeam===1&&h.tower&&!refIds.has(h.id)),postTrade:{scope:'Laboratory continuation with passive immortal or regenerating towers. Excluded from the exchange; not a native competitive push oracle.',elapsed:round(g.elapsed-end.at),towerDamage:sum(push,h=>h.victimTeam===1&&h.tower),troopDamage:sum(push,h=>h.victimTeam===1&&!h.tower),events:push.length},trace:trade,final:capture(),maxUnits});
}
const report={asOf:'2026-11-14',fingerprintFormat:'SHA256 of UTF8 source normalized to LF; sourceBlobs are Git blob SHA1 of those same canonical bytes. Includes the transitive JavaScript dependencies of engine and sandbox.',methodFingerprint,fingerprints,sourceBlobs,setup:`Native18x32 field. Red preset at(${LANES[0]},304), deployed and frozen; blue full card at(${LANES[0]},472), retaining deployment delay. Production30Hz.`,scope:'Every selectable troop and all three offensive structures against Knight, Princess Tower, Golem and Pekka. Exchange ends at first defeated root family (including explicit descendants) or tower death; later push is separate. Non-interacting bodies marked at t0. A surviving tower has its real HP/state.',referenceControls:'Raw native fields for every mapped body; independent stationary melee oracle; source-derived Dart3hits, Princess AoE, all12Graveyard actions, Golem children, GoblinHut, Furnace and21Tornado pulls at30/60Hz. See tests/native*. Representative independent controls, not a complete native path/spawn oracle.',limits:['Rollouts measure this game. Original cards are not counted as native comparisons.','Exact-time melee ties favor the first-created actor in runtime and the first argument in the helper. Mirror tests check this convention, not the native simultaneous-hit rule.','Projectile conversion is independently measured on client16.402; the data rows are16.635. Steering/contact order and cross-version trace coverage retain documented limits. Raw-stat agreement does not establish universal trade identity.'],total:rows.length,nativeCases:rows.filter(r=>r.native).length,originalCases:rows.filter(r=>!r.native).length,rows};
fs.writeFileSync('docs/NATIVE-TRADE-MATRIX-2026-11-14.json',JSON.stringify(report,null,2)+'\n');
const fields=['key','name','reference','native','cost','blueCanTargetRef','refCanTargetBlue','damageToReference','referenceHits','receivedInTrade','otherTowerDamageDuringTrade'];
fs.writeFileSync('docs/NATIVE-TRADE-MATRIX-2026-11-14.csv',fields.join(',')+',tradeEnd,tradeReason,blueAlive,blueHP,referenceAlive,referenceHP,postTradeTowerDamage\n'+rows.map(r=>fields.map(k=>JSON.stringify(r[k]??'')).concat([r.trade.at,JSON.stringify(r.trade.reason),r.trade.blue.alive,r.trade.blue.hp,r.trade.reference.alive,r.trade.reference.hp,r.postTrade.towerDamage]).join(',')).join('\n')+'\n');
console.log(JSON.stringify({troops:keys.filter(k=>!CARDS[k].structure).length,offensiveStructures:keys.filter(k=>CARDS[k].structure).length,references:references.length,cases:rows.length,nativeCases:report.nativeCases,originalCases:report.originalCases,finite:true}));
