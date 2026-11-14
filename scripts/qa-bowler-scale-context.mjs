import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), out = path.join(root, 'docs/visual-followup/scales/bowler-context');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(out, { recursive: true });
const frozen = new Map(), inputs = (await readdir(dist)).filter(n => n.endsWith('.js')).map(n => `dist/${n}`);
inputs.push('dist/assets/pokemon/manifest.json');
for (const id of [75, 76, 112, 83, 534, 31, 34, 52]) inputs.push(...(await readdir(path.join(dist, `assets/pokemon/${id}`))).filter(n => /(?:Anim|Shadow|Offsets)\.png$/.test(n)).map(n => `dist/assets/pokemon/${id}/${n}`));
inputs.push(...(await readdir(path.join(dist, 'assets/battle'))).filter(n => /\.(png|webp)$/.test(n)).map(n => `dist/assets/battle/${n}`));
const sourceHashes = Object.fromEntries(await Promise.all(inputs.map(async file => { const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, hash(bytes)]; })));
sourceHashes['scripts/qa-bowler-scale-context.mjs'] = hash(await readFile(new URL(import.meta.url)));
const html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}canvas{position:absolute;left:10px;top:2px;width:370px;height:677px}</style><canvas width="600" height="800"></canvas>';
const mime = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  try {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); if (name === '/') { response.writeHead(200, { 'Content-Type': 'text/html' }).end(html); return; }
    const file = path.resolve(dist, '.' + name); if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    const bytes = frozen.get(name) || await readFile(file); response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  let pw;
  for (const location of [process.env.PLAYWRIGHT_MODULE, path.join(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs'), 'playwright'].filter(Boolean)) {
    try { pw = await import(location === 'playwright' ? location : pathToFileURL(path.resolve(location)).href); break; } catch {}
  }
  assert.ok(pw); browser = await pw.chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); await page.goto(`http://127.0.0.1:${server.address().port}`);
  const report = await page.evaluate(async () => {
    const { Renderer } = await import('/render.js?v=29'), { CARDS } = await import('/engine.js?v=26');
    const r = new Renderer(document.querySelector('canvas')); await r.load(['graveler', 'golem', 'rhydon']); await r.ensureSpecies([83, 534]);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = r.canvas.getBoundingClientRect(), sx = rect.width / 600, sy = rect.height / 800;
    const entries = [
      { key: 'graveler-current', label: 'Graveler actual / Bowler anterior', card: { ...CARDS.graveler } },
      { key: 'conkeldurr-1.85', label: 'Conkeldurr / candidato1.85', card: { ...CARDS.graveler, name: 'Conkeldurr', id: 534, scale: 1.85 } },
      { key: 'conkeldurr-2.05', label: 'Conkeldurr / candidato2.05', card: { ...CARDS.graveler, name: 'Conkeldurr', id: 534, scale: 2.05 } },
      { key: 'rhydon-current', label: 'Rhydon / P.E.K.K.A. actual', card: { ...CARDS.rhydon } },
      { key: 'golem-current', label: 'Golem actual', card: { ...CARDS.golem } },
      { key: 'farfetchd-2.2', label: "Farfetch'd / Caballero candidato2.2", card: { ...CARDS.geodude, name: "Farfetch'd", id: 83, scale: 2.2 } },
    ];
    const body = document.createElement('canvas'); body.width = body.height = 192;
    const bc = body.getContext('2d', { willReadFrequently: true }); bc.imageSmoothingEnabled = false;
    const platform = r.platform; r.platform = () => {};
    const alpha = () => { const d = bc.getImageData(0, 0, 192, 192).data; let l = 192, rr = -1, t = 192, b = -1, area = 0;
      for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) { const a = d[(y * 192 + x) * 4 + 3]; area += a / 255; if (a < 128) continue; l = Math.min(l, x); rr = Math.max(rr, x); t = Math.min(t, y); b = Math.max(b, y); }
      return { width: rr - l + 1, height: b - t + 1, area: Math.round(area * 10000) / 10000 }; };
    function draw(e, direction, time) { const angle = (2 - direction) * Math.PI / 4; bc.setTransform(1, 0, 0, 1, 0, 0); bc.clearRect(0, 0, 192, 192); bc.setTransform(sx, 0, 0, sy, 96, 145); r.t = time;
      r.sprite(bc, { id: 0, key: e.key, card: e.card, team: 0, x: 0, y: 0, scale: e.card.scale, dx: Math.cos(angle), dy: Math.sin(angle), preview: true, spawn: 0, moving: false, attack: 0, hit: 0, shield: 0, hp: e.card.hp, maxHp: e.card.hp }, true); }
    const measurements = [], sheet = document.createElement('canvas'); sheet.width = 800; sheet.height = 42 + 160 * entries.length;
    const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#f5efd6'; c.fillRect(0, 0, 800, sheet.height); c.fillStyle = '#2d4436'; c.font = 'bold 15px sans-serif'; c.fillText('Bowler body size | real Renderer390px | same grid24 | no collisions drawn', 8, 24);
    for (let index = 0; index < entries.length; index++) {
      const e = entries[index], meta = r.metadata[e.card.id].Idle, seconds = meta.durations.reduce((a, b) => a + b, 0) / 45, samples = [];
      const y = 42 + index * 160; c.fillStyle = index % 2 ? '#e5eac9' : '#eef1d8'; c.fillRect(0, y, 800, 160); c.fillStyle = '#2d4436'; c.font = 'bold 12px sans-serif'; c.fillText(e.label + ' | scale' + e.card.scale, 8, y + 16);
      for (let direction = 0; direction < 8; direction++) {
        r.resetVisuals(); for (let n = 0; n <= Math.ceil(seconds * 60); n++) { const time = Math.min(seconds - .00001, n / 60); draw(e, direction, time); samples.push({ direction, time, ...alpha() }); }
        const x = direction * 100, baseline = y + 115; c.strokeStyle = '#9eb08755'; c.lineWidth = 1;
        for (let xx = x + 50 - 24 * sx * 3; xx < x + 100; xx += 24 * sx) { c.beginPath(); c.moveTo(xx, y + 25); c.lineTo(xx, y + 135); c.stroke(); }
        for (let yy = baseline; yy > y + 25; yy -= 24 * sy) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 100, yy); c.stroke(); }
        r.resetVisuals(); draw(e, direction, 0); c.drawImage(body, x + 50 - 96, baseline - 145); c.fillStyle = '#2d4436'; c.font = '10px monospace'; c.fillText(['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'][direction], x + 5, y + 32); c.fillRect(x + 49, baseline - 1, 3, 3);
      }
      const m = { key: e.key, id: e.card.id, scale: e.card.scale, minWidth: Math.min(...samples.map(s => s.width)), maxWidth: Math.max(...samples.map(s => s.width)), minHeight: Math.min(...samples.map(s => s.height)), maxHeight: Math.max(...samples.map(s => s.height)), maxArea: Math.max(...samples.map(s => s.area)), samples: samples.length };
      measurements.push(m); c.fillStyle = '#2d4436'; c.font = '10px sans-serif'; c.fillText(`Whole Idle: ${m.minWidth}..${m.maxWidth}x${m.minHeight}..${m.maxHeight}pxCSS; max alpha area${m.maxArea}px2`, 8, y + 151);
    }
    r.platform = platform;
    return { viewport: { width: 390, height: 844, arenaCssWidth: rect.width, arenaCssHeight: rect.height, sx, sy, tile: 24 }, measurements, png: sheet.toDataURL('image/png').split(',')[1] };
  });
  const png = Buffer.from(report.png, 'base64'); delete report.png; await writeFile(path.join(out, 'role-comparison.png'), png);
  report.sheet = { file: 'role-comparison.png', sha256: hash(png) }; report.sourceHashes = sourceHashes; report.alphaThreshold = 128; report.changedAfterFreeze = [];
  for (const file of inputs) if (hash(await readFile(path.join(root, file))) !== sourceHashes[file]) report.changedAfterFreeze.push(file);
  await writeFile(path.join(out, 'measurements.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ measurements: report.measurements, changedAfterFreeze: report.changedAfterFreeze }));
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
