import {getC4BaseCatalog} from './c4-catalog.js?v=1';
import {BOARD_VERSION} from './arena-geometry.js?v=34';
import {currentCardKey} from './card-key-migrations.js?v=34';
import {validateC4Profiles} from './hog-profiles.js?v=1';
const fail=reason=>{const error=new Error('Estado C4 incompatible: '+reason);error.code='C4_PROFILE_INVALID';throw error;};
const alias=value=>typeof value==='string'&&currentCardKey(value)!==value;
function identityRecord(record){if(!record||typeof record!=='object')return;for(const field of ['key','sourceKey','spawnKey','cardKey'])if(alias(record[field]))fail('identidad no canónica');if(record.spawnGroup)identityRecord(record.spawnGroup);}
// Event consumers use this same schema-aware identity rule, without C1 migrations.
export function validateC4EventIdentity(event,cards){if(cards!==getC4BaseCatalog())throw Object.assign(new Error('Catálogo C4 no verificado.'),{code:'C4_CATALOG_SOURCE'});identityRecord(event);for(const field of ['unit','attacker','target','tower'])identityRecord(event?.[field]);return true;}
export function validateC4Restore(data,cards){
 validateC4Profiles(data,cards);
 if(data.boardVersion!==BOARD_VERSION)fail('versión de tablero');
 for(const field of ['units','towers','attacks','projectiles','reinforcements','hands','queues'])if(!Array.isArray(data[field]))fail('falta '+field);
 const detached=data.detachedEntities??[];if(!Array.isArray(detached))fail('referencias separadas');
 const ids=new Map();for(const entity of [...data.units,...data.towers,...detached]){
  if(!entity||!Number.isSafeInteger(entity.id)||entity.id<=0||ids.has(entity.id))fail('identificador ambiguo');
  ids.set(entity.id,entity);identityRecord(entity);
 }
 for(const entity of data.units){if(typeof entity.key!=='string'||!Object.hasOwn(cards,entity.key))fail('unidad no resoluble');}
 for(const entity of detached){if(!(entity.hp<=0)||!Number.isFinite(entity.x)||!Number.isFinite(entity.y)||typeof entity.key!=='string'||!Object.hasOwn(cards,entity.key)||!entity.card||typeof entity.card!=='object'||Array.isArray(entity.card)||!Object.keys(cards[entity.key]).every(key=>Object.hasOwn(entity.card,key)))fail('referencia separada inválida');}
 for(const row of [...data.hands,...data.queues]){if(!Array.isArray(row))fail('mano o cola inválida');for(const key of row)if(typeof key!=='string'||alias(key)||!Object.hasOwn(cards,key))fail('carta no resoluble');}
 for(const field of ['attacks','projectiles','spells','fields','reinforcements'])for(const item of data[field]??[])identityRecord(item);
 const referenced=new Set();const ref=(id,optional=false)=>{if(id==null&&optional)return;if(!Number.isSafeInteger(id)||!ids.has(id))fail('referencia no resoluble');referenced.add(id);};
 for(const entity of [...data.units,...data.towers])ref(entity.targetId,true);
 for(const job of data.attacks){ref(job.attackerId);ref(job.targetId);}
 for(const p of data.projectiles){const optional=!!(p.rolling||p.linear||p.impactPoint);ref(p.targetId,optional);}
 const ghosts=new Map(detached.map(entity=>[entity.id,entity])),visited=new Set(),queue=[...referenced];while(queue.length){const id=queue.shift(),ghost=ghosts.get(id);if(!ghost||visited.has(id))continue;visited.add(id);if(ghost.targetId!=null){ref(ghost.targetId);queue.push(ghost.targetId);}}
 for(const entity of detached)if(!visited.has(entity.id))fail('referencia separada no usada');
 return true;
}
