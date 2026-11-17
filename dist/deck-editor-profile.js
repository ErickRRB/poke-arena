import {savedSlotProfile} from './deck-provenance.js?v=c4-editor-1';
import {HOG_ARCANINE} from './editor-hog-profile.js?v=c4-editor-1';

export function isLocalC4EditorPreview(value){
  let url;try{url=new URL(value);}catch{return false;}
  return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.searchParams.get('preview')==='c4-editor-1';
}
export function cardForEditor({key,cards,library,deckIndex,slotIndex=null,preview=false}){
  const original=Object.hasOwn(cards,key)?cards[key]:null;
  if(preview!==true||key!=='arcanine'||!original)return original;
  if(slotIndex===null)return HOG_ARCANINE;
  if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=8)return original;
  return savedSlotProfile(library,deckIndex,slotIndex).kind==='hog'?HOG_ARCANINE:original;
}
export const editorCardRole=(card,fallback)=>card===HOG_ARCANINE?'Montapuercos':fallback;
export function conversionPresentation(role,accepted){
  return{label:accepted===true?role:'Versión anterior',action:accepted===true?`✓ ${role}`:`Usar como ${role}`,selected:accepted===true};
}
