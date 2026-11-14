import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)), output = path.join(root, 'docs/battle-refinement/combo-poses/renderer'), qa = path.join(root, 'qa/combo-renderer');
const numericOnly = process.argv.includes('--numeric');
await Promise.all([mkdir(path.join(output, 'contacts'), { recursive: true }), mkdir(path.join(output, 'videos'), { recursive: true }), mkdir(qa, { recursive: true })]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = ['dist/app.js', 'dist/attack-choreography.js', 'dist/sprite-motion.js', 'dist/sprite-geometry.js', 'dist/engine.js', 'dist/render.js', 'dist/assets/pokemon/manifest.json', 'scripts/qa-combo-harness.mjs', 'scripts/qa-combo-choreography.mjs'];
const report = { generatedAt: new Date().toISOString(), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  viewport: { width: 390, height: 844 }, board: { width: 370, height: 677 }, captureHz: 60,
  modes: { engine60: 'Game.step(1/60), Renderer.draw at 60Hz', engine30: 'Game.step(1/30), Renderer.draw at 60Hz', snapshots15: '30Hz authoritative simulation, packGame/unpackGame every 1/15s, event batches, app anim-only updates between packets; Renderer owns the attack clock; no network jitter.' },
  sourceHashes: Object.fromEntries(await Promise.all(sources.map(async filename => [filename, sha256(await readFile(path.join(root, filename)))]))), cases: [], sheets: [], directionTimelines: [], interventions: [], findings: [] };
let playwright;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
assert.ok(playwright, 'Playwright is required.');
const ffmpeg = process.env.POKE_ARENA_FFMPEG || 'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
const ffprobe = path.join(path.dirname(ffmpeg), 'ffprobe.exe');
async function video(filename, frames) {
  const destination = path.join(output, 'videos', filename);
  const proc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = ''; proc.stderr.on('data', bytes => errors += bytes);
  const finished = once(proc, 'close');
  for (const frame of frames) if (!proc.stdin.write(Buffer.from(frame, 'base64'))) await once(proc.stdin, 'drain');
  proc.stdin.end(); const [code] = await finished; assert.equal(code, 0, errors);
  const metadata = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,nb_frames,duration', '-of', 'json', destination], { encoding: 'utf8', windowsHide: true }));
  assert.equal(metadata.streams[0].avg_frame_rate, '60/1');
  return { file: `videos/${filename}`, bytes: (await stat(destination)).size, sha256: sha256(await readFile(destination)), ...metadata.streams[0] };
}
const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Combo renderer QA</title><style>body{margin:0;background:#f7f0d5}canvas{display:block;position:absolute;left:10px;top:2px;width:370px;height:677px;image-rendering:pixelated}</style><canvas width="600" height="800"></canvas><script type="module" src="/__qa/harness.mjs"></script>';
const dist = path.join(root, 'dist'), mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }).end(html); return; }
    const filename = pathname === '/__qa/harness.mjs' ? path.join(root, 'scripts/qa-combo-harness.mjs') : path.resolve(dist, '.' + pathname);
    if (pathname !== '/__qa/harness.mjs' && !filename.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  const page = await browser.newPage({ viewport: report.viewport }), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => !!globalThis.__combo); await page.evaluate(() => __combo.ready);
  const keys = await page.evaluate(() => __combo.keys);
  for (const key of keys) {
    const sheet = await page.evaluate(key => __combo.sheet(key), key);
    if (!numericOnly) await writeFile(path.join(output, 'contacts', `${key}.png`), Buffer.from(sheet.png, 'base64')); delete sheet.png; report.sheets.push(sheet);
    for (const row of sheet.rows) {
      if (row.emitter.error > .001) report.findings.push({ key, kind: 'native-emitter-mismatch', stage: row.stage, direction: row.direction, error: row.emitter.error });
      if (row.drawn?.frame !== row.pose.frame || row.drawn?.direction !== row.direction) report.findings.push({ key, kind: 'native-crop-mismatch', stage: row.stage, direction: row.direction, drawn: row.drawn, expected: row.pose });
    }
    for (const mode of Object.keys(report.modes)) {
      const result = await page.evaluate(({ key, mode, capture }) => __combo.run(key, mode, capture), { key, mode, capture: !numericOnly });
      if (!numericOnly) result.video = await video(`${key}-${mode}.mp4`, result.pngs); delete result.pngs;
      for (const contact of result.contacts) {
        if (!contact.nativeContactVisible) report.findings.push({ key, mode, kind: 'contact-not-visible-at-delivery', shot: contact.shot, expected: contact.expectedFrame, logicFrame: contact.logic.frame, drawn: contact.rendered?.drawn, at: contact.at, renderAt: contact.rendered?.at });
        if (contact.logic.frame !== contact.expectedFrame) report.findings.push({ key, mode, kind: 'logic-contact-mismatch', shot: contact.shot, expected: contact.expectedFrame, actual: contact.logic.frame });
      }
      if (!result.stableDirection || !result.recoveryObserved) report.findings.push({ key, mode, kind: 'orientation-or-recovery', stableDirection: result.stableDirection, recoveryObserved: result.recoveryObserved });
      if (!result.clockNeverRewinds) report.findings.push({ key, mode, kind: 'attack-clock-rewinds' });
      for (const gap of result.interHit) if (!gap.followVisible || !gap.restVisible) report.findings.push({ key, mode, kind: 'inter-hit-follow-or-rest-missing', ...gap });
      report.cases.push(result);
    }
    for (let direction = 0; direction < 8; direction++) {
      const result = await page.evaluate(({ key, direction }) => __combo.run(key, 'engine30', false, direction), { key, direction });
      const transitions = result.frames.filter((frame, index) => !index || frame.pose.animation !== result.frames[index - 1].pose.animation || frame.pose.frame !== result.frames[index - 1].pose.frame)
        .map(frame => ({ at: frame.at, age: frame.pose.age, animation: frame.pose.animation, frame: frame.pose.frame, raster: frame.pose.raster, drawnDirection: frame.drawn?.direction }));
      report.directionTimelines.push({ key, direction, stableDirection: result.stableDirection, recoveryObserved: result.recoveryObserved, clockNeverRewinds: result.clockNeverRewinds, contacts: result.contacts, transitions });
      if (!result.stableDirection || !result.recoveryObserved || !result.clockNeverRewinds || result.contacts.some(hit => !hit.nativeContactVisible)) report.findings.push({ key, direction, kind: 'direction-timeline-failure' });
    }
    for (const intervention of ['stun', 'pause']) {
      const result = await page.evaluate(({ key, intervention }) => __combo.run(key, 'engine30', false, 4, intervention), { key, intervention }); delete result.pngs;
      if (intervention === 'stun' && result.contacts.length) report.findings.push({ key, kind: 'stun-released-canceled-combo', contacts: result.contacts.length });
      if (intervention === 'pause' && (result.pause?.logicalTimes.length !== 1 || result.pause?.nativeFrames.length !== 1 || !result.pause?.identicalPixels)) report.findings.push({ key, kind: 'pause-changes-pose', pause: result.pause });
      report.interventions.push(result);
    }
    console.log(`${key}: ${numericOnly ? 'numeric 3 modes' : '3 videos'}, 8-direction sheet, interruption + pause`);
  }
  assert.deepEqual(errors, []); report.pageErrors = errors;
  await page.screenshot({ path: path.join(qa, 'renderer-390.png') });
  report.summary = { keys: keys.length, species: new Set(report.cases.map(row => row.profile.id)).size, cases: report.cases.length, videos: numericOnly ? 0 : report.cases.length,
    contacts: report.cases.reduce((sum, row) => sum + row.contacts.length, 0), directionTimelines: report.directionTimelines.length,
    directionContacts: report.directionTimelines.reduce((sum, row) => sum + row.contacts.length, 0), findings: report.findings.length, interventions: report.interventions.length };
  for (const filename of sources) if (sha256(await readFile(path.join(root, filename))) !== report.sourceHashes[filename]) report.findings.push({ kind: 'source-changed-during-qa', file: filename });
} catch (error) { report.error = error.stack; throw error; }
finally {
  if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  await writeFile(numericOnly ? path.join(qa, 'numeric-report.json') : path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  const csv = ['key,mode,shot,scheduled,logicTime,renderTime,expectedFrame,logicFrame,renderFrame,contactVisible'];
  for (const row of report.cases) for (const hit of row.contacts) csv.push([row.key, row.mode, hit.shot, hit.expectedAt, hit.at, hit.rendered?.at, hit.expectedFrame, hit.logic.frame, hit.rendered?.drawn?.frame, hit.nativeContactVisible].join(','));
  if (!numericOnly) await writeFile(path.join(output, 'contacts.csv'), csv.join('\n') + '\n');
  console.log(JSON.stringify({ ...report.summary, findings: report.findings }));
}
