import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), baseOutput = path.join(root, 'docs/visual-followup/loader'), output = process.argv.includes('--proposal') ? path.join(baseOutput, 'proposal') : baseOutput;
await mkdir(path.join(output, 'frames'), { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), frozen = new Map(), sources = {};
for (const file of (await readdir(dist)).filter(file => /\.(js|css|html|svg)$/.test(file))) { const bytes = await readFile(path.join(dist, file)); frozen.set('/' + file, bytes); sources['dist/' + file] = hash(bytes); }
const shapes = (await import('../dist/loader-art.js')).LOADER_BALL_SHAPES;
const liveBall = await readFile(path.join(baseOutput, 'inputs/public/assets/ui/pokeball-v2.webp'));
const report = { generatedAt: new Date().toISOString(), localHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(), sources,
  scope: 'Public live page and frozen local app. Initial/lab loading is naturally delayed by one asset. Search/reconnection DOM states are exposed without matchmaking, sockets or API writes. No CSS/app/product changes.', states: [], screenshots: [], errors: [], apiRequests: [] };
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = http.createServer(async (request, response) => { try {
  const local = new URL(request.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(request.url, 'http://localhost').pathname, file = path.resolve(dist, '.' + local);
  if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
  let bytes = frozen.get(local); if (!bytes) { bytes = await readFile(file); frozen.set(local, bytes); sources['dist' + local] = hash(bytes); }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes);
} catch { response.writeHead(404).end(); } });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(pathToFileURL(path.resolve(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs')).href);
let browser;
const rects = (page, selectors) => page.evaluate(selectors => Object.fromEntries(selectors.map(selector => { const node = document.querySelector(selector); if (!node) return [selector, null]; const b = node.getBoundingClientRect(); return [selector, { x: b.x, y: b.y, width: b.width, height: b.height }]; })), selectors);
const delta = (before, after) => Object.entries(before).flatMap(([selector, box]) => box && after[selector] ? Object.keys(box).filter(key => Math.abs(box[key] - after[selector][key]) > .1).map(key => ({ selector, key, before: box[key], after: after[selector][key] })) : [{ selector, missing: true }]);
async function shot(page, file) { const bytes = await page.screenshot(); await writeFile(path.join(output, file), bytes); report.screenshots.push({ file, bytes: bytes.length, sha256: hash(bytes) }); }
async function describe(page, selector) { return page.locator(selector).first().evaluate(node => { const b = node.getBoundingClientRect(), s = getComputedStyle(node), base = node.querySelector('.loading-base,.lab-load-base'); return { tag: node.tagName, width: b.width, height: b.height, opacity: s.opacity, filter: s.filter, animation: s.animationName, duration: s.animationDuration,
  base: base ? { opacity: getComputedStyle(base).opacity, filter: getComputedStyle(base).filter } : null, markup: node.outerHTML.slice(0, 650) }; }); }
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true }); report.browser = await browser.version();
  const origins = [['public', 'https://poke-arena-erick.eriqrb.chatgpt.site'], ['local', `http://127.0.0.1:${server.address().port}`]].filter(([kind]) => !process.argv.includes('--local-only') || kind === 'local');
  for (const [kind, origin] of origins) for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : width === 768 ? 1024 : 1000 } });
    await context.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
    await context.route('**/api/**', route => { report.apiRequests.push(route.request().url()); return route.abort(); });
    if (context.routeWebSocket) await context.routeWebSocket('**', socket => socket.close());
    for (const lab of [false, true]) {
      const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => report.errors.push({ kind, width, message: error.message }));
      let release, held = false; const gate = new Promise(resolve => release = resolve);
      const routeHandler = async route => { if (!held && /\/assets\/pokemon\/.*\.png(?:\?|$)/.test(route.request().url())) { held = true; await gate; } await route.continue(); };
      await page.route('**/assets/pokemon/**/*.png', routeHandler);
      try {
        const firstAsset = page.waitForRequest(request => /\/assets\/pokemon\/.*\.png(?:\?|$)/.test(request.url()), { timeout: 15000 });
        const response = await page.goto(origin + (lab ? '/testing.html' : '/'), { waitUntil: 'commit' }); await firstAsset;
        if (!lab && width === 390) report[kind + 'Document'] = { url: response.url(), sha256: hash(await response.body()) };
        await page.waitForFunction(lab => lab ? document.getElementById('lab-loading') && !document.getElementById('lab-loading').hidden : Number(document.getElementById('menu-load-progress')?.getAttribute('aria-valuenow') || 0) > 40, lab);
        await page.waitForTimeout(450); await page.evaluate(() => document.fonts.ready);
        const selectors = lab ? ['.lab-toolbar', '.lab-workspace', '#choose-card', '#add-column'] : ['#ready-overlay', '#menu-deck-preview', '#trainer-name', '#start-btn'];
        const before = await rects(page, selectors), loaderSelector = lab ? '#lab-loading .lab-load-progress' : '#menu-load-progress .loading-ball';
        const state = { kind, width, state: lab ? 'lab-loading' : 'initial-loading', indicator: await describe(page, loaderSelector), before };
        if (!lab) state.progress = await page.locator('#menu-load-progress').evaluate(node => ({ role: node.getAttribute('role'), label: node.getAttribute('aria-label'), now: node.getAttribute('aria-valuenow'), fill: document.getElementById('menu-load-fill').outerHTML }));
        if (width === 390) await shot(page, `frames/${kind}-${lab ? 'lab-loading' : 'initial-loading'}.png`);
        release(); await page.waitForFunction(lab => lab ? document.getElementById('lab-loading').hidden : !document.getElementById('start-btn').disabled, lab);
        state.after = await rects(page, selectors); state.layoutChanges = delta(before, state.after); report.states.push(state);
        await page.unroute('**/assets/pokemon/**/*.png', routeHandler);
        if (lab) {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          state.reducedAnimation = await page.locator('.lab-load-progress').first().evaluate(node => getComputedStyle(node).animationName);
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          const columnSelectors = ['.lab-column', '.column-arena', '.column-actions', '.column-metrics'], columnBefore = await rects(page, columnSelectors);
          await page.locator('.column-loading').first().evaluate(node => { node.hidden = false; });
          const column = { kind, width, state: 'lab-column-ui-only', indicator: await describe(page, '.column-loading .lab-pokeball'), layoutChanges: delta(columnBefore, await rects(page, columnSelectors)) };
          if (width === 390) await shot(page, `frames/${kind}-lab-column.png`);
          report.states.push(column);
        } else {
          const menuBefore = await rects(page, selectors);
          await page.evaluate(() => { document.getElementById('search-panel').hidden = false; });
          const search = { kind, width, state: 'search-ui-only', indicator: await describe(page, '#search-panel .loading-ball'), layoutChanges: delta(menuBefore, await rects(page, selectors)), network: 'No online action invoked.' };
          if (width === 390) await shot(page, `frames/${kind}-search.png`);
          await page.emulateMedia({ reducedMotion: 'reduce' }); search.reduced = await describe(page, '#search-panel .loading-ball'); await page.emulateMedia({ reducedMotion: 'no-preference' }); report.states.push(search);
          await page.evaluate(() => { document.getElementById('search-panel').hidden = true; });
          await page.locator('#start-btn').click();
          const battleSelectors = ['#arena', '#hand', '#energy-bar', '#match-pause', '#match-leave'], battleBefore = await rects(page, battleSelectors);
          await page.evaluate(() => { document.getElementById('connection-loading').hidden = false; });
          const reconnect = { kind, width, state: 'reconnection-ui-only', indicator: await describe(page, '#connection-loading .loading-ball'), layoutChanges: delta(battleBefore, await rects(page, battleSelectors)), network: 'No socket reconnect or online match invoked.' };
          if (width === 390) await shot(page, `frames/${kind}-reconnection.png`);
          await page.emulateMedia({ reducedMotion: 'reduce' }); reconnect.reduced = await describe(page, '#connection-loading .loading-ball'); await page.emulateMedia({ reducedMotion: 'no-preference' }); report.states.push(reconnect);
        }
      } finally { release(); await page.unrouteAll({ behavior: 'wait' }); await page.close(); }
    }
    await context.close(); console.log(JSON.stringify({ kind, width, states: report.states.filter(state => state.kind === kind && state.width === width).length }));
  }
  const page = await browser.newPage();
  report.alpha = await page.evaluate(async ({ base64, shapes }) => {
    const load = async url => { const image = new Image(); image.src = url; await image.decode(); return image; };
    const raster = await load('data:image/webp;base64,' + base64), vector = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${shapes}</svg>`));
    const probe = image => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d', { willReadFrequently: true }); c.drawImage(image, 0, 0, 64, 64); const pixels = c.getImageData(0, 0, 64, 64).data; let redOpaque = 0, redPartial = 0;
      for (let n = 0; n < pixels.length; n += 4) if (pixels[n] > pixels[n + 1] * 1.4 && pixels[n] > pixels[n + 2] * 1.3 && pixels[n] > 80) { if (pixels[n + 3] === 255) redOpaque++; else if (pixels[n + 3]) redPartial++; }
      return { redOpaque, redPartial, samples: [[32, 14], [20, 18], [32, 20]].map(([x, y]) => ({ x, y, rgba: [...pixels.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)] })) }; };
    const sheet = document.createElement('canvas'); sheet.width = 768; sheet.height = 260; const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false;
    for (let bg = 0; bg < 3; bg++) { c.fillStyle = ['#f8f0d0', '#243d30', '#c0daf0'][bg]; c.fillRect(bg * 256, 0, 256, 260); for (const [at, image] of [raster, vector].entries()) { c.drawImage(image, bg * 256 + at * 128 + 16, 20, 96, 96); c.drawImage(image, bg * 256 + at * 128 + 44, 156, 42, 42); } c.fillStyle = bg === 1 ? '#fff8de' : '#263b30'; c.font = '13px sans-serif'; c.fillText('LIVE raster / SVG actual', bg * 256 + 8, 241); }
    return { raster: probe(raster), vector: probe(vector), comparison: sheet.toDataURL('image/png').split(',')[1] };
  }, { base64: liveBall.toString('base64'), shapes });
  const comparison = Buffer.from(report.alpha.comparison, 'base64'); delete report.alpha.comparison; await writeFile(path.join(output, 'alpha-comparison.png'), comparison); report.screenshots.push({ file: 'alpha-comparison.png', bytes: comparison.length, sha256: hash(comparison) });
  assert.equal(report.alpha.vector.redPartial, 0); assert.ok(report.alpha.vector.redOpaque > 500); assert.equal(report.apiRequests.length, 0);
} catch (error) { report.error = error.stack; throw error; }
finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); await writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); }
