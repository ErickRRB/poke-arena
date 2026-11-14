import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createNativeIntegratedServer } from './qa-native-integrated-server.mjs';

const root = path.resolve(import.meta.dirname, '..'), requested = process.argv.find(value => value.startsWith('--checkpoint='))?.slice(13), capture = process.argv.includes('--capture');
assert.ok(requested, 'Pass an immutable --checkpoint=<SHA>.');
const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, maxBuffer: 16_000_000 }), checkpoint = git('rev-parse', `${requested}^{commit}`).toString('utf8').trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let targeting = git('show', `${checkpoint}:dist/targeting-art.js`).toString('utf8');
for (const [name, kind, payload] of [['areaGuide', 'area', 'x,y,radius,team,pending,progress'], ['cellGuide', 'cell', 'x,y,size,valid'], ['travelGuide', 'travel', 'x,y,radius,length,team,valid']]) {
  const expression = new RegExp(`(export function ${name}[^\\r\\n]*\\{\\r?\\n)`); assert.ok(expression.test(targeting), `Missing instrumentable ${name} header.`);
  targeting = targeting.replace(expression, `$1  globalThis.__spellIndicatorProbe?.record('${kind}',{${payload}});\n`);
}
const server = await createNativeIntegratedServer({ checkpoint, qaRoutes: { '/targeting-art.js': Buffer.from(targeting), '/__qa/spell-indicators.mjs': path.join(root, 'scripts/qa-spell-indicator-harness.mjs') } });
const folder = path.join(root, capture ? 'docs/visual-followup/spell-indicators' : 'qa/spell-indicators', checkpoint.slice(0, 7)); await mkdir(path.join(folder, 'frames'), { recursive: true });
const report = { generatedAt: new Date().toISOString(), checkpoint, kind: capture ? 'capture' : 'functional-only',
  scope: 'All canonical spells; tactical aiming graphics separated from projectiles, impact FX, deployment FX and active fields. Product modules/assets come exclusively from the immutable commit.',
  instrumentation: 'Only the served targeting-art.js response adds calls counters. The recorded product hash remains its original Git bytes; instrumented bytes have a separate QA hash. No game, camera, material or input logic is replaced.',
  model: { gameHz: 30, publicSnapshotsHz: 15, rendererSamplingHz: 60, viewports: capture ? [[390, 844], [768, 1024], [1440, 1000]] : [[390, 844]], perspectives: [0, 1] },
  cases: [], uiCases: [], screenshots: [], findings: [], errors: [] };
const { chromium } = await import(pathToFileURL(path.resolve(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs')).href); let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true }); report.browser = await browser.version();
  for (const [width, height] of report.model.viewports) {
    const page = await browser.newPage({ viewport: { width, height } }); page.setDefaultTimeout(15000); page.on('pageerror', error => report.errors.push({ width, message: error.message }));
    await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
    await page.goto(server.url); await page.waitForFunction(() => globalThis.__nativeIntegratedApp && !document.getElementById('start-btn').disabled); await page.locator('#start-btn').click();
    await page.evaluate(async () => { await import('/__qa/native-integrated-harness.mjs'); await import('/__qa/spell-indicators.mjs'); await __spellIndicators.ready; });
    report.spells ??= await page.evaluate(() => __spellIndicators.spells);
    for (const key of report.spells) for (const side of [0, 1]) {
      const result = await page.evaluate(({ key, side, capture }) => __spellIndicators.run(key, side, capture), { key, side, capture: capture && width === 390 }); result.viewport = { width, height };
      for (const [check, passed] of Object.entries(result.checks)) if (!passed) report.findings.push({ key, side, width, check }); report.cases.push(result);
      if (capture && width === 390 && (side === 0 || key === 'log')) for (const phase of result.phases.filter(phase => side === 0 || phase.name === 'aim')) {
        await page.evaluate(name => __spellIndicators.show(name), phase.name); const file = `frames/${key}-side${side}-${phase.name}.png`, bytes = await page.screenshot(); await writeFile(path.join(folder, file), bytes);
        report.screenshots.push({ file, sha256: hash(bytes), bytes: bytes.length, key, side, phase: phase.name });
      }
      console.log(JSON.stringify({ width, key, side, failed: Object.entries(result.checks).filter(([, value]) => !value).map(([name]) => name), postFieldGuides: result.postImpactGuides.filter(guide => guide.scope === 'field').length }));
    }
    if (width === 390 && capture) {
      report.materialFlight = await page.evaluate(() => __spellIndicators.materialFlight());
      const goldenFile = 'docs/visual-followup/capsule-v2/verification.json', goldenBytes = await readFile(path.join(root, goldenFile)), goldenReport = JSON.parse(goldenBytes), golden = goldenReport.cases.find(row => row.mode === 'snapshots15' && row.side === 0 && !row.reduced);
      let maxPositionError = 0, maxAgeError = 0, changedCallCounts = 0;
      for (const row of report.materialFlight.trace) { const expected = golden.rows[row.index]; if (row.calls.length !== expected.calls.length) changedCallCounts++;
        for (const [index, call] of row.calls.entries()) { const before = expected.calls[index]; if (!before) continue; maxPositionError = Math.max(maxPositionError, Math.abs(call.x - before.x), Math.abs(call.y - before.y)); maxAgeError = Math.max(maxAgeError, Math.abs(call.visualElapsed - before.visualElapsed)); } }
      report.materialFlight.motionComparison = { referenceFile: goldenFile, referenceSha256: hash(goldenBytes), referenceHead: goldenReport.base.gitHead, scope: 'World positions and visual age on the same native trajectory, snapshots15/render60 and pause1.0–1.4s. Camera and appearance are intentionally not compared.', maxPositionError, maxAgeError, changedCallCounts };
      report.materialFlight.checks.worldTrajectoryAndAgeUnchanged = maxPositionError < 1e-8 && maxAgeError < 1e-8 && changedCallCounts === 0;
      report.materialFlight.checks.svgMatchesImmutableAsset = report.materialFlight.asset.sha256 === server.sourceHashes['dist/' + report.materialFlight.asset.path].sha256;
      for (const [check, passed] of Object.entries(report.materialFlight.checks)) if (!passed) report.findings.push({ scope: 'material-flight', check });
      for (const phase of report.materialFlight.phases) { await page.evaluate(name => __spellIndicators.show(name), phase.name); const file = `frames/${phase.name}.png`, bytes = await page.screenshot(); await writeFile(path.join(folder, file), bytes); report.screenshots.push({ file, sha256: hash(bytes), bytes: bytes.length, key: 'sneaselAmbush-v3', phase: phase.name }); }
    }
    await page.close();
  }
  // Use a separate real app instance for input; do not import the simulation
  // fixture, which intentionally suspends the original app loop.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); page.setDefaultTimeout(15000);
  await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
  await page.goto(server.url); await page.waitForFunction(() => globalThis.__nativeIntegratedApp && !document.getElementById('start-btn').disabled); await page.locator('#start-btn').click();
  async function reset(key) {
    await page.keyboard.press('Escape'); await page.evaluate(key => { const { game, renderer } = __nativeIntegratedApp; game.state = 'playing'; game.aiEnabled = false; game.units = []; game.spells = []; game.fields = []; game.projectiles = []; game.attacks = []; game.hands[0][0] = key; game.energy[0] = 10; game.stats[0].energy = 0; for (const tower of game.towers) { tower.active = false; tower.cooldown = 1000; } renderer.resetVisuals(); }, key);
    await page.waitForFunction(key => document.querySelector('#hand [data-card="0"]')?.textContent.includes(__nativeIntegratedApp.CARDS[key].name), key);
  }
  const state = () => page.evaluate(() => ({ selection: __nativeIntegratedApp.renderer.selection, pointer: __nativeIntegratedApp.renderer.pointer, spells: __nativeIntegratedApp.game.spells.length, spent: __nativeIntegratedApp.game.stats[0].energy }));
  for (const key of report.spells) {
    await reset(key); const card = page.locator('#hand [data-card="0"]'); await card.click();
    const chosen = await state(), point = await page.evaluate(() => { const r = __nativeIntegratedApp.renderer, b = r.canvas.getBoundingClientRect(), p = r.projection; return { x: b.x + p.x + 288 * p.scale, y: b.y + p.y + 508 * p.scale }; });
    await page.mouse.move(point.x, point.y); const aimed = await state(); await page.mouse.move(2, 2); const exited = await state();
    await page.mouse.move(point.x, point.y); await page.keyboard.press('Escape'); const cancelled = await state();
    await card.click(); await page.mouse.move(point.x, point.y); await page.mouse.click(point.x, point.y); const released = await state();
    const checks = { selectedWithoutAim: chosen.selection === key && !chosen.pointer, hoverHasAim: Boolean(aimed.pointer), exitClearsAim: !exited.pointer,
      escapeClears: !cancelled.pointer && !cancelled.selection, releaseClears: !released.pointer && !released.selection, actualCastCreated: released.spent > 0 };
    report.uiCases.push({ key, chosen, aimed, exited, cancelled, released, checks }); for (const [check, passed] of Object.entries(checks)) if (!passed) report.findings.push({ key, scope: 'real-app-input', check });
  }
  const cdp = await page.context().newCDPSession(page), touch = (type, point) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ id: 1, x: point.x, y: point.y, radiusX: 4, radiusY: 4, force: 1 }] : [] });
  await page.evaluate(() => { globalThis.__spellPointerTrace = []; document.addEventListener('pointermove', event => { __spellPointerTrace.push({ x: event.clientX, y: event.clientY, pointerAfterAppHandler: __nativeIntegratedApp.renderer.pointer }); }); });
  report.touchCases = [];
  for (const key of report.spells) {
    await reset(key); let b = await page.locator('#hand [data-card="0"]').boundingBox();
    const point = await page.evaluate(() => { const r = __nativeIntegratedApp.renderer, b = r.canvas.getBoundingClientRect(), p = r.projection; return { x: b.x + p.x + 288 * p.scale, y: b.y + p.y + 508 * p.scale }; });
    const dragTo = async destination => { await touch('touchStart', { x: b.x + b.width / 2, y: b.y + b.height / 2 }); await touch('touchMove', destination); await page.waitForTimeout(40); };
    await dragTo(point); const aimed = await state(); await touch('touchCancel'); const cancelled = await state();
    await reset(key); b = await page.locator('#hand [data-card="0"]').boundingBox(); await dragTo(point); await touch('touchEnd'); const released = await state();
    await reset(key); b = await page.locator('#hand [data-card="0"]').boundingBox(); await dragTo(point); await page.evaluate(() => { __spellPointerTrace.length = 0; }); await touch('touchMove', { x: 2, y: 2 });
    await page.waitForFunction(() => __spellPointerTrace.some(event => event.x === 2 && event.y === 2));
    const outsideNativeEvent = await page.evaluate(() => __spellPointerTrace.find(event => event.x === 2 && event.y === 2)), outside = await state(); await touch('touchEnd'); const droppedOutside = await state();
    const checks = { realTouchAims: aimed.selection === key && Boolean(aimed.pointer), touchCancelClears: !cancelled.selection && !cancelled.pointer,
      touchReleaseCastsAndClears: released.spent > 0 && !released.selection && !released.pointer, dragOutsideClearsAim: !outside.pointer && !outsideNativeEvent.pointerAfterAppHandler,
      outsideReleaseCancels: !droppedOutside.selection && !droppedOutside.pointer && droppedOutside.spent === 0 };
    report.touchCases.push({ key, aimed, cancelled, released, outside, outsideNativeEvent, droppedOutside, checks }); for (const [check, passed] of Object.entries(checks)) if (!passed) report.findings.push({ key, scope: 'CDP-real-touch', check });
  }
  await page.close(); report.engineURLs = [...server.engineURLs]; assert.deepEqual(report.engineURLs, ['/engine.js?v=26']);
  report.missing = server.missing.filter(url => !url.startsWith('/favicon')); assert.deepEqual(report.errors, []); assert.deepEqual(report.missing, []);
} catch (error) { report.error = error.stack; throw error; }
finally { if (browser) await browser.close(); await server.close(); report.sourceHashes = server.sourceHashes; report.qaHashes = server.qaHashes;
  for (const file of ['qa-spell-indicators.mjs', 'qa-spell-indicator-harness.mjs']) report.qaHashes[file] = hash(await readFile(path.join(root, 'scripts', file)));
  await writeFile(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); }
