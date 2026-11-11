import { writeFile } from 'node:fs/promises';
import { CARDS } from '../dist/engine.js';

// Snapshot the upstream data at authoring time; play never depends on an API.
const source = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_stats.csv';
const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw Error(`PokéAPI stats: ${response.status}`);
const ids = new Set([...Object.values(CARDS).map(c => c.id).filter(Boolean), 50, 261, 280]);
const stats = {};
for (const row of (await response.text()).trim().split('\n').slice(1)) {
  const [id, stat, value] = row.split(',').map(Number);
  if (!ids.has(id) || ![1, 2, 4].includes(stat)) continue;
  (stats[id] ??= {})[{ 1: 'hp', 2: 'attack', 4: 'specialAttack' }[stat]] = value;
}
for (const id of ids) if (Object.keys(stats[id] || {}).length !== 3) throw Error(`Missing base stats for ${id}`);
await writeFile(new URL('../dist/pokemon-stats.js', import.meta.url), `// Base stats from PokéAPI, captured 2026-11-11. Game damage and health remain in balance.js.\n// Source: ${source}\nexport const POKEMON_STATS = ${JSON.stringify(stats, null, 2)};\n`);
console.log(`Recorded base stats for ${ids.size} species.`);
