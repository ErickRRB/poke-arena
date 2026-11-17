import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';

export async function checkOpaqueBall(page){
  const result=await page.evaluate(async()=>{
    const{BATTLE_ASSETS}=await import('/assets/battle/manifest.js');
    const image=new Image();image.src='/assets/ui/pokeball-pixel-v1.svg';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,64,64).data;let red=0,partialRed=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]>pixels[i+1]*1.3&&pixels[i]>pixels[i+2]*1.3&&pixels[i+3]){red++;if(pixels[i+3]!==255)partialRed++;}
    const base=document.querySelector('#menu-load-progress .loading-base'),fill=document.querySelector('#menu-load-progress .loading-fill');
    return{red,partialRed,baseOpacity:getComputedStyle(base).opacity,fillOpacity:getComputedStyle(fill).opacity,symbolImages:document.querySelectorAll('#i-loading-ball image,#i-ball image').length,canvasFile:BATTLE_ASSETS.pokeball.file,brand:getComputedStyle(document.querySelector('.brand-ball')).backgroundImage};
  });
  assert.ok(result.red>400);assert.equal(result.partialRed,0,'red artwork is opaque');assert.equal(result.baseOpacity,'1','progress base remains solid');assert.equal(result.fillOpacity,'1');assert.equal(result.symbolImages,0);assert.equal(result.canvasFile,'assets/ui/pokeball-pixel-v1.svg');assert.ok(!result.brand.includes('pokeball-v2'));
  return result;
}

export async function run({browser,url,viewports,output}){
  for(const viewport of viewports){
    const{context,page,errors,apiRequests}=await openPage(browser,viewport);let release;const gate=new Promise(resolve=>release=resolve);let count=0;
    try{
      await page.route('**/assets/pokemon/**/*.png',async route=>{if(++count>44)await gate;await route.continue();});await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Number(document.getElementById('menu-load-progress').getAttribute('aria-valuenow'))>=40);await page.evaluate(()=>document.fonts.ready);
      const before=await rects(page,['ready-overlay','menu-deck-preview','trainer-name','start-btn']),ball=await page.locator('#menu-load-progress').boundingBox(),overlay=await page.locator('#menu-loading').boundingBox();
      assert.equal(await page.locator('.load-ring').count(),0);assert.ok(Math.abs(ball.x+ball.width/2-overlay.x-overlay.width/2)<1&&Math.abs(ball.y+ball.height/2-overlay.y-overlay.height/2)<1);
      const fill=Number(await page.locator('#menu-load-fill').getAttribute('height'));assert.ok(fill>20&&fill<64);await checkOpaqueBall(page);await page.screenshot({path:`${output}/loading-${viewport.width}.png`});
      await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#search-panel .loading-ball').evaluate(node=>getComputedStyle(node).animationName),'none');
      release();await ready(page);stable(before,await rects(page,['ready-overlay','menu-deck-preview','trainer-name','start-btn']),'loading');
      await page.emulateMedia({reducedMotion:'no-preference'});
      const menuBefore=await rects(page,['ready-overlay','menu-deck-preview','trainer-name','start-btn']);
      await page.evaluate(()=>document.getElementById('search-panel').hidden=false);
      stable(menuBefore,await rects(page,['ready-overlay','menu-deck-preview','trainer-name','start-btn']),'search overlay');
      await page.evaluate(()=>document.getElementById('search-panel').hidden=true);
      await page.locator('#start-btn').click();
      const ids=['arena-frame','hand','energy-bar','battle-settings-btn'],battleBefore=await rects(page,ids);
      for(const id of ['loading','battle-loading','connection-loading']){
        await page.evaluate(id=>document.getElementById(id).hidden=false,id);
        stable(battleBefore,await rects(page,ids),id+' shown');
        await page.evaluate(id=>document.getElementById(id).hidden=true,id);
        stable(battleBefore,await rects(page,ids),id+' hidden');
      }
      assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
    }finally{release();await context.close();}
  }
  return{viewports:viewports.length,onlineRequests:0};
}
