import {getC4BaseCatalog,isCompleteC4CardProfile} from './c4-catalog.js?v=1';
import {BOARD_VERSION} from './arena-geometry.js?v=34';
import {currentCardKey} from './card-key-migrations.js?v=34';
import {validateC4Profiles,HOG_ARCANINE,isCompatibleHogProfile} from './hog-profiles.js?v=1';
const fail=reason=>{const error=new Error('Estado C4 incompatible: '+reason);error.code='C4_PROFILE_INVALID';throw error;};
const alias=value=>typeof value==='string'&&currentCardKey(value)!==value;
function identityRecord(record){if(!record||typeof record!=='object')return;for(const field of ['key','sourceKey','spawnKey','cardKey'])if(alias(record[field]))fail('identidad no canónica');if(record.spawnGroup)identityRecord(record.spawnGroup);}
const profileFor=(key,cards)=>typeof key==='string'&&Object.hasOwn(cards,key)?key==='arcanine'?HOG_ARCANINE:cards[key]:undefined;
function profileSlot(record,field,key,cards,required=false){
 if(!Object.hasOwn(record,field)){if(required)fail('falta perfil');return;}
 const expected=profileFor(key,cards);if(!expected||!isCompleteC4CardProfile(record[field],expected)||(key==='arcanine'&&!isCompatibleHogProfile(record[field])))fail('perfil incompleto o no resoluble');
}
function entityProfile(entity,cards,required=false){
 if(!entity||typeof entity!=='object')return;
 if('king'in entity){if(entity.card!=null)fail('perfil de torre inesperado');return;}
 if(typeof entity.key!=='string'||!profileFor(entity.key,cards))fail('unidad no resoluble');
 profileSlot(entity,'card',entity.key,cards,required);
 if(entity.burn&&Object.hasOwn(entity.burn,'sourceCard'))profileSlot(entity.burn,'sourceCard',entity.burn.sourceKey,cards);
}
// Shared identity and typed entity/profile checks, without C1 migrations.
export function validateC4EventIdentity(event,cards){
 if(cards!==getC4BaseCatalog())throw Object.assign(new Error('Catálogo C4 no verificado.'),{code:'C4_CATALOG_SOURCE'});
 identityRecord(event);for(const field of ['unit','attacker','target','tower']){const entity=event?.[field];identityRecord(entity);entityProfile(entity,cards);}
 if(Object.hasOwn(event,'sourceCard')){const key=event.sourceKey??event.key;if(typeof event.sourceKey==='string'&&typeof event.key==='string'&&event.sourceKey!==event.key)fail('fuente contradictoria');profileSlot(event,'sourceCard',key,cards);}
 return true;
}
export function validateC4Restore(data,cards){
 validateC4Profiles(data,cards);
 if(data.boardVersion!==BOARD_VERSION)fail('versión de tablero');
 for(const field of ['units','towers','attacks','projectiles','reinforcements','hands','queues'])if(!Array.isArray(data[field]))fail('falta '+field);
 const detached=data.detachedEntities??[];if(!Array.isArray(detached))fail('referencias separadas');
 const ids=new Map();for(const entity of [...data.units,...data.towers,...detached]){
  if(!entity||!Number.isSafeInteger(entity.id)||entity.id<=0||ids.has(entity.id))fail('identificador ambiguo');
  ids.set(entity.id,entity);identityRecord(entity);
 }
 for(const entity of data.units)entityProfile(entity,cards);
 for(const entity of detached){if(!(entity.hp<=0)||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))fail('referencia separada inválida');entityProfile(entity,cards,true);}
 for(const row of [...data.hands,...data.queues]){if(!Array.isArray(row))fail('mano o cola inválida');for(const key of row)if(typeof key!=='string'||alias(key)||!Object.hasOwn(cards,key))fail('carta no resoluble');}
 for(const field of ['attacks','projectiles','spells','fields','reinforcements'])for(const item of data[field]??[])identityRecord(item);
 for(const spell of data.spells??[])profileSlot(spell,'card',spell.key,cards,true);
 const referenced=new Set();const ref=(id,optional=false)=>{if(id==null&&optional)return;if(!Number.isSafeInteger(id)||!ids.has(id))fail('referencia no resoluble');referenced.add(id);};
 for(const entity of [...data.units,...data.towers])ref(entity.targetId,true);
 for(const job of data.attacks){ref(job.attackerId);ref(job.targetId);}
 for(const p of data.projectiles){const optional=!!(p.rolling||p.linear||p.impactPoint);ref(p.targetId,optional);}
 const ghosts=new Map(detached.map(entity=>[entity.id,entity])),visited=new Set(),queue=[...referenced];while(queue.length){const id=queue.shift(),ghost=ghosts.get(id);if(!ghost||visited.has(id))continue;visited.add(id);if(ghost.targetId!=null){ref(ghost.targetId);queue.push(ghost.targetId);}}
 for(const entity of detached)if(!visited.has(entity.id))fail('referencia separada no usada');
 return true;
}
