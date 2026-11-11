import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../dist/assets/pokemon');
const ids = [1,3,4,6,7,9,12,15,18,23,25,26,27,29,31,32,34,37,41,50,52,54,56,59,64,65,68,74,76,79,80,81,88,91,92,94,95,100,101,102,103,109,113,115,121,122,123,129,130,131,132,133,143,144,145,146,149,150,151,154,157,160,169,181,196,197,202,208,212,227,242,249,250,251,252,254,257,260,261,280,282,302,306,319,330,334,353,355,359,373,376,377,378,379,382,383,384];
const special = { 1: 'Shoot', 4: 'Shoot', 6: 'Shoot', 7: 'Shoot', 9: 'Shoot', 25: 'Shock', 26: 'Shock', 37: 'Shoot', 41: 'Attack', 52: 'Shoot', 54: 'Shoot', 65: 'Shoot', 68: 'Double', 74: 'Attack', 81: 'Shoot', 94: 'Attack', 95: 'Shoot', 123: 'Double', 131: 'Shoot', 133: 'Attack', 143: 'Stomp', 150: 'Shoot' };
const base = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite';
const manifest = {};
const report = {ids, aliases:[], failures:[], directions:[]};
async function fetchAsset(url) {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
      if(response.ok||response.status<500)return response;
      if(attempt===2)return response;
    } catch(error) {if(attempt===2)throw error;}
  }
}
async function downloadArt(id) {
  const folder=path.join(root,String(id));await mkdir(folder,{recursive:true});
  try {await readFile(path.join(folder,'art.png'));return;}catch {}
  const response=await fetchAsset(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`);
  if(response.status===404){console.log(`Artwork unavailable #${id}; original portrait retained.`);return;}
  if(!response.ok)throw Error(`Artwork #${id}: ${response.status}`);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error(`Invalid artwork PNG #${id}`);
  await writeFile(path.join(folder,'art.png'),data);
}
async function download(id) {
  const dex = String(id).padStart(4, '0');
  const folder = path.join(root, String(id));
  await mkdir(folder, { recursive: true });
  async function get(file, binary = false) {
    try { return await readFile(path.join(folder, file), binary ? undefined : 'utf8'); } catch {}
    const response = await fetchAsset(`${base}/${dex}/${file}`);
    if (!response.ok) throw new Error(`${dex}/${file}: ${response.status}`);
    const data = binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
    await writeFile(path.join(folder, file), data);
    return data;
  }
  const xml = await get('AnimData.xml');
  await get('credits.txt');
  const animations = {};
  const blocks=new Map([...xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)].map(m=>[m[1].match(/<Name>(.*?)<\/Name>/)?.[1],m[1]]));
  function resolve(name,seen=new Set()) {
    if(seen.has(name))throw Error(`Animation alias cycle for ${id}/${name}`);
    seen.add(name);const block=blocks.get(name);if(!block)return null;
    const copy=block.match(/<CopyOf>(.*?)<\/CopyOf>/)?.[1];
    return copy?resolve(copy,seen):{source:name,block};
  }
  for (const name of new Set(['Walk','Idle','Attack','Hurt',special[id],'Shoot','Shock','Double','Stomp','Charge'].filter(Boolean))) {
    const resolved=resolve(name);if(!resolved)continue;
    const {source,block}=resolved;
    const width = Number(block.match(/<FrameWidth>(\d+)/)?.[1]);
    const height = Number(block.match(/<FrameHeight>(\d+)/)?.[1]);
    const durations = [...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(m => Number(m[1]));
    const hitFrame = Number(block.match(/<HitFrame>(\d+)/)?.[1] || 0);
    const png=await get(`${source}-Anim.png`, true);
    await get(`${source}-Shadow.png`, true);
    if(png.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error(`Invalid PNG for ${id}/${source}`);
    const rows=png.readUInt32BE(20)/height;
    if(!Number.isInteger(rows)||rows<1)throw Error(`Invalid direction rows for ${id}/${name}`);
    if(rows!==8)report.directions.push({id,name,rows});
    if(source!==name)report.aliases.push({id,name,source});
    animations[name] = { width, height, durations, hitFrame, file: `assets/pokemon/${id}/${source}-Anim.png`, shadow: `assets/pokemon/${id}/${source}-Shadow.png` };
  }
  if (!animations.Walk) throw new Error(`Missing Walk for ${id}`);
  // Original battle sprites are used only on cards; the arena uses PMD sheets.
  try {await readFile(path.join(folder,'card.png'));}catch {
    const portrait = await fetchAsset(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`);
    if (!portrait.ok) throw new Error(`Missing card portrait for ${id}`);
    await writeFile(path.join(folder, 'card.png'), Buffer.from(await portrait.arrayBuffer()));
  }
  manifest[id] = animations;
  await downloadArt(id);
}
if(process.argv.includes('--art-only')){
  for(let i=0;i<ids.length;i+=5)await Promise.all(ids.slice(i,i+5).map(downloadArt));
  console.log(`Official artworks cached for ${ids.length} species.`);
  process.exit(0);
}
for (let i = 0; i < ids.length; i += 4) {
  const group=await Promise.allSettled(ids.slice(i,i+4).map(download));
  group.forEach((result,j)=>{if(result.status==='rejected')report.failures.push({id:ids[i+j],error:String(result.reason)});});
  console.log(`Sprites ${Math.min(i+4,ids.length)}/${ids.length}`);
}
await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
await mkdir(path.resolve(import.meta.dirname,'../qa'),{recursive:true});
await writeFile(path.resolve(import.meta.dirname,'../qa/asset-report-v5.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({available:Object.keys(manifest).length,aliases:report.aliases.length,failures:report.failures,unusualDirections:report.directions}));
if(report.failures.length)process.exitCode=1;
