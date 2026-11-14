import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stable } from '../tests/browser/helpers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}/qa/quick-stats`;
await mkdir(output, { recursive: true });
let playwright;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
assert.ok(playwright, 'Playwright is required; use POKE_ARENA_PLAYWRIGHT_MODULE if it is installed outside this checkout.');
const browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true });
let url = process.env.POKE_ARENA_TEST_URL, server;
if (!url) {
  const dist = path.resolve(root, 'dist'), mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
  server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const filename = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!filename.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
      const bytes = await readFile(filename);
      response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { generatedAt: new Date().toISOString(), browser: await browser.version(), viewports: [],
  integration: { mode: 'real-working-tree', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
    runtime: 'Versionable files from the current working tree; source hashes identify the exact tested content, including uncommitted changes.',
    instrumentation: 'The app.js response only gets appended __qa accessors. No imports, bindings, handlers, HTML or CSS are added or replaced.' } };
report.sources = Object.fromEntries(await Promise.all(['dist/app.js', 'dist/index.html', 'dist/quick-stats.js', 'dist/quick-stats.css', 'tests/quick-stats.test.mjs', 'scripts/qa-quick-stats.mjs'].map(async filename => [filename, sha256(await readFile(path.join(root, filename)))])));
const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 980 }];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 768 });
    const page = await context.newPage(), errors = [], served = {};
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
    await page.route('**/app.js?*', async route => {
      const response = await route.fetch();
      const source = await response.text();
      assert.match(source, /import\s*\{[^}]*\bbindQuickStats\b[^}]*\}\s*from\s*['"]\.\/quick-stats\.js(?:\?[^'"]*)?['"]/, 'app.js must already import the real quick-stats module.');
      served.appSha256 = sha256(source);
      assert.equal(served.appSha256, report.sources['dist/app.js'], 'The served app.js matches the working tree before __qa instrumentation.');
      const instrumented = source + '\nglobalThis.__qa={get game(){return game},get selected(){return selected},renderer,updateUi,choose,cancelSelection,togglePause,syncHand,quickStats};';
      await route.fulfill({ response, body: instrumented });
    });
    try {
      const cssResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/quick-stats.css'));
      const documentResponse = await page.goto(url);
      served.indexSha256 = sha256(await documentResponse.body());
      assert.equal(served.indexSha256, report.sources['dist/index.html'], 'The actual HTML is served without injection.');
      const stylesheetResponse = await cssResponse;
      assert.equal(stylesheetResponse.status(), 200, 'The real CSS loads successfully.');
      served.cssSha256 = sha256(await stylesheetResponse.body());
      assert.equal(served.cssSha256, report.sources['dist/quick-stats.css']);
      await page.waitForFunction(() => globalThis.__qa && !document.getElementById('start-btn').disabled);
      served.cssApplied = await page.evaluate(() => {
        const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(node => new URL(node.href).pathname.endsWith('/quick-stats.css'));
        return !!link?.sheet && [...link.sheet.cssRules].some(rule => rule.selectorText === '.quick-stats' && rule.style.position === 'fixed' && rule.style.pointerEvents === 'none');
      });
      assert.equal(served.cssApplied, true, 'The stylesheet linked by index.html supplies the fixed, nonintercepting tooltip styles.');
      await page.locator('#start-btn').click();
      await page.evaluate(() => { __qa.game.aiEnabled = false; __qa.game.hands[0] = ['fireball', 'spikes', 'sneaselAmbush', 'wobbuffet']; __qa.game.energy[0] = 10; __qa.updateUi(); });
      const card = page.locator('#hand [data-card="0"]'), tip = page.locator('.quick-stats');
      const center = async () => { const r = await card.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
      const down = async () => { const p = await center(); await page.mouse.move(p.x, p.y); await page.mouse.down(); return p; };
      const hold = async () => { await down(); await tip.waitFor({ state: 'visible' }); };
      const hidden = async () => assert.equal(await tip.isVisible(), false);
      const snapshot = () => page.evaluate(() => Object.fromEntries([
        ...['arena', 'hand', 'energy-bar', 'next-card'].map(id => [id, document.getElementById(id)]),
        ...[...document.querySelectorAll('#hand [data-card]')].map(card => [`card-${card.dataset.card}`, card]),
      ].map(([name, element]) => { const r = element.getBoundingClientRect(); return [name, { x: r.x, y: r.y, width: r.width, height: r.height }]; })));
      const checks = {};
      let touchInput = null;

      await down(); await page.waitForTimeout(80); await hidden(); await page.mouse.up();
      assert.equal(await page.evaluate(() => __qa.selected), 0);
      checks.shortPressSelects = true;
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      const before = await snapshot();
      await hold();
      assert.equal(await tip.locator('dl>div').count(), 3);
      assert.match(await tip.innerText(), /Daño a tropas\s+688[\s\S]+Daño a torres\s+159/);
      const tipRect = await tip.boundingBox(), cardRect = await card.boundingBox();
      assert.ok(tipRect.y + tipRect.height <= cardRect.y, 'The tooltip is above the card.');
      assert.ok(tipRect.x >= 0 && tipRect.x + tipRect.width <= viewport.width, 'The tooltip fits inside the viewport.');
      stable(before, await snapshot(), 'show quick stats');
      const accessibility = await card.getAttribute('aria-describedby');
      assert.ok(accessibility?.startsWith('quick-stats-'));
      await page.screenshot({ path: `${output}/hold-${viewport.width}.png` });
      await page.mouse.up(); await hidden();
      assert.equal(await page.evaluate(() => __qa.selected), -1, 'Finishing a long press does not select the card.');
      assert.equal(await card.getAttribute('aria-describedby'), null);
      stable(before, await snapshot(), 'hide quick stats');
      checks.holdOnlyAndNoLayoutShift = true;
      checks.longPressClickIgnored = true;

      await hold();
      const arena = await page.locator('#arena').boundingBox();
      const destination = { x: arena.x + arena.width * .27, y: arena.y + arena.height * .7 };
      await page.mouse.move(destination.x, destination.y, { steps: 8 }); await hidden();
      const costBefore = await page.evaluate(() => __qa.game.stats[0].energy);
      await page.mouse.up(); await hidden();
      await page.waitForFunction(previous => __qa.game.stats[0].energy > previous, costBefore);
      assert.equal(await page.evaluate(() => __qa.selected), -1);
      checks.longPressDragDeploys = true;

      await page.evaluate(() => { __qa.game.hands[0][0] = 'fireball'; __qa.game.energy[0] = 10; __qa.syncHand(); });
      await hold(); await page.evaluate(() => __qa.choose(1)); await tip.waitFor({ state: 'hidden' }); await page.mouse.up();
      assert.equal(await page.evaluate(() => __qa.selected), 1, 'Ending the dismissed hold preserves the new selection.');
      checks.selectionChangeHides = true;
      await page.keyboard.press('Escape');
      await hold(); await page.evaluate(() => __qa.togglePause()); await tip.waitFor({ state: 'hidden' }); await page.mouse.up();
      await page.evaluate(() => __qa.togglePause());
      checks.pauseHides = true;
      await hold(); await page.evaluate(() => dispatchEvent(new Event('blur'))); await hidden(); await page.mouse.up();
      checks.blurHides = true;
      await hold();
      await card.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' }); await hidden(); await page.mouse.up();
      checks.cancelHides = true;

      await page.keyboard.press('Escape'); await card.focus();
      await page.keyboard.down('Space'); await tip.waitFor({ state: 'visible' }); await page.keyboard.up('Space'); await hidden();
      assert.equal(await page.evaluate(() => __qa.selected), -1);
      checks.keyboardSpaceHold = true;
      await page.keyboard.press('Space'); assert.equal(await page.evaluate(() => __qa.selected), 0);
      checks.keyboardShortSpaceSelects = true;
      await page.keyboard.press('Escape');
      await page.keyboard.down('Enter'); await tip.waitFor({ state: 'visible' }); await page.keyboard.up('Enter'); await hidden();
      assert.equal(await page.evaluate(() => __qa.selected), 0);
      checks.keyboardEnterHold = true;

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await hold(); assert.equal(await tip.evaluate(node => getComputedStyle(node).animationName), 'none'); await page.mouse.up();
      checks.reducedMotion = true;
      await page.keyboard.press('Escape');
      if (viewport.width <= 768) {
        await page.evaluate(() => {
          __qa.touchEvents = [];
          for (const type of ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup']) {
            document.addEventListener(type, event => __qa.touchEvents.push({ type: event.type, constructor: event.constructor.name, trusted: event.isTrusted, pointerType: event.pointerType || null, touches: event.touches?.length ?? null }), { capture: true, passive: true });
          }
        });
        const cdp = await context.newCDPSession(page);
        const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 7, radiusX: 4, radiusY: 4, force: 1 }] : [] });
        let point = await center();
        await touch('touchStart', point); await tip.waitFor({ state: 'visible' }); await touch('touchEnd'); await hidden();
        assert.equal(await page.evaluate(() => __qa.selected), -1, 'A physical touch hold does not turn into a selection.');
        checks.touchHoldNoAccidentalClick = true;
        point = await center();
        await touch('touchStart', point); await tip.waitFor({ state: 'visible' });
        for (let step = 1; step <= 8; step++) {
          await touch('touchMove', { x: point.x + (destination.x - point.x) * step / 8, y: point.y + (destination.y - point.y) * step / 8 });
          await page.waitForTimeout(20);
        }
        await hidden();
        const previousEnergy = await page.evaluate(() => __qa.game.stats[0].energy);
        await touch('touchEnd');
        await page.waitForFunction(previous => __qa.game.stats[0].energy > previous, previousEnergy);
        checks.touchHoldDragDeploys = true;
        await page.evaluate(() => { __qa.game.hands[0][0] = 'fireball'; __qa.game.energy[0] = 10; __qa.syncHand(); });
        point = await center();
        await touch('touchStart', point); await touch('touchMove', destination); await page.waitForTimeout(300); await hidden();
        await touch('touchMove', point); await page.waitForTimeout(300); await hidden(); await touch('touchEnd');
        checks.touchExitAndReentryStaysHidden = true;
        touchInput = await page.evaluate(() => __qa.touchEvents);
        const nativeTouches = touchInput.filter(event => event.constructor === 'TouchEvent');
        for (const type of ['touchstart', 'touchmove', 'touchend']) assert.ok(nativeTouches.some(event => event.type === type && event.trusted), `${type} is a browser-generated trusted TouchEvent.`);
        assert.ok(touchInput.some(event => event.pointerType === 'touch' && event.trusted), 'The app also receives genuine touch PointerEvents.');
        assert.ok(touchInput.every(event => event.trusted), 'No dispatchEvent-created input is used for the touch gestures.');
        await cdp.detach();
      }
      await page.keyboard.press('Escape');
      await hold(); await page.evaluate(() => __qa.quickStats());
      assert.equal(await tip.count(), 0, 'Cleanup removes the floating node.'); await page.mouse.up();
      checks.cleanup = true;
      assert.deepEqual(errors, []);
      report.viewports.push({ viewport, served, checks, touchInput, before, after: await snapshot(), tooltip: tipRect });
      console.log(`${viewport.width}: ${Object.keys(checks).length} checks passed`);
    } catch (error) {
      report.viewports.push({ viewport, errors, failure: error.stack });
      throw error;
    } finally { await context.close(); }
  }
} catch (error) {
  report.error = error.stack; throw error;
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
