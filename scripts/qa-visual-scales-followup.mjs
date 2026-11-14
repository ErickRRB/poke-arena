import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { openPage, ready } from '../tests/browser/helpers.mjs';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist');
const out = path.join(root, 'docs/visual-followup/scales');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(out, { recursive: true });
const frozen = new Map(), inputs = (await readdir(dist)).filter(file => /\.(js|css|html)$/.test(file)).map(file => `dist/${file}`);
inputs.push('dist/assets/pokemon/manifest.json');
for (const id of (await readdir(path.join(dist, 'assets/pokemon'))).filter(name => /^\d+$/.test(name))) {
  inputs.push(...(await readdir(path.join(dist, 'assets/pokemon', id))).filter(name => /(?:Anim|Shadow|Offsets)\.png$|\.xml$|^credits\.txt$/.test(name)).map(name => `dist/assets/pokemon/${id}/${name}`));
}
inputs.push(...(await readdir(path.join(dist, 'assets/battle'))).filter(name => /\.(png|webp|js)$/.test(name)).map(name => `dist/assets/battle/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(inputs.map(async file => {
  const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, hash(bytes)];
})));
sourceHashes['scripts/qa-visual-scales-followup.mjs'] = hash(await readFile(new URL(import.meta.url)));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const name = pathname === '/' ? '/index.html' : pathname, file = path.resolve(dist, '.' + name);
    if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
    const bytes = frozen.get(name) || await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  let playwright;
  for (const location of [process.env.PLAYWRIGHT_MODULE, path.join(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs'), 'playwright'].filter(Boolean)) {
    try { playwright = await import(location === 'playwright' ? location : pathToFileURL(path.resolve(location)).href); break; } catch {}
  }
  assert.ok(playwright, 'Use an existing Playwright installation');
  browser = await playwright.chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const { context, page, errors } = await openPage(browser, { width: 390, height: 844 });
  page.setDefaultTimeout(180000); await page.exposeFunction('scaleProgress', value => console.log(value));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await ready(page); await page.locator('#start-btn').click();
  const report = await page.evaluate(async () => {
    const { Game, CARDS, TILE, W, H } = await import('/engine.js?v=26');
    const { CARD_EQUIVALENTS } = await import('/card-equivalents.js');
    const { movementVisual } = await import('/combat-visuals.js?v=29');
    const r = __qa.renderer; r.draw = () => {}; __qa.game.step = () => {};
    r.resetVisuals(); r.reduced = false;
    const rect = r.canvas.getBoundingClientRect(), sx = rect.width / W, sy = rect.height / H, vertical = r.verticalScale;
    const round = n => Math.round(n * 10000) / 10000;
    const entries = Object.entries(CARDS).filter(([, card]) => card.id).map(([key, card]) => ({ key, card: { ...card }, scope: 'catalogue', sourceKey: key }));
    const derived = new Game(); derived.state = 'playing'; derived.towers = []; derived.units = [];
    const parent = derived.spawn('golem', 0, 300, 500, 0); derived.damage(parent, 1e9, 1);
    const child = derived.units.find(u => u !== parent && u.hp > 0);
    if (child) entries.push({ key: 'golemDeathGeodude', sourceKey: child.key, scope: 'derived_golem_token', card: { ...child.card, id: 74, name: 'Geodude pequeno de Golem', role: 'Token de Golem', scale: child.scale, token: true, cost: 0, hp: child.maxHp }, radius: child.radius });
    const extras = [
      { id: 83, key: 'knightFarfetchdCandidate', sourceKey: 'geodude', name: "Farfetch'd", scale: 2.2 },
      { id: 534, key: 'bowlerConkeldurrCandidate', sourceKey: 'graveler', name: 'Conkeldurr', scale: 1.85 },
    ];
    const missingCandidates = [];
    for (const e of extras) {
      if (!r.metadata[e.id]) { missingCandidates.push(e.id); continue; }
      entries.push({ key: e.key, sourceKey: e.sourceKey, scope: 'species_replacement_candidate', card: { ...CARDS[e.sourceKey], id: e.id, name: e.name, scale: e.scale } });
    }
    await r.ensureSpecies([...new Set(entries.map(e => e.card.id))]);
    const group = entry => {
      const c = entry.card;
      if (entry.scope === 'species_replacement_candidate') return 'replacement-candidates';
      if (['electrode', 'exeggutor', 'registeel'].includes(entry.key)) return 'legacy';
      if (c.structure) return 'structures';
      if (c.token || c.count > 1) return 'swarms-tokens';
      if (c.flying) return c.hp >= 1800 ? 'air-heavy' : 'air-support';
      if (c.building || c.hp >= 3000) return 'tanks';
      if (c.hp >= 1800 || c.role?.includes('Mini tanque')) return 'frontline';
      if (c.range >= 50) return 'ranged-support';
      return 'fighters-cycle';
    };
    const source = new Map();
    function alpha(canvas, threshold = 128) {
      const context = canvas.getContext('2d', { willReadFrequently: true }), data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width, right = -1, top = canvas.height, bottom = -1, pixels = 0, sumAlpha = 0;
      let anyLeft = canvas.width, anyRight = -1, anyTop = canvas.height, anyBottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const a = data[(y * canvas.width + x) * 4 + 3]; if (!a) continue;
        anyLeft = Math.min(anyLeft, x); anyRight = Math.max(anyRight, x); anyTop = Math.min(anyTop, y); anyBottom = Math.max(anyBottom, y); sumAlpha += a / 255;
        if (a < threshold) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); pixels++;
      }
      return { alphaThreshold: threshold, left, top, right, bottom, width: right >= left ? right - left + 1 : 0, height: bottom >= top ? bottom - top + 1 : 0, pixels, alphaArea: round(sumAlpha), anyAlphaBounds: { left: anyLeft, top: anyTop, right: anyRight, bottom: anyBottom, width: anyRight >= anyLeft ? anyRight - anyLeft + 1 : 0, height: anyBottom >= anyTop ? anyBottom - anyTop + 1 : 0 } };
    }
    function native(id, animation) {
      const key = `${id}:${animation}`; if (source.has(key)) return source.get(key);
      const meta = r.metadata[id]?.[animation], image = r.sprites.get(`${id}-${animation}`); if (!image || !meta) return null;
      const canvas = document.createElement('canvas'); canvas.width = meta.width; canvas.height = meta.height;
      const c = canvas.getContext('2d', { willReadFrequently: true }), poses = [];
      const directions = Math.min(8, image.height / meta.height);
      for (let direction = 0; direction < directions; direction++) for (let frame = 0; frame < meta.durations.length; frame++) {
        c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(image, frame * meta.width, direction * meta.height, meta.width, meta.height, 0, 0, meta.width, meta.height);
        poses.push({ direction, frame, ...alpha(canvas, 1) });
      }
      const extrema = values => ({ minWidth: Math.min(...values.map(p => p.width)), maxWidth: Math.max(...values.map(p => p.width)), minHeight: Math.min(...values.map(p => p.height)), maxHeight: Math.max(...values.map(p => p.height)), minArea: Math.min(...values.map(p => p.alphaArea)), maxArea: Math.max(...values.map(p => p.alphaArea)) });
      const result = { animation, frame0: extrema(poses.filter(p => !p.frame)), fullCycle: extrema(poses), poses }; source.set(key, result); return result;
    }
    const body = document.createElement('canvas'); body.width = 192; body.height = 192;
    const bc = body.getContext('2d', { willReadFrequently: true }); bc.imageSmoothingEnabled = false;
    const nativeDraw = bc.drawImage.bind(bc); let drawn;
    bc.drawImage = (image, ...args) => { drawn = { source: image.src?.split('/').pop() || 'articulated', args }; return nativeDraw(image, ...args); };
    const platform = r.platform.bind(r), rigs = new Set([6, 123, 373]);
    function draw(entry, direction, time, state, withBase = false) {
      const card = entry.card, angle = (2 - direction) * Math.PI / 4;
      const actor = { id: 0, key: entry.sourceKey, card, scale: card.scale, team: 0, x: 0, y: 0, dx: Math.cos(angle), dy: Math.sin(angle), hp: card.hp, maxHp: card.hp, spawn: 0, hit: 0, shield: 0, preview: true, moving: state === 'walk', anim: time, attack: state === 'attack' ? Math.max(0, card.attackDuration - time) : 0, attackDuration: card.attackDuration, attackWindup: card.windup, attackAnim: card.attackAnim };
      bc.setTransform(1, 0, 0, 1, 0, 0); bc.clearRect(0, 0, 192, 192); bc.setTransform(sx, 0, 0, sy, 96, 145); drawn = null;
      r.t = time; r.platform = withBase ? platform : () => {}; r.sprite(bc, actor, true); r.platform = platform;
      return drawn;
    }
    function cycle(entry, state = 'rest') {
      const card = entry.card, motion = movementVisual(card), animation = state === 'attack' ? card.attackAnim : state === 'walk' || card.flying ? motion.animation : card.idleAnim || 'Idle';
      const meta = r.metadata[card.id][animation];
      const seconds = state === 'attack' ? card.attackDuration : motion.frames && animation === motion.animation ? motion.frames.length * motion.frameDuration / 60 : meta.durations.reduce((a, b) => a + b, 0) / 60 / (card.flying || state === 'walk' ? .85 : .75);
      const count = Math.ceil(seconds * 60), views = [], all = [];
      for (let direction = 0; direction < 8; direction++) {
        r.resetVisuals(); const samples = [], memo = new Map();
        for (let index = 0; index <= count; index++) {
          const t = Math.min(seconds - .00001, index / 60), drawing = draw(entry, direction, Math.max(0, t), state);
          const signature = rigs.has(card.id) ? `${index}` : JSON.stringify(drawing);
          let box = memo.get(signature); if (!box) { box = alpha(body); memo.set(signature, box); }
          samples.push({ index, t: round(t), ...box, drawn: drawing });
        }
        const maxHeight = samples.reduce((a, b) => b.height > a.height ? b : a), maxWidth = samples.reduce((a, b) => b.width > a.width ? b : a);
        views.push({ direction, count: samples.length, framesObserved: rigs.has(card.id) ? 'articulated' : [...new Set(samples.map(s => s.drawn.args[0] / meta.width))].sort((a,b)=>a-b), uniqueRasterMeasurements: memo.size, first: samples[0], maxHeight, maxWidth, minWidth: Math.min(...samples.map(s => s.width)), minHeight: Math.min(...samples.map(s => s.height)) }); all.push(...samples);
      }
      return { state, animation, seconds: round(seconds), samples: all.length, rasterMeasurements: views.reduce((n, v) => n + v.uniqueRasterMeasurements, 0), minWidth: Math.min(...all.map(s => s.width)), maxWidth: Math.max(...all.map(s => s.width)), minHeight: Math.min(...all.map(s => s.height)), maxHeight: Math.max(...all.map(s => s.height)), minArea: Math.min(...all.map(s => s.alphaArea)), maxArea: Math.max(...all.map(s => s.alphaArea)), views };
    }
    const metrics = [], collisions = [];
    for (const [index, entry] of entries.entries()) {
      const card = entry.card, idle = native(card.id, 'Idle'), walk = native(card.id, movementVisual(card).animation), current = cycle(entry);
      const s = card.scale, nominal = values => ({ width: round(values.maxWidth * s), height: round(values.maxHeight * s), area: round(values.maxArea * s * s), cssWidth: round(values.maxWidth * s * sx), cssHeight: round(values.maxHeight * s * sx) });
      metrics.push({ key: entry.key, sourceKey: entry.sourceKey, scope: entry.scope, id: card.id, name: card.name, role: card.role, reference: entry.scope === 'derived_golem_token' ? null : CARD_EQUIVALENTS[entry.sourceKey]?.reference || null, similarity: entry.scope === 'derived_golem_token' ? 'none' : CARD_EQUIVALENTS[entry.sourceKey]?.similarity || 'none', group: group(entry), scale: card.scale, cost: card.cost, hp: card.hp, count: card.count || 1, token: !!card.token, nativeIdle: idle, nativeMovement: walk, nominalIdleFrame0: nominal(idle.frame0), nominalIdleFull: nominal(idle.fullCycle), actualRestCycle: current });
      const radius = entry.radius ?? card.radius ?? 12;
      collisions.push({ key: entry.key, sourceKey: entry.sourceKey, scope: entry.scope, radius, diameter: radius * 2, groundTiles: round(radius * 2 / TILE), cssWidth: round(radius * 2 * sx), cssHeight: round(radius * 2 * sy), independentOfScale: true });
      if (index % 15 === 0) await scaleProgress(`Measured ${index + 1}/${entries.length}: ${entry.key}`);
    }
    const sheets = [], dirs = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
    function sheet(name, title, rows) {
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 42 + rows.length * 160;
      const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#f5efd6'; c.fillRect(0, 0, canvas.width, canvas.height); c.fillStyle = '#2d4436'; c.font = 'bold 15px sans-serif'; c.fillText(title, 8, 24);
      const cells = [];
      for (const [i, row] of rows.entries()) {
        const entry = row.entry, metric = metrics.find(m => m.key === entry.key), y = 42 + i * 160;
        c.fillStyle = i % 2 ? '#e5eac9' : '#eef1d8'; c.fillRect(0, y, 800, 160); c.fillStyle = '#2d4436'; c.font = 'bold 12px sans-serif'; c.fillText(row.label || `${entry.card.name} | ${metric.reference || entry.card.role} | scale ${entry.card.scale}`, 8, y + 16);
        for (let direction = 0; direction < 8; direction++) {
          const x = direction * 100, baseline = y + 115, t = row.state === 'attack' ? row.time ?? entry.card.windup : row.time ?? 0;
          c.strokeStyle = '#9eb08755'; c.lineWidth = 1;
          for (let xx = x + 50 - TILE * sx * 3; xx < x + 100; xx += TILE * sx) { c.beginPath(); c.moveTo(xx, y + 25); c.lineTo(xx, y + 135); c.stroke(); }
          for (let yy = baseline; yy > y + 25; yy -= TILE * sy) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + 100, yy); c.stroke(); }
          r.resetVisuals(); draw(entry, direction, t, row.state || 'rest', true);
          c.drawImage(body, x + 50 - 96, baseline - 145);
          c.fillStyle = '#2d4436'; c.font = '10px monospace'; c.fillText(dirs[direction], x + 5, y + 32); c.fillRect(x + 49, baseline - 1, 3, 3);
          cells.push({ direction, time: t, state: row.state || 'rest', key: entry.key, scale: entry.card.scale });
        }
        c.fillStyle = '#2d4436'; c.font = '10px sans-serif';
        c.fillText(row.note || `Full Idle native ${metric.nativeIdle.fullCycle.maxWidth}x${metric.nativeIdle.fullCycle.maxHeight}px; painted rest ${metric.actualRestCycle.maxWidth}x${metric.actualRestCycle.maxHeight}pxCSS; collision in separate CSV`, 8, y + 151);
      }
      sheets.push({ name, cells, png: canvas.toDataURL('image/png').split(',')[1] });
    }
    const groups = ['fighters-cycle', 'ranged-support', 'frontline', 'tanks', 'air-support', 'air-heavy', 'structures', 'swarms-tokens', 'legacy', 'replacement-candidates'];
    for (const category of groups) {
      const rows = entries.filter(e => group(e) === category).sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
      for (let index = 0; index < rows.length; index += 6) sheet(`${category}-${index / 6 + 1}.png`, `${category} | actual390px | ground grid24=${round(TILE * sx)}x${round(TILE * sy)}pxCSS`, rows.slice(index, index + 6).map(entry => ({ entry })));
    }
    const candidateSets = [
      { key: 'ampharos', scales: [CARDS.ampharos.scale, 1.8, 1.85, 1.95], states: ['rest', 'attack'] },
      { key: 'nuzleaf', scales: [CARDS.nuzleaf.scale, 1.45, 1.55], states: ['rest'] },
      { key: 'alakazam', scales: [CARDS.alakazam.scale, 1.3], states: ['rest'] },
      { key: 'knightFarfetchdCandidate', scales: [2, 2.2, 2.4], states: ['rest'] },
      { key: 'bowlerConkeldurrCandidate', scales: [1.75, 1.85, 1.95], states: ['rest'] },
    ], candidates = [];
    for (const candidate of candidateSets) {
      const original = entries.find(e => e.key === candidate.key); if (!original) continue;
      for (const state of candidate.states) {
        const rows = [];
        for (const scale of candidate.scales) {
          const entry = { ...original, card: { ...original.card, scale } }, measurement = cycle(entry, state);
          candidates.push({ key: entry.key, id: entry.card.id, scale, state, nativeAnimation: native(entry.card.id, measurement.animation), actual: measurement });
          for (const phase of ['start', 'tallest']) {
            const time = phase === 'start' ? 0 : measurement.views.reduce((a, b) => a.maxHeight.height >= b.maxHeight.height ? a : b).maxHeight.t;
            rows.push({ entry, state, time, label: `${entry.card.name} | ${state} ${phase} | scale ${scale} | t=${round(time)}`, note: `Cycle all8views: ${measurement.minWidth}..${measurement.maxWidth}x${measurement.minHeight}..${measurement.maxHeight}pxCSS; no collision change` });
          }
        }
        for (let i = 0; i < rows.length; i += 6) sheet(`candidate-${candidate.key}-${state}-${i / 6 + 1}.png`, `Candidate comparison | ${candidate.key} | real Renderer body | grid24`, rows.slice(i, i + 6));
      }
      await scaleProgress(`Compared candidates: ${candidate.key}`);
    }
    r.platform = platform;
    return { date: '2026-11-14', scene: 'Read-only synthetic Renderer scale scenes; no combat validation. All current keys plus a separately derived Golem token and two replacement candidates.', measurementThresholds: { native: 1, paintedCore: 128, note: 'All nonzero-alpha bounds are also retained per sample; core bounds exclude almost-transparent atlas fringes after projection.' }, coverage: { allKeys: Object.keys(CARDS).length, bodyKeys: entries.filter(e => e.scope === 'catalogue').length, measuredBodies: entries.length, species: new Set(entries.map(e => e.card.id)).size, missingCandidates, effects: Object.entries(CARDS).filter(([, c]) => !c.id).map(([key]) => ({ key, reference: CARD_EQUIVALENTS[key]?.reference || null })) }, viewport: { width: 390, height: 844, arenaCssWidth: rect.width, arenaCssHeight: rect.height, sx, sy, vertical, tile: TILE, tileCss: { width: round(TILE * sx), height: round(TILE * sy) } }, metrics, collisions, candidates, sheets };
  });
  assert.equal(report.coverage.bodyKeys, report.metrics.filter(m => m.scope === 'catalogue').length);
  assert.ok(report.metrics.every(m => m.actualRestCycle.minWidth > 0 && m.actualRestCycle.minHeight > 0)); assert.deepEqual(errors, []);
  for (const sheet of report.sheets) { const bytes = Buffer.from(sheet.png, 'base64'); await writeFile(path.join(out, sheet.name), bytes); sheet.sha256 = hash(bytes); delete sheet.png; }
  report.gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
  report.sourceHashes = sourceHashes; report.frozenInputFiles = frozen.size; report.changedAfterFreeze = [];
  for (const file of inputs) if (hash(await readFile(path.join(root, file))) !== sourceHashes[file]) report.changedAfterFreeze.push(file);
  await writeFile(path.join(out, 'measurements.json'), JSON.stringify(report, null, 2) + '\n');
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`, csv = rows => rows.map(row => row.map(quote).join(',')).join('\n') + '\n';
  await writeFile(path.join(out, 'body-measurements.csv'), csv([['key', 'scope', 'id', 'name', 'role', 'reference', 'scale', 'idleFrame0WidthU', 'idleFrame0HeightU', 'idleCycleWidthU', 'idleCycleHeightU', 'paintedMinWidthCss', 'paintedMaxWidthCss', 'paintedMinHeightCss', 'paintedMaxHeightCss', 'paintedMaxAlphaAreaCss', 'decision'], ...report.metrics.map(m => [m.key, m.scope, m.id, m.name, m.role, m.reference, m.scale, m.nominalIdleFrame0.width, m.nominalIdleFrame0.height, m.nominalIdleFull.width, m.nominalIdleFull.height, m.actualRestCycle.minWidth, m.actualRestCycle.maxWidth, m.actualRestCycle.minHeight, m.actualRestCycle.maxHeight, m.actualRestCycle.maxArea, 'pending_visual_review'])]));
  await writeFile(path.join(out, 'collisions-separate.csv'), csv([Object.keys(report.collisions[0]), ...report.collisions.map(row => Object.values(row))]));
  await writeFile(path.join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Scale follow-up</title><style>body{font:16px system-ui;background:#f5efd6;color:#2d4436}img{max-width:100%}section{margin:2rem 0}</style><h1>Scale follow-up:390px / grid24</h1><p>Read-only Renderer scenes. Bodies and ground collisions measured separately. CR sprite pixel parity is not established.</p>' + report.sheets.map(s => `<section><h2>${s.name}</h2><a href="${s.name}"><img src="${s.name}" loading="lazy"></a></section>`).join(''));
  console.log(JSON.stringify({ coverage: report.coverage, viewport: report.viewport, sheets: report.sheets.length, changedAfterFreeze: report.changedAfterFreeze }));
  await context.close();
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
