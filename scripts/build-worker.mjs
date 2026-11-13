import{readFile,writeFile,mkdir,readdir}from'node:fs/promises';
import path from'node:path';
import{CARDS,DEFAULT_DECK}from'../dist/engine.js';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.txt':'text/plain','.xml':'text/xml'};
const assets={},remoteAssets={},spriteCommit='576a7f13b5b7f6ad09a5877d5ae6b2d33458c245',artCommit='1b3b7c0a538dd2226ae08d0d2f8955125075bbd4';
const audioManifest=JSON.parse(await readFile(path.join(dist,'assets/audio/manifest.json'),'utf8'));
const usedAudio=new Set(Object.values(audioManifest).flatMap(group=>Object.values(group)).map(file=>'/'+file));
const animations=JSON.parse(await readFile(path.join(dist,'assets/pokemon/manifest.json'),'utf8'));
const defaultIds=new Set([...DEFAULT_DECK.map(k=>CARDS[k]?.id),31,34,52].filter(Boolean)),embedded=new Set();
for(const[id,anims]of Object.entries(animations))for(const[name,meta]of Object.entries(anims))if(defaultIds.has(Number(id))||['Walk','Idle'].includes(name)){embedded.add('/'+meta.file);embedded.add('/'+meta.shadow);}
async function visit(dir){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name==='server'||entry.name==='.openai')continue;
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){await visit(file);continue;}
    const key='/'+path.relative(dist,file).replaceAll('\\','/');
    if(/^\/assets\/audio\/(cries|voices|foley)\//.test(key)&&!usedAudio.has(key))continue;
    const match=key.match(/^\/assets\/pokemon\/(\d+)\/(.+\.png)$/);
    if(match&&!embedded.has(key)&&!(defaultIds.has(Number(match[1]))&&match[2]==='art.png')){
      const[id,name]=match.slice(1);
      remoteAssets[key]=name==='art.png'?`https://raw.githubusercontent.com/PokeAPI/sprites/${artCommit}/sprites/pokemon/other/official-artwork/${id}.png`:name==='card.png'?`https://raw.githubusercontent.com/PokeAPI/sprites/${artCommit}/sprites/pokemon/${id}.png`:`https://raw.githubusercontent.com/PMDCollab/SpriteCollab/${spriteCommit}/sprite/${id.padStart(4,'0')}/${name}`;
    }else assets[key]=[mime[path.extname(file)]||'application/octet-stream',(await readFile(file)).toString('base64')];
  }
}
await visit(dist);
const strip=s=>s.replace(/^import .*?;\r?\n/gm,'').replace(/^export \{.*?\} from .*?;\r?\n/gm,'').replace(/^export /gm,'');
const engine=(await Promise.all(['pokemon-stats.js','unit-sizes.js','sprite-geometry.js','sprite-motion.js','catalog.js','balance.js','engine.js'].map(async file=>strip(await readFile(path.join(dist,file),'utf8'))))).join('\n'),snapshot=strip(await readFile(path.join(dist,'snapshot.js'),'utf8')),apiSource=strip(await readFile(path.join(root,'worker/api.js'),'utf8'));
await mkdir(path.join(dist,'server'),{recursive:true});
const assetChunks=[];let chunk={},chunkBytes=0;
for(const [key,value]of Object.entries(assets)){
  const size=Buffer.byteLength(JSON.stringify([key,value]));
  if(chunkBytes+size>6*1024*1024&&chunkBytes){assetChunks.push(chunk);chunk={};chunkBytes=0;}
  chunk[key]=value;chunkBytes+=size;
}
if(chunkBytes)assetChunks.push(chunk);
for(const[index,part]of assetChunks.entries())await writeFile(path.join(dist,'server',`asset-chunk-${index}.js`),'export default '+JSON.stringify(part)+';\n');
const assetImports=assetChunks.map((_,index)=>`import arenaPart${index} from './asset-chunk-${index}.js';`).join('\n');
const source=`${assetImports}\n${engine}\n${snapshot}\n${apiSource}\nconst arenaAssets={${assetChunks.map((_,index)=>`...arenaPart${index}`).join(',')}};\nconst arenaRemoteAssets=${JSON.stringify(remoteAssets)};\nconst arenaAnimations=${JSON.stringify(animations)};\nexport default {async fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return api(request,env,arenaAnimations);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const key=url.pathname==='/'?'/index.html':url.pathname,asset=arenaAssets[key];if(!asset){const upstream=arenaRemoteAssets[key];if(!upstream)return new Response('No encontrado',{status:404});const origin=await fetch(upstream);if(!origin.ok)return new Response('Recurso no disponible',{status:502});const response=new Response(origin.body,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});return request.method==='HEAD'?new Response(null,{headers:response.headers}):response;}const bytes=Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset[0],'Cache-Control':url.pathname==='/'||/\\.(html|js|css|json)$/.test(url.pathname)?'no-cache':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}};\n`;
await mkdir(path.join(dist,'server'),{recursive:true});await writeFile(path.join(dist,'server/index.js'),source);
await mkdir(path.join(dist,'.openai'),{recursive:true});await writeFile(path.join(dist,'.openai/hosting.json'),await readFile(path.join(root,'.openai/hosting.json')));
console.log(`Worker built: ${Object.keys(assets).length} embedded assets, ${Object.keys(remoteAssets).length} pinned CDN assets, ${(Buffer.byteLength(source)/1024/1024).toFixed(1)} MiB entrypoint, ${assetChunks.length} asset modules.`);
