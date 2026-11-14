import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';
export async function run({browser,url,viewports,output}){
 const reports=[],ids=['arena','arena-frame','hand','energy-bar','battle-clock','match-pause','match-leave'];
 for(const viewport of viewports){
  const {context,page,errors}=await openPage(browser,viewport);
  try{
   await page.goto(url);await ready(page);await page.locator('#start-btn').click();
   await page.evaluate(()=>{__qa.game.aiEnabled=false;__qa.game.step=()=>{};});
   const before=await rects(page,ids),rows=[];
   for(const phase of[
    {name:'normal',time:100,overtime:false,m:1},
    {name:'double',time:60,overtime:false,m:2},
    {name:'overtime-double',time:100,overtime:true,m:2},
    {name:'overtime-triple',time:55,overtime:true,m:3}
   ]){
    const result=await page.evaluate(phase=>{
     const g=__qa.game;Object.assign(g,{time:phase.time,overtime:phase.overtime,elapsed:.25,state:'playing'});__qa.updateUi();
     const clock=document.getElementById('battle-clock'),bar=document.querySelector('.energy-section'),boost=document.getElementById('boost'),a=document.getElementById('battle-phase-announcement');
     window.__phaseMutationCount=0;window.__phaseObserver?.disconnect();window.__phaseObserver=new MutationObserver(records=>window.__phaseMutationCount+=records.length);window.__phaseObserver.observe(a,{subtree:true,childList:true,characterData:true});
     return{multiplier:g.multiplier,phase:clock.dataset.phase,beat:clock.dataset.beat,color:getComputedStyle(clock).color,background:getComputedStyle(clock).backgroundColor,bar:getComputedStyle(bar).backgroundImage,boost:boost.textContent,boostHidden:boost.hidden,announcement:a.textContent};
    },phase);
    assert.equal(result.multiplier,phase.m);assert.equal(result.boostHidden,phase.m===1);assert.equal(result.boost,phase.m+'×');
    assert.equal(result.phase,phase.overtime?'overtime':'regular');stable(before,await rects(page,ids),phase.name);
    if(phase.overtime){assert.match(result.announcement,/Tiempo extra/);assert.equal(result.background,'rgb(223, 63, 80)');}
    await page.screenshot({path:output+'/phase-'+phase.name+'-'+viewport.width+'.png'});
    await page.evaluate(()=>{for(let i=0;i<8;i++)__qa.updateUi();});
    assert.equal(await page.evaluate(()=>window.__phaseMutationCount),0,'no repeated live announcement');
    if(phase.overtime){
     const soft=await page.evaluate(()=>{__qa.game.elapsed=.75;__qa.updateUi();return{background:getComputedStyle(document.getElementById('battle-clock')).backgroundColor,beat:document.getElementById('battle-clock').dataset.beat}});
     assert.notEqual(soft.background,result.background);assert.equal(soft.beat,'soft');
     await page.evaluate(()=>{__qa.game.pause();__qa.updateUi();});await page.waitForTimeout(580);
     assert.equal(await page.locator('#battle-clock').getAttribute('data-beat'),'soft','pause freezes the pulse');
     stable(before,await rects(page,ids),'paused '+phase.name);
    }
    rows.push({...phase,...result});
   }
   await page.evaluate(()=>{const el=document.getElementById('motion-setting');el.checked=true;el.dispatchEvent(new Event('change'));__qa.game.elapsed=.25;__qa.updateUi();});
   const reduced=await page.locator('#battle-clock').evaluate(el=>getComputedStyle(el).color);
   await page.evaluate(()=>{__qa.game.elapsed=.75;__qa.updateUi();});assert.equal(await page.locator('#battle-clock').evaluate(el=>getComputedStyle(el).color),reduced);
   await page.screenshot({path:output+'/phase-reduced-'+viewport.width+'.png'});
   // A reconnecting overlay is checked in the same boxes as the live two-client suite.
   await page.evaluate(()=>document.getElementById('connection-loading').hidden=false);stable(before,await rects(page,ids),'triple reconnect overlay');
   await page.evaluate(()=>document.getElementById('connection-loading').hidden=true);stable(before,await rects(page,ids),'triple recovered overlay');
   // Restore both perspectives from real wire snapshots already inside each boost phase.
   const restored=await page.evaluate(async()=>{
    const {Game}=await import('/engine.js?v=26'),{packGame,unpackGame,perspective}=await import('/snapshot.js?v=26'),rows=[];
    for(const time of[100,55])for(const team of[0,1]){const source=new Game();source.start();Object.assign(source,{time,overtime:true,elapsed:.75});const model=unpackGame(perspective(packGame(source),team));Object.assign(__qa.game,model);__qa.game.step=()=>{};__qa.updateUi();rows.push({time,team,m:__qa.game.multiplier,badge:document.getElementById('boost').textContent,phase:document.getElementById('battle-clock').dataset.phase});}return rows;
   });for(const row of restored){assert.equal(row.m,row.time>60?2:3);assert.equal(row.badge,row.m+'×');assert.equal(row.phase,'overtime');}
   await page.locator('#again-btn').dispatchEvent('click');await page.waitForFunction(()=>document.querySelector('.energy-section').dataset.elixir==='1');
   assert.equal(await page.locator('#boost').isHidden(),true);assert.equal(await page.locator('#phase-label').isHidden(),true);stable(before,await rects(page,ids),'fresh match');
   assert.deepEqual(errors,[]);reports.push({viewport,phases:rows,wireSnapshotPerspectives:restored,reducedStatic:true,pausedPulse:true,stable:true});await context.close();
  }catch(error){await page.screenshot({path:output+'/phase-failure-'+viewport.width+'.png'});throw error;}
 }
 return {viewports:reports,method:'Controlled UI clock fixtures, actual shared Game multiplier and wire snapshot restore in both perspectives. Real socket reconnect transport is covered separately by online.'};
}
