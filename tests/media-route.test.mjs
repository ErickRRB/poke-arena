import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync,readdirSync,statSync}from'node:fs';import worker from'../dist/server/index.js';
test('the public test arena and its shared battle dependencies are included in the hosted Worker',async()=>{
  for(const file of['testing.html','testing.js','testing.css','sandbox.js','quick-stats.js','quick-stats.css','attack-choreography.js','wing-motion.js','wing-rigs.js','knockback-profiles.js','targeting-art.js','audio.js','assets/audio/manifest.json','loader-art.js','assets/ui/pokeball-pixel-v1.svg','assets/audio/feedback/bow-release.ogg','assets/audio/feedback/CREDITS.txt','assets/battle/arena-ground-v2.webp','assets/battle/arena-bridge-v2.webp','assets/battle/riverbank-v2.webp']){
    const response=await worker.fetch(new Request('https://arena.test/'+file),{});assert.equal(response.status,200,file);assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(new URL('../dist/'+file,import.meta.url)),file);
  }
});
test('the hosted Worker preserves resource bytes including its immutable large illustrations',async t=>{
  const prefix='https://raw.githubusercontent.com/ErickRRB/poke-arena/c0b5ed90c5de98021b879dc227f5b5736d0f73e5/dist/';
  t.mock.method(globalThis,'fetch',async url=>{assert.ok(String(url).startsWith(prefix));return new Response(readFileSync(new URL('../dist/'+String(url).slice(prefix.length),import.meta.url)),{headers:{'Content-Type':'image/png'}});});
  for(const file of['index.html','engine.js','spell-preview.js','battle-art.js','combat-visuals.js','pokemon-silhouettes.js','assets/battle/projectile-bounds.js','assets/battle/Particle__Weather_Ball_Fire_1.None.png','assets/battle/Particle__Weather_Ball_Fire_3.Flip.png','assets/audio/voices/205.mp3','assets/cards/flame-wheel-v1.png','assets/battle/Particle__Flame_Wheel.None.png','assets/cards/battle-1.webp','assets/battle/structures-v1.png','assets/battle/Particle__Gust_Blue.None.png','assets/ui/menu-icons-v1.webp']){
    const response=await worker.fetch(new Request('https://arena.test/'+file),{});assert.equal(response.status,200,file);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),readFileSync(new URL('../dist/'+file,import.meta.url)),file);
  }
});

test('the complete hosted module set leaves headroom below the platform size limit',()=>{
 const folder=new URL('../dist/server/',import.meta.url),files=readdirSync(folder).filter(file=>file.endsWith('.js'));
 const bytes=files.reduce((sum,file)=>sum+statSync(new URL(file,folder)).size,0);
 assert.ok(bytes<60*1024*1024,'all uploaded modules including stale chunks must fit; got '+bytes);
});

test('large illustration HEAD preserves media headers and an unavailable upstream returns 502',async t=>{
 const file='assets/cards/farfetchd-knight-v1.png',bytes=readFileSync(new URL('../dist/'+file,import.meta.url));
 const mock=t.mock.method(globalThis,'fetch',async()=>new Response(bytes));
 const head=await worker.fetch(new Request('https://arena.test/'+file,{method:'HEAD'}),{});
 assert.equal(head.status,200);assert.equal(head.headers.get('Content-Type'),'image/png');assert.match(head.headers.get('Cache-Control'),/immutable/);assert.equal((await head.arrayBuffer()).byteLength,0);
 mock.mock.mockImplementation(async()=>new Response('Unavailable',{status:503}));
 assert.equal((await worker.fetch(new Request('https://arena.test/'+file),{})).status,502);
});

test('retired generic impacts and translucent loading images are no longer served',async()=>{
  for(const file of ['assets/audio/foley/heavy.ogg','assets/audio/foley/punch-1.ogg','assets/audio/foley/punch-2.ogg','assets/audio/foley/punch-3.ogg','assets/ui/pokeball-v2.webp','assets/ui/pokeball-v2.png']){
    const response=await worker.fetch(new Request('https://arena.test/'+file),{});assert.equal(response.status,404,file);
  }
});
test('hosted media works when the platform forbids access to CacheStorage',async t=>{const descriptor=Object.getOwnPropertyDescriptor(globalThis,'caches');Object.defineProperty(globalThis,'caches',{configurable:true,get(){throw Error('This Worker is not permitted to access the default cache.');}});t.after(()=>descriptor?Object.defineProperty(globalThis,'caches',descriptor):delete globalThis.caches);const bytes=readFileSync(new URL('../dist/assets/pokemon/252/art.png',import.meta.url));t.mock.method(globalThis,'fetch',async url=>{assert.match(String(url),/^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/[a-f0-9]{40}\//);return new Response(bytes,{headers:{'Content-Type':'image/png'}});});const response=await worker.fetch(new Request('https://arena.test/assets/pokemon/252/art.png'),{});assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);});
