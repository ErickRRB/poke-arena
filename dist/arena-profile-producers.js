import { getEeveeLightProfile, LIGHT_EEVEE_IDENTITY } from './eevee-light-profile.js?v=1';
import { C4_CATALOG_FINGERPRINT } from './c4-catalog.js?v=1';

// Immutable producer identity. Future overrides require another producer identity.
export const LIGHT_EEVEE_RULESET = 'c4-eevee-1';
export const LIGHT_EEVEE_PRODUCER = `arena:c4-eevee-1:base-${C4_CATALOG_FINGERPRINT}:eevee-light-v1`;
const producers = Object.freeze({
  [LIGHT_EEVEE_RULESET]: Object.freeze({ marker: LIGHT_EEVEE_PRODUCER, cards: Object.freeze({ eevee: getEeveeLightProfile }), profileIdentities: Object.freeze([LIGHT_EEVEE_IDENTITY]) })
});
// Read only typed profile slots; never reinterpret opaque metadata or raw keys.
// Does not require preparation of the C4 catalog for historical snapshots.
export function validateHistoricalProducerBoundary(data) {
  const fail = () => { const e = new Error('Productor nuevo incompatible con reglas históricas.'); e.code = 'ARENA_PROFILE_INVALID'; throw e; };
  if (Object.hasOwn(data, 'arenaProfileProducer')) fail();
  const identities = new Set(Object.values(producers).flatMap(p => p.profileIdentities));
  const check = profile => { if (profile && typeof profile === 'object' && identities.has(profile.nativeReference)) fail(); };
  const markers = new Set(Object.values(producers).map(p => p.marker));
  const carrier = value => { if (!value || typeof value !== 'object') return; if (markers.has(value.sourceProfile)) fail(); check(value.card); check(value.sourceCard); if (value.burn) { if (markers.has(value.burn.sourceProfile)) fail(); check(value.burn.sourceCard); } };
  for (const group of [data.snapshotProfiles, data.legacyCardOverrides]) if (group && typeof group === 'object') for (const profile of Object.values(group)) check(profile);
  for (const field of ['units', 'towers', 'detachedEntities', 'attacks', 'projectiles', 'spells', 'fields', 'reinforcements']) if (Array.isArray(data[field])) for (const value of data[field]) carrier(value);
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
