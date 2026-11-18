import {checkSelectionCard,resolveSelectionKey} from './canonical-selection.js?v=1';
import {savedSlotProfile} from './deck-provenance.js?v=arena-selection-1';
import {c4SelectionFromLibrary,admitC4Selection} from './profile-selection.js?v=1';
import {arenaSelectionProfile,arenaSelectionProducer,hasArenaSelection} from './arena-selection-profiles.js?v=1';

export const ARENA_SELECTION_VERSION=3;
const choiceFields=['key','choice','catalogVersion','ruleset','action','acceptedAt'];
const selectionFields=['version','choiceVersion','arenaProfileProducer','slots','conflictClock'];
export function resolveSavedSelectionKey(reference){return arenaSelectionProfile(reference)?.key??resolveSelectionKey(reference).key;}

export function checkArenaLibraryDeck(library,deckIndex,{producer=null}={}){
  if(library?.version!==1||!Number.isInteger(deckIndex)||deckIndex<0||deckIndex>=4)return{ok:false,reason:'invalid-library'};
  const row=library.slots?.[deckIndex];
  if(!Array.isArray(row)||row.length!==8||Array.from({length:8},(_,i)=>!Object.hasOwn(row,i)).some(Boolean))return{ok:false,reason:'eight-positions-required'};
  const referenceProfile=producer===null?row.map(arenaSelectionProfile).find(Boolean):null;
  const selected=arenaSelectionProducer(producer??referenceProfile?.arenaProfileProducer);
  if(!selected)return{ok:false,reason:'unknown-profile-producer'};
  const marker=selected.marker,keys=[],seen=new Set();
  for(let index=0;index<8;index++){
    const reference=row[index],choice=savedSlotProfile(library,deckIndex,index),profile=arenaSelectionProfile(reference);
    if(choice.kind==='conflict')return{ok:false,index,reason:'profile-conflict'};
    let key;
    if(profile){
      if(profile.arenaProfileProducer!==marker||choice.kind!=='profile'||choice.arenaProfileProducer!==marker)return{ok:false,index,reason:'profile-conflict'};
      key=profile.key;
    }else if(selected.keys.includes(reference))return{ok:false,index,reason:'acceptance-required'};
    else if(reference==='arcanine'){
      if(choice.kind!=='hog')return{ok:false,index,reason:'acceptance-required'};
      key=reference;
    }else{
      const canonical=checkSelectionCard(reference);
      if(!canonical.ok)return{ok:false,index,reason:'inactive-card'};
      key=canonical.canonicalKey;
      // An alias must not bypass an override's explicit position choice.
      if(selected.keys.includes(key))return{ok:false,index,reason:'acceptance-required'};
    }
    if(seen.has(key))return{ok:false,index,reason:'duplicate-card'};
    seen.add(key);keys.push(key);
  }
  return{ok:true,keys,catalogVersion:4,ruleset:selected.ruleset,arenaProfileProducer:marker};
}
export function arenaSelectionFromLibrary(library,deckIndex){
  if(!hasArenaSelection(library?.slots?.[deckIndex]))return c4SelectionFromLibrary(library,deckIndex);
  const checked=checkArenaLibraryDeck(library,deckIndex);if(!checked.ok)return checked;
  const entries=library.slotProvenance?.slots?.[deckIndex]??[];
  return{...checked,deck:[...library.slots[deckIndex]],selection:{version:ARENA_SELECTION_VERSION,choiceVersion:2,arenaProfileProducer:checked.arenaProfileProducer,
    slots:Array.from({length:8},(_,i)=>entries[i]==null?null:Object.fromEntries(choiceFields.map(key=>[key,entries[i][key]]))),conflictClock:library.provenanceConflict?.updatedAt??0}};
}
export function admitArenaSelection(deck,selection){
  if(selection?.version===2)return admitC4Selection(deck,selection);
  if(!selection||selection.version!==ARENA_SELECTION_VERSION||selection.choiceVersion!==2||!arenaSelectionProducer(selection.arenaProfileProducer)||
    Object.keys(selection).length!==selectionFields.length||Object.keys(selection).some(key=>!selectionFields.includes(key))||
    !Array.isArray(selection.slots)||selection.slots.length!==8||!Number.isSafeInteger(selection.conflictClock)||selection.conflictClock<0)return{ok:false,reason:'invalid-selection'};
  for(const entry of selection.slots)if(entry!==null&&(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).length!==choiceFields.length||Object.keys(entry).some(key=>!choiceFields.includes(key))||!Number.isSafeInteger(entry.acceptedAt)||entry.acceptedAt<=0))return{ok:false,reason:'invalid-slot-choice'};
  return checkArenaLibraryDeck({version:1,slots:[deck],slotProvenance:{version:1,slots:[selection.slots]},...(selection.conflictClock?{provenanceConflict:{updatedAt:selection.conflictClock}}:{})},0,{producer:selection.arenaProfileProducer});
}
