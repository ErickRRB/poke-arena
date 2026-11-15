import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createNativeIntegratedServer} from './qa-native-integrated-server.mjs';
const root=path.resolve(import.meta.dirname,'..'),main=path.resolve(root,'../pokemon-arena'),out=path.resolve(root,'../.supervision/mobile-board-20261114/card-hold');
await mkdir(out,{recursive:true});
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{cwd:main,windowsHide:true}).toString().trim();
const server=await createNativeIntegratedServer({checkpoint});
const {chromium}=await import(pathToFileURL(path.join(main,'qa/node_modules/playwright/index.mjs')).href),browser=await chromium.launch({channel:'msedge',headless:true});
const report={checkpoint,scope:'Actual pointer/touch long-press input on an ordinary saved deck; real stats and layout. No simulation/stat/actor hooks used.',cases:[]};
try{
 for(const [width,height,touch] of [[390,700,true],[768,1024,true],[1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:width<500}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('poke-arena:sound','false');localStorage.setItem('poke-arena:deck',JSON.stringify(['fireball','earthquake','blizzard','lightning','pikachu','charizard','snorlax','zubat']));});
  await page.goto(server.url);await page.waitForFunction(()=>!document.getElementById('start-btn').disabled);await page.locator('#start-btn').click();
  const rects=()=>page.evaluate(()=>Object.fromEntries(['arena','hand','energy-bar'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return[id,{x:b.x,y:b.y,width:b.width,height:b.height}];})));
  const before=await rects(),card=page.locator('#hand [data-card="0"]'),box=await card.boundingBox();assert.ok(await card.innerText().then(t=>t.includes('Bomba ígnea')),'saved deck must put Fireball in the first hand slot');
  const point={x:box.x+box.width/2,y:box.y+box.height/2},cdp=touch?await context.newCDPSession(page):null;
  const down=async p=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y}]}):(await page.mouse.move(p.x,p.y),page.mouse.down());
  const up=async()=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.mouse.up();
  const move=async p=>touch?cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:p.x,y:p.y}]}):page.mouse.move(p.x,p.y);
  await down(point);await page.waitForTimeout(350);const tooltip=page.locator('.quick-stats:not([hidden])');await tooltip.waitFor({state:'visible'});
  const rows=await tooltip.locator('dl>div').evaluateAll(nodes=>nodes.map(el=>({label:el.querySelector('dt').textContent,value:el.querySelector('dd').textContent})));
  assert.deepEqual(rows,[{label:'Daño a tropas',value:'688'},{label:'Daño a torres',value:'159'},{label:'Radio',value:'2,5 casillas'}]);
  assert.deepEqual(await rects(),before,'showing statistics must not move arena, hand or elixir');
  await page.screenshot({path:path.join(out,`hold-${width}x${height}.png`)});
  const tooltipBox=await tooltip.boundingBox();assert.ok(tooltipBox.y+tooltipBox.height<=box.y,'tooltip sits above the card');
  await up();await page.waitForFunction(()=>document.querySelector('.quick-stats').hidden);
  assert.equal(await page.evaluate(()=>__nativeIntegratedApp.renderer.selection),null,'inspection release must not select/deploy');
  assert.deepEqual(await rects(),before,'release must preserve layout');
  await down(point);await page.waitForTimeout(350);await tooltip.waitFor({state:'visible'});
  const arena=page.locator('#arena'),a=await arena.boundingBox(),boardPoint={x:a.x+a.width*.35,y:a.y+a.height*.75};await move(boardPoint);
  await page.waitForFunction(()=>document.querySelector('.quick-stats').hidden);await page.waitForTimeout(350);
  assert.equal(await tooltip.count(),0,'statistics stay hidden while aiming on the board');
  await up();
  assert.deepEqual(await rects(),before,'drag/deployment must preserve layout');
  assert.deepEqual(errors,[]);report.cases.push({viewport:{width,height},input:touch?'native Chromium touch events':'mouse',rows,before,tooltipBox,after:await rects(),hiddenOnRelease:true,hiddenOnBoard:true,errors});
  await context.close();console.log(JSON.stringify({width,height,input:touch?'touch':'mouse',rows:rows.length}));
 }
 report.sourceHashes=server.sourceHashes;report.runnerSha256=createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex');
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();await server.close();}
