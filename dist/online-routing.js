import {localC4Endpoint} from './online-context.js?v=1';

export const C4_CANONICAL_ORIGIN='https://poke-arena-web.eriickramiirez.workers.dev';
export const C4_PRODUCTION_ENDPOINT='wss://poke-arena-realtime-c4.eriickramiirez.workers.dev';
// Change only in the reviewed activation source. Recovery remains available
// when new admissions are disabled; a failed C4 request never starts C1.
export const C4_NEW_SEARCHES_ENABLED=false;
const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
export function onlineRouting(value,newSearches=C4_NEW_SEARCHES_ENABLED){
  const page=new URL(value),local=localC4Endpoint(value),canonical=page.origin===C4_CANONICAL_ORIGIN;
  return{localC4:local,c4Recovery:local||(canonical?C4_PRODUCTION_ENDPOINT:null),c4Search:local||(canonical&&newSearches?C4_PRODUCTION_ENDPOINT:null)};
}
export function allowedC4Server(serverUrl,pageUrl=globalThis.location?.href){
  try{
    const server=new URL(serverUrl);if(server.username||server.password||server.pathname!=='/'||server.search||server.hash)return false;
    if(loopback(server.hostname))return ['http:','https:','ws:','wss:'].includes(server.protocol)&&(!pageUrl||loopback(new URL(pageUrl).hostname));
    return server.href===C4_PRODUCTION_ENDPOINT+'/'&&new URL(pageUrl).origin===C4_CANONICAL_ORIGIN;
  }catch{return false;}
}
