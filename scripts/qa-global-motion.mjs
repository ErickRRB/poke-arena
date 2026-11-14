import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { openPage, ready } from '../tests/browser/helpers.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'docs/battle-refinement/global-motion');
const inputFiles = ['dist/engine.js', 'dist/catalog.js', 'dist/balance.js', 'dist/unit-sizes.js', 'dist/render.js', 'dist/sprite-motion.js', 'dist/combat-visuals.js', 'dist/attack-choreography.js', 'dist/wing-motion.js', 'dist/wing-rigs.js', 'dist/sprite-geometry.js', 'dist/assets/pokemon/manifest.json'];
const hashes = async () => Promise.all(inputFiles.map(async file => {
  try { return { file, sha256: createHash('sha256').update(await readFile(path.join(root, file))).digest('hex') }; }
  catch (error) { if (error.code === 'ENOENT') return { file, absent: true }; throw error; }
}));
const before = await hashes();
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const server = http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(dist, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  let playwright;
  if (process.env.PLAYWRIGHT_MODULE) playwright = await import(pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href);
  else {
    try { playwright = await import('playwright'); }
    catch { playwright = await import(pathToFileURL(path.join(root, '../pokemon-arena/qa/node_modules/playwright/index.mjs')).href); }
  }
  browser = await playwright.chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const { context, page, errors } = await openPage(browser, { width: 390, height: 844 });
  try {
    page.setDefaultTimeout(120000);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await ready(page);
    await page.locator('#start-btn').click();
    const report = await page.evaluate(async () => {
      const r = __qa.renderer;
      r.draw = () => {};
      __qa.game.step = () => {};
      const { CARDS, directionRow } = await import('/engine.js?v=26');
      const { attackAnimationFrame, animationFrame, movementAnchor, emitterPart } = await import('/sprite-motion.js?v=26');
      const { movementVisual } = await import('/combat-visuals.js?v=29');
      const { SPRITE_GEOMETRY } = await import('/sprite-geometry.js');
      const cards = Object.entries(CARDS).filter(([, card]) => card.id);
      await r.ensureSpecies([...new Set(cards.map(([, card]) => card.id))]);
      const rect = r.canvas.getBoundingClientRect();
      const cssScale = rect.width / 600;
      const vertical = r.verticalScale;
      r.reduced = false;
      const round = n => Math.round(n * 1e6) / 1e6;
      const dirs = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
      const native = new Map();
      function imageHash(data) {
        let hash = 2166136261;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619);
        return (hash >>> 0).toString(16).padStart(8, '0');
      }
      function poses(id, animation) {
        const key = `${id}:${animation}`;
        if (native.has(key)) return native.get(key);
        const meta = r.metadata[id][animation];
        const image = r.sprites.get(`${id}-${animation}`);
        if (!image || !meta) throw Error(`Missing native image ${key}`);
        const canvas = document.createElement('canvas');
        canvas.width = meta.width; canvas.height = meta.height;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        const result = [];
        for (let direction = 0; direction < 8; direction++) {
          result[direction] = [];
          for (let frame = 0; frame < meta.durations.length; frame++) {
            c.clearRect(0, 0, canvas.width, canvas.height);
            c.drawImage(image, frame * meta.width, direction * meta.height, meta.width, meta.height, 0, 0, meta.width, meta.height);
            const pixels = c.getImageData(0, 0, meta.width, meta.height);
            let left = meta.width, top = meta.height, right = -1, bottom = -1;
            for (let y = 0; y < meta.height; y++) for (let x = 0; x < meta.width; x++) if (pixels.data[(y * meta.width + x) * 4 + 3]) {
              left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
            }
            const crop = right < 0 ? new Uint8ClampedArray() : c.getImageData(left, top, right - left + 1, bottom - top + 1).data;
            result[direction][frame] = { signature: `${right - left + 1}x${bottom - top + 1}:${imageHash(crop)}`, bbox: [left, top, right, bottom] };
          }
        }
        native.set(key, result);
        return result;
      }
      const sprite = document.createElement('canvas');
      sprite.width = 150; sprite.height = 144;
      const sc = sprite.getContext('2d', { willReadFrequently: true });
      const rawDraw = sc.drawImage.bind(sc);
      let spriteDraw;
      sc.drawImage = (image, ...args) => {
        spriteDraw = { source: image.src?.split('/').pop() || 'articulated-canvas', args: [...args] };
        return rawDraw(image, ...args);
      };
      const allSamples = [], rows = [], sheets = [];
      const group = card => card.structure ? 'structures' : card.token || card.count > 1 ? 'swarms-tokens' : card.flying ? 'flying' : card.hp >= 1800 || card.building ? 'heavy' : 'support';
      const sorted = [...cards].sort((a, b) => group(a[1]).localeCompare(group(b[1])) || a[1].id - b[1].id || a[0].localeCompare(b[0]));
      const byKind = { attack: [], movement: [] };
      for (const [ordinal, [key, card]] of sorted.entries()) {
        const movement = movementVisual(card);
        const attackName = card.attackAnim || 'Attack';
        const duration = card.attackDuration || .75;
        const windup = card.windup ?? .18;
        const active = !card.passive && card.damage > 0;
        const mobile = card.speed > 0 || card.flying;
        const movementName = mobile ? movement.animation : card.idleAnim || 'Idle';
        const meta = r.metadata[card.id][attackName];
        const movingMeta = r.metadata[card.id][movementName];
        const moveLoop = mobile && movement.frames ? { durations: movement.frames.map(() => movement.frameDuration) } : movingMeta;
        const moveSeconds = Math.max(.6, 2 * moveLoop.durations.reduce((a, b) => a + b, 0) / (60 * (mobile && movement.frames ? 1 : mobile ? .85 : .75)));
        const row = { key, name: card.name, id: card.id, group: group(card), card: JSON.parse(JSON.stringify(card)), delegatedRigReview: [6, 123, 373].includes(card.id), active, attackAnimation: attackName, movementAnimation: movementName, directions: [], galleries: {} };
        for (const kind of ['attack', 'movement']) {
          const length = kind === 'attack' ? duration + 3 / 60 : moveSeconds;
          const indices = Array.from({ length: Math.ceil(length * 60) + 1 }, (_, i) => i);
          const stateAt = (sample, direction) => {
            const t = sample / 60;
            const attacking = kind === 'attack' && active && sample >= 0 && t < duration;
            const animation = attacking ? attackName : kind === 'movement' && mobile || card.flying ? movement.animation : card.idleAnim || 'Idle';
            const am = r.metadata[card.id][animation];
            const useLoop = !attacking && animation === movement.animation && movement.frames;
            const loop = useLoop ? { durations: movement.frames.map(() => movement.frameDuration) } : am;
            let frame;
            if (attacking) frame = attackAnimationFrame(am, duration - Math.max(0, duration - t), duration, windup, card.attackFrames, card);
            else {
              const clock = (t + (10000 + ordinal * 8 + direction) * .173) * 60 * (useLoop ? 1 : card.flying || kind === 'movement' && mobile ? .85 : .75);
              frame = animationFrame(loop, clock);
              if (useLoop) frame = movement.frames[frame];
            }
            return { t, animation, frame, attacking };
          };
          const selected = new Map();
          const choose = (sample, label) => {
            sample = Math.max(-1, Math.min(indices.at(-1), sample));
            selected.set(sample, [...new Set([...(selected.get(sample) || []), label])]);
          };
          if (kind === 'attack') {
            choose(-1, 'idle'); choose(0, 'start'); choose(Math.floor(windup * .65 * 60), 'prep');
            if (active) for (let shot = 0; shot < (card.burst || 1); shot++) choose(Math.ceil((windup + shot * (card.burstSpacing || 0)) * 60 - 1e-7), `C${shot + 1}`);
            choose(Math.floor((duration + windup + ((card.burst || 1) - 1) * (card.burstSpacing || 0)) * 30), 'recover');
            choose(Math.ceil(duration * 60) + 2, 'return');
          }
          const captures = [];
          for (let direction = 0; direction < 8; direction++) {
            const angle = (2 - direction) * Math.PI / 4;
            const id = 10000 + ordinal * 8 + direction;
            const logical = { id, key, card, team: 0, x: 0, y: 0, dx: Math.cos(angle), dy: Math.sin(angle), hp: card.hp, maxHp: card.hp, radius: card.radius || 12, spawn: 0, hit: 0, shield: 0, attackSeq: 1, attackDuration: duration, attackWindup: windup, attackAnim: attackName, moving: kind === 'movement' && mobile, anim: 0, burrowed: false, burrowProgress: 0 };
            const target = { id: id + 100000, card: { id: 143 }, x: logical.dx * 100, y: logical.dy * 100, hp: 1e9 };
            r.resetVisuals(); r.effects = []; r.particles = []; r.t = 0;
            if (kind === 'attack' && active) r.onEvent({ type: 'attackStart', attacker: logical, target, style: card.style, duration, windup });
            const viewSamples = [];
            captures[direction] = new Map();
            const seen = new Set();
            let nextShot = 0;
            for (const sample of [-1, ...indices]) {
              const state = stateAt(sample, direction);
              const t = Math.max(0, state.t);
              logical.attack = state.attacking ? Math.max(0, duration - t) : 0;
              logical.attackSeq = sample < 0 ? 0 : 1;
              logical.anim = t;
              r.t = t; r.drawDt = sample <= 0 ? 0 : 1 / 60;
              // Synthetic events exercise the same contact latch as the app.
              // This fixture supplies a timeline; it does not simulate combat.
              if (kind === 'attack' && active && sample >= 0) while (nextShot < (card.burst || 1) && t + 1e-7 >= windup + nextShot * (card.burstSpacing || 0)) {
                r.onEvent({ type: 'attackRelease', attacker: logical, target, key, style: card.style, shot: nextShot, from: r.visualEmission(logical, nextShot), to: target });
                nextShot++;
              }
              const actor = r.visualActor(logical, sample <= 0 ? 0 : 1 / 60);
              actor.logicalX = 0; actor.logicalY = 0;
              r.frameActors = new Map([[id, actor], [target.id, target]]);
              sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, sprite.width, sprite.height); sc.imageSmoothingEnabled = false;
              sc.save(); sc.translate(75, 106); sc.scale(cssScale, cssScale * vertical); spriteDraw = null;
              r.sprite(sc, actor, true);
              const nativeDraw = spriteDraw;
              const emitters = [0, 1].map(shot => card.bolts ? r.effectSource({ kind: 'beam', sourceId: id, shot }) : r.visualEmission(actor, shot));
              if (emitters.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) throw Error(`Non-finite emitter ${key}`);
              r.drawEffects(sc, r.drawDt);
              sc.restore();
              const am = r.metadata[card.id][state.animation];
              const observedFrame = nativeDraw?.source === am.file.split('/').pop() ? Math.round(nativeDraw.args[0] / am.width) : state.attacking ? attackAnimationFrame(am, duration - actor.attack, duration, windup, card.attackFrames, card) : state.frame;
              const nativePose = poses(card.id, state.animation)[direction][observedFrame];
              const geom = SPRITE_GEOMETRY[card.id]?.[state.animation]?.points[direction]?.[observedFrame];
              const rawAnchor = r.anchors.get(`${card.id}-${state.animation}`)?.[direction]?.[observedFrame];
              const anchor = movement.bodyAnchor && (state.attacking || movement.frames) ? movementAnchor(card.id, state.animation, direction, observedFrame, rawAnchor) : rawAnchor;
              const entry = { kind, key, direction, sample, t: round(state.t), animation: state.animation, frame: observedFrame, plannedFrame: state.frame, signature: nativePose.signature, anchor, points: geom, emitter0: emitters[0], emitter1: emitters[1], draw: nativeDraw };
              if (sample >= 0) { allSamples.push(entry); viewSamples.push(entry); }
              captures[direction].set(sample, { pixels: sc.getImageData(0, 0, sprite.width, sprite.height), entry });
              if (sample >= 0 && (kind === 'movement' || t < duration)) {
                const signature = `${state.animation}:${nativePose.signature}`;
                if (!seen.has(signature)) { seen.add(signature); choose(sample, kind === 'attack' ? 'pose' : 'move'); }
              }
            }
            let longest = 0, run = 0, prior;
            for (const s of viewSamples.filter(s => kind === 'movement' || s.t < duration)) { run = s.signature === prior ? run + 1 : 1; longest = Math.max(longest, run); prior = s.signature; }
            const unique = [...new Set(viewSamples.filter(s => kind === 'movement' || s.t < duration).map(s => `${s.animation}:${s.signature}`))];
            const contacts = kind === 'attack' && active ? Array.from({ length: card.burst || 1 }, (_, shot) => {
              const at = windup + shot * (card.burstSpacing || 0); const chosen = viewSamples.find(s => s.t + 1e-7 >= at);
              return { shot, at, sample: chosen?.sample, frame: chosen?.frame, animation: chosen?.animation, emitter0: chosen?.emitter0, emitter1: chosen?.emitter1 };
            }) : [];
            const samplesForPose = viewSamples.filter(s => kind === 'movement' || s.t < duration);
            row.directions[direction] ||= { direction, name: dirs[direction] };
            row.directions[direction][kind] = { samples: viewSamples.length, uniqueRasters: unique.length, frames: [...new Set(samplesForPose.map(s => s.frame))], maxSameDrawingSeconds: round(longest / 60), contacts, poseSignatures: unique };
          }
          const selections = [...selected].sort((a, b) => a[0] - b[0]);
          row.galleries[kind] = selections.map(([sample, labels]) => ({ sample, labels }));
          const tile = document.createElement('canvas');
          const cw = 94, ch = 80, header = 54, left = 32;
          tile.width = left + selections.length * cw; tile.height = header + dirs.length * ch;
          const tc = tile.getContext('2d'); tc.imageSmoothingEnabled = false;
          tc.fillStyle = '#edf0d4'; tc.fillRect(0, 0, tile.width, tile.height);
          tc.fillStyle = '#2d4435'; tc.font = 'bold 14px sans-serif';
          tc.fillText(`${key} | ${card.name} | ${kind === 'attack' ? attackName : movementName}${row.delegatedRigReview ? ' [rig: separate review]' : ''}`, 7, 17);
          tc.font = '11px sans-serif'; tc.fillText(`${kind}${!mobile && kind === 'movement' ? ' (stationary)' : ''} | scale ${card.scale} | ${active ? `windup ${windup}s, burst ${card.burst || 1}` : 'passive, no scheduled attack'} | actual 390px mobile scale`, 7, 32);
          for (const [column, [sample, labels]] of selections.entries()) tc.fillText(`${labels.join('+')} ${sample < 0 ? 'rest' : (sample / 60).toFixed(2)}`, left + column * cw + 3, 49);
          for (let direction = 0; direction < 8; direction++) {
            const covered = new Set();
            for (const [column, [sample]] of selections.entries()) {
              const capture = captures[direction].get(sample), entry = capture.entry;
              covered.add(`${entry.animation}:${entry.signature}`);
              sc.setTransform(1, 0, 0, 1, 0, 0); sc.putImageData(capture.pixels, 0, 0);
              const x = left + column * cw, y = header + direction * ch;
              tc.fillStyle = column % 2 ? '#dfe8c5' : '#eaf0d2'; tc.fillRect(x + 1, y + 1, cw - 2, ch - 2);
              tc.save(); tc.beginPath(); tc.rect(x + 1, y + 1, cw - 2, ch - 2); tc.clip(); tc.drawImage(sprite, x + cw / 2 - 75, y + 65 - 106);
              tc.fillStyle = '#516344'; tc.fillRect(x + cw / 2 - 8, y + 65, 16, 1);
              if (kind === 'attack' && active) for (let shot = 0; shot < 2; shot++) {
                const p = entry[`emitter${shot}`], mx = x + cw / 2 + p.x * cssScale, my = y + 65 + p.y * cssScale * vertical;
                tc.strokeStyle = shot ? '#2554d3' : '#d33642'; tc.lineWidth = 1; tc.beginPath(); tc.arc(mx, my, shot ? 2 : 3.5, 0, Math.PI * 2); tc.stroke();
              }
              tc.restore(); tc.fillStyle = '#2d4435'; tc.font = '10px sans-serif'; tc.fillText(`${entry.animation}:${entry.frame}`, x + 3, y + 12);
            }
            row.directions[direction][kind].galleryMissingPoses = row.directions[direction][kind].poseSignatures.filter(signature => !covered.has(signature));
            if (row.directions[direction][kind].galleryMissingPoses.length) throw Error(`Gallery omitted observed pose ${key}/${kind}/${direction}`);
            tc.fillStyle = '#2d4435'; tc.font = '11px sans-serif'; tc.fillText(dirs[direction], 3, header + direction * ch + 43);
          }
          byKind[kind].push({ key, group: group(card), png: tile });
        }
        row.emitter = emitterPart(card);
        rows.push(row);
      }
      for (const kind of ['attack', 'movement']) {
        const entries = byKind[kind];
        for (let page = 0; page < Math.ceil(entries.length / 4); page++) {
          const batch = entries.slice(page * 4, page * 4 + 4);
          const cw = Math.max(...batch.map(b => b.png.width)), ch = Math.max(...batch.map(b => b.png.height));
          const canvas = document.createElement('canvas'); canvas.width = cw * 2; canvas.height = 36 + ch * Math.ceil(batch.length / 2);
          const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#f8f0d5'; c.fillRect(0, 0, canvas.width, canvas.height);
          c.fillStyle = '#2d4435'; c.font = 'bold 16px sans-serif'; c.fillText(`Static Renderer scene, not combat | ${kind} | page ${page + 1} | red/blue = emitter 0/1`, 9, 24);
          for (const [i, item] of batch.entries()) c.drawImage(item.png, (i % 2) * cw, 36 + Math.floor(i / 2) * ch);
          sheets.push({ name: `${kind}-${String(page + 1).padStart(2, '0')}.png`, keys: batch.map(b => b.key), png: canvas.toDataURL('image/png').split(',')[1] });
        }
      }
      return { date: '2026-11-14', sampleHz: 60, scene: 'Static synthetic actor timelines and attackStart/attackRelease events passed through real visualActor, sprite, drawEffects and visualEmission. No battle simulation, projectile travel, multiplayer or subjective smoothness claim.', viewport: { width: 390, height: 844, arenaCssWidth: rect.width, arenaCssHeight: rect.height, cssScale, verticalScale: vertical }, coverage: { allKeys: Object.keys(CARDS).length, bodyCards: cards.length, species: new Set(cards.map(([, card]) => card.id)).size, delegatedRigSpecies: [6, 123, 373], spellKeysExcluded: Object.entries(CARDS).filter(([, card]) => !card.id).map(([key]) => key) }, rows, sheets, samples: allSamples };
    });
    assert.deepEqual(errors, []);
    assert.equal(report.coverage.bodyCards, 108);
    assert.equal(report.coverage.species, 100);
    assert.equal(report.rows.length, 108);
    for (const sheet of report.sheets) {
      await writeFile(path.join(out, sheet.name), Buffer.from(sheet.png, 'base64'));
      delete sheet.png;
    }
    report.sampleCount = report.samples.length;
    await writeFile(path.join(out, 'samples-60hz.json.gz'), gzipSync(JSON.stringify(report.samples)));
    delete report.samples;
    report.inputs = before;
    report.inputsAfter = await hashes();
    report.changedDuringCapture = report.inputs.filter((entry, i) => entry.sha256 !== report.inputsAfter[i].sha256).map(entry => entry.file);
    const manifest = JSON.parse(await readFile(path.join(dist, 'assets/pokemon/manifest.json'), 'utf8'));
    const activeFiles = [...new Set(report.rows.flatMap(row => [...new Set([row.attackAnimation, row.movementAnimation, row.card.idleAnim || 'Idle'])].flatMap(animation => {
      const meta = manifest[row.id][animation];
      return [meta.file, meta.shadow, meta.file.replace('-Anim.png', '-Offsets.png')];
    })))];
    report.assets = await Promise.all(activeFiles.map(async file => ({ file: `dist/${file}`, sha256: createHash('sha256').update(await readFile(path.join(dist, file))).digest('hex') })));
    await writeFile(path.join(out, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
    const header = ['key', 'name', 'id', 'group', 'scale', 'attack', 'movement', 'emitter', 'active', 'attackUniqueMin', 'attackUniqueMax', 'attackMaxHoldSeconds', 'moveUniqueMin', 'moveUniqueMax', 'moveMaxHoldSeconds', 'rigReviewDelegated', 'visualReviewStatus', 'finding'];
    const csv = [header, ...report.rows.map(row => [row.key, row.name, row.id, row.group, row.card.scale, row.attackAnimation, row.movementAnimation, row.emitter, row.active, Math.min(...row.directions.map(d => d.attack.uniqueRasters)), Math.max(...row.directions.map(d => d.attack.uniqueRasters)), Math.max(...row.directions.map(d => d.attack.maxSameDrawingSeconds)), Math.min(...row.directions.map(d => d.movement.uniqueRasters)), Math.max(...row.directions.map(d => d.movement.uniqueRasters)), Math.max(...row.directions.map(d => d.movement.maxSameDrawingSeconds)), row.delegatedRigReview, 'pending', ''])].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    await writeFile(path.join(out, 'all-body-cards.csv'), csv + '\n');
    const html = `<!doctype html><meta charset="utf-8"><title>Global motion QA</title><style>body{font:16px system-ui;background:#f4edcf;color:#293f30}img{max-width:100%;height:auto}section{margin:2rem 0}a{color:#2552a0}</style><h1>Static Renderer scenes, not combat</h1><p>108 body cards, 100 species, 8 directions, 60 timeline samples/s. Review status is pending until each sheet is inspected. Rigs 6/123/373 have a separate reviewer.</p>${report.sheets.map(sheet => `<section><h2>${sheet.name}</h2><p>${sheet.keys.join(', ')}</p><a href="${sheet.name}"><img loading="lazy" src="${sheet.name}"></a></section>`).join('')}`;
    await writeFile(path.join(out, 'index.html'), html);
    console.log(JSON.stringify({ coverage: report.coverage, samples: report.sampleCount, sheets: report.sheets.length, changedDuringCapture: report.changedDuringCapture, output: out }));
  } finally { await context.close(); }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
