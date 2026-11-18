import {admitC4Selection} from './profile-selection.js?v=1';
import {admitArenaSelection} from './arena-profile-selection.js?v=1';
import {arenaServiceForContext} from './online-context.js?v=1';

export const C4_SEARCH_VERSION=1;
export const C4_PENDING_KEY='poke-arena:ws-pending:c4';
export const C4_SEARCH_TOKEN=/^[0-9a-f]{64}$/;
const choiceFields=['key','choice','catalogVersion','ruleset','action','acceptedAt'];

// Keep the raw eight positions and their consent proof, including acceptance
// timestamps. Property order alone must not turn a retry into another request.
export function c4SearchRequest(value,{expectedContext}={}){
  const service=arenaServiceForContext(expectedContext),selected=service.arenaProfileProducer?admitArenaSelection(value?.deck,value?.selection):admitC4Selection(value?.deck,value?.selection);
  if(typeof value?.name!=='string'||!selected.ok||selected.ruleset!==service.ruleset||selected.arenaProfileProducer!==service.arenaProfileProducer||['card','sourceCard','stats'].some(key=>Object.hasOwn(value,key)))throw Error('Revisá tu mazo antes de buscar.');
  const {version,choiceVersion,slots,conflictClock}=value.selection;
  return{name:value.name,deck:[...value.deck],selection:{version,choiceVersion,...(service.arenaProfileProducer?{arenaProfileProducer:service.arenaProfileProducer}:{}),slots:slots.map(entry=>entry===null?null:Object.fromEntries(choiceFields.map(key=>[key,entry[key]]))),conflictClock}};
}

export function newC4SearchToken(){
  const bytes=new Uint8Array(32);try{globalThis.crypto.getRandomValues(bytes);}catch{throw Error('No se pudo iniciar la búsqueda.');}
  return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function c4SearchEndpoint(value){
  const url=new URL(value);url.protocol=url.protocol==='https:'||url.protocol==='wss:'?'wss:':'ws:';return url.origin;
}
