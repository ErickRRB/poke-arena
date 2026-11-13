import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';

export async function run({browser,url,viewports,output}){
  for(const viewport of viewports){
    const{context,page,errors,apiRequests}=await openPage(browser,viewport);
    try{
      await page.goto(url);await ready(page);await page.locator('#settings-btn').click();
      assert.equal(await page.locator('#damage-numbers-setting').isChecked(),false);assert.equal(await page.evaluate(()=>__qa.renderer.showCombatNumbers),false);
      await page.locator('.debug-settings summary').click();await page.locator('#damage-numbers-setting').check();assert.equal(await page.evaluate(()=>__qa.renderer.showCombatNumbers),true);
      await page.reload();await ready(page);assert.equal(await page.evaluate(()=>__qa.renderer.showCombatNumbers),true);
      await page.locator('#settings-btn').click();await page.locator('.debug-settings summary').click();await page.locator('#damage-numbers-setting').uncheck();await page.locator('#settings-dialog [data-close]').click();await page.locator('#start-btn').click();
      await page.evaluate(()=>{const target=__qa.game.spawn('snorlax',1,300,300,0);__qa.game.damage(target,100,0);});assert.equal(await page.evaluate(()=>__qa.renderer.numbers.length),0);
      await page.evaluate(()=>{__qa.game.aiEnabled=false;__qa.game.energy[0]=0;__qa.updateUi();});assert.equal(await page.locator('#hand .unaffordable').count(),4);assert.match(await page.locator('#hand .pokemon-card').first().evaluate(node=>getComputedStyle(node).filter),/grayscale\(1\)/);
      await page.evaluate(()=>{__qa.game.energy[0]=10;__qa.updateUi();});assert.equal(await page.locator('#hand .unaffordable').count(),0);assert.equal(await page.locator('#next-name').isVisible(),true);
      const board=await rects(page,['arena','hand','energy-bar']);await page.locator('#hand [data-card="0"]').click();await page.evaluate(()=>{__qa.renderer.pointer={x:300,y:520};__qa.renderer.draw(__qa.game,0);});stable(board,await rects(page,['arena','hand','energy-bar']),'range');await page.screenshot({path:`${output}/battle-${viewport.width}.png`});
      await page.locator('#match-leave').click();assert.equal(await page.evaluate(()=>__qa.game.state),'paused');await page.locator('#leave-dialog .primary-btn').click();await page.waitForFunction(()=>__qa.game.state==='playing');
      assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
    }finally{await context.close();}
  }
  return{viewports:viewports.length,onlineRequests:0};
}
