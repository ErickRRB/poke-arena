import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';

export async function run({browser,url,viewports,output}){
  for(const viewport of viewports){
    const{context,page,errors,apiRequests}=await openPage(browser,viewport);let release;const gate=new Promise(resolve=>release=resolve);let count=0;
    try{
      await page.route('**/assets/pokemon/**/*.png',async route=>{if(++count>44)await gate;await route.continue();});await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Number(document.getElementById('menu-load-progress').getAttribute('aria-valuenow'))>=40);await page.evaluate(()=>document.fonts.ready);
      const before=await rects(page,['ready-overlay','menu-deck-preview','trainer-name','start-btn']),ball=await page.locator('#menu-load-progress .loading-ball').boundingBox(),overlay=await page.locator('#menu-loading').boundingBox();
      assert.equal(await page.locator('.load-ring').count(),0);assert.ok(Math.abs(ball.x+ball.width/2-overlay.x-overlay.width/2)<1&&Math.abs(ball.y+ball.height/2-overlay.y-overlay.height/2)<1);
      const fill=Number(await page.locator('#menu-load-fill').getAttribute('height'));assert.ok(fill>20&&fill<64);await page.screenshot({path:`${output}/loading-${viewport.width}.png`});release();await ready(page);stable(before,await rects(page,['ready-overlay','menu-deck-preview','trainer-name','start-btn']),'loading');assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
    }finally{release();await context.close();}
  }
  return{viewports:viewports.length,onlineRequests:0};
}
