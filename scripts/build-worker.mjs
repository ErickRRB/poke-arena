import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {WEB_ORIGIN} from '../worker/web-origin.js';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist'),allowed=[];
async function visit(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(['server','.openai','.assetsignore'].includes(entry.name))continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await visit(file);else allowed.push('/'+path.relative(dist,file).replaceAll('\\','/'));
 }
}
await visit(dist);
// Publish this bridge before switching Cloudflare's atomic asset deployment.
// These exact former public audio paths keep the old app working during that
// transition. After Cloudflare switches, its missing files still return404.
const retiredAudio=JSON.parse(await readFile(path.join(root,'docs/audio-pokemon-2026-11-14/retired-assets.json'),'utf8'));
for(const row of retiredAudio.rows){
 if(!/^assets\/audio\/(foley|feedback|combat)\/[a-z0-9-]+\.(ogg|wav)$/.test(row.file))throw Error('Invalid former public audio path');
 allowed.push('/'+row.file);
}
const strip=s=>s.replace(/^import .*?;\r?\n/gm,'').replace(/^export \{.*?\} from .*?;\r?\n/gm,'').replace(/^export /gm,'');
const engine=(await Promise.all(['arena-tilemap.js','arena-geometry.js','native-formations.js','pokemon-stats.js','unit-sizes.js','sprite-geometry.js','sprite-motion.js','deployment-formations.js','current-reference.js','knockback-profiles.js','attack-choreography.js','native-descriptions.js','catalog.js','balance.js','engine.js'].map(async file=>strip(await readFile(path.join(dist,file),'utf8'))))).join('\n');
const snapshot=strip(await readFile(path.join(dist,'snapshot.js'),'utf8')),apiSource=strip(await readFile(path.join(root,'worker/api.js'),'utf8'));
const animations=JSON.parse(await readFile(path.join(dist,'assets/pokemon/manifest.json'),'utf8'));
async function hostedFetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return api(request,env,arenaAnimations);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const key=url.pathname==='/'?'/index.html':url.pathname;
 if(!allowedAssets.has(key))return new Response('No encontrado',{status:404});
 const target=new URL(upstreamOrigin);target.pathname=key;target.search=url.search;
 const headers=new Headers();
 for(const key of ['Accept','If-None-Match','If-Modified-Since','Range','If-Range']){const value=request.headers.get(key);if(value)headers.set(key,value);}
 try{
  const origin=await fetch(target,{method:request.method,headers,redirect:'manual'}),resultHeaders=new Headers(origin.headers);
  resultHeaders.set('Cache-Control','public, max-age=0, must-revalidate');resultHeaders.set('X-Content-Type-Options','nosniff');
  return new Response(origin.body,{status:origin.status,headers:resultHeaders});
 }catch{
  return new Response('Recurso temporalmente no disponible',{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
const source=[engine,snapshot,apiSource,'const upstreamOrigin='+JSON.stringify(WEB_ORIGIN)+';','const allowedAssets=new Set('+JSON.stringify(allowed)+');','const arenaAnimations='+JSON.stringify(animations)+';','export default {fetch:'+hostedFetch.toString()+'};'].join('\n');
const server=path.join(dist,'server');await mkdir(server,{recursive:true});await writeFile(path.join(server,'index.js'),source);
for(const file of await readdir(server))if(/^asset-chunk-\d+\.js$/.test(file))await unlink(path.join(server,file));
if(Buffer.byteLength(source)>=3*1024*1024)throw Error('The compatibility Worker must stay below 3 MiB.');
await mkdir(path.join(dist,'.openai'),{recursive:true});await writeFile(path.join(dist,'.openai/hosting.json'),await readFile(path.join(root,'.openai/hosting.json')));
console.log('Compatibility Worker: '+(Buffer.byteLength(source)/1024/1024).toFixed(2)+' MiB, '+allowed.length+' Cloudflare-hosted paths; legacy API retained separately.');
