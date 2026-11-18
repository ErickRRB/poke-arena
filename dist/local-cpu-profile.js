import {checkC4LibraryDeck} from './profile-selection.js?v=eevee-1';
import {checkSelectionDeck} from './canonical-selection.js?v=1';
import {savedSlotProfile} from './deck-provenance.js?v=eevee-1';
import {hasArenaSelection} from './arena-selection-profiles.js?v=eevee-1';
import {checkArenaLibraryDeck} from './arena-profile-selection.js?v=eevee-1';
export {checkC4LibraryDeck as checkLocalCpuDeck} from './profile-selection.js?v=eevee-1';
export function checkCpuDeck(library,deckIndex,{forceC4=false}={}){
  if(library?.version!==1||!Number.isInteger(deckIndex)||deckIndex<0||deckIndex>=4)return{ok:false,reason:'invalid-library'};
  const row=library.slots?.[deckIndex];
  if(!Array.isArray(row)||row.length!==8)return{ok:false,reason:'eight-positions-required'};
  for(let index=0;index<8;index++)if(!Object.hasOwn(row,index))return{ok:false,reason:'eight-positions-required'};
  if(hasArenaSelection(row))return checkArenaLibraryDeck(library,deckIndex);
  const acceptedHog=Array.isArray(row)&&row.some((key,index)=>key==='arcanine'&&savedSlotProfile(library,deckIndex,index).kind==='hog');
  if(forceC4||acceptedHog)return checkC4LibraryDeck(library,deckIndex);
  const selected=checkSelectionDeck(row);
  return selected.ok?{ok:true,keys:selected.slots.map(slot=>slot.canonicalKey),catalogVersion:1,ruleset:'c1-733'}:selected;
}
export function isLocalC4CpuPreview(value){
  let url;try{url=new URL(value);}catch{return false;}
  return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.searchParams.get('preview')==='c4-cpu-1';
}
