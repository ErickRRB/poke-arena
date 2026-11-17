import {C4_CATALOG_FINGERPRINT} from './c4-catalog.js?v=1';
export const C1_SERVICE=Object.freeze({id:'c1',protocol:4,catalogVersion:1,ruleset:'c1-733',selectionVersion:1,keys:Object.freeze({token:'poke-arena:ws-token',room:'poke-arena:ws-room',seq:'poke-arena:ws-seq'})});
export const C4_SERVICE=Object.freeze({id:'c4',protocol:5,catalogVersion:4,ruleset:'c4-1',selectionVersion:2,catalogRef:C4_CATALOG_FINGERPRINT,keys:Object.freeze({token:'poke-arena:ws-token:c4',room:'poke-arena:ws-room:c4',seq:'poke-arena:ws-seq:c4'})});
export const isC4Game=value=>value?.catalogVersion===4&&value.ruleset==='c4-1';
export const serviceForServer=env=>env?.ONLINE_SERVICE==='c4'||env?.LOCAL_C4_TEST==='1'?C4_SERVICE:C1_SERVICE;
export const serviceEnvelope=service=>service?.id==='c4'?{service:'c4',protocol:5,catalogVersion:4,ruleset:'c4-1',selectionVersion:2,catalogRef:C4_CATALOG_FINGERPRINT}:{};
export function assertC4Envelope(packet){
  for(const [key,value]of Object.entries(serviceEnvelope(C4_SERVICE)))if(packet?.[key]!==value)throw Object.assign(new Error('Contexto de partida incompatible.'),{code:'C4_CONTEXT_INVALID'});
}
const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
export function localC4Endpoint(value){
  try{const page=new URL(value);if(!['http:','https:'].includes(page.protocol)||!loopback(page.hostname)||page.searchParams.get('preview')!=='c4-wire-1')return null;
    const endpoint=new URL(page.searchParams.get('realtime'));if(!['http:','https:','ws:','wss:'].includes(endpoint.protocol)||!loopback(endpoint.hostname)||endpoint.username||endpoint.password||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)return null;return endpoint.href;
  }catch{return null;}
}
