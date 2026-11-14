import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), output = path.join(root, 'docs/visual-followup/animations'), qa = path.join(root, 'qa/visual-followup-animations');
const numeric = process.argv.includes('--numeric'), sha = bytes => createHash('sha256').update(bytes).digest('hex');
await Promise.all([mkdir(path.join(output, 'frames'), { recursive: true }), mkdir(qa, { recursive: true })]);
const frozen = new Map(), files = [...(await readdir(dist)).filter(name => /\.(js|css|html)$/.test(name)).map(name => `dist/${name}`), 'dist/assets/pokemon/manifest.json'];
for (const dir of ['assets/battle', 'assets/ui', ...[76, 74, 215, 31, 34, 52].map(id => `assets/pokemon/${id}`)]) files.push(...(await readdir(path.join(dist, dir))).filter(name => /\.(js|png|webp)$/.test(name)).map(name => `dist/${dir}/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, sha(bytes)]; })));
for (const file of ['scripts/qa-visual-followup.mjs', 'scripts/qa-visual-followup-harness.mjs']) sourceHashes[file] = sha(await readFile(path.join(root, file)));
const report = { generatedAt: new Date().toISOString(), sourceHashes, model: { gameHz: 30, publicSnapshotsHz: 15, rendererHz: 60,
  instrumentation: 'Actual app HTML/CSS and Renderer. App response only predeclares its readback context and exposes accessors. The app animation instance is suspended for controlled real-Game fixtures.',
  capture: 'Actual UI screenshot is the fixed backdrop; each live arena canvas is composited at its measured DOM rectangle. No HUD or audio behavior is evaluated.' }, capsule: [], golem: [], findings: [], videos: [] };
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname, local = pathname === '/' ? '/index.html' : pathname;
    let bytes, filename;
    if (pathname === '/__qa/followup.mjs') { filename = path.join(root, 'scripts/qa-visual-followup-harness.mjs'); bytes = await readFile(filename); }
    else {
      filename = path.resolve(dist, '.' + local); if (!filename.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
      bytes = frozen.get(local) || await readFile(filename);
      if (local === '/app.js') bytes = Buffer.from("document.getElementById('arena').getContext('2d',{alpha:false,willReadFrequently:true});\n" + bytes.toString('utf8') + '\nglobalThis.__visualApp={get game(){return game},renderer,updateUi};');
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let playwright, browser;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
const fail = (scope, check, detail) => report.findings.push({ scope, check, detail });
function checkCapsule(result) {
  const calls = result.frames.flatMap(frame => frame.calls), expected = result.board.width / 600 * 52;
  if (!calls.length || calls.some(call => Math.abs(call.projectedWidth - expected) > .01 || Math.abs(call.projectedHeight - expected) > .01)) fail('capsule', 'projected-circle', { viewport: result.viewport, side: result.side, expected });
  if (calls.some(call => call.rotations)) fail('capsule', 'flat-clock-rotation', result.viewport);
  if (result.phases.front.arcs !== 6 || result.phases.back.arcs !== 3 || result.phases.return.arcs !== 6) fail('capsule', 'front-back-return', result.phases);
  for (const measurement of result.measurements) if (Math.abs(measurement.opaqueCssWidth - measurement.opaqueCssHeight) > .3 || Math.abs(measurement.opaqueCssWidth - expected) > .8) fail('capsule', 'opaque-pixel-circle', measurement);
  for (const id of new Set(calls.map(call => call.visualId))) {
    const flight = calls.filter(call => call.visualId === id).map(call => call.elapsed);
    if (flight.some((age, index) => index && age < flight[index - 1] - 1e-7)) fail('capsule', 'flight-clock-rewind', { id });
  }
}
function checkGolem(result) {
  const hurt = result.frames.flatMap(frame => frame.native).filter(draw => draw.animation === 'Hurt'), expectedHurt = ['log', 'death'].includes(result.kind), p = result.pause;
  if (!!hurt.length !== expectedHurt) fail('golem', 'native-hurt-selection', { kind: result.kind, team: result.team, side: result.side, reduced: result.reduced, hurt: hurt.length });
  if (!p.frames || p.engineTimes.length !== 1 || !p.visibleInEveryFrame || p.nativeImages.length !== 1 || p.differentChannels) fail('golem', 'paused-pose-pixels', { kind: result.kind, team: result.team, side: result.side, reduced: result.reduced, pause: p });
  if (expectedHurt && !p.nativeImages[0]?.startsWith('Hurt:')) fail('golem', 'paused-hurt-disappeared', p);
  if (result.kind === 'death' && (p.ghostLives.length !== 1 || p.ghostLives[0] === null || result.frames.at(-1).ghostLife !== null)) fail('golem', 'ghost-lifetime', { pause: p, last: result.frames.at(-1) });
  const moved = Math.hypot(result.final.x - result.origin.x, result.final.y - result.origin.y);
  if (result.kind === 'log' ? moved < .01 : moved > .01) fail('golem', 'effective-push', { kind: result.kind, moved });
}
const ffmpeg = process.env.POKE_ARENA_FFMPEG || 'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
async function encode(page, name) {
  const destination = path.join(output, name), child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = ''; child.stderr.on('data', bytes => stderr += bytes); const done = once(child, 'close');
  for (;;) { const frames = await page.evaluate(() => __visualFollowup.takeFrames()); if (!frames.length) break; for (const frame of frames) if (!child.stdin.write(Buffer.from(frame, 'base64'))) await once(child.stdin, 'drain'); }
  child.stdin.end(); const [code] = await done; assert.equal(code, 0, stderr);
  return { file: name, bytes: (await stat(destination)).size, sha256: sha(await readFile(destination)), fps: 60 };
}
try {
  assert.ok(playwright, 'Playwright is required.'); browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => globalThis.__visualApp && !document.getElementById('start-btn').disabled);
  await page.locator('#start-btn').click(); await page.evaluate(async () => { await import('/__qa/followup.mjs'); await __visualFollowup.ready; await document.fonts.ready; });
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 980 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(100);
    for (const side of [0, 1]) {
      const result = await page.evaluate(side => __visualFollowup.capsuleScene(side), side); delete result.pngs;
      checkCapsule(result); report.capsule.push(result);
    }
    console.log(`capsule ${viewport.width}: both perspectives, real board ${report.capsule.at(-1).board.width}x${report.capsule.at(-1).board.height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
  report.blockedPush = await page.evaluate(() => __visualFollowup.blockedPush());
  if (report.blockedPush.pushHurt) fail('golem', 'blocked-push-causes-hurt', report.blockedPush);
  for (const kind of ['chip', 'fireball', 'log', 'death']) for (const team of [0, 1]) for (const side of [0, 1]) for (const reduced of [false, true]) {
    const result = await page.evaluate(({ kind, team, side, reduced }) => __visualFollowup.golemScene(kind, team, side, reduced), { kind, team, side, reduced }); delete result.pngs;
    checkGolem(result); report.golem.push(result);
  }
  console.log(JSON.stringify({ numeric: { capsule: report.capsule.length, golem: report.golem.length, findings: report.findings } }));
  if (!numeric && !report.findings.length) {
    await page.evaluate(base64 => __visualFollowup.setBackdrop(base64), (await page.screenshot()).toString('base64'));
    for (const side of [0, 1]) {
      const result = await page.evaluate(side => __visualFollowup.captureCapsule(side), side); checkCapsule(result);
      for (const [phase, sample] of Object.entries(result.phases)) await writeFile(path.join(output, 'frames', `capsule-side${side}-${phase}.png`), Buffer.from(await page.evaluate(index => __visualFollowup.frame(index), sample.index), 'base64'));
      for (const [i, measurement] of result.measurements.entries()) { await writeFile(path.join(output, 'frames', `capsule-opaque-${side}-${i}.png`), Buffer.from(measurement.png, 'base64')); delete measurement.png; }
      report.videos.push(await encode(page, `capsule-perspective-${side}.mp4`));
    }
    for (const kind of ['chip', 'fireball', 'log', 'death']) {
      const result = await page.evaluate(kind => __visualFollowup.captureGolem(kind, 1, 0, false), kind); checkGolem(result);
      const first = result.frames.find(frame => frame.paused), last = result.frames.filter(frame => frame.paused).at(-1);
      for (const [label, frame] of [['pause-first', first], ['pause-last', last]]) await writeFile(path.join(output, 'frames', `golem-${kind}-${label}.png`), Buffer.from(await page.evaluate(index => __visualFollowup.frame(index), frame.index), 'base64'));
      report.videos.push(await encode(page, `golem-${kind}.mp4`));
    }
    for (const kind of ['log', 'death']) for (const [team, reduced] of [[0, false], [1, true]]) {
      const result = await page.evaluate(({ kind, team, reduced }) => __visualFollowup.captureGolem(kind, team, 0, reduced), { kind, team, reduced }); checkGolem(result);
      const paused = result.frames.filter(frame => frame.paused);
      for (const [label, frame] of [['pause-first', paused[0]], ['pause-last', paused.at(-1)]]) await writeFile(path.join(output, 'frames', `golem-${kind}-team${team}-reduced${reduced}-${label}.png`), Buffer.from(await page.evaluate(index => __visualFollowup.frame(index), frame.index), 'base64'));
    }
    for (const viewport of [{ width: 768, height: 1024 }, { width: 1440, height: 980 }]) {
      await page.setViewportSize(viewport); await page.waitForTimeout(100);
      await page.evaluate(base64 => __visualFollowup.setBackdrop(base64), (await page.screenshot()).toString('base64'));
      const result = await page.evaluate(() => __visualFollowup.captureCapsule(0)); checkCapsule(result);
      for (const [phase, sample] of Object.entries(result.phases)) await writeFile(path.join(output, 'frames', `capsule-${viewport.width}-${phase}.png`), Buffer.from(await page.evaluate(index => __visualFollowup.frame(index), sample.index), 'base64'));
    }
  }
  assert.deepEqual(errors, []); report.summary = { capsuleCases: report.capsule.length, golemCases: report.golem.length, pausedFrames: report.golem.reduce((sum, row) => sum + row.pause.frames, 0), findings: report.findings.length, videos: report.videos.length };
} catch (error) { report.error = error.stack; throw error; }
finally {
  if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  await writeFile(numeric ? path.join(qa, 'numeric.json') : path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ summary: report.summary, findings: report.findings }));
}
