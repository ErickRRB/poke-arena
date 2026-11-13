import { CARDS } from './engine.js?v=23';
import { packGame } from './snapshot.js?v=23';

export const ONLINE_PROTOCOL = 2;
export const SIMULATION_HZ = 30;
export const SNAPSHOT_HZ = 15;
export const RECONNECT_GRACE = 25000;
const cardSignatures = new WeakMap();
function signature(card) {
  if (!cardSignatures.has(card)) cardSignatures.set(card, JSON.stringify(card));
  return cardSignatures.get(card);
}
function compactEntity(entity) {
  const { target, card, ...copy } = entity;
  const canonical = CARDS[entity.key];
  if (card && (!canonical || card !== canonical && signature(card) !== signature(canonical))) copy.card = card;
  copy.targetId = target?.id ?? entity.targetId ?? null;
  return copy;
}
export function publicSnapshot(game, team) {
  const copy = packGame(game);
  copy.units = game.units.map(compactEntity);
  copy.towers = game.towers.map(compactEntity);
  copy.hands = game.hands.map((hand, index) => index === team ? [...hand] : []);
  copy.queues = game.queues.map((queue, index) => index === team ? [...queue] : []);
  // Precision is reduced only on the wire; the authoritative simulation keeps it.
  return JSON.parse(JSON.stringify(copy, (_, value) => typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 1000) / 1000 : value));
}
export function publicEvent(event) {
  const copy = { ...event };
  for (const key of ['attacker', 'target', 'unit', 'tower']) if (copy[key]) copy[key] = compactEntity(copy[key]);
  return structuredClone(copy);
}
export function unpackEvent(event) {
  const copy = { ...event };
  for (const key of ['attacker', 'target', 'unit', 'tower']) if (copy[key]) copy[key] = { ...copy[key], card: copy[key].card || CARDS[copy[key].key] };
  return copy;
}
