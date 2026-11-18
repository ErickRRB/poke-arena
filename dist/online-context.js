import {C4_CATALOG_FINGERPRINT} from './c4-catalog.js?v=1';
import {getArenaProducerByRuleset} from './arena-profile-producers.js?v=1';
export const C1_SERVICE=Object.freeze({id:'c1',protocol:4,catalogVersion:1,ruleset:'c1-733',selectionVersion:1,keys:Object.freeze({token:'poke-arena:ws-token',room:'poke-arena:ws-room',seq:'poke-arena:ws-seq'})});
export const C4_SERVICE=Object.freeze({id:'c4',protocol:5,catalogVersion:4,ruleset:'c4-1',selectionVersion:2,catalogRef:C4_CATALOG_FINGERPRINT,keys:Object.freeze({token:'poke-arena:ws-token:c4',room:'poke-arena:ws-room:c4',seq:'poke-arena:ws-seq:c4'})});
export const C4_CONFIRMED_KEY='poke-arena:ws-session:c4';
const arenaServices=new Map();
const invalidContext=()=>Object.assign(new Error('Contexto de partida incompatible.'),{code:'C4_CONTEXT_INVALID'});
// Resolve only a known, explicitly identified context; no catalog preparation.
export function arenaServiceForContext(context){
  if(context===undefined)return C4_SERVICE;
  if(!context||typeof context!=='object'||Array.isArray(context))throw invalidContext();
  if(context.ruleset===C4_SERVICE.ruleset&&!Object.hasOwn(context,'arenaProfileProducer'))return C4_SERVICE;
  const producer=getArenaProducerByRuleset(context.ruleset);
  if(!producer||context.arenaProfileProducer!==producer.marker)throw invalidContext();
  if(!arenaServices.has(producer.marker))arenaServices.set(producer.marker,Object.freeze({...C4_SERVICE,ruleset:producer.ruleset,selectionVersion:3,arenaProfileProducer:producer.marker}));
  return arenaServices.get(producer.marker);
}
export function expectedContextForService(service){
  if(service?.id!=='c4')return undefined;
  const known=arenaServiceForContext(service);
  return known.arenaProfileProducer?Object.freeze({ruleset:known.ruleset,arenaProfileProducer:known.arenaProfileProducer}):undefined;
}
export const isC4Game=value=>value?.catalogVersion===4&&value.ruleset==='c4-1';
export const serviceForServer=env=>env?.ONLINE_SERVICE==='c4'||env?.LOCAL_C4_TEST==='1'?C4_SERVICE:C1_SERVICE;
export function serviceEnvelope(service,expectedContext){
  if(service?.id!=='c4')return{};
  const known=arenaServiceForContext(expectedContext===undefined?service:expectedContext);
  return{service:'c4',protocol:known.protocol,catalogVersion:known.catalogVersion,ruleset:known.ruleset,selectionVersion:known.selectionVersion,catalogRef:known.catalogRef,...(known.arenaProfileProducer?{arenaProfileProducer:known.arenaProfileProducer}:{})};
}
export function assertC4Envelope(packet,{expectedContext}={}){
  const known=arenaServiceForContext(expectedContext);
  for(const [key,value]of Object.entries(serviceEnvelope(known)))if(packet?.[key]!==value)throw invalidContext();
  if(!known.arenaProfileProducer&&Object.hasOwn(packet,'arenaProfileProducer'))throw invalidContext();
}
const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
export function localC4Endpoint(value){
  try{const page=new URL(value);if(!['http:','https:'].includes(page.protocol)||!loopback(page.hostname)||page.searchParams.get('preview')!=='c4-wire-1')return null;
    const endpoint=new URL(page.searchParams.get('realtime'));if(!['http:','https:','ws:','wss:'].includes(endpoint.protocol)||!loopback(endpoint.hostname)||endpoint.username||endpoint.password||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)return null;return endpoint.href;
  }catch{return null;}
}
