import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), output = path.join(root, 'docs/visual-followup/ralts-hut');
await mkdir(path.join(output, 'frames'), { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), frozen = new Map();
const files = [...(await readdir(dist)).filter(name => /\.(js|css|html)$/.test(name)).map(name => `dist/${name}`), 'dist/assets/pokemon/manifest.json', 'dist/assets/cards/ralts-hut-v1.png'];
for (const directory of ['assets/battle', 'assets/ui']) files.push(...(await readdir(path.join(dist, directory))).filter(name => /\.(js|png|webp)$/.test(name)).map(name => `dist/${directory}/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, sha(bytes)]; })));
for (const file of ['scripts/qa-ralts-hut.mjs', 'scripts/qa-ralts-hut-harness.mjs']) sourceHashes[file] = sha(await readFile(path.join(root, file)));
const report = { generatedAt: new Date().toISOString(), sourceHashes, scope: 'Visual fixture for raltsHut without a Pokemon id. Contract: 4 elixir, 1180 HP, 30 s, radius24. Does not validate catalog/collection integration or Ralts generation.',
  instrumentation: 'Actual app HTML/CSS; QA readback context/accessors; normal animation instance suspended for controlled real-Game actor fixtures and serialized public events.', assets: null, cases: [], projection: [], findings: [], screenshots: [] };
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname, local = pathname === '/' ? '/index.html' : pathname;
    const filename = pathname === '/__qa/hut.mjs' ? path.join(root, 'scripts/qa-ralts-hut-harness.mjs') : path.resolve(dist, '.' + local);
    if (pathname !== '/__qa/hut.mjs' && !filename.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    let bytes = frozen.get(local) || await readFile(filename);
    if (local === '/app.js') bytes = Buffer.from("document.getElementById('arena').getContext('2d',{alpha:false,willReadFrequently:true});\n" + bytes.toString('utf8') + '\nglobalThis.__hutApp={get game(){return game},renderer,updateUi};');
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let playwright, browser;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
const fail = (check, detail) => report.findings.push({ check, detail });
try {
  assert.ok(playwright, 'Playwright is required.'); browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], invalidRequests = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (/assets\/pokemon\/(undefined|null|NaN)(\/|\?)/.test(request.url())) invalidRequests.push(request.url()); });
  await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => globalThis.__hutApp && !document.getElementById('start-btn').disabled);
  await page.locator('#start-btn').click(); await page.evaluate(async () => { await import('/__qa/hut.mjs'); await document.fonts.ready; });
  report.assets = await page.evaluate(() => __hutQA.loadCard());
  async function screenshot(name) { const file = `frames/${name}.png`, bytes = await page.screenshot(); await writeFile(path.join(output, file), bytes); report.screenshots.push({ file, sha256: sha(bytes) }); }
  const primary = await page.evaluate(() => __hutQA.init()); await screenshot('390-normal');
  console.log(JSON.stringify({ firstPng: path.join(output, 'frames/390-normal.png'), body: primary.calls[0], hp: primary.bars, invalidLoads: primary.invalidLoads }));
  for (const team of [0, 1]) for (const side of [0, 1]) for (const reduced of [false, true]) {
    const normal = await page.evaluate(({ team, side, reduced }) => __hutQA.init(team, side, reduced), { team, side, reduced });
    const probes = await page.evaluate(() => __hutQA.probes());
    if (team === 0 && side === 0 && !reduced) for (const [key, file] of [['normalPng', 'probe-normal'], ['previewPng', 'probe-preview'], ['redPng', 'probe-red']]) {
      const bytes = Buffer.from(probes[key], 'base64'); await writeFile(path.join(output, `frames/${file}.png`), bytes); report.screenshots.push({ file: `frames/${file}.png`, sha256: sha(bytes) });
    }
    delete probes.normalPng; delete probes.previewPng; delete probes.redPng;
    const preview = await page.evaluate(() => __hutQA.showPreview()); if (team === 0 && side === 0 && !reduced) await screenshot('390-preview');
    const targeted = await page.evaluate(() => __hutQA.highlight(true)); if (team !== side && !reduced) await screenshot(`390-target-team${team}-side${side}`);
    const cleared = await page.evaluate(() => __hutQA.highlight(false));
    const hit = await page.evaluate(() => __hutQA.hit()); if (team === 0 && side === 0) await screenshot(`390-hit-reduced${reduced}`);
    const hitPause = await page.evaluate(() => __hutQA.pause());
    const death = await page.evaluate(() => __hutQA.death()); if (team === 0 && side === 0) await screenshot(`390-death-reduced${reduced}`);
    const deathPause = await page.evaluate(() => __hutQA.pause()); if (team === 0 && side === 0) await screenshot(`390-death-paused-reduced${reduced}`);
    const resumed = await page.evaluate(() => __hutQA.resumeDeath()); if (team === 0 && side === 0 && !reduced) await screenshot('390-death-cleaned');
    const result = { team, side, reduced, normal, probes, preview, targeted, cleared, hit, hitPause, death, deathPause, resumed }; report.cases.push(result);
    if (normal.cardId !== null || normal.calls.length !== 1 || normal.platformCalls || normal.invalidLoads.length || normal.invalidSpeciesKeys.length) fail('idless-body', { team, side, reduced, normal });
    if (normal.bars.length !== 1 || normal.bars[0].hp !== 1180 || normal.bars[0].maxHp !== 1180) fail('health', normal.bars);
    if (Math.abs(probes.previewBodyAlpha - .55) > .001 || probes.previewMaxAlpha >= 220) fail('preview-alpha', probes);
    if (probes.outsideAlphaPixels || probes.changedPixels < 10 || probes.redGain <= 0 || probes.clearChanges) fail('red-mask-cleanup', probes);
    if ((team !== side) !== targeted.highlighted || cleared.highlighted || cleared.tintCalls) fail('actual-target-selection', { team, side, highlighted: targeted.highlighted, cleared: cleared.highlighted });
    if (hit.hp !== 1080 || (!reduced && !hit.calls[0]?.filter.includes('brightness'))) fail('damage-feedback', hit);
    for (const [phase, paused] of [['hit', hitPause], ['death', deathPause]]) if (paused.changes || paused.missingBody || paused.engineAt !== paused.engineAfter || paused.effectAt !== paused.effectAfter) fail('paused-pixels', { phase, team, side, reduced, paused });
    if (death.death.length !== 1 || resumed.last.death.length || resumed.last.calls.length || resumed.last.bars.length) fail('structure-death-cleanup', { team, side, reduced, death, last: resumed.last });
    if (!reduced && resumed.middle.calls[0]?.matrix[3] >= death.calls[0]?.matrix[3]) fail('collapse-motion', { before: death.calls[0], middle: resumed.middle.calls[0] });
  }
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 980 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(100); const normal = await page.evaluate(() => __hutQA.init());
    await screenshot(`${viewport.width}-projection`); const args = normal.calls[0].args, b = normal.board;
    report.projection.push({ viewport, board: b, cssWidth: args[6] * b.width / 600, cssHeight: args[7] * b.height / 800, actor: normal.actorPosition, bar: normal.bars[0], art: normal.art });
    if (Math.abs(args[6] - normal.art.width) > .001 || Math.abs(args[5] + args[7] - normal.actorPosition.y - normal.art.baseOffset / b.verticalScale) > .001 || normal.bars[0].y >= args[5]) fail('projection-anchor-health', normal);
  }
  if (invalidRequests.length || errors.length) fail('browser-errors', { errors, invalidRequests }); report.invalidRequests = invalidRequests; report.pageErrors = errors;
  report.summary = { cases: report.cases.length, projectionViewports: report.projection.length, pauseFrames: report.cases.length * 48, screenshots: report.screenshots.length, findings: report.findings.length, generationTested: false };
} catch (error) { report.error = error.stack; throw error; }
finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); await writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ summary: report.summary, findings: report.findings })); }
