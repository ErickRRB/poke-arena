import assert from 'node:assert/strict';
import {stable} from './helpers.mjs';

export async function run({browser,url,viewports,output}){
  const reports=[];
  for(const viewport of viewports){
    const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
    await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
    await page.route('**/arena-ground-v2.webp',async route=>{await new Promise(resolve=>setTimeout(resolve,650));await route.continue();});
    const geometry=()=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.column-arena,.column-actions,.column-metrics')].map((element,i)=>{const r=element.getBoundingClientRect();return[i,{x:r.x,y:r.y,width:r.width,height:r.height}];})));
    await page.goto(`${url}/testing.html`,{waitUntil:'domcontentloaded'});await page.waitForSelector('.lab-column');
    const before=await geometry();await page.waitForFunction(()=>globalThis.arenaLab?.ready);stable(before,await geometry(),'initial load');
    const initial=await page.evaluate(()=>arenaLab.columns.map(c=>({state:c.game.state,key:c.element.querySelector('select').value,units:c.game.units.length})));
    assert.equal(initial.length,10);assert.ok(initial.every(c=>c.state==='paused'));assert.deepEqual(initial.slice(0,6).map(c=>c.key),['geodude','rhydon','charmander','diglettHorde','princess','sableye']);assert.ok(initial.slice(6,9).every(c=>c.units===0));assert.equal(initial[9].key,'fireball-check');
    const first=page.locator('.lab-column').nth(0),canvas=first.locator('canvas');let box=await canvas.boundingBox();
    await canvas.click({position:{x:box.width*158/600,y:box.height*480/800}});
    await page.waitForFunction(()=>arenaLab.columns[0].game.state==='playing');
    assert.ok(await page.evaluate(()=>arenaLab.columns.slice(1).every(c=>c.game.state==='paused')));
    await page.locator('#pause-all').click();const elapsed=await page.evaluate(()=>arenaLab.columns[0].game.elapsed);
    await first.locator('.column-step').click();const stepped=await page.evaluate(()=>arenaLab.columns[0].game.elapsed);assert.ok(Math.abs(stepped-elapsed-.1)<1e-6);
    await first.locator('.column-clear').click();assert.equal(await page.evaluate(()=>arenaLab.columns[0].game.measurement(0).total),0);
    await page.locator('#choose-card').click();await page.locator('#card-search').fill('P.E.K.K.A.');await page.locator('[data-pick="rhydon"]').click();assert.equal(await page.locator('#chosen-name').textContent(),'Rhydon');
    const free=page.locator('.lab-column').nth(6);await free.scrollIntoViewIfNeeded();box=await free.locator('canvas').boundingBox();
    await free.locator('canvas').click({position:{x:box.width*158/600,y:box.height*480/800}});await page.waitForFunction(()=>arenaLab.columns[6].game.units.length===1);
    const frozen=await page.evaluate(()=>arenaLab.columns[6].game.units[0].y);await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>arenaLab.columns[6].game.units[0].y),frozen);assert.equal(await page.evaluate(()=>arenaLab.columns[6].game.elapsed),0);
    await page.locator('[data-team="1"]').click();box=await free.locator('canvas').boundingBox();await free.locator('canvas').click({position:{x:box.width*158/600,y:box.height*328/800}});await page.waitForFunction(()=>arenaLab.columns[6].game.state==='playing');
    await page.locator('#pause-all').click();
    // Delayed species loading overlays the fixed canvas, actions and meters.
    await page.route('**/assets/pokemon/**',async route=>{await new Promise(resolve=>setTimeout(resolve,400));await route.continue();});
    await page.locator('#choose-card').click();await page.locator('#card-search').fill('snorlax');await page.locator('[data-pick="snorlax"]').click();await page.locator('[data-team="0"]').click();
    await free.locator('canvas').scrollIntoViewIfNeeded();box=await free.locator('canvas').boundingBox();const stableBefore=await geometry();await free.locator('canvas').click({position:{x:box.width*442/600,y:box.height*510/800}});await page.waitForSelector('.column-loading:not([hidden])');stable(stableBefore,await geometry(),'species load');await page.waitForSelector('.column-loading:not([hidden])',{state:'hidden'});stable(stableBefore,await geometry(),'species ready');
    await page.locator('#lab-sound').click();assert.equal(await page.locator('#lab-sound').getAttribute('aria-pressed'),'true');await page.locator('#lab-sound').click();assert.equal(await page.locator('#lab-sound').getAttribute('aria-pressed'),'false');
    const abilityBefore=await geometry();
    await page.evaluate(async()=>{const c=arenaLab.columns[6];c.game.pause();await c.renderer.ensureSpecies([382]);globalThis.__labHero=c.game.spawn('kyogre',0,300,520,0).id;});
    await page.waitForSelector(`[data-lab-ability]`);stable(abilityBefore,await geometry(),'ability visible');
    const ability=free.locator('[data-lab-ability]').first();await ability.scrollIntoViewIfNeeded();const abilityReady=await geometry();await ability.click();
    await page.waitForFunction(()=>arenaLab.columns[6].game.units.find(u=>u.id===__labHero).abilityUsed);stable(abilityReady,await geometry(),'ability activated');assert.equal(await page.evaluate(()=>arenaLab.columns[6].game.state),'paused');
    await page.locator('#add-column').click();assert.equal(await page.locator('.lab-column').count(),11);
    await page.evaluate(()=>{for(const c of arenaLab.columns)c.game.pause();document.getElementById('lab-columns').scrollLeft=0;});
    await page.screenshot({path:`${output}/sandbox-${viewport.width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page must not overflow horizontally');assert.deepEqual(errors,[]);
    reports.push({viewport,columns:11,independent:true,waitForOpponent:true,stableLoad:true,abilities:true});await context.close();
  }
  return{checks:reports.length,viewports:reports};
}
