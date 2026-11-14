import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {CARD_ART} from '../dist/card-art.js';
import {CARDS} from '../dist/engine.js';
import {openPage,ready,stable} from '../tests/browser/helpers.mjs';
import {run as reviewDeck} from '../tests/browser/deck.mjs';

const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const output=path.join(root,'docs/pokemon-fidelity/ui');
const keys=['diglett','diglettHorde','zubat','crobat','raltsTrio','registeel','celebi','duskull','nuzleaf'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
  if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(file));}
  catch{res.writeHead(404).end();}
});
await mkdir(output,{recursive:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  const module=process.env.POKE_ARENA_PLAYWRIGHT_MODULE||path.join(root,'qa/node_modules/playwright/index.mjs');
  const {chromium}=await import(pathToFileURL(module).href);
  browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
  const report={artworks:Object.keys(CARD_ART).length,selectable:Object.keys(CARD_ART).filter(key=>!CARDS[key]?.token).length,corrected:keys,viewports:[]};
  report.deck=await reviewDeck({browser,url,viewports:[{width:390,height:844}],output});
  for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:980}]){
    const {context,page,errors,apiRequests}=await openPage(browser,viewport,{deckOnly:true,reducedMotion:'reduce'});
    try{
      await page.goto(url);await ready(page);
      assert.ok((await (await page.request.get(url+'/card-art.js?v=26')).text()).includes("diglett:'diglettV2'"));
      for(const key of keys){
        const file=CARD_ART[key].file,response=await page.request.get(url+'/'+file);
        const actual=createHash('sha256').update(await response.body()).digest('hex');
        const expected=createHash('sha256').update(await readFile(path.join(dist,file))).digest('hex');
        assert.equal(actual,expected,`served artwork bytes for ${key}`);
      }
      const images=await page.evaluate(async files=>Promise.all(files.map(file=>new Promise((resolve,reject)=>{
        const image=new Image();image.onload=()=>resolve({file,width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error(file));image.src=file;
      }))),[...new Set(Object.values(CARD_ART).map(art=>art.file))]);
      assert.ok(images.every(image=>image.width>0&&image.height>0));
      await page.locator('#menu-deck-btn').click();
      const positions=()=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('[data-collection],#deck-scroll,#save-deck-btn')].map(node=>{
        const r=node.getBoundingClientRect();return[node.dataset.collection||node.id,{x:r.x,y:r.y,width:r.width,height:r.height}];
      })));
      const before=await positions();
      let release;const gate=new Promise(resolve=>release=resolve),pending=new Set();
      await page.route(location=>location.searchParams.has('fidelity-delay'),async route=>{
        pending.add(new URL(route.request().url()).pathname);await gate;await route.continue();
      });
      try{
        await page.evaluate(art=>{
          for(const [key,meta]of Object.entries(art))for(const node of document.querySelectorAll(`[data-art="${key}"]`))node.style.backgroundImage=`url('/${meta.file}?fidelity-delay=1')`;
        },Object.fromEntries(keys.map(key=>[key,CARD_ART[key]])));
        await page.waitForTimeout(300);
        stable(before,await positions(),'delayed card images');
      }finally{release();}
      await page.evaluate(async files=>Promise.all(files.map(file=>new Promise((resolve,reject)=>{
        const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error(file));image.src=`/${file}?fidelity-delay=1`;
      }))),keys.map(key=>CARD_ART[key].file));
      stable(before,await positions(),'loaded card images');
      assert.equal(pending.size,keys.length,'all corrected images exercised the delayed route');
      for(const key of keys){
        const card=page.locator(`[data-collection="${key}"]`);await card.scrollIntoViewIfNeeded();
        if(viewport.width===390)await card.screenshot({path:path.join(output,`card-${key}.png`)});
        await card.click();await page.locator('#card-action-info').click();
        const art=page.locator(`#card-info-art [data-art="${key}"]`);await art.waitFor();
        const source=await art.evaluate(node=>getComputedStyle(node).backgroundImage);
        assert.ok(source.includes(CARD_ART[key].file));
        await art.evaluate(async node=>{
          const image=new Image();image.src=getComputedStyle(node).backgroundImage.slice(5,-2);await image.decode();
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        });
        const bounds=await art.boundingBox();assert.ok(bounds.width>80&&bounds.height>80);
        if(viewport.width===390||['diglett','diglettHorde','zubat'].includes(key))await page.locator('#card-dialog').screenshot({path:path.join(output,`detail-${key}-${viewport.width}.png`)});
        await page.locator('#card-dialog [data-close]').click();
      }
      assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
      report.viewports.push({...viewport,loadedFiles:images.length,delayedImages:pending.size,layoutDelta:0,detailCards:keys.length,apiRequests:0});
      console.log(`Artwork UI ${viewport.width}: all nine cards load; no layout movement.`);
    }finally{await context.close();}
  }
  await writeFile(path.join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
