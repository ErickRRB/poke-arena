import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import worker from '../dist/server/index.js';
import frontend from '../realtime/frontend/src/index.js';
import {WEB_ORIGIN} from '../worker/web-origin.js';
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.txt':'text/plain'};
function mockAssets(t){
 return t.mock.method(globalThis,'fetch',async(url,init)=>{
  const target=new URL(String(url));assert.equal(target.origin,WEB_ORIGIN);
  try{const bytes=readFileSync(new URL('../dist'+target.pathname,import.meta.url)),ext=target.pathname.slice(target.pathname.lastIndexOf('.'));return new Response(init.method==='HEAD'?null:bytes,{headers:{'Content-Type':mime[ext]||'application/octet-stream','ETag':'"asset"','Cache-Control':'public, max-age=31536000, immutable'}});}catch{return new Response('Missing',{status:404});}
 });
}
test('hosted pages, scripts, sound, loaders and large illustrations preserve bytes through Cloudflare',async t=>{
 mockAssets(t);
 for(const file of['index.html','app.js','engine.js','testing.html','testing.js','testing.css','sandbox.js','quick-stats.js','attack-choreography.js','wing-motion.js','wing-rigs.js','knockback-profiles.js','targeting-art.js','battle-phase.css','battle-phase-ui.js','audio.js','attack-audio.js','attack-audio-fallback.js','assets/audio/manifest.json','loader-art.js','assets/ui/pokeball-pixel-v1.svg','assets/battle/arena-ground-v2.webp','assets/battle/arena-bridge-v2.webp','assets/battle/riverbank-v2.webp','assets/battle/structures-v1.png','assets/cards/farfetchd-knight-v1.png','assets/cards/flame-wheel-v1.png']){
  const r=await worker.fetch(new Request('https://arena.test/'+file),{});assert.equal(r.status,200,file);assert.deepEqual(Buffer.from(await r.arrayBuffer()),readFileSync(new URL('../dist/'+file,import.meta.url)));assert.match(r.headers.get('Cache-Control'),/must-revalidate/);assert.ok(!r.headers.get('Cache-Control').includes('immutable'));
 }
});
test('the compatibility proxy preserves conditional headers and does not forward private credentials',async t=>{
 t.mock.method(globalThis,'fetch',async(url,init)=>{assert.equal(new URL(url).origin,WEB_ORIGIN);assert.equal(new URL(url).pathname,'/engine.js');assert.equal(new URL(url).search,'?v=34');assert.equal(init.headers.get('If-None-Match'),'"asset"');assert.equal(init.headers.get('Cookie'),null);assert.equal(init.headers.get('Authorization'),null);assert.equal(init.headers.get('Host'),null);return new Response(null,{status:304,headers:{ETag:'"asset"'}});});
 const r=await worker.fetch(new Request('https://arena.test/engine.js?v=34',{headers:{'If-None-Match':'"asset"',Cookie:'private',Authorization:'private'}}),{});assert.equal(r.status,304);assert.equal(r.headers.get('ETag'),'"asset"');
});
test('HEAD and media type are preserved by the compatibility proxy',async t=>{
 mockAssets(t);const r=await worker.fetch(new Request('https://arena.test/assets/cards/farfetchd-knight-v1.png',{method:'HEAD'}),{});assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/png');assert.equal((await r.arrayBuffer()).byteLength,0);
});
test('retired media and build metadata are rejected without an upstream request',async t=>{
 const mock=t.mock.method(globalThis,'fetch',()=>{throw Error('must not fetch')});
 for(const path of['assets/audio/foley/heavy.ogg','assets/audio/foley/punch-1.ogg','assets/ui/pokeball-v2.webp','assets/ui/pokeball-v2.png','server/index.js','.openai/hosting.json','.assetsignore'])assert.equal((await worker.fetch(new Request('https://arena.test/'+path),{})).status,404);
 assert.equal(mock.mock.callCount(),0);
});

test('the transition bridge permits former public audio paths but preserves the upstream404 after replacement',async t=>{
 const mock=mockAssets(t),retired=JSON.parse(readFileSync(new URL('../docs/audio-pokemon-2026-11-14/retired-assets.json',import.meta.url)));
 for(const row of retired.rows)assert.equal((await worker.fetch(new Request('https://arena.test/'+row.file),{})).status,404,row.file);
 assert.equal(mock.mock.callCount(),retired.rows.length);
});
test('the legacy API stays in the compatibility Worker without forwarding back to the frontend',async t=>{
 const mock=t.mock.method(globalThis,'fetch',()=>{throw Error('API loop')});
 const r=await worker.fetch(new Request('https://arena.test/api/not-a-route'),{DB:{}});assert.equal(r.status,401);assert.equal(r.headers.get('Content-Type'),'application/json');assert.equal(mock.mock.callCount(),0);
});
test('the compatibility Worker has no embedded asset modules and stays below three MiB',()=>{
 const folder=new URL('../dist/server/',import.meta.url),files=readdirSync(folder).filter(f=>f.endsWith('.js'));assert.deepEqual(files,['index.js']);assert.ok(statSync(new URL('index.js',folder)).size<3*1024*1024);
});
test('network failure is explicit and cache storage is not required',async t=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'caches');Object.defineProperty(globalThis,'caches',{configurable:true,get(){throw Error('Forbidden')}});
 t.after(()=>descriptor?Object.defineProperty(globalThis,'caches',descriptor):delete globalThis.caches);
 const mock=mockAssets(t);assert.equal((await worker.fetch(new Request('https://arena.test/engine.js'),{})).status,200);
 mock.mock.mockImplementation(async()=>{throw Error('origin unavailable')});const r=await worker.fetch(new Request('https://arena.test/engine.js'),{});assert.equal(r.status,502);assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('Cloudflare frontend uses its asset binding with correct root, query, MIME, ETag and cache headers',async()=>{
 const r=await frontend.fetch(new Request(WEB_ORIGIN+'/?v=34'),{ASSETS:{fetch:async request=>{const url=new URL(request.url);assert.equal(url.pathname,'/index.html');assert.equal(url.search,'?v=34');return new Response('app',{headers:{'Content-Type':'text/html',ETag:'"root"'}});}}});
 assert.equal(await r.text(),'app');assert.equal(r.headers.get('Content-Type'),'text/html');assert.equal(r.headers.get('ETag'),'"root"');assert.equal(r.headers.get('Cache-Control'),'public, max-age=0, must-revalidate');
});
test('Cloudflare retires every old HTTP API route without an external request or asset lookup',async t=>{
 const mock=t.mock.method(globalThis,'fetch',()=>{throw Error('No external API forwarding')});
 const env={get ASSETS(){throw Error('Retired API must not look up an asset')}};
 for(const path of['/api','/api/','/api/session','/api/resume','/api/queue','/api/cancel','/api/battle','/api/not-a-route','/api/__proto__','/api/%2Funknown','/api/%00'])for(const method of['GET','POST','HEAD','OPTIONS']){
  const request=new Request(WEB_ORIGIN+path+'?after=1',{method,headers:{Origin:WEB_ORIGIN,Authorization:'Bearer private-retired-token'},...(method==='POST'?{body:'invalid legacy payload'}:{})});
  const response=await frontend.fetch(request,env);assert.equal(response.status,410,path+' '+method);assert.equal(response.headers.get('Content-Type'),'application/json');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(request.bodyUsed,false);
  if(method==='HEAD')assert.equal((await response.arrayBuffer()).byteLength,0);else{const body=await response.json();assert.equal(body.code,'legacy_api_retired');assert.equal(body.updateRequired,true);assert.match(body.error,/Actualizá la página/);assert.ok(!JSON.stringify(body).includes('private-retired-token'));}
 }
 const foreign=await frontend.fetch(new Request(WEB_ORIGIN+'/api/session',{method:'POST',headers:{Origin:'https://unrelated.test'},body:'private'}),env);assert.equal(foreign.status,410);assert.equal(foreign.headers.get('Access-Control-Allow-Origin'),null);assert.equal(mock.mock.callCount(),0);
});
test('public Cloudflare media supports anonymous cross-origin playback and byte-range seeking without an API proxy',async t=>{
 const external=t.mock.method(globalThis,'fetch',()=>{throw Error('No external upstream')});let calls=0;
 const bytes=Uint8Array.from({length:8000},(_,i)=>i%251);
 const env={ASSETS:{fetch:async request=>{calls++;assert.equal(request.headers.get('Range'),'bytes=100-199');return new Response(bytes,{status:200,headers:{'Content-Type':'audio/mpeg','Content-Length':String(bytes.length),ETag:'"music"'}});}}};
 const r=await frontend.fetch(new Request(WEB_ORIGIN+'/assets/audio/music/test.mp3',{headers:{Origin:'https://legacy.example',Range:'bytes=100-199'}}),env);assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 100-199/8000');assert.equal(r.headers.get('Content-Length'),'100');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes.slice(100,200));assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');assert.equal(r.headers.get('Access-Control-Allow-Credentials'),null);assert.match(r.headers.get('Access-Control-Expose-Headers'),/Content-Range/);assert.equal(calls,1);
 const preflight=await frontend.fetch(new Request(WEB_ORIGIN+'/assets/audio/music/test.mp3',{method:'OPTIONS',headers:{Origin:'https://legacy.example','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'range'}}),{});assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'*');assert.match(preflight.headers.get('Access-Control-Allow-Headers'),/Range/);assert.equal(external.mock.callCount(),0);
});

test('full asset bindings support open, suffix and clamped byte ranges while HEAD stays bodyless',async()=>{
 const bytes=Uint8Array.from({length:8000},(_,i)=>i%251),env={ASSETS:{fetch:async req=>new Response(req.method==='HEAD'?null:bytes,{headers:{'Content-Length':'8000','Content-Type':'audio/mpeg'}})}};
 for(const[range,start,end]of[['bytes=0-0',0,0],['bytes=7990-',7990,7999],['bytes=-64',7936,7999],['bytes=7990-9999',7990,7999],['bytes=-9000',0,7999]]){
  const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:range}}),env);assert.equal(r.status,206,range);assert.equal(r.headers.get('Content-Range'),`bytes ${start}-${end}/8000`);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes.slice(start,end+1));
 }
 const head=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{method:'HEAD',headers:{Range:'bytes=100-199'}}),env);assert.equal(head.status,200);assert.equal(head.headers.get('Accept-Ranges'),'bytes');assert.equal(head.headers.get('Content-Length'),'8000');assert.equal((await head.arrayBuffer()).byteLength,0);
});

test('unsatisfiable ranges return416 and unsupported range syntax preserves the full asset',async()=>{
 const bytes=new Uint8Array(8000),env={ASSETS:{fetch:async()=>new Response(bytes,{headers:{'Content-Length':'8000'}})}};
 for(const range of['bytes=8000-','bytes=90071992547409999-','bytes=150-100','bytes=-0']){const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:range,Origin:'https://legacy.example'}}),env);assert.equal(r.status,416,range);assert.equal(r.headers.get('Content-Range'),'bytes */8000');assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');assert.equal((await r.arrayBuffer()).byteLength,0);}
 for(const range of['items=0-1','bytes=','bytes=0-1,10-20']){const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:range}}),env);assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,8000);}
});

test('If-Range validators and upstream304 responses retain their HTTP semantics',async()=>{
 const env={ASSETS:{fetch:async()=>new Response(new Uint8Array(8000),{headers:{'Content-Length':'8000',ETag:'"music"','Last-Modified':'Sun, 15 Nov 2026 05:00:00 GMT'}})}};
 for(const[validator,status]of[['"music"',206],['"older"',200],['W/"music"',200],['Sun, 15 Nov 2026 05:00:00 GMT',206],['Sat, 14 Nov 2026 05:00:00 GMT',200]]){const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:'bytes=100-199','If-Range':validator}}),env);assert.equal(r.status,status,validator);await r.arrayBuffer();}
 const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:'bytes=100-199','If-None-Match':'"music"'}}),{ASSETS:{fetch:async()=>new Response(null,{status:304,headers:{ETag:'"music"'}})}});assert.equal(r.status,304);assert.equal((await r.arrayBuffer()).byteLength,0);assert.equal(r.headers.get('Content-Range'),null);
});

test('a small range stops the upstream stream without buffering the whole music file',async()=>{
 let reads=0,cancelled=false;const chunk=65536,size=8*1024*1024;
 const env={ASSETS:{fetch:async()=>new Response(new ReadableStream({pull(c){reads++;c.enqueue(new Uint8Array(chunk).fill(reads));},cancel(){cancelled=true;}}),{headers:{'Content-Length':String(size),'Content-Type':'audio/mpeg'}})}};
 const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:'bytes=65530-65545'}}),env);const bytes=new Uint8Array(await r.arrayBuffer());assert.equal(bytes.length,16);assert.deepEqual([...bytes],[...new Uint8Array(6).fill(1),...new Uint8Array(10).fill(2)]);assert.ok(cancelled);assert.ok(reads<=3,`only boundary chunks may be read, got ${reads}`);
});

test('client cancellation and source failures propagate through a streaming range',async()=>{
 let cancelled=false;const env={ASSETS:{fetch:async()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(65536));},cancel(){cancelled=true;}}),{headers:{'Content-Length':'8000000'}})}};
 const r=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:'bytes=0-'}}),env),reader=r.body.getReader();await reader.read();await reader.cancel();assert.ok(cancelled);
 const broken={ASSETS:{fetch:async()=>new Response(new ReadableStream({pull(c){c.error(new Error('source unavailable'));}}),{headers:{'Content-Length':'8000'}})}};
 const failed=await frontend.fetch(new Request(WEB_ORIGIN+'/music.mp3',{headers:{Range:'bytes=100-199'}}),broken);await assert.rejects(failed.arrayBuffer(),/source unavailable/);
});

test('published music uses pinned file lengths when ASSETS omits Content-Length inside the Worker',async()=>{
 const sources=JSON.parse(readFileSync(new URL('../dist/assets/audio/music/SOURCES.json',import.meta.url)));
 for(const track of sources.tracks){
  const bytes=readFileSync(new URL('../dist/assets/audio/music/'+track.file,import.meta.url));assert.equal(bytes.length,track.bytes);
  const env={ASSETS:{fetch:async req=>{assert.equal(req.headers.get('Accept-Encoding'),'identity');return new Response(req.method==='HEAD'?null:bytes,{headers:{'Content-Type':'audio/mpeg',ETag:'"pinned"'}});}}};
  for(const[range,status,start,end]of[['bytes=100-199',206,100,199],['bytes=-16',206,bytes.length-16,bytes.length-1],[`bytes=${bytes.length}-`,416]]){
   const r=await frontend.fetch(new Request(WEB_ORIGIN+'/assets/audio/music/'+track.file,{headers:{Range:range,'If-Range':'"pinned"',Origin:'https://legacy.example'}}),env);assert.equal(r.status,status,track.file+' '+range);const body=Buffer.from(await r.arrayBuffer());if(status===206){assert.equal(r.headers.get('Content-Range'),`bytes ${start}-${end}/${bytes.length}`);assert.equal(r.headers.get('Content-Length'),String(end-start+1));assert.deepEqual(body,bytes.subarray(start,end+1));}else{assert.equal(body.length,0);assert.equal(r.headers.get('Content-Range'),'bytes */'+bytes.length);}
  }
  const head=await frontend.fetch(new Request(WEB_ORIGIN+'/assets/audio/music/'+track.file,{method:'HEAD'}),env);assert.equal(head.headers.get('Content-Length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
 }
 const unknown=await frontend.fetch(new Request(WEB_ORIGIN+'/unknown.mp3',{headers:{Range:'bytes=0-2'}}),{ASSETS:{fetch:async()=>new Response('unknown',{headers:{'Content-Type':'audio/mpeg'}})}});assert.equal(unknown.status,200);assert.equal(unknown.headers.get('Accept-Ranges'),null);assert.equal(await unknown.text(),'unknown');
});
