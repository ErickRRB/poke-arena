import {Game,CARDS,DEFAULT_DECK} from './engine.js?v=26';

// The sandbox uses the production combat rules. Only match lifecycle, card
// availability and tower recovery differ; card stats are never copied or edited.
export class SandboxGame extends Game {
  constructor({mode='duel',towerFire=false,onEvent=()=>{},...options}={}){
    super({...options,deck:DEFAULT_DECK,tutorial:true,onEvent});
    this.mode=mode;this.towerFire=towerFire;this.state='paused';this.aiEnabled=false;this.capturedDeployment=false;
    this.samples=[];this.lastTowerHit=new Map();this.preparedTeams=new Set();this.totals=[0,0];this.towerTotals=[0,0];this.hitCounts=[0,0];this.firstHit=[null,null];
    if(mode==='duel')for(const tower of this.towers){if(tower.king)tower.hp=0;else{tower.labImmortal=true;tower.active=false;}}
    if(['princess','fireball-check'].includes(mode))for(const tower of this.towers)if(tower.team!==1||tower.king||tower.lane!==(mode==='princess'?0:1))tower.hp=0;
  }
  get visibleTowers(){return this.mode==='duel'?this.towers.filter(t=>t.labImmortal):['princess','fireball-check'].includes(this.mode)?this.towers.filter(t=>t.team===1&&!t.king&&t.lane===(this.mode==='princess'?0:1)):this.towers;}
  finish(){} // Destroying a king must never end an experiment.
  canDeploy(team,key,x,y,formation=true){
    if(!CARDS[key]?.spell&&(team?y>356:y<444))return false;
    return super.canDeploy(team,key,x,y,formation);
  }
  attack(actor,target){if('king'in actor&&(this.mode==='duel'||!this.towerFire))return;super.attack(actor,target);}
  damage(target,amount,team,options={}){
    if(target.labImmortal&&this.state==='playing'){
      super.damage(target,0,team,options);
      const actual=Math.max(0,amount);if(!actual)return;
      this.stats[team].damage+=actual;
      this.emit('damage',{target,amount:actual,dot:!!options.dot,sourceId:options.sourceId||0,sourceKey:options.sourceKey||''});
      this.samples.push({time:this.elapsed,team,amount:actual,targetId:target.id,tower:true,key:options.sourceKey||''});
      this.totals[team]+=actual;this.towerTotals[team]+=actual;this.hitCounts[team]++;this.firstHit[team]??=this.elapsed;
      return;
    }
    const before=target.hp+(target.shield||0);
    super.damage(target,amount,team,options);
    const actual=Math.max(0,before-target.hp-(target.shield||0));
    if(actual){
      this.samples.push({time:this.elapsed,team,amount:actual,targetId:target.id,tower:'king'in target,key:options.sourceKey||''});
      this.totals[team]+=actual;this.hitCounts[team]++;this.firstHit[team]??=this.elapsed;
      if('king'in target)this.towerTotals[team]+=actual;
      if('king'in target)this.lastTowerHit.set(target.id,this.elapsed);
    }
  }
  place(team,key,x,y){
    if(!CARDS[key]||CARDS[key].token)return{ok:false,reason:'Elegí una carta del catálogo.'};
    if(this.units.length>=120)return{ok:false,reason:'Esta columna ya tiene 120 unidades. Limpiá la prueba para seguir.'};
    const state=this.state,hand=this.hands[team],queue=this.queues[team];
    this.state='playing';this.hands[team]=[key];this.queues[team]=[key];this.energy[team]=10;
    try{
      const result=this.deploy(team,0,x,y);
      if(result.ok)this.preparedTeams.add(team);
      return result;
    }finally{this.state=state;this.hands[team]=hand;this.queues[team]=queue;this.energy[team]=10;}
  }
  useAbility(team,id){
    const state=this.state;this.state='playing';this.energy[team]=10;
    try{return this.activateAbility(team,id);}
    finally{this.state=state;this.energy[team]=10;}
  }
  step(dt){
    if(this.state!=='playing')return;
    this.time=3600;super.step(dt);this.energy=[10,10];
    this.samples=this.samples.filter(sample=>sample.time>=this.elapsed-5);
    if(this.mode!=='duel')for(const tower of this.visibleTowers){
      const last=this.lastTowerHit.get(tower.id);
      if(last===undefined||this.elapsed-last<2)continue;
      if(tower.hp<=0){tower.hp=tower.maxHp;tower.active=!tower.king;tower.target=null;tower.stun=0;tower.freeze=0;tower.burn=null;tower.attack=0;tower.cooldown=.5;}
      else tower.hp=Math.min(tower.maxHp,tower.hp+tower.maxHp*2*Math.min(.1,dt));
      if(tower.hp===tower.maxHp)this.lastTowerHit.delete(tower.id);
    }
  }
  measurement(team){
    const recent=this.samples.filter(hit=>hit.team===team&&hit.time>=this.elapsed-5),units=this.units.filter(unit=>unit.team===team&&unit.hp>0);
    const seconds=this.firstHit[team]!==null?Math.min(5,Math.max(1,this.elapsed-this.firstHit[team])):1;
    return{total:this.totals[team],tower:this.towerTotals[team],dps:recent.reduce((sum,hit)=>sum+hit.amount,0)/seconds,hits:this.hitCounts[team],alive:units.length,hp:units.reduce((sum,u)=>sum+u.hp+(u.shield||0),0)+(['princess','fireball-check'].includes(this.mode)&&team===1?this.visibleTowers[0].hp:0)};
  }
}
