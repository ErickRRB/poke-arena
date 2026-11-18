import { getEeveeLightProfile, LIGHT_EEVEE_IDENTITY } from './eevee-light-profile.js?v=1';
import { C4_CATALOG_FINGERPRINT } from './c4-catalog.js?v=1';

// Immutable producer identity. Future overrides require another producer identity.
export const LIGHT_EEVEE_RULESET = 'c4-eevee-1';
export const LIGHT_EEVEE_PRODUCER = `arena:c4-eevee-1:base-${C4_CATALOG_FINGERPRINT}:eevee-light-v1`;
const producers = Object.freeze({
  [LIGHT_EEVEE_RULESET]: Object.freeze({ marker: LIGHT_EEVEE_PRODUCER, cards: Object.freeze({ eevee: getEeveeLightProfile }), profileIdentities: Object.freeze([LIGHT_EEVEE_IDENTITY]) })
});
const descriptors = Object.freeze(Object.fromEntries(Object.entries(producers).map(([ruleset, producer]) => [ruleset, Object.freeze({
  ruleset, marker: producer.marker, keys: Object.freeze(Object.keys(producer.cards))
})])));
export function getArenaProducerByRuleset(ruleset) {
  return typeof ruleset === 'string' && Object.hasOwn(descriptors, ruleset) ? descriptors[ruleset] : undefined;
}
export function getArenaProducerByMarker(marker) {
  return typeof marker === 'string' ? Object.values(descriptors).find(producer => producer.marker === marker) : undefined;
}
// Read only typed profile slots; never reinterpret opaque metadata or raw keys.
// Does not require preparation of the C4 catalog for historical snapshots.
const historicalIdentities = new Set(Object.values(producers).flatMap(p => p.profileIdentities));
const historicalMarkers = new Set(Object.values(producers).map(p => p.marker));
const historicalFail = () => { const e = new Error('Productor nuevo incompatible con reglas históricas.'); e.code = 'ARENA_PROFILE_INVALID'; throw e; };
const historicalProfile = profile => { if (profile && typeof profile === 'object' && historicalIdentities.has(profile.nativeReference)) historicalFail(); };
const historicalCarrier = value => { if (!value || typeof value !== 'object') return; if (historicalMarkers.has(value.sourceProfile)) historicalFail(); historicalProfile(value.card); historicalProfile(value.sourceCard); if (value.burn) { if (historicalMarkers.has(value.burn.sourceProfile)) historicalFail(); historicalProfile(value.burn.sourceCard); } };
export function validateHistoricalProducerEvent(event) {
  historicalCarrier(event);
  for (const key of ['unit', 'attacker', 'target', 'tower']) historicalCarrier(event?.[key]);
  return true;
}
export function validateHistoricalProducerBoundary(data) {
  if (Object.hasOwn(data, 'arenaProfileProducer')) historicalFail();
  for (const group of [data.snapshotProfiles, data.legacyCardOverrides]) if (group && typeof group === 'object') for (const profile of Object.values(group)) historicalProfile(profile);
  for (const field of ['units', 'towers', 'detachedEntities', 'attacks', 'projectiles', 'spells', 'fields', 'reinforcements']) if (Array.isArray(data[field])) for (const value of data[field]) historicalCarrier(value);
  return true;
}
export function arenaProducerCard(ruleset, key) {
  const cards = Object.hasOwn(producers, ruleset) ? producers[ruleset].cards : null;
  return cards && Object.hasOwn(cards, key) ? cards[key]() : undefined;
}
const equal = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const x = Object.keys(a).sort(), y = Object.keys(b).sort();
  return x.length === y.length && x.every((k, i) => k === y[i] && equal(a[k], b[k]));
};
export function validateArenaProducerEventProfiles(event, ruleset) {
  const producer = Object.hasOwn(producers, ruleset) ? producers[ruleset] : null;
  if (!producer) throw Error('Productor de perfiles desconocido.');
  const fail = () => { const e = new Error('Perfil incompatible con el productor.'); e.code = 'ARENA_PROFILE_INVALID'; throw e; };
  const check = (record, field, key) => {
    if (!record || !Object.hasOwn(producer.cards, key)) return;
    if (Object.hasOwn(record, field) && !equal(record[field], producer.cards[key]())) fail();
  };
  for (const name of ['unit', 'attacker', 'target', 'tower']) {
    const entity = event?.[name]; if (!entity) continue;
    check(entity, 'card', entity.key);
    if (entity.burn) check(entity.burn, 'sourceCard', entity.burn.sourceKey);
  }
  const key = event?.sourceKey ?? event?.key;
  if (Object.hasOwn(producer.cards, key)) {
    if (Object.hasOwn(event, 'sourceProfile')) fail();
    check(event, 'sourceCard', key); check(event, 'card', key);
  }
  return true;
}
// The ordinary C4 validator handles graph and typed carriers first. This producer
// additionally requires every declared override to match its frozen identity.
export function validateArenaProducerProfiles(data, ruleset) {
  const producer = Object.hasOwn(producers, ruleset) ? producers[ruleset] : null;
  if (!producer) throw Error('Productor de perfiles desconocido.');
  const fail = () => { const e = new Error('Perfil incompatible con el productor.'); e.code = 'ARENA_PROFILE_INVALID'; throw e; };
  if (data.arenaProfileProducer !== producer.marker) fail();
  const expected = key => Object.hasOwn(producer.cards, key) ? producer.cards[key]() : undefined;
  const card = (record, field, key) => { if (expected(key) && Object.hasOwn(record, field) && !equal(record[field], expected(key))) fail(); };
  const source = record => {
    if (!record || typeof record !== 'object') return;
    const key = record.sourceKey ?? record.key;
    if (!expected(key)) return;
    if (Object.hasOwn(record, 'sourceProfile')) fail();
    card(record, 'sourceCard', key);
  };
  for (const group of [data.snapshotProfiles, data.legacyCardOverrides]) if (group) for (const key of Object.keys(producer.cards)) if (Object.hasOwn(group, key) && !equal(group[key], expected(key))) fail();
  for (const entity of [...data.units, ...data.towers, ...(data.detachedEntities || [])]) {
    card(entity, 'card', entity.key);
    source(entity.burn);
  }
  for (const p of data.projectiles) { source(p); card(p, 'card', p.key); }
  for (const item of [...(data.spells || []), ...(data.fields || [])]) { source(item); card(item, 'card', item.key); }
  return true;
}
