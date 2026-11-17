import {admitC4Selection} from '../../dist/profile-selection.js?v=1';
import {C1_SERVICE,assertC4Envelope} from '../../dist/online-context.js?v=1';
import {currentDeck,validDeck} from '../../dist/engine.js?v=34';
import {selectionVersion,checkSelectionDeck} from '../../dist/canonical-selection.js?v=1';

export {selectionVersion};
export const LEGACY_QUEUE_MAX_AGE=60000;
export function selectedDeck(input){
  const checked=checkSelectionDeck(input);
  if(!checked.ok)return null;
  const deck=checked.slots.map(slot=>slot.canonicalKey);
  return validDeck(deck)?deck:null;
}
export const queueVersion=session=>session.selection_version??0;
export function validQueuedDeck(session,service=C1_SERVICE){
  try{const deck=JSON.parse(session.deck),version=queueVersion(session);if(version===2){if(service.id!=='c4')return false;assertC4Envelope(JSON.parse(session.profile_context));return admitC4Selection(deck,JSON.parse(session.c4_selection)).ok;}if(service.id==='c4')return false;return version===0?validDeck(deck):version===selectionVersion&&!!selectedDeck(deck);}catch{return false;}
}
export const legacyQueueExpired=(session,now)=>queueVersion(session)===0&&session.joined!==null&&session.joined!==undefined&&now-session.joined>=LEGACY_QUEUE_MAX_AGE;
export function continuesQueue(session,packet,service=C1_SERVICE){
  if(session.joined===null||session.joined===undefined)return false;
  if(packet.mode==='resume')return true;
  if(service.id==='c4')try{return packet.mode==='search'&&admitC4Selection(packet.deck,packet.selection).ok&&JSON.stringify(admitC4Selection(packet.deck,packet.selection).keys)===session.deck&&JSON.stringify(packet.selection)===session.c4_selection;}catch{return false;}
  try{return packet.mode==='search'&&JSON.stringify(currentDeck(packet.deck))===JSON.stringify(currentDeck(JSON.parse(session.deck)));}catch{return false;}
}
