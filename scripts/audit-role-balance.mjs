import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Game,CARDS} from '../dist/engine.js';
import {createSandbox,spawnCard,damageTrial} from './balance-sandbox.mjs';

export function towerPushTrial(key,{ability=false,defender=null,seconds=45}={}){
  const game=new Game({seed:120112});game.start();game.aiEnabled=false;
  const actors=spawnCard(game,key,0,158,520),target=game.towers.find(t=>t.team===1&&!t.king&&t.lane===0);
  if(defender)spawnCard(game,defender,1,158,250);
  let firstHit=null,firstTowerHit=null,abilityCost=0;
  game.onEvent=event=>{if(event.type==='damage'&&event.target===target&&firstTowerHit===null)firstTowerHit=game.elapsed;if(event.type==='damage'&&actors.includes(event.target)&&firstHit===null)firstHit=game.elapsed;};
  for(let i=0;i<seconds*30&&target.hp>0&&game.units.some(u=>u.team===0&&u.hp>0);i++){
    if(ability)for(const actor of actors){if(!actor.card.ability||actor.abilityUsed||actor.hp<=0||actor.spawn>0)continue;
      if(actor.hp<actor.maxHp*.7||game.units.some(enemy=>enemy.team===1&&enemy.hp>0&&Math.hypot(enemy.x-actor.x,enemy.y-actor.y)<actor.card.ability.radius+enemy.radius)){game.energy[0]=10;const result=game.activateAbility(0,actor.id);if(result.ok)abilityCost+=actor.card.ability.cost;}}
    game.step(1/30);
  }
  return{key,defender,seconds:+game.elapsed.toFixed(2),damage:Math.round(target.maxHp-target.hp),totalTowerDamage:Math.round(game.stats[0].damage),firstTowerHit:firstTowerHit===null?null:+firstTowerHit.toFixed(2),firstIncomingHit:firstHit===null?null:+firstHit.toFixed(2),survivingHp:Math.round(game.units.filter(u=>u.team===0&&u.hp>0).reduce((sum,u)=>sum+u.hp,0)),deployed:game.stats[0].deployed,abilityCost};
}
export function buildingDefenseTrial(key){
  const game=new Game({seed:120112});game.start();game.aiEnabled=false;
  if(key)spawnCard(game,key,0,240,520);spawnCard(game,'snorlax',1,158,290);
  for(let i=0;i<40*30&&game.units.some(u=>u.team===1&&u.hp>0);i++)game.step(1/30);
  const target=game.towers.find(t=>t.team===0&&!t.king&&t.lane===0);
  return{key,damage:Math.round(target.maxHp-target.hp),spawned:game.stats[0].deployed,seconds:+game.elapsed.toFixed(2)};
}
export function weakSpellTrial(key,{fresh=false,flying=false,targetKey=flying?'gastly':'diglett'}={}){
  const game=new Game({seed:120112}),targets=[];game.start();game.aiEnabled=false;game.towers.forEach(tower=>tower.active=false);
  const targetY=key==='log'?340:300;
  for(let i=0;i<3;i++){
    const unit=game.spawn(targetKey,1,280+i*20,targetY,fresh?.75:0);unit.card={...unit.card,speed:0,passive:true};targets.push(unit);
  }
  game.hands[0]=[key];game.energy[0]=10;const result=game.deploy(0,0,300,key==='log'?520:300);
  if(!result.ok)return{key,applicable:false};
  for(let i=0;i<15*30&&targets.some(u=>u.hp>0);i++)game.step(1/30);
  return{key,fresh,flying,targetKey,eliminated:targets.filter(u=>u.hp<=0).length,total:targets.length,seconds:+game.elapsed.toFixed(2)};
}
export function auditAllRoles(){
  const rows=[];
  for(const[key,card]of Object.entries(CARDS).filter(([,card])=>!card.token)){
    const row={key,name:card.name,cost:card.cost,role:card.role};
    if(card.spell){row.damage=[damageTrial(key),damageTrial(key,{flying:true}),damageTrial(key,{tower:true})];row.weakTargets=[weakSpellTrial(key),weakSpellTrial(key,{fresh:true}),weakSpellTrial(key,{flying:true}),weakSpellTrial(key,{fresh:true,targetKey:'shuppetToken'})];}
    else{
      const deployment=createSandbox();spawnCard(deployment,key,0,156,550);
      row.deployment={bodies:deployment.units.length,totalHp:deployment.units.reduce((sum,u)=>sum+u.hp+(u.shield||0),0),nominalDps:+deployment.units.reduce((sum,u)=>sum+u.card.damage*(u.card.burst||u.card.bolts||1)/u.card.interval,0).toFixed(2)};
      row.openTower=towerPushTrial(key);
      if(card.building)row.defendedTower=['pikachu','magnemite','blastoise'].map(defender=>towerPushTrial(key,{defender}));
      if(card.structure)row.defense=buildingDefenseTrial(key);
      if(card.ability)row.withAbility=towerPushTrial(key,{ability:true,defender:'pikachu'});
      if(card.summon||card.deathSpawn)row.summons=damageTrial(key,{seconds:30});
    }
    rows.push(row);
  }
  return{protocol:{fps:30,seed:120112,towerPushSeconds:45,attackDeployment:[158,520],defenseDeployment:[240,520]},cards:rows,unprotectedDefense:buildingDefenseTrial(null)};
}
if(process.argv[1]?.endsWith('audit-role-balance.mjs')){
  const catalogAt=process.argv.indexOf('--catalog');
  if(catalogAt>=0){const previous=JSON.parse(await readFile(process.argv[catalogAt+1],'utf8'));for(const[key,card]of Object.entries(previous.catalog))Object.assign(CARDS[key],card);}
  const at=process.argv.indexOf('--out'),out=at<0?'docs/balance-role-audit.json':process.argv[at+1],report=auditAllRoles();
  await mkdir(resolve(out,'..'),{recursive:true});
  await writeFile(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({out,cards:report.cards.length,winConditions:report.cards.filter(row=>CARDS[row.key].building).map(({key,openTower})=>({key,...openTower}))},null,2));
}
