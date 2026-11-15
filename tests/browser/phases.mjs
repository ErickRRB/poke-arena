import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';
export async function run({browser,url,viewports,output}){
 const reports=[],ids=['arena','arena-frame','hand','energy-bar','battle-clock','match-pause','match-leave'];
 for(const viewport of viewports){
  const {context,page,errors}=await openPage(browser,viewport);
  try{
   await page.goto(url);await ready(page);await page.locator('#start-btn').click();
   await page.evaluate(()=>{__qa.game.aiEnabled=false;__qa.game.step=()=>{};});
   assert.equal(await page.locator('#match-pause use').getAttribute('href'),'#i-pause');assert.equal(await page.locator('#match-leave use').getAttribute('href'),'#i-home');
   const before=await rects(page,ids),rows=[];
   let releaseFont;const fontGate=new Promise(resolve=>releaseFont=resolve);
   await page.route('**/assets/fonts/font-1.ttf?phase-test=late',async route=>{await fontGate;await route.continue();});
   await page.evaluate(()=>{const font=new FontFace('LateBattleClock',"url('/assets/fonts/font-1.ttf?phase-test=late')",{weight:'600'});document.fonts.add(font);document.getElementById('battle-clock').style.fontFamily="'LateBattleClock',monospace";window.__lateClockFont=font.load();});
   stable(before,await rects(page,ids),'clock font pending');releaseFont();await page.evaluate(()=>window.__lateClockFont);
   stable(before,await rects(page,ids),'clock font loaded');await page.locator('#battle-clock').evaluate(el=>el.style.removeProperty('font-family'));
   stable(before,await rects(page,ids),'clock font restored');
   for(const phase of[
    {name:'normal',time:100,overtime:false,m:1},
    {name:'double',time:60,overtime:false,m:2},
    {name:'low-time',time:24,overtime:false,m:2},
    {name:'overtime-double',time:100,overtime:true,m:2},
    {name:'overtime-triple',time:55,overtime:true,m:3}
   ]){
    const result=await page.evaluate(phase=>{
     const g=__qa.game;Object.assign(g,{time:phase.time,overtime:phase.overtime,elapsed:.25,state:'playing'});__qa.updateUi();
     const clock=document.getElementById('battle-clock'),bar=document.querySelector('.energy-section'),boost=document.getElementById('boost'),a=document.getElementById('battle-phase-announcement');
     window.__phaseMutationCount=0;window.__phaseObserver?.disconnect();window.__phaseObserver=new MutationObserver(records=>window.__phaseMutationCount+=records.length);window.__phaseObserver.observe(a,{subtree:true,childList:true,characterData:true});
     return{multiplier:g.multiplier,phase:clock.dataset.phase,beat:clock.dataset.beat,color:getComputedStyle(clock).color,background:getComputedStyle(clock).backgroundColor,bar:getComputedStyle(bar).backgroundImage,boost:boost.textContent,boostHidden:boost.hidden,announcement:a.textContent};
    },phase);
    assert.equal(result.multiplier,phase.m);assert.equal(result.boostHidden,phase.m===1);assert.equal(result.boost.trim(),'×'+phase.m);
    assert.equal(result.phase,phase.overtime?'overtime':'regular');stable(before,await rects(page,ids),phase.name);
    for(const id of ['enemy-name','online-status','match-pause','match-leave']){
     const appearance=await page.locator('#'+id).evaluate(el=>{const s=getComputedStyle(el);return{background:s.backgroundColor,color:s.color,border:s.borderWidth,shadow:s.boxShadow}});
     assert.equal(appearance.color,'rgb(255, 247, 231)',id+' has light lettering');assert.equal(appearance.background,'rgba(0, 0, 0, 0)',id+' has no plate');assert.equal(appearance.border,'0px');assert.equal(appearance.shadow,'none');
    }
    assert.equal(result.background,'rgba(0, 0, 0, 0)');
    if(phase.overtime)assert.match(result.announcement,/Tiempo extra/);
    if(phase.overtime||phase.time<=30)assert.equal(result.color,'rgb(255, 86, 97)');
    assert.match(await page.locator('#battle-clock').evaluate(el=>getComputedStyle(el).fontFamily),/Lilita One/);
    await page.screenshot({path:output+'/phase-'+phase.name+'-'+viewport.width+'.png'});
    if(phase.m>1){
     const clip=await page.locator('#boost').boundingBox(),visible=await page.screenshot({clip});
     await page.locator('#boost-value').evaluate(el=>el.style.visibility='hidden');const withoutNumber=await page.screenshot({clip});
     await page.locator('#boost-value').evaluate(el=>el.style.removeProperty('visibility'));
     assert.notDeepEqual(visible,withoutNumber,'the multiplier number actually paints above the filtered SVG');
    }
    await page.evaluate(()=>{for(let i=0;i<8;i++)__qa.updateUi();});
    assert.equal(await page.evaluate(()=>window.__phaseMutationCount),0,'no repeated live announcement');
    if(phase.overtime){
     const soft=await page.evaluate(()=>{__qa.game.elapsed=.75;__qa.updateUi();return{color:getComputedStyle(document.getElementById('battle-clock')).color,beat:document.getElementById('battle-clock').dataset.beat}});
     assert.equal(soft.color,'rgb(228, 56, 74)');assert.notEqual(soft.color,result.color);assert.equal(soft.beat,'soft');
     await page.evaluate(()=>{__qa.game.pause();__qa.updateUi();});await page.waitForTimeout(580);
     assert.equal(await page.locator('#match-pause use').getAttribute('href'),'#i-play');
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
   });for(const row of restored){assert.equal(row.m,row.time>60?2:3);assert.equal(row.badge.trim(),'×'+row.m);assert.equal(row.phase,'overtime');}
   const fieldIds=['arena','arena-frame','hand','energy-bar'],fieldBefore=await rects(page,fieldIds);
   await page.evaluate(()=>{document.getElementById('match-pause').hidden=true;document.getElementById('match-leave').hidden=true;});
   const onlinePhase=await page.evaluate(()=>({extra:document.getElementById('phase-label').getBoundingClientRect().toJSON(),boost:document.getElementById('boost').getBoundingClientRect().toJSON()}));
   assert.ok(onlinePhase.extra.bottom<onlinePhase.boost.top,'online phase text and the elixir drop do not overlap');stable(fieldBefore,await rects(page,fieldIds),'online controls hidden');
   await page.evaluate(()=>{document.getElementById('match-pause').hidden=false;document.getElementById('match-leave').hidden=false;});stable(before,await rects(page,ids),'CPU controls restored');
   await page.locator('#again-btn').dispatchEvent('click');await page.waitForFunction(()=>document.querySelector('.energy-section').dataset.elixir==='1');
   assert.equal(await page.locator('#boost').isHidden(),true);assert.equal(await page.locator('#phase-label').isHidden(),true);stable(before,await rects(page,ids),'fresh match');
   assert.deepEqual(errors,[]);reports.push({viewport,phases:rows,wireSnapshotPerspectives:restored,reducedStatic:true,pausedPulse:true,lateFontStable:true,stable:true});await context.close();
  }catch(error){await page.screenshot({path:output+'/phase-failure-'+viewport.width+'.png'});throw error;}
 }
 return {viewports:reports,method:'Controlled UI clock fixtures, actual shared Game multiplier and wire snapshot restore in both perspectives. Real socket reconnect transport is covered separately by online.'};
}
