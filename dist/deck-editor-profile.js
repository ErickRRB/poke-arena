import {savedSlotProfile} from './deck-provenance.js?v=c4-editor-1';
import {HOG_ARCANINE} from './editor-hog-profile.js?v=c4-editor-1';
import {arenaCollectionProfile,arenaSelectionProfile} from './arena-selection-profiles.js?v=1';
import {LIGHT_EEVEE_OVERRIDES} from './eevee-light-profile.js?v=1';
const lightPresentations=new WeakMap();
function lightEeveePresentation(original){
  if(!lightPresentations.has(original))lightPresentations.set(original,Object.freeze(Object.assign(structuredClone(original),LIGHT_EEVEE_OVERRIDES)));
  return lightPresentations.get(original);
}

export function isLocalC4EditorPreview(value){
  let url;try{url=new URL(value);}catch{return false;}
  return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.searchParams.get('preview')==='c4-editor-1';
}
export function cardForEditor({key,cards,library,deckIndex,slotIndex=null,preview=false}){
  const original=Object.hasOwn(cards,key)?cards[key]:null;
  const profile=arenaCollectionProfile(key);
  if(profile&&original&&(slotIndex===null||Number.isInteger(slotIndex)&&slotIndex>=0&&slotIndex<8&&arenaSelectionProfile(library?.slots?.[deckIndex]?.[slotIndex])?.key===key))return lightEeveePresentation(original);
  if(preview!==true||key!=='arcanine'||!original)return original;
  if(slotIndex===null)return HOG_ARCANINE;
  if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=8)return original;
  return savedSlotProfile(library,deckIndex,slotIndex).kind==='hog'?HOG_ARCANINE:original;
}
export const editorCardRole=(card,fallback)=>card?.nativeReference==='HogRider'?'Montapuercos':fallback;
export function conversionPresentation(role,accepted){
  return{label:accepted===true?role:'Versión anterior',action:accepted===true?`✓ ${role}`:`Usar como ${role}`,selected:accepted===true};
}
