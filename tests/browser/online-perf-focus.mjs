import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const {chromium}=await import(process.env.POKE_ARENA_PLAYWRIGHT_MODULE?pathToFileURL(process.env.POKE_ARENA_PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.POKE_ARENA_TEST_URL||'http://127.0.0.1:4173/')+'?perf=1');await page.waitForFunction(()=>!!window.pokeArenaPerf&&!document.querySelector('#start-btn').disabled);
 await page.locator('#settings-btn').click();await page.locator('.perf-toggle').click();
 const focus=()=>page.evaluate(()=>document.activeElement.className);
 assert.equal(await focus(),'perf-close');assert.equal(await page.locator('#settings-dialog .modal-heading').evaluate(el=>el.inert),true);
 await page.keyboard.press('Shift+Tab');assert.equal(await focus(),'perf-start');await page.keyboard.press('Tab');assert.equal(await focus(),'perf-close');
 await page.locator('.perf-start').click();assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report().active),true);
 await page.locator('.perf-close').focus();await page.keyboard.press('Tab');assert.equal(await focus(),'perf-stop');await page.keyboard.press('Tab');assert.equal(await focus(),'perf-close');await page.keyboard.press('Shift+Tab');assert.equal(await focus(),'perf-stop');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.perf-panel').isHidden(),true);assert.equal(await focus(),'perf-toggle');assert.equal(await page.locator('#settings-dialog .modal-heading').evaluate(el=>el.inert),false);assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report().active),true);
 await page.locator('#settings-dialog [data-close]').click();assert.equal(await page.locator('#settings-dialog').isHidden(),true);assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report().active),true);
 await page.locator('#settings-btn').click();await page.locator('.perf-toggle').click();await page.locator('.perf-stop').click();assert.equal(await page.evaluate(()=>window.pokeArenaPerf.report().active),false);
 await page.locator('.perf-close').focus();await page.keyboard.press('Shift+Tab');assert.equal(await focus(),'perf-output');await page.keyboard.press('Tab');assert.equal(await focus(),'perf-close');await page.keyboard.press('Tab');assert.equal(await focus(),'perf-start');await page.keyboard.press('Tab');assert.equal(await focus(),'perf-save');await page.keyboard.press('Tab');assert.equal(await focus(),'perf-output');
 await page.keyboard.press('Escape');assert.equal(await focus(),'perf-toggle');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({preCaptureWrap:true,activeWrap:true,reportWrap:true,escapeRestoresFocus:true,inertRestored:true,captureContinues:true,errors}));
 await page.close();
}finally{await browser.close()}
