import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../dist/assets/pokemon');
const ids = [1, 4, 6, 7, 9, 25, 26, 37, 41, 52, 54, 65, 68, 74, 81, 94, 95, 123, 131, 133, 143, 150];
const special = { 1: 'Shoot', 4: 'Shoot', 6: 'Shoot', 7: 'Shoot', 9: 'Shoot', 25: 'Shock', 26: 'Shock', 37: 'Shoot', 41: 'Attack', 52: 'Shoot', 54: 'Shoot', 65: 'Shoot', 68: 'Double', 74: 'Attack', 81: 'Shoot', 94: 'Attack', 95: 'Shoot', 123: 'Double', 131: 'Shoot', 133: 'Attack', 143: 'Stomp', 150: 'Shoot' };
const base = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite';
const manifest = {};
async function download(id) {
  const dex = String(id).padStart(4, '0');
  const folder = path.join(root, String(id));
  await mkdir(folder, { recursive: true });
  async function get(file, binary = false) {
    try { return await readFile(path.join(folder, file), binary ? undefined : 'utf8'); } catch {}
    const response = await fetch(`${base}/${dex}/${file}`);
    if (!response.ok) throw new Error(`${dex}/${file}: ${response.status}`);
    const data = binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
    await writeFile(path.join(folder, file), data);
    return data;
  }
  const xml = await get('AnimData.xml');
  await get('credits.txt');
  const animations = {};
  for (const name of new Set(['Walk', 'Idle', 'Attack', 'Hurt', special[id]])) {
    const block = [...xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)].map(m => m[1]).find(b => b.includes(`<Name>${name}</Name>`));
    if (!block || block.includes('<CopyOf>')) continue;
    const width = Number(block.match(/<FrameWidth>(\d+)/)?.[1]);
    const height = Number(block.match(/<FrameHeight>(\d+)/)?.[1]);
    const durations = [...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(m => Number(m[1]));
    const hitFrame = Number(block.match(/<HitFrame>(\d+)/)?.[1] || 0);
    await get(`${name}-Anim.png`, true);
    await get(`${name}-Shadow.png`, true);
    animations[name] = { width, height, durations, hitFrame, file: `assets/pokemon/${id}/${name}-Anim.png`, shadow: `assets/pokemon/${id}/${name}-Shadow.png` };
  }
  if (!animations.Walk) throw new Error(`Missing Walk for ${id}`);
  // Original battle sprites are used only on cards; the arena uses PMD sheets.
  const portrait = await fetch(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`);
  if (!portrait.ok) throw new Error(`Missing card portrait for ${id}`);
  await writeFile(path.join(folder, 'card.png'), Buffer.from(await portrait.arrayBuffer()));
  manifest[id] = animations;
  console.log(`Downloaded #${dex}: ${Object.keys(animations).join(', ')}`);
}
for (let i = 0; i < ids.length; i += 3) await Promise.all(ids.slice(i, i + 3).map(download));
await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('All Pokémon sprites saved locally.');
