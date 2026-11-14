import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist'), output = path.join(root, 'docs/visual-followup/capsule-v2');
await mkdir(output, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), baselineFile = path.join(output, 'inputs/capsule-live-v34.js');
const baseline = await readFile(baselineFile), expectedBaseline = 'a8a5b458eee3ccfba5596131df951a45ac21232369d8bd000d103d2e30726c5e';
assert.equal(sha(baseline), expectedBaseline, 'The authentic live-v34 capsule source must match its supplied hash.');
const frozen = new Map(), files = [...(await readdir(dist)).filter(name => /\.(js|css|html)$/.test(name)).map(name => `dist/${name}`), 'dist/assets/pokemon/manifest.json'];
for (const directory of ['assets/battle', 'assets/ui']) files.push(...(await readdir(path.join(dist, directory))).filter(name => /\.(js|png|webp)$/.test(name)).map(name => `dist/${directory}/${name}`));
const sourceHashes = Object.fromEntries(await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); frozen.set('/' + file.slice(5), bytes); return [file, sha(bytes)]; })));
sourceHashes['scripts/qa-capsule-v2.mjs'] = sha(await readFile(path.join(root, 'scripts/qa-capsule-v2.mjs')));
const report = { generatedAt: new Date().toISOString(), cut: 'Frozen local proposal files. The app camera may continue changing outside this captured cut.', sourceHashes,
  baseline: { url: 'https://poke-arena-erick.eriqrb.chatgpt.site/', suppliedFile: baselineFile, sha256: expectedBaseline, scope: 'Authentic v34 graphic function replayed over the same frozen local Game trajectory. This A/B is not a recording of production gameplay.' }, artifacts: [] };
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/__qa/live-capsule.mjs') { response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(baseline); return; }
    const local = pathname === '/' ? '/index.html' : pathname, file = path.resolve(dist, '.' + local);
    if (!file.startsWith(dist + path.sep)) { response.writeHead(403).end(); return; }
    let bytes = frozen.get(local) || await readFile(file);
    if (local === '/app.js') bytes = Buffer.from("document.getElementById('arena').getContext('2d',{alpha:false,willReadFrequently:true});\n" + bytes.toString('utf8') + '\nglobalThis.__capsuleApp={get game(){return game},renderer};');
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let playwright, browser;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
async function save(file, bytes) { await writeFile(path.join(output, file), bytes); report.artifacts.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
try {
  assert.ok(playwright, 'Playwright is required.'); browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => globalThis.__capsuleApp && !document.getElementById('start-btn').disabled);
  await page.locator('#start-btn').click();
  const result = await page.evaluate(async () => {
    const { drawCapsule: oldDraw } = await import('/__qa/live-capsule.mjs'), { CapsuleArt } = await import('/capsule-art.js'), { Game } = await import('/engine.js?v=26');
    const app = __capsuleApp, r = app.renderer, draw = r.draw.bind(r), newCapsule = r.capsule.bind(r); r.draw = () => {}; app.game.step = () => {};
    r.resetVisuals(); r.effects = []; r.particles = []; r.numbers = []; r.t = 0; r.selection = null; r.pointer = null;
    const art = new CapsuleArt(r.battleArt.images.get('assets/battle/pokeball-material-v2.png'));
    const strip = document.createElement('canvas'); strip.width = 8 * 120; strip.height = 340; const c = strip.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#294638'; c.fillRect(0, 0, strip.width, strip.height); c.font = '12px monospace';
    const phases = [];
    for (let phase = 0; phase < 8; phase++) {
      const angle = phase * Math.PI / 4, x = phase * 120 + 60;
      c.fillStyle = '#f6edce'; c.fillText(`${phase}/8`, phase * 120 + 8, 20);
      oldDraw(c, x, 58, 32.0666666667, angle); art.draw(c, x, 118, 32.0666666667, angle, 0);
      c.save(); c.translate(x, 242); c.scale(3, 3); art.draw(c, 0, 0, 32.0666666667, angle, 0); c.restore();
      phases.push({ phase, angle, atlasPhase: art.lastFrame.phase });
    }
    c.fillStyle = '#f6edce'; c.fillText('v34 auténtica', 8, 88); c.fillText('propuesta · tamaño móvil', 8, 148); c.fillText('propuesta ×3 · inspección', 8, 330);
    const g = new Game({ seed: 4201, onEvent: event => r.onEvent(event) }); g.start(); g.aiEnabled = false;
    for (const tower of g.towers) { tower.active = false; tower.cooldown = 999; tower.hp = tower.maxHp = 1e6; }
    for (const team of [0, 1]) { g.hands[team][0] = 'sneaselAmbush'; g.energy[team] = 10; const deployed = g.deploy(team, 0, team ? 442 : 158, team ? 628 : 172); if (!deployed.ok) throw new Error(deployed.reason); }
    for (let frame = 0; frame <= 60; frame++) { if (frame && frame % 2 === 0) g.step(1 / 30); draw(g, frame ? 1 / 60 : 0); }
    const positions = [];
    r.capsule = (ctx, x, y, size, angle, axis) => { positions.push({ variant: 'proposal', x, y, size, angle, axis }); newCapsule(ctx, x, y, size, angle, axis); }; draw(g, 0);
    const newPng = r.canvas.toDataURL('image/png').split(',')[1];
    r.capsule = (ctx, x, y, size, angle, axis) => { positions.push({ variant: 'live-v34-graphic', x, y, size, angle, axis }); ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / (r.verticalScale || 1)); oldDraw(ctx, 0, 0, size, angle); ctx.restore(); }; draw(g, 0);
    const oldPng = r.canvas.toDataURL('image/png').split(',')[1];
    globalThis.__capsuleReview = { r, g, draw, newCapsule, oldDraw, positions, newPng, oldPng };
    const b = r.canvas.getBoundingClientRect();
    return { strip: strip.toDataURL('image/png').split(',')[1], phases, positions, board: { width: b.width, height: b.height, verticalScale: r.verticalScale }, texture: { loaded: !!r.capsuleArt.texture, width: art.texture.width, height: art.texture.height }, stats: art.stats };
  });
  await save('phases-8.png', Buffer.from(result.strip, 'base64')); delete result.strip; report.firstReview = result;
  await save('arena-live-v34-graphic.png', await page.screenshot());
  await page.evaluate(() => { __capsuleReview.r.capsule = __capsuleReview.newCapsule; __capsuleReview.draw(__capsuleReview.g, 0); });
  await save('arena-proposal.png', await page.screenshot());
  assert.deepEqual(result.positions.filter(p => p.variant === 'proposal').map(({ variant, ...p }) => p), result.positions.filter(p => p.variant === 'live-v34-graphic').map(({ variant, ...p }) => p));
  assert.deepEqual(errors, []); report.pageErrors = errors;
  console.log(JSON.stringify({ firstReview: 'ready', files: report.artifacts.map(a => a.file), texture: result.texture, identicalTrajectoryAndViewport: true }));
} catch (error) { report.error = error.stack; throw error; }
finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); await writeFile(path.join(output, 'first-review.json'), JSON.stringify(report, null, 2) + '\n'); }
