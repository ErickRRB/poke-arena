import {isC4Game} from './online-context.js?v=1';
import {getC4BaseCard} from './c4-catalog.js?v=1';
import {HOG_ARCANINE} from './hog-profiles.js?v=1';
import { CARDS } from './engine.js?v=target-c1-1';
import { packGame, migrateLegacyCardIdentity } from './snapshot.js?v=target-c1-1';

export const ONLINE_PROTOCOL = 4;
export const SIMULATION_HZ = 30;
export const SNAPSHOT_HZ = 15;
export const RECONNECT_GRACE = 25000;
const cardSignatures = new WeakMap();
function signature(card) {
  if (!cardSignatures.has(card)) cardSignatures.set(card, JSON.stringify(card));
  return cardSignatures.get(card);
}
function compactLegacyEntity(entity) {
  const { target, card, ...copy } = entity;
  const canonical = CARDS[entity.key];
  if (card && (!canonical || card !== canonical && signature(card) !== signature(canonical))) copy.card = card;
  copy.targetId = target?.id ?? entity.targetId ?? null;
  return copy;
}
const sameProfile=(a,b)=>{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(key=>Object.hasOwn(b,key)&&sameProfile(a[key],b[key]));};
const c4Card=key=>key==='arcanine'?HOG_ARCANINE:getC4BaseCard(key);
function eventProfiles(event,game){
  const fail=()=>{throw Object.assign(new Error('Procedencia de evento C4 incompatible.'),{code:'C4_EVENT_PROFILE_INVALID'});};
  const check=(value,key)=>{
    const base=key==='tower'?[...(game.towers||[]),...(game.detachedEntities||[])].find(t=>t.id===value.sourceId&&'king'in t)?.guard:c4Card(key);
    if(value.sourceProfile!==undefined&&(value.sourceProfile!=='c4-1:cards-c1-733'||!base||key==='arcanine'||key==='tower'))fail();
    for(const field of ['card','sourceCard'])if(value[field]!==undefined){
      const profile=value[field];if(!base||!profile||typeof profile!=='object'||Array.isArray(profile)||!Object.keys(base).every(k=>Object.hasOwn(profile,k)))fail();
      for(const [k,expected]of Object.entries(base))if(expected!==null&&typeof expected!=='object'&&typeof profile[k]!==typeof expected)fail();
      if(key==='arcanine'&&!sameProfile(profile,HOG_ARCANINE)||key==='tower'&&!sameProfile(profile,base)||value.sourceProfile!==undefined&&!sameProfile(profile,base))fail();
    }
  };
  if(event.sourceProfile!==undefined||event.sourceCard!==undefined||event.card!==undefined)check(event,event.sourceKey??event.key??event.attacker?.key??event.unit?.key);
  for(const key of ['attacker','target','unit','tower'])if(event[key])check(event[key],event[key].key);
}
function compactEntity(entity,context){
  if(!isC4Game(context))return compactLegacyEntity(entity);
  const {target,card,...copy}=entity,canonical=c4Card(entity.key);
  if(card&&!sameProfile(card,canonical))copy.card=card;
  copy.targetId=target?.id??entity.targetId??null;return copy;
}
export function publicSnapshot(game, team) {
  const copy = packGame(game);
  copy.units = (isC4Game(game)?copy.units:game.units).map(entity=>compactEntity(entity,game));
  copy.towers = (isC4Game(game)?copy.towers:game.towers).map(entity=>compactEntity(entity,game));
  copy.hands = game.hands.map((hand, index) => index === team ? [...hand] : []);
  copy.queues = game.queues.map((queue, index) => index === team ? [...queue] : []);
  if(isC4Game(game))return structuredClone(copy);
  // Precision is reduced only on the wire; the authoritative simulation keeps it.
  return JSON.parse(JSON.stringify(copy, (_, value) => typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 1000) / 1000 : value));
}
export function publicEvent(event,context) {
  const copy = { ...event };
  for (const key of ['attacker', 'target', 'unit', 'tower']) if (copy[key]) copy[key] = compactEntity(copy[key],context);
  return structuredClone(copy);
}
export function unpackEvent(event,context) {
  const copy = { ...event };
  for (const key of ['attacker', 'target', 'unit', 'tower']) if (copy[key]) copy[key] = { ...copy[key] };
  const game=context?.game||context;
  if(isC4Game(game)){
    // The pure identity boundary is supplied by the prepared packet bootstrap.
    if(typeof context?.validateEvent!=='function')throw Object.assign(new Error('Validación C4 de eventos no preparada.'),{code:'C4_EVENT_VALIDATOR_REQUIRED'});
    context.validateEvent(copy);
    eventProfiles(copy,game);
    for(const key of ['attacker','target','unit','tower'])if(copy[key]&&!copy[key].card){const card=c4Card(copy[key].key);if(card)copy[key].card=card;}
    return copy;
  }
  migrateLegacyCardIdentity(copy);
  for (const key of ['attacker', 'target', 'unit', 'tower']) if (copy[key]) copy[key].card ??= game?.cardFor?.(copy[key].key)||CARDS[copy[key].key];
  return copy;
}
