import {mkdir,readFile,writeFile}from'node:fs/promises';
import path from'node:path';
const root=path.resolve(import.meta.dirname,'../dist/assets/audio');
await mkdir(path.join(root,'cries'),{recursive:true});
const sprites=JSON.parse(await readFile(path.resolve(import.meta.dirname,'../dist/assets/pokemon/manifest.json'),'utf8'));
let previous={};try{previous=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));}catch{}
const manifest={cries:{},moves:previous.moves||{}};
async function fetchAudio(url){for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(response.ok||response.status<500||attempt===2)return response;}catch(error){if(attempt===2)throw error;}}}
async function get(url,file){let data;try{data=await readFile(path.join(root,file));}catch{const r=await fetchAudio(url);if(!r.ok)throw Error(`${file}: ${r.status}`);data=Buffer.from(await r.arrayBuffer());await writeFile(path.join(root,file),data);}if(data[0]===255||data.toString('ascii',0,3)==='ID3'){file=file.replace(/\.ogg$/,'.mp3');await writeFile(path.join(root,file),data);}else if(!['OggS','RIFF'].includes(data.toString('ascii',0,4)))throw Error(`Invalid audio: ${file}`);return`assets/audio/${file}`;}
const ids=Object.keys(sprites);
for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{try{await readFile(path.join(root,`voices/${id}.mp3`));manifest.cries[id]=`assets/audio/voices/${id}.mp3`;}catch{manifest.cries[id]=await get(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,`cries/${id}.ogg`);}}));
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
await import('./import-pokemon-audio.mjs');
console.log(`Saved ${ids.length} Pokémon voices and the pinned Pokémon move bank.`);
