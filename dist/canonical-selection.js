// Shared, engine-independent policy for NEW C1 deck selection.
// Source authority: canonical-table-v2.json, selection version 1.
export const selectionVersion = 1;

const SELECTION_ALIASES = Object.freeze({
  "shuppet": "diglett",
  "shuppetSwarm": "diglettHorde",
  "nidoranScouts": "raltsTrio",
  "nidoranPack": "poochyenaPack",
  "electrode": "forretress",
  "exeggutor": "vivero",
  "registeel": "rhydon"
});
const ELIGIBLE_SELECTION_KEYS = Object.freeze([
  "pikachu",
  "snorlax",
  "zubat",
  "charizard",
  "thunder",
  "fireball",
  "machamp",
  "eevee",
  "alakazam",
  "geodude",
  "treecko",
  "golem",
  "log",
  "blastoiseCannon",
  "raltsHut",
  "roselia",
  "graveler",
  "nuzleaf",
  "sneaselAmbush",
  "diglett",
  "diglettHorde",
  "raltsTrio",
  "poochyenaPack",
  "beedrill",
  "sandshrew",
  "slowbro",
  "voltorb",
  "forretress",
  "zapdos",
  "typhlosion",
  "ampharos",
  "swampert",
  "sableye",
  "centralElectrode",
  "madriguera",
  "vivero",
  "duskull",
  "rhydon",
  "pandilla",
  "pinMissile",
  "lightning",
  "hyperBeam",
  "blizzard",
  "whirlpool",
  "nightmare",
  "earthquake"
]);
const eligible = new Set(ELIGIBLE_SELECTION_KEYS);

export function resolveSelectionKey(key) {
  if (typeof key !== 'string' || !key) return { key: null, alias: false, reason: 'invalid-key' };
  const resolved = Object.hasOwn(SELECTION_ALIASES, key) ? SELECTION_ALIASES[key] : key;
  return { key: resolved, alias: resolved !== key, reason: null };
}

export function checkSelectionCard(key) {
  const resolved = resolveSelectionKey(key);
  if (!resolved.key) return { ok: false, key, canonicalKey: null, reason: resolved.reason };
  const ok = eligible.has(resolved.key);
  return { ok, key, canonicalKey: resolved.key, reason: ok ? null : 'inactive-or-unknown' };
}

export function checkSelectionDeck(deck) {
  if (!Array.isArray(deck)) return { ok: false, version: selectionVersion, reasons: ['deck-not-array'], slots: [] };
  const slots = deck.map((key, index) => ({ index, ...checkSelectionCard(key) }));
  const reasons = [];
  if (deck.length !== 8) reasons.push('deck-must-have-eight-positions');
  for (const slot of slots) if (!slot.ok) reasons.push('slot-'+(slot.index+1)+'-'+slot.reason);
  const seen = new Set();
  for (const slot of slots) {
    if (!slot.canonicalKey) continue;
    if (seen.has(slot.canonicalKey)) reasons.push('duplicate-canonical-card-'+slot.canonicalKey);
    seen.add(slot.canonicalKey);
  }
  if (seen.size !== 8) reasons.push('deck-must-have-eight-distinct-identities');
  return { ok: reasons.length === 0, version: selectionVersion, reasons: [...new Set(reasons)], slots };
}
