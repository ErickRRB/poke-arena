import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
import{PVFX_ASSETS}from'../dist/assets/battle/vfx-manifest.js';import{BattleArt}from'../dist/battle-art.js';

test('new effect pixels and metadata retain the original pinned CC0 sources',()=>{
 const source=JSON.parse(readFileSync(new URL('../dist/assets/battle/pvfx-v1/SOURCES.json',import.meta.url)));
 assert.equal(source.license,'CC0-1.0');assert.equal(source.packVersion,'1.0.0');
 for(const file of source.files){
  for(const[path,hash]of[[file.path,file.sheetSha256],[file.metadata,file.manifestSha256]])assert.equal(createHash('sha256').update(readFileSync(new URL('../dist/'+path,import.meta.url))).digest('hex'),hash);
  const meta=PVFX_ASSETS[file.key],bytes=readFileSync(new URL('../dist/'+file.path,import.meta.url));
  assert.ok(meta.frameCount>meta.columns);assert.equal(bytes.readUInt32BE(16),meta.columns*meta.width);assert.equal(bytes.readUInt32BE(20),meta.rows*meta.height);
 }
});
test('grid effects reach later rows and respect their original source pivot',()=>{
 const image={},art=new BattleArt(()=>{}),calls=[],ctx=new Proxy({globalAlpha:1,drawImage(...args){calls.push(args);}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 for(const meta of Object.values(PVFX_ASSETS))art.images.set(meta.file,image);
 art.draw(ctx,'vfxWhirlpool',0,0,100,100,{frame:12});assert.equal(calls.at(-1)[2],PVFX_ASSETS.vfxWhirlpool.height);
 calls.length=0;art.draw(ctx,'vfxFireJet',0,0,128,48,{frame:1,anchor:'pivot'});
 assert.equal(calls[0][5],-PVFX_ASSETS.vfxFireJet.pivot[0]);assert.equal(calls[0][6],-PVFX_ASSETS.vfxFireJet.pivot[1]);
});
