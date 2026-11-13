import assert from 'node:assert/strict';

export async function openPage(browser,viewport,{deckOnly=false,...options}={}){
  const context=await browser.newContext({viewport,...options}),page=await context.newPage(),errors=[],apiRequests=[];
  page.setDefaultTimeout(12000);
  await page.addInitScript(()=>localStorage.setItem('poke-arena:sound','false'));
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))apiRequests.push(new URL(request.url()).pathname);});
  if(deckOnly)await page.route('**/render.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nRenderer.prototype.load=async function(){};'});});
  await page.route('**/app.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nglobalThis.__qa={get game(){return game},get online(){return online},get onlineMode(){return onlineMode},renderer,updateUi,setDeck(keys){deckDraft=keys;applyDeckChanges();if(document.getElementById("deck-dialog").open)renderCollection();}};'});});
  return{context,page,errors,apiRequests};
}
export const ready=page=>page.waitForFunction(()=>globalThis.__qa&&!document.getElementById('start-btn').disabled);
export const rects=(page,ids)=>page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,width:r.width,height:r.height}]})),ids);
export function stable(before,after,label){for(const id in before)for(const key in before[id])assert.ok(Math.abs(before[id][key]-after[id][key])<.1,`${label}: ${id}.${key} moved`);}
export async function inViewport(page,selector,viewport){const r=await page.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width+1&&r.y+r.height<=viewport.height+1,`${selector} is clipped`);}
