import {mkdir,readFile,writeFile}from'node:fs/promises';
import path from'node:path';
const root=path.resolve(import.meta.dirname,'../dist/assets/audio');
await mkdir(path.join(root,'cries'),{recursive:true});await mkdir(path.join(root,'foley'),{recursive:true});
const sprites=JSON.parse(await readFile(path.resolve(import.meta.dirname,'../dist/assets/pokemon/manifest.json'),'utf8'));
const manifest={cries:{},foley:{}};
async function fetchAudio(url){for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(response.ok||response.status<500||attempt===2)return response;}catch(error){if(attempt===2)throw error;}}}
async function get(url,file){let data;try{data=await readFile(path.join(root,file));}catch{const r=await fetchAudio(url);if(!r.ok)throw Error(`${file}: ${r.status}`);data=Buffer.from(await r.arrayBuffer());await writeFile(path.join(root,file),data);}if(data[0]===255||data.toString('ascii',0,3)==='ID3'){file=file.replace(/\.ogg$/,'.mp3');await writeFile(path.join(root,file),data);}else if(!['OggS','RIFF'].includes(data.toString('ascii',0,4)))throw Error(`Invalid audio: ${file}`);return`assets/audio/${file}`;}
const ids=Object.keys(sprites);
for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{try{await readFile(path.join(root,`voices/${id}.mp3`));manifest.cries[id]=`assets/audio/voices/${id}.mp3`;}catch{manifest.cries[id]=await get(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,`cries/${id}.ogg`);}}));
const base='https://raw.githubusercontent.com/receptron/mulmocast-media/main/soundeffects/';
const files={
 'punch-1':'kenney/impact-sounds/impactPunch_heavy_000.ogg','punch-2':'kenney/impact-sounds/impactPunch_heavy_001.ogg','punch-3':'kenney/impact-sounds/impactPunch_medium_002.ogg',
 heavy:'kenney/impact-sounds/impactWood_heavy_001.ogg',stone:'kenney/impact-sounds/impactPlate_heavy_001.ogg',metal:'kenney/impact-sounds/impactMetal_light_001.ogg',glass:'kenney/impact-sounds/impactGlass_medium_001.ogg',
 bell:'kenney/impact-sounds/impactBell_heavy_001.ogg',coin:'kenney/rpg-audio/handleCoins.ogg','swish-1':'kenney/rpg-audio/knifeSlice.ogg','swish-2':'kenney/rpg-audio/knifeSlice2.ogg',cloth:'kenney/rpg-audio/cloth1.ogg',water:'stable-audio-3/water-drop-s4.wav'
};
await Promise.all(Object.entries(files).map(async([name,file])=>{manifest.foley[name]=await get(base+file,`foley/${name}.${file.endsWith('.wav')?'wav':'ogg'}`);}));
for(const pack of['impact-sounds','rpg-audio']){const file=path.join(root,`Kenney-${pack}-License.txt`);try{await readFile(file);}catch{const r=await fetchAudio(base+`kenney/${pack}/License.txt`);if(!r.ok)throw Error('Missing Kenney license');await writeFile(file,await r.text());}}
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(root,'SOURCES.txt'),'Pokémon cries: https://github.com/PokeAPI/cries (original Pokémon audio).\nFoley: Kenney Impact Sounds and RPG Audio, CC0. https://kenney.nl/assets/impact-sounds https://kenney.nl/assets/rpg-audio\nDownload mirror: https://github.com/receptron/mulmocast-media/tree/main/soundeffects/kenney\nWater recording: receptron, CC0, water-drop-s4.wav. https://github.com/receptron/jinglescript/blob/main/samples/sfx/SOURCES.md\n');
console.log(`Saved ${ids.length} Pokémon voices and ${Object.keys(files).length} foley samples.`);
