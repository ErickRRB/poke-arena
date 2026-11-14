import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createNativeIntegratedServer } from './qa-native-integrated-server.mjs';

const root = path.resolve(import.meta.dirname, '..'), checkpoints = process.argv.filter(value => value.startsWith('--checkpoint=')).map(value => value.slice(13));
assert.ok(checkpoints.length); const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const { chromium } = await import(pathToFileURL(path.resolve(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs')).href);
for (const checkpoint of checkpoints) {
  const server = await createNativeIntegratedServer({ checkpoint }), folder = path.join(root, 'docs/visual-followup/spell-exit-marker', server.checkpoint.slice(0, 7)); await mkdir(folder, { recursive: true });
  const report = { capturedAt: new Date().toISOString(), checkpoint: server.checkpoint, key: 'fireball', viewport: { width: 390, height: 844 },
    scope: 'One native mouse gesture: valid aim → outside playable arena but inside HTML canvas → outside canvas → Escape. The stale inside:false probe is separately labeled synthetic. No casts or physics edits.', stages: [], screenshots: [], errors: [] }; let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true }); const page = await browser.newPage({ viewport: report.viewport }); page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(error.message)); await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
    await page.goto(server.url); await page.waitForFunction(() => globalThis.__nativeIntegratedApp && !document.getElementById('start-btn').disabled); await page.locator('#start-btn').click();
    await page.evaluate(() => {
      const { game, renderer: r } = __nativeIntegratedApp; game.aiEnabled = false; game.hands[0][0] = 'fireball'; game.energy[0] = 10; for (const tower of game.towers) { tower.active = false; tower.cooldown = 1000; }
      let inside = false, path = [], trace; const original = r.drawPlacement.bind(r);
      r.drawPlacement = (...args) => { inside = true; trace = { strokes: [], texts: [], fills: 0, arcs: 0 }; try { return original(...args); } finally { inside = false; globalThis.__exitTrace = trace; } };
      const begin = r.ctx.beginPath.bind(r.ctx); r.ctx.beginPath = () => { if (inside) path = []; return begin(); };
      for (const method of ['moveTo', 'lineTo', 'arc']) { const fn = r.ctx[method].bind(r.ctx); r.ctx[method] = (...args) => { if (inside) { path.push({ method, args }); if (method === 'arc') trace.arcs++; } return fn(...args); }; }
      const stroke = r.ctx.stroke.bind(r.ctx); r.ctx.stroke = (...args) => { if (inside) trace.strokes.push({ path: structuredClone(path), color: r.ctx.strokeStyle }); return stroke(...args); };
      for (const method of ['fillText', 'strokeText', 'fillRect']) { const fn = r.ctx[method].bind(r.ctx); r.ctx[method] = (...args) => { if (inside) { if (method === 'fillRect') trace.fills++; else trace.texts.push({ method, args }); } return fn(...args); }; }
    });
    await page.waitForFunction(() => document.querySelector('#hand [data-card="0"]')?.textContent.includes(__nativeIntegratedApp.CARDS.fireball.name)); await page.locator('#hand [data-card="0"]').click();
    const worldToCss = (x, y) => page.evaluate(({ x, y }) => { const r = __nativeIntegratedApp.renderer, b = r.canvas.getBoundingClientRect(), p = r.projection; return { x: b.x + p.x + x * p.scale, y: b.y + p.y + y * p.scale }; }, { x, y });
    const frame = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function save(name) {
      await frame(); const stage = await page.evaluate(name => { const r = __nativeIntegratedApp.renderer, g = __nativeIntegratedApp.game, t = __exitTrace;
        const diagonals = t.strokes.filter(stroke => stroke.path.length === 2 && stroke.path[0].method === 'moveTo' && stroke.path[1].method === 'lineTo' && Math.abs(Math.abs(stroke.path[0].args[0] - stroke.path[1].args[0]) - 10) < .01 && Math.abs(Math.abs(stroke.path[0].args[1] - stroke.path[1].args[1]) - 10) < .01);
        return { name, pointer: r.pointer, selection: r.selection, trace: t, diagonalSegments: diagonals, cursor: getComputedStyle(r.canvas).cursor, spellCount: g.spells.length, fieldCount: g.fields.length, energySpent: g.stats[0].energy }; }, name);
      const file = `${name}.png`, bytes = await page.screenshot(); await writeFile(path.join(folder, file), bytes); report.screenshots.push({ file, bytes: bytes.length, sha256: hash(bytes) }); report.stages.push(stage); return stage;
    }
    const valid = await worldToCss(300, 520); await page.mouse.move(valid.x, valid.y); await save('valid-aim');
    const margin = await worldToCss(60, 520); await page.mouse.move(margin.x, margin.y); const invalid = await save('outside-playable-inside-canvas');
    await page.mouse.move(2, margin.y); const outside = await save('outside-canvas'); await page.keyboard.press('Escape'); const cancelled = await save('escape');
    await page.locator('#hand [data-card="0"]').click(); await page.evaluate(() => { __nativeIntegratedApp.renderer.pointer = { x: 300, y: 520, inside: false }; }); const stale = await save('synthetic-stale-inside-false');
    report.observation = { invalidMarginDiagonalSegments: invalid.diagonalSegments.length, invalidMarginAreaArcs: invalid.trace.arcs,
      actualCanvasExitClearsPointer: outside.pointer === null, actualCanvasExitDrawsNoMarker: outside.diagonalSegments.length === 0 && outside.trace.arcs === 0,
      escapeClears: !cancelled.selection && !cancelled.pointer, staleFalseDrawsNothing: stale.trace.strokes.length === 0 && stale.trace.arcs === 0 && stale.trace.fills === 0,
      xIsCanvasDiagonalNotText: invalid.diagonalSegments.length === 2 && invalid.trace.texts.length === 0,
      noPhysicalCast: report.stages.every(stage => stage.spellCount === 0 && stage.fieldCount === 0 && stage.energySpent === 0) };
    assert.ok(report.observation.actualCanvasExitClearsPointer && report.observation.actualCanvasExitDrawsNoMarker && report.observation.escapeClears && report.observation.noPhysicalCast);
    if (server.checkpoint.startsWith('5af8a6d')) assert.ok(invalid.diagonalSegments.length === 0 && invalid.trace.arcs === 0 && report.observation.staleFalseDrawsNothing);
    console.log(JSON.stringify({ checkpoint: server.checkpoint, observation: report.observation }));
  } catch (error) { report.error = error.stack; throw error; }
  finally { if (browser) await browser.close(); await server.close(); report.sourceHashes = server.sourceHashes; report.qaHashes = server.qaHashes; report.qaHashes['qa-spell-exit-marker.mjs'] = hash(await readFile(new URL('./qa-spell-exit-marker.mjs', import.meta.url))); await writeFile(path.join(folder, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); }
}
