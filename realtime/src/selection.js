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
export function validQueuedDeck(session){
  try{const deck=JSON.parse(session.deck),version=queueVersion(session);return version===0?validDeck(deck):version===selectionVersion&&!!selectedDeck(deck);}catch{return false;}
}
export const legacyQueueExpired=(session,now)=>queueVersion(session)===0&&session.joined!==null&&session.joined!==undefined&&now-session.joined>=LEGACY_QUEUE_MAX_AGE;
export function continuesQueue(session,packet){
  if(session.joined===null||session.joined===undefined)return false;
  if(packet.mode==='resume')return true;
  try{return packet.mode==='search'&&JSON.stringify(currentDeck(packet.deck))===JSON.stringify(currentDeck(JSON.parse(session.deck)));}catch{return false;}
}
