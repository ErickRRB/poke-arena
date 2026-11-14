import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), output = path.join(root, 'docs/visual-followup/capsule-v2');
const numericOnly = process.argv.includes('--numeric'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(path.join(output, 'frames'), { recursive: true });
const baselineFile = path.join(output, 'inputs/capsule-live-v34.js'), baseline = await readFile(baselineFile);
const expectedBaseline = 'a8a5b458eee3ccfba5596131df951a45ac21232369d8bd000d103d2e30726c5e';
assert.equal(sha(baseline), expectedBaseline);
const frozen = new Map(), files = [...(await readdir(dist)).filter(name => /\.(js|css|html)$/.test(name)).map(name => `dist/${name}`), 'dist/assets/pokemon/manifest.json'];
for (const directory of ['assets/battle', 'assets/ui', 'assets/pokemon/215']) files.push(...(await readdir(path.join(dist, directory))).filter(name => /\.(js|png|webp)$/.test(name)).map(name => `dist/${directory}/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, sha(bytes)]; })));
const helper = await readFile(path.join(root, 'scripts/qa-capsule-v2-harness.mjs'));
for (const file of ['scripts/qa-capsule-v2-harness.mjs', 'scripts/qa-capsule-v2-flight.mjs']) sourceHashes[file] = sha(await readFile(path.join(root, file)));
const report = { generatedAt: new Date().toISOString(), base: { gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  kind: 'frozen-local-proposal', note: 'Current native motor and camera frozen at capture start. Uncommitted material/renderer files are identified by exact SHA-256. This is not a production gameplay recording.' },
  baseline: { url: 'https://poke-arena-erick.eriqrb.chatgpt.site/capsule-art.js?v=26', suppliedFile: baselineFile, sha256: expectedBaseline,
    scope: 'Authentic published v34 graphic function, replayed with the same frozen local Game path and viewport. Only the capsule drawing hook changes in the A/B.' },
  model: { simulationHz: 30, snapshotHz: 15, renderSamplingHz: 60, viewport: { width: 390, height: 844 }, pause: { start: 1, end: 1.4 },
    note: 'Fixed-step sampling, no network jitter. Readback context willReadFrequently is fixture-only; timings are a local CPU microbenchmark, not a hardware frame-rate guarantee.' },
  sourceHashes, checks: {}, cases: [], artifacts: [], findings: [] };
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/__qa/live-capsule.mjs') { response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(baseline); return; }
    if (pathname === '/__qa/capsule-harness.mjs') { response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(helper); return; }
    const local = pathname === '/' ? '/index.html' : pathname, file = path.resolve(dist, '.' + local);
    if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    let bytes = frozen.get(local);
    if (!bytes) { bytes = await readFile(file); frozen.set(local, bytes); sourceHashes['dist' + local] = sha(bytes); }
    if (local === '/app.js') bytes = Buffer.from("document.getElementById('arena').getContext('2d',{alpha:false,willReadFrequently:true});\n" + bytes.toString('utf8') + '\nglobalThis.__capsuleApp={get game(){return game},renderer};');
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let playwright, browser;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
const ffmpeg = process.env.POKE_ARENA_FFMPEG || 'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
async function artifact(file, bytes) { await writeFile(path.join(output, file), bytes); const row = { file, bytes: bytes.length, sha256: sha(bytes) }; report.artifacts.push(row); return row; }
function check(name, passed) { report.checks[name] = Boolean(passed); if (!passed) report.findings.push(name); }
function inspect(result) {
  const draws = result.rows.flatMap(row => row.calls), paused = result.rows.filter(row => row.paused), byId = new Map();
  for (const row of result.rows) for (const call of row.calls) { if (!byId.has(call.id)) byId.set(call.id, []); byId.get(call.id).push({ ...call, at: row.at, paused: row.paused }); }
  const prefix = `${result.mode}:side${result.side}:${result.reduced ? 'reduced' : 'motion'}`;
  check(prefix + ':bothTeams', new Set(draws.map(call => call.team)).size === 2);
  check(prefix + ':size52', draws.length > 150 && draws.every(call => call.size === 52));
  check(prefix + ':noPlanarRotation', draws.every(call => call.rotations === 0));
  check(prefix + ':pausePixels', result.pausedPixelChanges === 0 && paused.length === 24);
  check(prefix + ':pauseEngine', new Set(paused.map(row => row.engineAt)).size === 1);
  check(prefix + ':phaseClock', draws.every(call => result.reduced ? call.angle === 0 && call.phase === 0 : Math.abs(call.angle - call.visualElapsed * 4) < 1e-8));
  check(prefix + ':monotonic', [...byId.values()].every(calls => calls.every((call, index) => !index || call.visualElapsed + 1e-7 >= calls[index - 1].visualElapsed)));
  check(prefix + ':flightMoves', [...byId.values()].every(calls => new Set(calls.map(call => call.x.toFixed(5) + ':' + call.y.toFixed(5))).size > 120));
  check(prefix + ':pauseMaterialAndPosition', [...byId.values()].every(calls => new Set(calls.filter(call => call.paused).map(call => [call.x, call.y, call.angle, call.axis].join(':'))).size === 1));
  result.summary = { calls: draws.length, identities: byId.size, pausedFrames: paused.length, visibleCssDiameter: 52 * result.projection.scale,
    observedPhases: new Set(draws.map(call => call.phase)).size, landings: result.eventLog.filter(event => event.type === 'spawn' && event.key === 'sneaselToken').length };
}
async function encode(page, key) {
  const destination = path.join(output, `${key}.mp4`), child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = ''; child.stderr.on('data', bytes => stderr += bytes); const done = once(child, 'close');
  for (;;) { const frames = await page.evaluate(() => __capsuleV2.takeFrames()); if (!frames.length) break; for (const frame of frames) if (!child.stdin.write(Buffer.from(frame, 'base64'))) await once(child.stdin, 'drain'); }
  child.stdin.end(); const [code] = await done; assert.equal(code, 0, stderr);
  const probe = JSON.parse(execFileSync(path.join(path.dirname(ffmpeg), 'ffprobe.exe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,nb_frames,duration', '-of', 'json', destination], { encoding: 'utf8', windowsHide: true })).streams[0];
  assert.equal(probe.avg_frame_rate, '60/1'); const row = { file: path.basename(destination), sha256: sha(await readFile(destination)), bytes: (await stat(destination)).size, ...probe }; report.artifacts.push(row); return row;
}
try {
  assert.ok(playwright, 'Playwright is required.'); browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  const page = await browser.newPage({ viewport: report.model.viewport }), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => globalThis.__capsuleApp && !document.getElementById('start-btn').disabled);
  await page.locator('#start-btn').click();
  report.nativeSpecies = await page.evaluate(async () => { const r = __capsuleApp.renderer; await r.ensureSpecies([215]); return { id: 215, pending: r.pendingSpecies.has(215), loadedAnimations: [...r.sprites.keys()].filter(key => key.startsWith('215-')) }; });
  assert.equal(report.nativeSpecies.pending, false); assert.ok(report.nativeSpecies.loadedAnimations.includes('215-Idle'));
  await page.evaluate(() => import('/__qa/capsule-harness.mjs'));
  const backdrop = await page.screenshot(); await page.evaluate(png => __capsuleV2.backdrop(png), backdrop.toString('base64'));
  for (const mode of ['local30', 'snapshots15']) for (const side of [0, 1]) for (const reduced of [false, true]) {
    const result = await page.evaluate(options => __capsuleV2.replay(options), { mode, side, reduced }); delete result.pngs; inspect(result); report.cases.push(result);
  }
  const material = await page.evaluate(() => __capsuleV2.material()); await artifact('phases-current.png', Buffer.from(material.png, 'base64')); delete material.png; report.material = material;
  check('materialReturns2pi', material.returnsExactly); check('materialAlphaUnchanged', material.alphaUnchanged);
  check('redHemispherePassesFrontToBack', material.rows[0].redTop > material.rows[0].redBottom * 2 && material.rows[4].redBottom > material.rows[4].redTop * 2);
  check('whiteHemispherePassesFrontToBack', material.rows[0].whiteBottom > material.rows[0].whiteTop * 2 && material.rows[4].whiteTop > material.rows[4].whiteBottom * 2);
  check('seamMovesAcrossSurface', Math.max(...material.rows.map(row => row.beltCenter)) > Math.min(...material.rows.map(row => row.beltCenter)) + 8);
  report.budget = await page.evaluate(() => __capsuleV2.budget());
  check('cacheWarmNoBuilds', report.budget.warm.newFramesBuilt === 0); check('cacheBounded256', report.budget.afterEviction.keys === 256);
  check('cacheReusesAtlasAndScratch', report.budget.afterEviction.sameAtlas && report.budget.afterEviction.sameScratch);
  console.log(JSON.stringify({ numeric: 'complete', checks: Object.keys(report.checks).length, failed: report.findings, diameterCss: material.cssDiameter, budget: report.budget }));
  assert.deepEqual(report.findings, [], 'Numerical checks failed; skip videos.');
  if (!numericOnly) for (const mode of ['local30', 'snapshots15']) {
    let proposal;
    for (const variant of ['proposal', 'v34-graphic-replay']) {
      const result = await page.evaluate(options => __capsuleV2.capture(options), { mode, side: 0, reduced: false, variant });
      const geometry = result.rows.map(row => ({ at: row.at, engineAt: row.engineAt, paused: row.paused, calls: row.calls.map(({ phase, direction, rotations, ...call }) => call) }));
      if (variant === 'proposal') proposal = geometry; else assert.deepEqual(geometry, proposal, 'Art-only replay must preserve the exact trajectory and clock.');
      const key = `${mode}-${variant}`; result.video = await encode(page, key);
      if (variant === 'proposal') {
        const keyframes = await page.evaluate(options => { __capsuleV2.capture(options); return [30, 60, 72, 108, 168, 216].map(index => ({ index, png: __capsuleV2.frame(index) })); }, { mode, side: 0, reduced: false, variant });
        for (const frame of keyframes) await artifact(`frames/${key}-${frame.index}.png`, Buffer.from(frame.png, 'base64'));
      }
      report.videoRuns ??= []; report.videoRuns.push({ mode, variant, frames: result.frameCount, video: result.video, exactArtReplay: true });
      console.log(JSON.stringify({ video: key, frames: result.frameCount }));
    }
    const comparison = path.join(output, `${mode}-art-only-ab.mp4`);
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(output, `${mode}-v34-graphic-replay.mp4`), '-i', path.join(output, `${mode}-proposal.mp4`), '-filter_complex', '[0:v][1:v]hstack=inputs=2[v]', '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', comparison], { windowsHide: true });
    await artifact(path.basename(comparison), await readFile(comparison));
  }
  if (!numericOnly) {
    const reduced = await page.evaluate(() => __capsuleV2.capture({ mode: 'snapshots15', side: 0, reduced: true }));
    await artifact('frames/reduced-flight.png', Buffer.from(await page.evaluate(() => __capsuleV2.frame(108)), 'base64'));
    const video = await encode(page, 'snapshots15-reduced'); report.videoRuns.push({ mode: 'snapshots15', variant: 'proposal', reduced: true, frames: reduced.frameCount, video });
  }
  report.pageErrors = errors; assert.deepEqual(errors, []);
} catch (error) { report.error = error.stack; throw error; }
finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); await writeFile(path.join(output, numericOnly ? 'numeric-verification.json' : 'verification.json'), JSON.stringify(report, null, 2) + '\n'); }
