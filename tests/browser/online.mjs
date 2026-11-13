import assert from 'node:assert/strict';
import {openPage,ready,rects,stable} from './helpers.mjs';

export async function run({browser,url,viewports,output}){
  const a=await openPage(browser,{width:390,height:844}),b=await openPage(browser,{width:390,height:844}),frames=[],rooms=[];
  a.page.on('websocket',socket=>socket.on('framereceived',({payload})=>{try{const packet=JSON.parse(String(payload));if(packet.type==='snapshot'){rooms.push(packet.roomId);frames.push({at:Date.now(),bytes:Buffer.byteLength(String(payload))});}}catch{}}));
  let room;
  try{
    await Promise.all([a.page.goto(url),b.page.goto(url)]);await Promise.all([ready(a.page),ready(b.page)]);await a.page.locator('#online-btn').click();await b.page.locator('#online-btn').click();
    await Promise.all([a.page.waitForFunction(()=>__qa.onlineMode&&__qa.game.state==='playing'),b.page.waitForFunction(()=>__qa.onlineMode&&__qa.game.state==='playing')]);
    room=await a.page.evaluate(()=>__qa.online.roomId);assert.ok(room);assert.equal(await b.page.evaluate(()=>__qa.online.roomId),room);
    assert.equal(await a.page.locator('#match-pause').isVisible(),false);
    const deployed=await a.page.evaluate(async()=>{const client=__qa.online;return client.send({kind:'deploy',handIndex:0,key:__qa.game.hands[0][0],x:client.team?442:158,y:client.team?280:520});});assert.equal(deployed.ok,true);
    await b.page.waitForFunction(()=>__qa.game.units.length>0);
    await a.page.locator('#menu-btn').dispatchEvent('click');assert.equal(await a.page.locator('#main-menu').isHidden(),true);
    await a.page.reload();await a.page.waitForFunction(()=>globalThis.__qa&&__qa.onlineMode&&__qa.game.state==='playing');assert.equal(await a.page.evaluate(()=>__qa.online.roomId),room);
    const sizes=viewports.length>1?[{width:390,height:844},{width:768,height:1024},{width:1440,height:980}]:[{width:390,height:844}],before=[];
    const ids=['arena-frame','hand','energy-bar'];
    for(const viewport of sizes){await a.page.setViewportSize(viewport);await a.page.evaluate(()=>new Promise(requestAnimationFrame));before.push(await rects(a.page,ids));}
    await a.context.setOffline(true);await a.page.locator('#connection-loading').waitFor({state:'visible',timeout:12000});
    for(const [i,viewport]of sizes.entries()){await a.page.setViewportSize(viewport);await a.page.evaluate(()=>new Promise(requestAnimationFrame));stable(before[i],await rects(a.page,ids),'reconnecting '+viewport.width);}
    await a.context.setOffline(false);await a.page.locator('#connection-loading').waitFor({state:'hidden',timeout:12000});assert.equal(await a.page.evaluate(()=>__qa.online.roomId),room);
    for(const [i,viewport]of sizes.entries()){await a.page.setViewportSize(viewport);await a.page.evaluate(()=>new Promise(requestAnimationFrame));stable(before[i],await rects(a.page,ids),'recovered '+viewport.width);}
    await a.page.screenshot({path:output+'/online.png'});assert.ok(rooms.every(id=>id===room));assert.deepEqual([...a.apiRequests,...b.apiRequests],[]);assert.deepEqual([...a.errors,...b.errors],[]);
  }finally{
    await a.context.setOffline(false);try{await a.page.evaluate(()=>__qa.online?.send({kind:'leave'}));}catch{}
    await Promise.all([a.context.close(),b.context.close()]);
  }
  const gaps=frames.slice(1).map((frame,i)=>frame.at-frames[i].at).filter(gap=>gap<1000).sort((a,b)=>a-b);
  return{sessions:2,sameRoomAfterReload:true,networkRecovery:true,layoutViewports:viewports.length>1?3:1,httpPolls:0,snapshots:frames.length,medianFrameGapMs:gaps[Math.floor(gaps.length/2)],p95FrameGapMs:gaps[Math.floor(gaps.length*.95)],maxPacketBytes:Math.max(...frames.map(frame=>frame.bytes))};
}
