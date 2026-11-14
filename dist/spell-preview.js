import { isCombatTargetReady } from './engine.js';
// Preview the current targets, using the same footprints and exclusions as combat.
export function spellPreviewTargets(game,card,point,team=0){
  if(!card?.spell||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return[];
  let targets=[...game.units,...game.towers].filter(target=>{
    if(target.team===team||target.hp<=0||target.burrowed&&!card.affectsHidden)return false;
    const radius=target.radius||0;
    if(card.rolling){
      const end=point.y+(team?1:-1)*card.travelDistance;
      return !target.card?.flying&&Math.abs(target.x-point.x)<card.splash+radius&&target.y>=Math.min(point.y,end)-18-radius&&target.y<=Math.max(point.y,end)+18+radius;
    }
    return isCombatTargetReady(target)&&(!card.groundOnly||!target.card?.flying)&&Math.hypot(target.x-point.x,target.y-point.y)<card.splash+radius*.4;
  });
  if(card.targetLimit){targets.sort((a,b)=>b.hp-a.hp||a.id-b.id);targets=targets.slice(0,card.targetLimit);}
  return targets.filter(target=>{
    if(card.damage>0&&(target.card||card.towerDamage>0||card.stun||card.freeze))return true;
    return card.fieldDuration&&(target.card?(card.fieldDamage>0||card.fieldSlow||card.pull&&!target.card.structure&&!target.leap):card.fieldTowerDamage>0);
  });
}
