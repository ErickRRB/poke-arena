import {validateC4Restore} from './c4-restore.js?v=1';
import {getC4BaseCatalog} from './c4-catalog.js?v=1';
import {C1_RULESET,C3_RULESET,C4_RULESET,validateC4Profiles} from './hog-profiles.js?v=1';
import {resolveC3Profiles} from './hog-c3-validation.js?v=1';
import {LIGHT_EEVEE_RULESET,validateArenaProducerProfiles} from './arena-profile-producers.js?v=1';
import { Game, CARDS, W, H, PRINCESS_RANGE, KING_Y } from './engine.js?v=target-c1-1';
import { BOARD_VERSION, migrateLegacyX, migrateLegacyY } from './arena-geometry.js?v=34';
import { currentDeck } from './card-key-migrations.js?v=34';

// Persisted matches retain the old mobile card's numbers and entity references.
// Only its retired key and visual identity change; Cannon is a separate card.
export function migrateLegacyCardIdentity(value,options={}){
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value)){value.forEach(item=>migrateLegacyCardIdentity(item,options));return value;}
  if(!options.c4&&value.key==='voltorb'&&(!value.card||value.card.id===100)){
    if(value.card)value.card={...value.card,scale:CARDS.voltorb.scale,visualScale:CARDS.voltorb.visualScale};
    if('scale'in value)value.scale=CARDS.voltorb.scale;
  }
  const legacy=value.key==='blastoise'||value.sourceKey==='blastoise';
  for(const field of ['key','sourceKey','spawnKey'])if(value[field]==='blastoise')value[field]='octillery';
  if(legacy&&value.card?.id===9){
    const profile=CARDS.octillery,visual=['name','id','scale','move','attackAnim','attackFrames','attackGestures','attackContactFrame','emitter','muzzleHeight','movementAnchor'];
    value.card={...value.card,...Object.fromEntries(visual.map(key=>[key,profile[key]]))};
  }
  if(!options.c4&&(value.key==='madriguera'||value.sourceKey==='madriguera')&&value.card?.id===31){
    const {name,id,structureArt}=CARDS.madriguera;
    value.card={...value.card,name,id,structureArt};
  }
  if(value.hands)value.hands=value.hands.map(currentDeck);
  if(value.queues)value.queues=value.queues.map(currentDeck);
  for(const[field,item]of Object.entries(value))if(!['card','sourceCard','guard','stats','hands','queues','legacyCardOverrides','snapshotProfiles'].includes(field))migrateLegacyCardIdentity(item,options);
  return value;
}

// Entity references are IDs on the wire; full cards preserve summoned forms.
const entityCopy=(e,c4=false)=>{const{target,...copy}=e;if(!c4)delete copy.abilityUsed;return{...copy,targetId:target?.id??null};};
export function packGame(game){
  const{onEvent,animations,units,towers,attacks,projectiles,...plain}=game;
  const c4=game.catalogVersion===4&&[C4_RULESET,LIGHT_EEVEE_RULESET].includes(game.ruleset);if(c4)delete plain.detachedEntities;const live=new Map([...units,...towers].map(e=>[e.id,e])),detached=new Map();
  const retain=entity=>{if(!c4||!entity)return;const existing=live.get(entity.id)||detached.get(entity.id);if(existing){if(existing!==entity)throw Error('Referencia C4 ambigua.');return;}if(!(entity.hp<=0))throw Error('Referencia C4 sin entidad.');detached.set(entity.id,entity);retain(entity.target);};
  if(c4){for(const entity of [...units,...towers])retain(entity.target);for(const job of attacks){retain(job.attacker);retain(job.target);}for(const projectile of projectiles)if(!projectile.rolling&&!projectile.linear)retain(projectile.target);}
  return{...plain,...(detached.size?{detachedEntities:[...detached.values()].map(e=>entityCopy(e,true))}:{}),units:units.map(e=>entityCopy(e,c4)),towers:towers.map(e=>entityCopy(e,c4)),attacks:attacks.map(({attacker,target,...job})=>({...job,attackerId:attacker.id,targetId:target.id})),projectiles:projectiles.map(({target,...p})=>({...p,targetId:p.rolling||p.linear?null:target?.id??p.chainTargetId??null}))};
}
export function unpackGame(data,onEvent=()=>{},animations={}){
  const version=data.catalogVersion??1, ruleset=data.ruleset??(version<=2?C1_RULESET:version===3?C3_RULESET:null);
  if(!(((version===1||version===2)&&ruleset===C1_RULESET)||(version===3&&[C1_RULESET,C3_RULESET].includes(ruleset))||(version===4&&[C1_RULESET,C4_RULESET,LIGHT_EEVEE_RULESET].includes(ruleset))))throw Error('Perfil de partida incompatible.');
  const c3=version===3&&ruleset===C3_RULESET?resolveC3Profiles(data):null;
  const c4=version===4&&[C4_RULESET,LIGHT_EEVEE_RULESET].includes(ruleset);
  if(ruleset===C4_RULESET&&Object.hasOwn(data,'arenaProfileProducer'))throw Object.assign(Error('Productor incompatible con reglas.'),{code:'ARENA_PROFILE_INVALID'});
  if(c4)validateC4Restore(data,getC4BaseCatalog());
  if(ruleset===LIGHT_EEVEE_RULESET)validateArenaProducerProfiles(data,ruleset);
  const restored=c4?structuredClone(data):migrateLegacyCardIdentity(structuredClone(data));
  restored.catalogVersion=version;restored.ruleset=ruleset;
  if(c3){restored.profileProducer=c3.source;restored.legacyCardOverrides={...restored.legacyCardOverrides,...c3.overrides};for(const entity of restored.units||[])if(Object.hasOwn(c3.overrides,entity.key)&&entity.card)entity.card=structuredClone(c3.overrides[entity.key]);}
  if(!c4&&(restored.boardVersion||1)<BOARD_VERSION){
    for(const tower of restored.towers||[])if(tower.king&&tower.y===(tower.team?118:682))tower.y=tower.team?94:706;
    const migrate=value=>{
      if(!value||typeof value!=='object')return;
      if(Array.isArray(value)){value.forEach(migrate);return;}
      for(const[key,item]of Object.entries(value)){
        if(['card','sourceCard','guard','stats','spawnSchedule','legacyCardOverrides','snapshotProfiles'].includes(key))continue;
        if(['x','groundX','startX','endX'].includes(key)&&typeof item==='number')value[key]=migrateLegacyX(item);
        else if(['y','groundY','startY','endY'].includes(key)&&typeof item==='number')value[key]=migrateLegacyY(item);
        else migrate(item);
      }
    };
    migrate(restored);restored.boardVersion=BOARD_VERSION;
  }
  const detached=c4?restored.detachedEntities||[]:[];if(c4)delete restored.detachedEntities;
  const game=Object.assign(Object.create(Game.prototype),restored);game.onEvent=onEvent;game.animations=animations;
  if(!c4){game.reinforcements??=[];for(const tower of game.towers)if(tower.king){if(tower.y===(tower.team?118:682))tower.y=KING_Y[tower.team];}else tower.range=PRINCESS_RANGE;}
  const entities=new Map([...game.units,...game.towers,...detached].map(e=>[e.id,e]));
  for(const entity of [...game.units,...game.towers,...(c4?detached:[])]){entity.card=entity.card||game.cardFor(entity.key);if(!c4){if(entity.card?.ability)delete entity.card.ability;delete entity.abilityUsed;}entity.target=entities.get(entity.targetId)||null;}
  game.attacks=game.attacks.map(j=>({...j,attacker:entities.get(j.attackerId),target:entities.get(j.targetId)}));
  game.projectiles=game.projectiles.map(p=>({...p,target:entities.get(p.targetId)}));
  if(!c4){game.attacks=game.attacks.filter(j=>j.attacker&&j.target);game.projectiles=game.projectiles.filter(p=>p.electricChain||p.rolling||p.linear||p.flameCone||p.impactPoint||p.target);}
  return game;
}
export function packEvent(event){
  const copy={...event};for(const key of['attacker','target','unit','tower'])if(copy[key])copy[key]=entityCopy(copy[key]);return structuredClone(copy);
}
function turn(value){
  if(Array.isArray(value))return value.map(turn);
  if(!value||typeof value!=='object')return value;
  const copy={};for(const[key,item]of Object.entries(value))copy[key]=['card','sourceCard','guard','stats','spawnSchedule','legacyCardOverrides','snapshotProfiles'].includes(key)?structuredClone(item):turn(item);
  if(typeof copy.x==='number')copy.x=W-copy.x;if(typeof copy.y==='number')copy.y=H-copy.y;
  if(typeof copy.groundX==='number')copy.groundX=W-copy.groundX;if(typeof copy.groundY==='number')copy.groundY=H-copy.groundY;
  if(typeof copy.liftX==='number')copy.liftX=-copy.liftX;
  if(typeof copy.startX==='number')copy.startX=W-copy.startX;if(typeof copy.startY==='number')copy.startY=H-copy.startY;
  if(typeof copy.endX==='number')copy.endX=W-copy.endX;if(typeof copy.endY==='number')copy.endY=H-copy.endY;
  if(typeof copy.dx==='number')copy.dx=-copy.dx;if(typeof copy.dy==='number')copy.dy=-copy.dy;
  for(const key of['steerX','steerY','separateX','separateY'])if(typeof copy[key]==='number')copy[key]=-copy[key];
  if(typeof copy.angle==='number')copy.angle+=Math.PI;
  if(copy.team===0||copy.team===1)copy.team=1-copy.team;
  if(copy.lane===0||copy.lane===1)copy.lane=1-copy.lane;
  if(copy.winner===0||copy.winner===1)copy.winner=1-copy.winner;
  return copy;
}
export function perspective(data,team){
  if(!team)return structuredClone(data);const result=turn(data);
  if(result.hands){result.hands.reverse();result.queues.reverse();result.energy.reverse();result.stats.reverse();}
  return result;
}
