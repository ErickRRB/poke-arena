import {checkSelectionCard} from './canonical-selection.js?v=1';
import {savedSlotProfile} from './deck-provenance.js?v=c4-editor-1';
export const C4_SELECTION_VERSION=2;
// The same pure positional guard is used by the editor, CPU and authority.
export function checkC4LibraryDeck(library,deckIndex){
  if(library?.version!==1||!Number.isInteger(deckIndex)||deckIndex<0||deckIndex>=4)return{ok:false,reason:'invalid-library'};
  const row=library.slots?.[deckIndex];if(!Array.isArray(row)||row.length!==8)return{ok:false,reason:'eight-positions-required'};
  const keys=[],seen=new Set();
  for(let index=0;index<8;index++){
    const raw=row[index],profile=savedSlotProfile(library,deckIndex,index),selection=checkSelectionCard(raw);
    if(profile.kind==='conflict')return{ok:false,index,reason:'profile-conflict'};
    if(raw==='arcanine'?profile.kind!=='hog':!selection.ok)return{ok:false,index,reason:raw==='arcanine'?'acceptance-required':'inactive-card'};
    const key=raw==='arcanine'?raw:selection.canonicalKey;if(seen.has(key))return{ok:false,index,reason:'duplicate-card'};seen.add(key);keys.push(key);
  }
  return{ok:true,keys,catalogVersion:4,ruleset:'c4-1'};
}
const choiceFields=['key','choice','catalogVersion','ruleset','action','acceptedAt'];
export function c4SelectionFromLibrary(library,deckIndex){
  const checked=checkC4LibraryDeck(library,deckIndex);if(!checked.ok)return checked;
  const entries=library.slotProvenance?.slots?.[deckIndex]||[];
  return{...checked,deck:[...library.slots[deckIndex]],selection:{version:2,choiceVersion:1,slots:Array.from({length:8},(_,i)=>entries[i]?Object.fromEntries(choiceFields.map(key=>[key,entries[i][key]])):null),conflictClock:library.provenanceConflict?.updatedAt??0}};
}
export function admitC4Selection(deck,selection){
  if(!selection||selection.version!==2||selection.choiceVersion!==1||!Array.isArray(selection.slots)||selection.slots.length!==8||!Number.isSafeInteger(selection.conflictClock)||selection.conflictClock<0)return{ok:false,reason:'invalid-selection'};
  if(Object.keys(selection).some(key=>!['version','choiceVersion','slots','conflictClock'].includes(key)))return{ok:false,reason:'invalid-selection-fields'};
  for(const entry of selection.slots)if(entry!==null&&(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).length!==choiceFields.length||Object.keys(entry).some(key=>!choiceFields.includes(key))||!Number.isSafeInteger(entry.acceptedAt)||entry.acceptedAt<=0))return{ok:false,reason:'invalid-slot-choice'};
  const library={version:1,slots:[deck],slotProvenance:{version:1,slots:[selection.slots]},...(selection.conflictClock?{provenanceConflict:{updatedAt:selection.conflictClock}}:{})};
  return checkC4LibraryDeck(library,0);
}
