import {arenaSelectionProfile,arenaCollectionProfile} from './arena-selection-profiles.js?v=1';
// Storage provenance is a per-position choice, never a catalogue-wide opt-in.
const clock=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):0;
const actions=new Set(['accept','replace','collection']);
function position(library,deckIndex,index){
  return library?.version===1&&Number.isInteger(deckIndex)&&deckIndex>=0&&deckIndex<4&&Number.isInteger(index)&&index>=0&&index<8&&Array.isArray(library.slots);
}
export function savedSlotProfile(library,deckIndex,index){
  const key=library?.slots?.[deckIndex]?.[index],metadata=library?.slotProvenance;
  if(library?.version!==1)return{kind:'conflict',key,reason:'unknown-library-format'};
  const row=metadata?.slots?.[deckIndex];
  if(row!=null&&!Array.isArray(row))return{kind:'conflict',key,reason:'unknown-provenance-row'};
  const entry=metadata?.version===1&&Array.isArray(metadata.slots)?metadata.slots[deckIndex]?.[index]:undefined;
  if(metadata&&!(metadata.version===1&&Array.isArray(metadata.slots)))return{kind:'conflict',key,reason:'unknown-provenance-format'};
  const selected=arenaSelectionProfile(key);
  if(entry==null){
    if(selected)return library.provenanceConflict?{kind:'conflict',key,reason:'conflicting-source-needs-choice'}:{kind:'profile',...selected,key,reason:null};
    return{kind:key==='arcanine'||arenaCollectionProfile(key)?'legacy':'unchanged',key,ruleset:'c1-733',reason:key==='arcanine'||arenaCollectionProfile(key)?'acceptance-required':null};
  }
  const accepted=key==='arcanine'&&entry.key===key&&entry.choice==='hog-arcanine'&&entry.catalogVersion===4&&entry.ruleset==='c4-1'&&actions.has(entry.action)&&clock(entry.acceptedAt)>0;
  const acceptedProfile=selected&&entry.key===key&&entry.choice===selected.choice&&entry.catalogVersion===selected.catalogVersion&&entry.ruleset===selected.ruleset&&actions.has(entry.action)&&clock(entry.acceptedAt)>0;
  if(!accepted&&!acceptedProfile)return{kind:'conflict',key,reason:'profile-key-or-choice-conflict'};
  if(library.provenanceConflict&&clock(entry.acceptedAt)<=clock(library.provenanceConflict.updatedAt))return{kind:'conflict',key,reason:'conflicting-source-needs-choice'};
  if(acceptedProfile)return{kind:'profile',...selected,key,acceptedAt:entry.acceptedAt,reason:null};
  return{kind:'hog',key,catalogVersion:4,ruleset:'c4-1',acceptedAt:entry.acceptedAt,reason:null};
}
function editableMetadata(library){
  const current=library.slotProvenance;
  if(current==null)return{version:1,slots:[[],[],[],[]]};
  if(current.version!==1||!Array.isArray(current.slots))throw new Error('Formato de procedencia no reconocido.');
  return current;
}
export function updateLibrarySlot(library,deckIndex,index,key,{action='replace',now=Date.now(),profileChoice=null}={}){
  if(!position(library,deckIndex,index)||!actions.has(action))return null;
  const old=library.slots[deckIndex];if(old!=null&&!Array.isArray(old))return null;
  const profile=profileChoice===null?arenaSelectionProfile(key):arenaCollectionProfile(key);
  if(profileChoice!==null&&(!profile||profile.choice!==profileChoice))return null;
  if(action==='accept'&&!(profile?[profile.key,profile.reference].includes(old?.[index]):old?.[index]==='arcanine'&&key==='arcanine'))return null;
  if(profile)key=profile.reference;
  const copy=structuredClone(library);
  // Conflict snapshots may share references with the chosen envelope in memory.
  // Detach the edited branches so the retained producer payload stays intact.
  copy.slots=structuredClone(library.slots);
  if(copy.slotProvenance)copy.slotProvenance=structuredClone(library.slotProvenance);
  const row=copy.slots[deckIndex]??[];
  copy.slots[deckIndex]=row;row[index]=key;
  const revision=Math.max(clock(now),clock(library.updatedAt)+1,clock(library.provenanceConflict?.updatedAt)+1);
  if(key==='arcanine'||profile){
    const metadata=editableMetadata(copy),profiles=metadata.slots[deckIndex];
    if(profiles!=null&&!Array.isArray(profiles))return null;
    metadata.slots[deckIndex]=profiles??[];
    metadata.slots[deckIndex][index]={key,choice:profile?.choice??'hog-arcanine',catalogVersion:4,ruleset:profile?.ruleset??'c4-1',acceptedAt:revision,action};
    copy.slotProvenance=metadata;
  }else if(copy.slotProvenance?.version===1&&Array.isArray(copy.slotProvenance.slots)){
    const profiles=copy.slotProvenance.slots[deckIndex];
    if(Array.isArray(profiles)&&index<profiles.length)profiles[index]=null;
  }
  copy.updatedAt=revision;
  return copy;
}
