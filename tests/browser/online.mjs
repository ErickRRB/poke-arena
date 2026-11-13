import assert from 'node:assert/strict';
import {openPage,ready} from './helpers.mjs';

export async function run({browser,url,output}){
  const a=await openPage(browser,{width:390,height:844}),b=await openPage(browser,{width:390,height:844}),rooms=[];
  a.page.on('response',async response=>{if(response.url().includes('/api/'))try{const packet=await response.json();if(packet.roomId)rooms.push(packet.roomId);}catch{}});
  try{
    await Promise.all([a.page.goto(url),b.page.goto(url)]);await Promise.all([ready(a.page),ready(b.page)]);await a.page.locator('#online-btn').click();await b.page.locator('#online-btn').click();
    await Promise.all([a.page.waitForFunction(()=>__qa.onlineMode&&__qa.game.state==='playing'),b.page.waitForFunction(()=>__qa.onlineMode&&__qa.game.state==='playing')]);const room=rooms.at(-1);assert.ok(room);
    const searches=a.apiRequests.filter(path=>path==='/api/queue').length;await a.page.locator('#menu-btn').dispatchEvent('click');assert.equal(await a.page.locator('#main-menu').isHidden(),true);
    await a.page.reload();await a.page.waitForFunction(()=>globalThis.__qa&&__qa.onlineMode&&__qa.game.state==='playing');assert.equal(rooms.at(-1),room);assert.equal(a.apiRequests.filter(path=>path==='/api/queue').length,searches);assert.ok(a.apiRequests.includes('/api/resume'));assert.equal(a.apiRequests.includes('/api/cancel'),false);
    await a.page.route('**/api/battle',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Offline"}'}));await a.page.locator('#connection-loading').waitFor({state:'visible'});await a.page.unroute('**/api/battle');await a.page.locator('#connection-loading').waitFor({state:'hidden'});
    assert.equal(rooms.at(-1),room);await a.page.screenshot({path:`${output}/online.png`});assert.deepEqual([...a.errors,...b.errors],[]);
  }finally{await Promise.all([a.context.close(),b.context.close()]);}
  return{sessions:2,sameRoomAfterReload:true,networkRecovery:true};
}
