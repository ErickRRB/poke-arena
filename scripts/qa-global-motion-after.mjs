import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist');
const output = path.join(root, 'docs/battle-refinement/global-motion/after');
const keys = ['beedrill', 'snorlax', 'lugia', 'rayquaza', 'koffing', 'kangaskhan', 'babyKangaskhan'];
const sha = value => createHash('sha256').update(value).digest('hex');
await Promise.all(['contacts', 'videos'].map(name => mkdir(path.join(output, name), { recursive: true })));

// Reuse the combat harness without overwriting another audit's version. These
// bounded fixture adaptations and their exact bytes are saved with the report.
const originalHarness = await readFile(path.join(root, 'scripts/qa-combo-harness.mjs'), 'utf8');
function replaceOnce(source, find, replacement) {
  assert.equal(source.split(find).length, 2, `Harness adaptation must match once: ${find}`);
  return source.replace(find, replacement);
}
let harness = originalHarness.replace(/const KEYS = \[[^\n]+\];/, `const KEYS = ${JSON.stringify(keys)};`);
if (!harness.includes('canvas.getContext(\'2d\', { alpha: false, willReadFrequently: true })')) {
  harness = replaceOnce(harness, "const canvas = document.querySelector('canvas'), renderer = new Renderer(canvas);",
    "const canvas = document.querySelector('canvas'); canvas.getContext('2d', { alpha: false, willReadFrequently: true }); const renderer = new Renderer(canvas);");
}
harness = replaceOnce(harness, 'expectedFrame = card.attackGestures[event.shot % card.attackGestures.length].contact;',
  'expectedFrame = card.attackGestures?.length ? card.attackGestures[event.shot % card.attackGestures.length].contact : card.attackContactFrame ?? renderer.metadata[card.id][card.attackAnim].hitFrame;');
harness = replaceOnce(harness, 'passive: true, damage: 0, speed: 0', 'passive: true, damage: 0, speed: 0, structure: !!actor.card.building, lifetime: 1e12');
harness = replaceOnce(harness, 'actor.entryPending = target.entryPending = false;', 'game.units = [actor, target]; actor.entryPending = target.entryPending = false;');
// At the center line a structure25px west is just outside Snorlax's legal24px
// pull-lane overlap.20px keeps every direction inside the same valid fixture.
harness = replaceOnce(harness, 'Math.cos(angle) * 25', 'Math.cos(angle) * 20');
harness = replaceOnce(harness, 'Math.sin(angle) * 25', 'Math.sin(angle) * 20');
harness = replaceOnce(harness, 'frames.push(row);', 'if (capture) row.tilePng = actorTile(); frames.push(row);');
harness = replaceOnce(harness, 'if (capture) pngs.push(compose(', 'if (capture === true) pngs.push(compose(');
harness = replaceOnce(harness, 'compose(key, mode, time, current, releases, row.visualEmission)', 'compose(key, mode, time, { ...current, ...native }, releases, row.visualEmission)');
harness += `
const actorTileCanvas = document.createElement('canvas'); actorTileCanvas.width = 94; actorTileCanvas.height = 136;
const actorTileContext = actorTileCanvas.getContext('2d', { willReadFrequently: true }); actorTileContext.imageSmoothingEnabled = false;
function actorTile() {
  actorTileContext.drawImage(canvas, 224, 400, 152, 160, 0, 0, 94, 136);
  return actorTileCanvas.toDataURL('image/png').split(',')[1];
}
globalThis.__combo.contactSheet = async function(key, mode, results) {
  const chosen = new Set([0]);
  for (const result of results) {
    const seen = new Set();
    for (const frame of result.frames) {
      const draw = frame.drawn;
      const signature = draw ? draw.animation + ':' + rasterIds.get(result.profile.id + ':' + draw.animation + ':' + draw.direction + ':' + draw.frame) : frame.pose.animation + ':' + frame.pose.raster;
      if (!seen.has(signature)) { chosen.add(frame.index); seen.add(signature); }
    }
    for (const release of result.contacts) {
      const index = Math.round(release.rendered.at * 60); chosen.add(index); chosen.add(Math.max(0, index - 1)); chosen.add(index + 1);
      const gesture = result.profile.gestures?.[release.shot % result.profile.gestures.length];
      if (gesture) {
        const next = result.contacts[release.shot + 1]?.rendered.at ?? Infinity;
        const between = result.frames.filter(frame => frame.at > release.rendered.at && frame.at < next && frame.drawn?.animation === result.profile.animation);
        for (const targetFrame of [gesture.follow, gesture.rest]) {
          const shown = between.find(frame => frame.drawn.frame === targetFrame); if(shown) chosen.add(shown.index);
        }
      }
    }
    chosen.add(Math.min(result.frames.length - 1, Math.round(result.profile.duration * 60) + 2));
  }
  const indices = [...chosen].filter(index => index < results[0].frames.length).sort((a,b) => a-b);
  const sheet = document.createElement('canvas'); sheet.width = indices.length * 110 + 25; sheet.height = 8 * 166 + 40;
  const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#f4edcf'; c.fillRect(0,0,sheet.width,sheet.height);
  c.fillStyle = '#263f31'; c.font = 'bold 14px sans-serif'; c.fillText(key + ' | ' + mode + ' | real Game + Renderer | mobile390px | all8views | native/contacts/recovery', 8,22);
  const selected = [];
  for (let direction = 0; direction < 8; direction++) {
    const result = results[direction]; c.fillText(DIRECTIONS[direction], 2, direction * 166 + 72);
    for (let column = 0; column < indices.length; column++) {
      const frame = result.frames[indices[column]], x = 25 + column * 110, y = 40 + direction * 166;
      c.fillStyle = column % 2 ? '#e4e8c5' : '#eaf0d2'; c.fillRect(x,y,109,165);
      const im = new Image(); im.src = 'data:image/png;base64,' + frame.tilePng; await im.decode(); c.drawImage(im,x+8,y+25);
      const native = frame.drawn || frame.pose;
      c.fillStyle = '#263f31'; c.font = '10px monospace'; c.fillText(frame.at.toFixed(3)+'s '+native.animation+':'+native.frame,x+3,y+12);
      const contacts = result.contacts.filter(hit => Math.abs(hit.rendered.at-frame.at)<.00001);
      c.fillText('releases '+frame.releases+' HP '+frame.hp,x+3,y+163);
      if(contacts.length) {c.strokeStyle='#a94825';c.lineWidth=2;c.strokeRect(x+1,y+1,107,163);}
      selected.push({direction,index:frame.index,at:frame.at,pose:frame.pose,drawn:frame.drawn,releases:frame.releases,hp:frame.hp,contactShots:contacts.map(hit=>hit.shot)});
    }
  }
  const missingObservedRasters = results.map(result => {
    const signature = frame => frame.drawn ? frame.drawn.animation + ':' + rasterIds.get(result.profile.id + ':' + frame.drawn.animation + ':' + frame.drawn.direction + ':' + frame.drawn.frame) : frame.pose.animation + ':' + frame.pose.raster;
    const shown = new Set(indices.map(index => signature(result.frames[index])));
    return { direction:result.direction, missing:[...new Set(result.frames.map(signature))].filter(value=>!shown.has(value)) };
  });
  return { key, mode, indices, selected, missingObservedRasters, png: sheet.toDataURL('image/png').split(',')[1] };
};
`;
await writeFile(path.join(output, 'harness-used.mjs'), harness);

const frozen = new Map(), inputFiles = (await readdir(dist)).filter(name => name.endsWith('.js')).map(name => `dist/${name}`);
inputFiles.push('dist/assets/pokemon/manifest.json');
for (const id of [15, 143, 249, 384, 109, 115, 50, 31, 34, 52]) {
  inputFiles.push(...(await readdir(path.join(dist, `assets/pokemon/${id}`))).filter(name => /\.(png|xml|txt)$/.test(name)).map(name => `dist/assets/pokemon/${id}/${name}`));
}
inputFiles.push(...(await readdir(path.join(dist, 'assets/battle'))).filter(name => /\.(png|webp|js)$/.test(name)).map(name => `dist/assets/battle/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(inputFiles.map(async file => {
  const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, sha(bytes)];
})));
sourceHashes['scripts/qa-combo-harness.mjs'] = sha(originalHarness);
sourceHashes['scripts/qa-global-motion-after.mjs'] = sha(await readFile(new URL(import.meta.url)));
const report = { generatedAt: new Date().toISOString(), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim(),
  scope: 'Seven corrected keys; real Game.attack/step with resistant passive target, no towers or AI. Spawned companions removed to isolate the chosen body. Snorlax target is a passive structure with finite lifetime. Renderer60Hz; engine30/60 and packGame/unpackGame event batches15Hz. Not an online server or network-jitter test.',
  keys, sourceHashes, harnessSha256: sha(harness), frozenInputFiles: frozen.size, viewport: { width: 390, height: 844 }, board: { width: 370, height: 677 }, cases: [], sheets: [], videos: [], findings: [] };
const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f7f0d5}canvas{position:absolute;left:10px;top:2px;width:370px;height:677px;image-rendering:pixelated}</style><canvas width="600" height="800"></canvas><script type="module" src="/__qa/harness.mjs"></script>';
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/') { response.writeHead(200, { 'Content-Type': mime['.html'] }).end(html); return; }
    if (pathname === '/__qa/harness.mjs') { response.writeHead(200, { 'Content-Type': mime['.mjs'] }).end(harness); return; }
    const file = path.resolve(dist, '.' + pathname); if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = frozen.get(pathname) || await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
async function video(file, frames) {
  const destination = path.join(output, 'videos', file);
  const ffmpeg = process.env.POKE_ARENA_FFMPEG || 'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe';
  const proc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '60', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destination], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = ''; proc.stderr.on('data', bytes => errors += bytes); const finished = once(proc, 'close');
  for (const png of frames) if (!proc.stdin.write(Buffer.from(png, 'base64'))) await once(proc.stdin, 'drain');
  proc.stdin.end(); assert.equal((await finished)[0], 0, errors);
  return { file: `videos/${file}`, frames: frames.length, captureHz: 60, width: 390, height: 844, bytes: (await stat(destination)).size, sha256: sha(await readFile(destination)) };
}
try {
  let playwright;
  for (const location of [process.env.PLAYWRIGHT_MODULE, process.env.POKE_ARENA_PLAYWRIGHT_MODULE, path.join(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs'), 'playwright'].filter(Boolean)) {
    try { playwright = await import(location === 'playwright' ? location : pathToFileURL(path.resolve(location)).href); break; } catch {}
  }
  assert.ok(playwright, 'Playwright is required');
  browser = await playwright.chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: report.viewport }), errors = []; page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(120000); await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => globalThis.__combo); await page.evaluate(() => __combo.ready);
  for (const key of keys) {
    for (const mode of ['engine60', 'engine30', 'snapshots15']) {
      const directions = [];
      for (let direction = 0; direction < 8; direction++) {
        const capture = direction === 4 && mode !== 'engine30' ? true : mode !== 'engine60' ? 'tiles' : false;
        const result = await page.evaluate(args => __combo.run(...args), [key, mode, capture, direction]);
        if (capture === true) report.videos.push(await video(`${key}-${mode}.mp4`, result.pngs)); delete result.pngs;
        for (const hit of result.contacts) {
          if (!hit.nativeContactVisible || !hit.nativeFrameMatches) report.findings.push({ key, mode, direction, kind: 'contact-not-visible', hit });
          if (hit.logic.frame !== hit.expectedFrame) report.findings.push({ key, mode, direction, kind: 'logical-contact-mismatch', hit });
          if (hit.emitter.error > .001) report.findings.push({ key, mode, direction, kind: 'native-emitter-mismatch', error: hit.emitter.error });
        }
        if (result.contacts.length !== result.profile.burst || !result.clockNeverRewinds || !result.recoveryObserved || !result.stableDirection) report.findings.push({ key, mode, direction, kind: 'timeline-invariant', contacts: result.contacts.length, burst: result.profile.burst, clock: result.clockNeverRewinds, recovery: result.recoveryObserved, stableDirection: result.stableDirection });
        for (const gap of result.interHit) if (!gap.followVisible || !gap.restVisible) report.findings.push({ key, mode, direction, kind: 'inter-hit-return', gap });
        directions.push(result);
      }
      if (mode !== 'engine60') {
        const sheet = await page.evaluate(args => __combo.contactSheet(...args), [key, mode, directions]);
        for (const view of sheet.missingObservedRasters) assert.equal(view.missing.length, 0, `Gallery omitted native raster: ${key}/${mode}/${view.direction}`);
        const file = `contacts/${key}-${mode}.png`; const bytes = Buffer.from(sheet.png, 'base64'); await writeFile(path.join(output, file), bytes); delete sheet.png;
        report.sheets.push({ ...sheet, file, sha256: sha(bytes) });
      }
      for (const result of directions) { for (const frame of result.frames) delete frame.tilePng; report.cases.push(result); }
    }
    console.log(`${key}: 3 modes x8views, 2 mobile contact sheets, 2 60Hz videos`);
  }
  assert.deepEqual(errors, []); report.pageErrors = errors;
  report.changedAfterFreeze = [];
  for (const file of inputFiles) if (sha(await readFile(path.join(root, file))) !== sourceHashes[file]) report.changedAfterFreeze.push(file);
  report.summary = { keys: keys.length, species: new Set(report.cases.map(r => r.profile.id)).size, timelines: report.cases.length, contacts: report.cases.reduce((sum,r) => sum+r.contacts.length, 0), samples: report.cases.reduce((sum,r) => sum+r.frames.length, 0), sheets: report.sheets.length, videos: report.videos.length, findings: report.findings.length };
  const viewer = '<!doctype html><meta charset="utf-8"><title>Corrected motion QA</title><style>body{font:16px system-ui;background:#f4edcf;color:#263f31}img{max-width:100%}video{width:390px;max-width:100%}section{margin:2rem 0}</style><h1>Seven corrected gestures</h1><p>Real Game + Renderer; engine30/60 and15Hz snapshot batches; no jitter. Contact sheets retain actual390px body scale.</p>' + report.sheets.map(s => `<section><h2>${s.key} ${s.mode}</h2><a href="${s.file}"><img src="${s.file}" loading="lazy"></a></section>`).join('') + report.videos.map(v => `<section><h2>${v.file}</h2><video src="${v.file}" controls loop muted></video></section>`).join('');
  await writeFile(path.join(output, 'index.html'), viewer);
  console.log(JSON.stringify({ ...report.summary, changedAfterFreeze: report.changedAfterFreeze, firstFindings: report.findings.slice(0, 5).map(({key,mode,direction,kind})=>({key,mode,direction,kind})) }));
  assert.equal(report.findings.length, 0, 'Corrected motion QA has findings; inspect verification.json');
} catch (error) { report.error = error.stack; throw error; }
finally {
  if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
}
