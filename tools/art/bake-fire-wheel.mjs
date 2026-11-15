// Offline asset authoring only. Nothing in dist imports this baker.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'../..');
const output=path.resolve(process.argv[2]||path.join(os.tmpdir(),'poke-arena-fire-wheel-bake'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={author:'tools/art/fire-wheel-author.mjs',texture:'art-source/fire-wheel-v2/fire-texture-original-v1.png'};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname==='/'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><meta charset="utf-8"><title>Offline fire material baker</title>');return;}
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
  try{const bytes=await fs.readFile(file);res.writeHead(200,{'content-type':file.endsWith('.mjs')?'text/javascript':'image/png','cache-control':'no-store'});res.end(bytes);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  let playwright;
  try{playwright=await import('playwright');}
  catch{playwright=await import(pathToFileURL(path.resolve(root,'../pokemon-arena/qa/node_modules/playwright/index.mjs')));}
  browser=await playwright.chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const baked=await page.evaluate(async files=>{
    const author=await import('/'+files.author);await author.initMaterial('/'+files.texture);
    return{material:author.MATERIAL,png:author.atlasDataUrls()};
  },files);
  await fs.mkdir(output,{recursive:true});
  const report={at:new Date().toISOString(),kind:'offline_fire_wheel_bake',browser:browser.version(),material:baked.material,inputs:[],outputs:[]};
  for(const [role,file] of Object.entries(files))report.inputs.push({role,path:file,sha256:hash(await fs.readFile(path.join(root,file)))});
  for(const mode of ['normal','reduced']){
    const bytes=Buffer.from(baked.png[mode].split(',')[1],'base64'),file=`${mode}.png`;
    await fs.writeFile(path.join(output,file),bytes);report.outputs.push({mode,file,bytes:bytes.length,sha256:hash(bytes)});
  }
  await fs.writeFile(path.join(output,'bake.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,frames:baked.material.frames,outputs:report.outputs}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
