import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), output = path.join(root, 'docs/battle-refinement/first-group-final'), qa = path.join(root, 'qa/first-group-final');
const numericOnly = process.argv.includes('--numeric'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
await Promise.all([mkdir(output, { recursive: true }), mkdir(qa, { recursive: true }), mkdir(path.join(output, 'frames'), { recursive: true })]);
const frozen = new Map(), inputs = [...(await readdir(dist)).filter(name => name.endsWith('.js')).map(name => `dist/${name}`), 'dist/assets/pokemon/manifest.json',
  ...(await readdir(path.join(dist, 'assets/battle'))).filter(name => /\.(js|png|webp)$/.test(name)).map(name => `dist/assets/battle/${name}`)];
for (const id of [6, 25, 215, 74, 31, 34, 52]) inputs.push(...(await readdir(path.join(dist, `assets/pokemon/${id}`))).filter(name => name.endsWith('.png')).map(name => `dist/assets/pokemon/${id}/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(inputs.map(async filename => { const bytes = await readFile(path.join(root, filename)); frozen.set('/' + filename.slice(5), bytes); return [filename, hash(bytes)]; })));
for (const filename of ['scripts/qa-first-group-harness.mjs', 'scripts/qa-first-group-final.mjs', 'scripts/verify-battle-refinement.mjs']) sourceHashes[filename] = hash(await readFile(path.join(root, filename)));
const report = { generatedAt: new Date().toISOString(), base: { kind: 'isolated-checkout-old-board', gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  note: 'Frozen files from the isolated pokemon-arena-search-timer checkout with its previous board. The integrator must repeat on final main; this is not final-board evidence.' },
  model: { simulationHz: 30, snapshotsHz: 15, rendererHz: 60, perspectives: [0, 1], perPerspectiveViewport: { width: 390, height: 844 }, video: { width: 780, height: 844 },
    wire: 'publicSnapshot/publicEvent/unpackEvent plus perspective/unpackGame; app anim, hit and deploy countdowns; Renderer owns attack time; no network jitter.',
    readbackContext: 'The QA board contexts are created with alpha:false, willReadFrequently:true before Renderer; production context options are unchanged.' }, sourceHashes, scenarios: [], findings: [] };
const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f7f0d5;display:flex}canvas{display:block;width:370px;height:677px;margin:2px 10px}</style><canvas width="600" height="800"></canvas><canvas width="600" height="800"></canvas><script type="module" src="/__qa/first-group.mjs"></script>';
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }).end(html); return; }
    const filename = pathname === '/__qa/first-group.mjs' ? path.join(root, 'scripts/qa-first-group-harness.mjs') : path.resolve(dist, '.' + pathname);
    if (pathname !== '/__qa/first-group.mjs' && !filename.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = frozen.get(pathname) || await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let playwright, browser;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
assert.ok(playwright, 'Playwright is required.');
const ffmpeg = process.env.POKE_ARENA_FFMPEG || 'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
async function encode(page, key) {
  const destination = path.join(output, `${key}-15hz-both-perspectives.mp4`);
  const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = ''; child.stderr.on('data', bytes => stderr += bytes); const done = once(child, 'close');
  for (;;) { const frames = await page.evaluate(() => __firstGroup.takeFrames()); if (!frames.length) break; for (const frame of frames) if (!child.stdin.write(Buffer.from(frame, 'base64'))) await once(child.stdin, 'drain'); }
  child.stdin.end(); const [code] = await done; assert.equal(code, 0, stderr);
  const probe = JSON.parse(execFileSync(path.join(path.dirname(ffmpeg), 'ffprobe.exe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,nb_frames,duration', '-of', 'json', destination], { encoding: 'utf8', windowsHide: true }));
  assert.equal(probe.streams[0].avg_frame_rate, '60/1');
  return { file: path.basename(destination), sha256: hash(await readFile(destination)), bytes: (await stat(destination)).size, ...probe.streams[0] };
}
function inspect(result) {
  const rows = result.frames.flatMap(frame => frame.views), checks = {};
  if (result.key !== 'sneaselAmbush') {
    checks.realRigDrawnBothSides = result.rig.actualDraws.every(count => count > 0);
    checks.headBodyPixelsProtected = result.rig.protectedChanges === 0 && result.rig.protectedPixels > 0;
    checks.wingsMoveWithinSameNativePose = Math.max(...Object.values(result.rig.silhouettesPerNativeFrame)) > 2;
    checks.headEmitterFollowsNativeMarker = rows.filter(row => row.charizard?.emitterError !== null).every(row => !row.charizard || row.charizard.emitterError < .001);
  }
  if (result.key === 'charizard') {
    checks.onlyTargetsInFrontDamaged = result.damage.front === 216 && result.damage.behind === 0 && result.damage.outside === 0;
    const first = result.events.find(event => event.type === 'damage' && event.key === 'charizard');
    const release = result.events.find(event => event.type === 'attackRelease' && event.key === 'charizard');
    checks.damageWaitsForTravellingFront = first.at > release.at + .2 && first.front.some(front => front.travelled >= 100);
    checks.threeReleases = result.counts.charizard === 3;
  }
  if (result.key === 'pikachu') checks.bothCombatantsRelease = result.counts.pikachu > 0 && result.counts.charizard >= 3;
  if (result.key === 'sneaselAmbush') {
    const f = result.flight, v = f.vulnerability;
    checks.flightUses192 = f.speed === 192;
    checks.landingIsVulnerable = v.targetable && v.spellTargetable && v.hpBefore - v.hpAfter === 10 && v.spawnDelay > 1;
    checks.firstAttackAfterLandingAndWindup = f.afterLanding >= 1.1 + .3 - 1 / 30 - 1e-6;
    for (const side of [0, 1]) {
      const capsules = result.frames.map(frame => frame.views[side].capsule).filter(Boolean), elapsed = capsules.map(capsule => capsule.elapsed);
      checks[`capsule52Side${side}`] = capsules.length > 100 && capsules.every(capsule => capsule.size === 52 && capsule.height === 52);
      checks[`flightMonotonicSide${side}`] = elapsed.every((value, index) => !index || value + 1e-7 >= elapsed[index - 1]);
      checks[`flightAdvancesSide${side}`] = new Set(elapsed.map(value => value.toFixed(6))).size >= elapsed.length * .9;
      const deploying = result.frames.map(frame => frame.views[side].minion).filter(minion => minion?.spawn > 0);
      checks[`deploymentStaysStillSide${side}`] = deploying.length > 30 && deploying.every(minion => minion.x === deploying[0].x && minion.y === deploying[0].y && minion.attack === 0);
    }
  }
  for (const [check, passed] of Object.entries(checks)) if (!passed) report.findings.push({ scenario: result.key, check });
  return checks;
}
try {
  browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  const page = await browser.newPage({ viewport: { width: 780, height: 844 } }), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => !!globalThis.__firstGroup); await page.evaluate(() => __firstGroup.ready);
  report.antiLock = await page.evaluate(() => __firstGroup.antiLock());
  for (const row of report.antiLock) if (row.charizardReleases < 6) report.findings.push({ scenario: 'pikachu', check: 'phase-lock', ...row });
  for (const key of ['pikachu', 'charizard', 'sneaselAmbush']) {
    const result = await page.evaluate(({ key, capture }) => capture ? __firstGroup.capture(key) : __firstGroup.run(key, false), { key, capture: !numericOnly }); delete result.pngs;
    result.checks = inspect(result);
    if (!numericOnly) {
      const hits = result.events.filter(event => event.type === 'damage' && !event.dot && event.key === 'charizard').map(event => event.at);
      const times = key === 'sneaselAmbush' ? [1, result.flight.landing - .05, result.flight.landing + .1, result.flight.firstRelease] : key === 'charizard' ? [.2, .4, hits[0], hits.at(-1)] : [.7, 1.05, 2.6, 3.8];
      result.keyframes = [];
      for (let i = 0; i < times.length; i++) {
        const index = Math.min(result.frames.length - 1, Math.max(0, Math.ceil((times[i] - 1e-7) * 15) * 4));
        const bytes = Buffer.from(await page.evaluate(index => __firstGroup.frameAt(index), index), 'base64'), filename = `frames/${key}-${i}-${result.frames[index].at.toFixed(3)}.png`;
        await writeFile(path.join(output, filename), bytes); result.keyframes.push({ file: filename, at: result.frames[index].at, sha256: hash(bytes) });
      }
      result.video = await encode(page, key);
    }
    report.scenarios.push(result); console.log(`${key}: ${Object.values(result.checks).filter(Boolean).length}/${Object.keys(result.checks).length} checks`);
  }
  assert.deepEqual(errors, []); report.pageErrors = errors;
  report.summary = { scenarios: report.scenarios.length, perspectives: 2, checks: report.scenarios.reduce((sum, row) => sum + Object.keys(row.checks).length, 0), failures: report.findings.length,
    antiLockCases: report.antiLock.length, videos: numericOnly ? 0 : 3, sampledFrames: report.scenarios.reduce((sum, row) => sum + row.frames.length, 0) };
} catch (error) { report.error = error.stack; throw error; }
finally {
  if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  await writeFile(numericOnly ? path.join(qa, 'numeric-report.json') : path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ summary: report.summary, findings: report.findings, antiLock: report.antiLock }));
}
