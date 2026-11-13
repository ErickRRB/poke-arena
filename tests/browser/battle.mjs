import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';

export async function checkCapturedDeploymentLighting(page){
  const results=await page.evaluate(async()=>{
    const{renderer,game}=__qa,{packGame,unpackGame,perspective}=await import('/snapshot.js?v=26');
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=800;const c=canvas.getContext('2d',{willReadFrequently:true});
    const selection=renderer.selection,pointer=renderer.pointer,results=[];renderer.pointer=null;
    try{
      for(const side of[0,1]){
        const source=new game.constructor({seed:477});source.start();source.aiEnabled=false;
        const preview=side?unpackGame(perspective(packGame(source),side)):source;
        const sample=key=>{renderer.selection=key;c.clearRect(0,0,600,800);renderer.drawPlacement(c,preview);return Object.fromEntries(Object.entries({left:[150,300],right:[450,300],own:[150,500]}).map(([name,[x,y]])=>[name,c.getImageData(x,y,1,1).data[3]]));};
        const before=sample('voltorb');
        const own=preview.towers.find(t=>t.team===0&&t.lane===0);preview.damage(own,own.hp,1);
        const ownDown=sample('voltorb');
        const left=preview.towers.find(t=>t.team===1&&t.lane===0);preview.damage(left,left.hp,0);
        const leftDown=sample('voltorb');
        const right=preview.towers.find(t=>t.team===1&&t.lane===1);preview.damage(right,right.hp,0);
        const bothDown=sample('voltorb'),rolling=sample('log'),spell=sample('thunder');
        results.push({side,before,ownDown,leftDown,bothDown,rolling,spell});
      }
    }finally{renderer.selection=selection;renderer.pointer=pointer;}
    return results;
  });
  for(const result of results){
    assert.ok(result.before.left>0&&result.before.right>0,'enemy territory starts shaded');assert.equal(result.before.own,0);
    assert.deepEqual(result.ownDown,result.before,'losing an allied tower must not unlock enemy territory');
    assert.equal(result.leftDown.left,result.before.own,'captured territory must be as clear as the home side');assert.equal(result.leftDown.right,result.before.right,'the other lane remains shaded');
    assert.equal(result.bothDown.left,0);assert.equal(result.bothDown.right,0);
    assert.ok(result.rolling.left>0&&result.rolling.right>0,'rolling spells keep their original deployment side');
    assert.deepEqual(result.spell,{left:0,right:0,own:0});
  }
}

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
      await checkCapturedDeploymentLighting(page);
      const board=await rects(page,['arena','hand','energy-bar']);await page.locator('#hand [data-card="0"]').click();await page.evaluate(()=>{__qa.renderer.pointer={x:300,y:520};__qa.renderer.draw(__qa.game,0);});stable(board,await rects(page,['arena','hand','energy-bar']),'range');await page.screenshot({path:`${output}/battle-${viewport.width}.png`});
      await page.locator('#match-leave').click();assert.equal(await page.evaluate(()=>__qa.game.state),'paused');await page.locator('#leave-dialog .primary-btn').click();await page.waitForFunction(()=>__qa.game.state==='playing');
      assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
    }finally{await context.close();}
  }
  return{viewports:viewports.length,onlineRequests:0};
}
