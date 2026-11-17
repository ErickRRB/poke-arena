import {checkSelectionCard} from './canonical-selection.js?v=1';
import {savedSlotProfile} from './deck-provenance.js?v=c4-editor-1';

export function isLocalC4CpuPreview(value){
  let url;try{url=new URL(value);}catch{return false;}
  return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.searchParams.get('preview')==='c4-cpu-1';
}

// Admission reads exact saved positions. It never repairs or accepts a library.
export function checkLocalCpuDeck(library,deckIndex){
  if(library?.version!==1||!Number.isInteger(deckIndex)||deckIndex<0||deckIndex>=4)return{ok:false,reason:'invalid-library'};
  const row=library.slots?.[deckIndex];
  if(!Array.isArray(row)||row.length!==8)return{ok:false,reason:'eight-positions-required'};
  const keys=[],seen=new Set();
  for(let index=0;index<8;index++){
    const raw=row[index],profile=savedSlotProfile(library,deckIndex,index),selection=checkSelectionCard(raw);
    if(profile.kind==='conflict')return{ok:false,index,reason:'profile-conflict'};
    if(raw==='arcanine'?profile.kind!=='hog':!selection.ok)return{ok:false,index,reason:raw==='arcanine'?'acceptance-required':'inactive-card'};
    const key=raw==='arcanine'?raw:selection.canonicalKey;
    if(seen.has(key))return{ok:false,index,reason:'duplicate-card'};
    seen.add(key);keys.push(key);
  }
  return{ok:true,keys,catalogVersion:4,ruleset:'c4-1'};
}
