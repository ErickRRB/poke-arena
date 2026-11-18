import {LIGHT_EEVEE_RULESET,LIGHT_EEVEE_PRODUCER,getArenaProducerByMarker} from './arena-profile-producers.js?v=eevee-1';

// Saved references identify an explicit selection, not client-supplied stats.
// Older clients preserve these strings but cannot admit them as legacy Eevee.
export const EEVEE_LIGHT_SELECTION_REF='arena:eevee-light-v1';
const eevee=Object.freeze({reference:EEVEE_LIGHT_SELECTION_REF,key:'eevee',choice:'eevee-light-v1',catalogVersion:4,ruleset:LIGHT_EEVEE_RULESET,arenaProfileProducer:LIGHT_EEVEE_PRODUCER});
const references=Object.freeze({[eevee.reference]:eevee});
export function arenaSelectionProfile(reference){return Object.hasOwn(references,reference)?references[reference]:null;}
export function arenaCollectionProfile(key){return key===eevee.key?eevee:null;}
export function arenaSelectionProducer(marker){return getArenaProducerByMarker(marker);}
export function hasArenaSelection(row){return Array.isArray(row)&&row.some(reference=>arenaSelectionProfile(reference)!==null);}
