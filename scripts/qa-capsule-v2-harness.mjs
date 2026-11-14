import { Game } from '/engine.js?v=26';
import { publicSnapshot, publicEvent, unpackEvent } from '/online-wire.js?v=26';
import { unpackGame, perspective } from '/snapshot.js?v=26';
import { ARENA_CAMERA } from '/arena-geometry.js?v=26';
import { CapsuleArt, capsulePixels, CAPSULE_TEXTURE } from '/capsule-art.js';
import { drawCapsule as liveGraphic } from '/__qa/live-capsule.mjs';

const app = globalThis.__capsuleApp, r = app.renderer, canvas = r.canvas, draw = r.draw.bind(r), proposal = r.capsule.bind(r);
r.draw = () => {}; app.game.step = () => {};
const textureImage = r.battleArt.images.get(CAPSULE_TEXTURE), TAU = Math.PI * 2;
let calls = [], rotations = 0, inside = false, framesToWrite = [], background, currentSpell;
const fireball = r.fireball.bind(r);
r.fireball = (c, spell) => { currentSpell = spell; fireball(c, spell); currentSpell = null; };
const rotate = r.ctx.rotate.bind(r.ctx);
r.ctx.rotate = angle => { if (inside) rotations++; return rotate(angle); };
function install(variant) {
  r.capsule = (c, x, y, size, angle, axis) => {
    inside = true; rotations = 0;
    if (variant === 'v34-graphic-replay') { c.save(); c.translate(x, y); c.scale(1, 1 / (r.verticalScale || 1)); liveGraphic(c, 0, 0, size, angle); c.restore(); }
    else proposal(c, x, y, size, angle, axis);
    const m = c.getTransform(); inside = false;
    calls.push({ id: currentSpell?.visualId, team: currentSpell?.team, logicalElapsed: currentSpell?.flightElapsed, visualElapsed: r.visualFlights.get(currentSpell?.visualId)?.elapsed,
      x, y, size, angle, axis, phase: variant === 'proposal' ? r.capsuleArt.lastFrame.phase : null, direction: variant === 'proposal' ? r.capsuleArt.lastFrame.direction : null,
      rotations, matrix: [m.a, m.b, m.c, m.d] });
  };
}
function reset(reduced, variant) {
  r.resetVisuals(); r.effects = []; r.particles = []; r.numbers = []; r.healthStates.clear(); r.t = 0; r.reduced = reduced; r.selection = null; r.pointer = null;
  r.capsuleArt = new CapsuleArt(textureImage); install(variant);
}
function stage(label, clock) {
  const out = document.createElement('canvas'); out.width = innerWidth; out.height = innerHeight + 44; const c = out.getContext('2d'), b = canvas.getBoundingClientRect(); c.imageSmoothingEnabled = false;
  c.fillStyle = '#f7f0d5'; c.fillRect(0, 0, out.width, out.height); c.drawImage(background, 0, 0); c.drawImage(canvas, b.x, b.y, b.width, b.height);
  c.fillStyle = '#243c30'; c.font = '12px monospace'; c.fillText(label, 8, innerHeight + 18); c.fillText(`replay local · t=${clock.toFixed(3)} s`, 8, innerHeight + 35);
  return out.toDataURL('image/png').split(',')[1];
}
function percentile(values, fraction) { const sorted = values.slice().sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * fraction)] || 0; }
function replay({ mode = 'local30', side = 0, reduced = false, variant = 'proposal', capture = false }) {
  reset(reduced, variant); let g, events = [], view; const rows = [], pngs = [], renderMs = [], eventLog = []; let pausedPixels, pixelChanges = 0;
  g = new Game({ seed: 7129, onEvent: event => { events.push(publicEvent(event)); eventLog.push({ type: event.type, at: g?.elapsed || 0, team: event.unit?.team, key: event.unit?.key }); } }); g.start(); g.aiEnabled = false;
  for (const tower of g.towers) { tower.active = false; tower.cooldown = 999; tower.hp = tower.maxHp = 1e6; }
  for (const team of [0, 1]) {
    const target = g.towers.find(tower => tower.team !== team && !tower.king && tower.lane === team);
    g.hands[team][0] = 'sneaselAmbush'; g.energy[team] = 10; const deployed = g.deploy(team, 0, target.x, target.y); if (!deployed.ok) throw new Error(deployed.reason);
  }
  const paths = g.spells.map(spell => ({ id: spell.visualId, team: spell.team, start: [spell.startX, spell.startY], target: [spell.x, spell.y], time: spell.flightTime, delay: spell.delay }));
  for (let index = 0; index <= 228; index++) {
    if (index === 60) g.pause(); if (index === 84) g.resume();
    if (index && index % 2 === 0) g.step(1 / 30);
    if (mode === 'local30') { view = side ? unpackGame(perspective(publicSnapshot(g, side), side)) : g; for (const event of events) r.onEvent(perspective(unpackEvent(event), side)); events = []; }
    else if (index % 4 === 0) { view = unpackGame(perspective(publicSnapshot(g, side), side)); for (const event of events) r.onEvent(perspective(unpackEvent(event), side)); events = []; }
    if (mode === 'snapshots15' && view.state === 'playing' && index) for (const unit of [...view.units, ...view.towers]) { unit.anim += 1 / 60; unit.hit = Math.max(0, (unit.hit || 0) - 1 / 60); if (unit.card) unit.spawn = Math.max(0, unit.spawn - 1 / 60); }
    const dt = g.state === 'paused' ? 0 : index ? 1 / 60 : 0; calls = [];
    const start = performance.now(); draw(view, dt); renderMs.push(performance.now() - start);
    const row = { index, at: index / 60, engineAt: g.elapsed, paused: g.state === 'paused', calls: structuredClone(calls) };
    if (row.paused) {
      const pixels = r.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      if (!pausedPixels) pausedPixels = pixels; else for (let i = 0; i < pixels.length; i++) if (pixels[i] !== pausedPixels[i]) pixelChanges++;
    }
    rows.push(row); if (capture) pngs.push(stage(`${variant} · ${mode}${reduced ? ' · reduced' : ''}${row.paused ? ' · PAUSA' : ''}`, index / 60));
  }
  const b = canvas.getBoundingClientRect();
  return { mode, side, reduced, variant, paths, rows, eventLog, viewport: { width: innerWidth, height: innerHeight }, camera: ARENA_CAMERA, board: { width: b.width, height: b.height },
    projection: r.projection, pausedPixelChanges: pixelChanges, cache: { frames: r.capsuleArt.cache.size, atlas: [r.capsuleArt.atlas.width, r.capsuleArt.atlas.height], stats: { ...r.capsuleArt.stats } },
    drawMs: { median: percentile(renderMs, .5), p95: percentile(renderMs, .95), max: Math.max(...renderMs) }, pngs };
}
function material() {
  const art = new CapsuleArt(textureImage), rows = [], images = [], size = 52 * r.projection.scale, cell = 144;
  const strip = document.createElement('canvas'); strip.width = cell * 8; strip.height = 380; const c = strip.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#294638'; c.fillRect(0, 0, strip.width, strip.height); c.font = '12px monospace';
  for (let phase = 0; phase < 8; phase++) {
    const angle = phase * TAU / 8, pixels = capsulePixels(angle, 0, art.texture); images.push(pixels.data.slice());
    let redTop = 0, redBottom = 0, whiteTop = 0, whiteBottom = 0, beltCenter = 0;
    for (let y = 8; y < 56; y++) for (let x = 8; x < 56; x++) {
      const n = (y * 64 + x) * 4, red = pixels.data[n], green = pixels.data[n + 1]; if (!pixels.data[n + 3]) continue;
      if (red > green * 1.6 && red > 64) { if (y < 32) redTop++; else redBottom++; }
      if (green > red * .8 && green > 90) { if (y < 32) whiteTop++; else whiteBottom++; }
      if (y >= 30 && y <= 33 && (x < 23 || x > 41) && Math.max(...pixels.data.subarray(n, n + 3)) < 90) beltCenter++;
    }
    rows.push({ phase, angle, redTop, redBottom, whiteTop, whiteBottom, beltCenter });
    const x = cell * phase + cell / 2; c.fillStyle = '#f6edce'; c.fillText(`${phase}/8`, cell * phase + 8, 18);
    liveGraphic(c, x, 62, size, angle); art.draw(c, x, 136, size, angle, 0);
    c.save(); c.translate(x, 264); c.scale(3, 3); art.draw(c, 0, 0, size, angle, 0); c.restore();
  }
  const returned = capsulePixels(TAU, 0, art.texture).data;
  c.fillStyle = '#f6edce'; c.fillText(`v34 auténtica · ${size.toFixed(2)}px en este corte`, 8, 96); c.fillText('propuesta · escala actual de arena', 8, 176); c.fillText('propuesta ×3 · inspección', 8, 369);
  return { rows, returnsExactly: returned.every((value, index) => value === images[0][index]), alphaUnchanged: images.every(image => image.every((value, index) => index % 4 !== 3 || value === images[0][index])),
    cssDiameter: size, png: strip.toDataURL('image/png').split(',')[1] };
}
function budget() {
  const art = new CapsuleArt(textureImage), axes = [-2.9, .24], cold = [], warm = [];
  for (const axis of axes) for (let phase = 0; phase < 96; phase++) { const at = performance.now(); art.frame(phase * TAU / 96, axis); cold.push(performance.now() - at); }
  const built = art.stats.built, atlas = art.atlas, pixels = art.pixels;
  for (let pass = 0; pass < 20; pass++) for (const axis of axes) for (let phase = 0; phase < 96; phase++) { const at = performance.now(); art.frame(phase * TAU / 96, axis); warm.push(performance.now() - at); }
  const warmBuilds = art.stats.built - built;
  for (let axis = 0; axis < 32; axis++) for (let phase = 0; phase < 96; phase++) art.frame(phase * TAU / 96, axis * TAU / 32);
  return { cold: { calls: cold.length, medianMs: percentile(cold, .5), p95Ms: percentile(cold, .95), maxMs: Math.max(...cold) },
    warm: { calls: warm.length, newFramesBuilt: warmBuilds, medianMs: percentile(warm, .5), p95Ms: percentile(warm, .95) },
    afterEviction: { keys: art.cache.size, atlas: [art.atlas.width, art.atlas.height], sameAtlas: art.atlas === atlas, sameScratch: art.pixels === pixels },
    rgbaBytes: art.atlas.width * art.atlas.height * 4 + art.texture.width * art.texture.height * 4 + art.pixels.data.length };
}
globalThis.__capsuleV2 = { replay, material, budget, async backdrop(base64) { background = new Image(); background.src = 'data:image/png;base64,' + base64; await background.decode(); },
  capture(options) { const result = replay({ ...options, capture: true }); framesToWrite = result.pngs; result.frameCount = framesToWrite.length; delete result.pngs; return result; },
  frame(index) { return framesToWrite[index]; }, takeFrames(count = 24) { return framesToWrite.splice(0, count); } };
