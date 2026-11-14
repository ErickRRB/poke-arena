import { Game } from '/engine.js?v=26';
import { publicSnapshot, publicEvent, unpackEvent } from '/online-wire.js?v=26';
import { unpackGame, perspective } from '/snapshot.js?v=26';
import { STRUCTURE_ART } from '/battle-art.js?v=32';

const app = globalThis.__hutApp, r = app.renderer, draw = r.draw.bind(r), canvas = r.canvas;
r.draw = () => {}; app.game.step = () => {};
const art = STRUCTURE_ART.raltsHut, image = r.battleArt.images.get(art.file);
const contract = { name: 'Refugio Ralts', cost: 4, hp: 1180, structure: true, structureArt: 'raltsHut', passive: true, speed: 0, damage: 0, lifetime: 30, radius: 24, platform: false, color: '#b5c6b0' };
let g, actor, view, side, queue = [], calls = [], bars = [], platformCalls = 0, invalidLoads = [], tintCalls = 0;
const originalImage = r.ctx.drawImage.bind(r.ctx), originalBar = r.healthBar.bind(r), originalPlatform = r.platform.bind(r), originalEnsure = r.ensureSpecies.bind(r), originalTint = r.tintTarget.bind(r);
r.ctx.drawImage = (img, ...args) => {
  if (img === image) { const m = r.ctx.getTransform(); calls.push({ args, alpha: r.ctx.globalAlpha, filter: r.ctx.filter, matrix: [m.a, m.b, m.c, m.d, m.e, m.f] }); }
  return originalImage(img, ...args);
};
r.healthBar = (c, unit, x, y, width) => { if (unit.key === 'raltsHut') bars.push({ x, y, width, hp: unit.hp, maxHp: unit.maxHp }); return originalBar(c, unit, x, y, width); };
r.platform = (c, unit) => { if (unit.key === 'raltsHut') platformCalls++; return originalPlatform(c, unit); };
r.ensureSpecies = ids => { invalidLoads.push(...ids.filter(id => !Number.isFinite(id)).map(id => String(id))); return originalEnsure(ids); };
r.tintTarget = (...args) => { if (args[1] === image) tintCalls++; return originalTint(...args); };
function board() { const b = canvas.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, verticalScale: r.verticalScale }; }
function refresh(dt = 0) {
  view = unpackGame(perspective(publicSnapshot(g, side), side));
  for (const event of queue) r.onEvent(perspective(unpackEvent(event), side)); queue = [];
  calls = []; bars = []; tintCalls = 0; draw(view, dt);
  return describe();
}
function describe() {
  return { board: board(), calls: structuredClone(calls), bars: structuredClone(bars), platformCalls, invalidLoads: [...invalidLoads],
    invalidSpeciesKeys: [...r.speciesLoads.keys()].filter(key => !Number.isFinite(key)).map(String), tintCalls, highlighted: r.spellTargets.has(actor.id),
    bodyHeight: r.bodyHeight(actor), cardId: actor.card.id ?? null, actorPosition: view.units.find(unit => unit.id === actor.id) ? { x: view.units.find(unit => unit.id === actor.id).x, y: view.units.find(unit => unit.id === actor.id).y, team: view.units.find(unit => unit.id === actor.id).team } : null, art, hp: actor.hp, maxHp: actor.maxHp, gameTime: g.elapsed, state: g.state,
    death: r.effects.filter(effect => effect.kind === 'structureDeath').map(effect => ({ life: effect.life, max: effect.max })) };
}
function init(team = 0, perspectiveSide = 0, reduced = false) {
  side = perspectiveSide; queue = []; calls = []; bars = []; platformCalls = 0; invalidLoads = [];
  r.resetVisuals(); r.effects = []; r.particles = []; r.numbers = []; r.healthStates.clear(); r.t = .25; r.reduced = reduced; r.selection = null; r.pointer = null;
  g = new Game({ seed: 882 }); g.state = 'playing'; g.aiEnabled = false;
  for (const tower of g.towers) { tower.active = false; tower.cooldown = 999; tower.hp = tower.maxHp = 1e6; }
  // Reuse the engine's complete actor shape, then install the agreed visual-only
  // card. No catalog entry or troop generation is synthesized by this fixture.
  actor = g.spawn('regice', team, 300, team ? 300 : 500, 0);
  actor.key = 'raltsHut'; actor.card = { ...contract }; actor.hp = actor.maxHp = 1180; actor.lifetime = 30; actor.radius = 24; actor.entryPending = false;
  g.onEvent = event => queue.push(publicEvent(event)); g.emit('spawn', { unit: actor });
  return refresh();
}
function surface(target, preview = false, alpha = 1) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 800; const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false; let bodyAlpha = null; const native = ctx.drawImage.bind(ctx);
  ctx.drawImage = (img, ...args) => { if (img === image) bodyAlpha = ctx.globalAlpha; return native(img, ...args); };
  ctx.globalAlpha = alpha; r.sprite(ctx, { ...target, preview }, true);
  return { canvas: c, pixels: ctx.getImageData(0, 0, 600, 800).data, bodyAlpha };
}
function probes() {
  const target = view.units.find(unit => unit.id === actor.id), saved = r.spellTargets;
  r.spellTargets = new Set(); const normal = surface(target), preview = surface(target, true, .55);
  r.spellTargets = new Set([actor.id]); const red = surface(target);
  r.spellTargets = new Set(); const clear = surface(target); r.spellTargets = saved;
  let outside = 0, changed = 0, redGain = 0, clearChanges = 0, previewMaxAlpha = 0;
  for (let i = 0; i < normal.pixels.length; i += 4) {
    const differs = [0, 1, 2, 3].some(channel => normal.pixels[i + channel] !== red.pixels[i + channel]);
    if (!normal.pixels[i + 3] && red.pixels[i + 3]) outside++; if (differs) changed++;
    redGain += red.pixels[i] - normal.pixels[i]; previewMaxAlpha = Math.max(previewMaxAlpha, preview.pixels[i + 3]);
    if ([0, 1, 2, 3].some(channel => normal.pixels[i + channel] !== clear.pixels[i + channel])) clearChanges++;
  }
  return { normalBodyAlpha: normal.bodyAlpha, previewBodyAlpha: preview.bodyAlpha, previewMaxAlpha, outsideAlphaPixels: outside, changedPixels: changed, redGain, clearChanges,
    normalPng: normal.canvas.toDataURL('image/png').split(',')[1], previewPng: preview.canvas.toDataURL('image/png').split(',')[1], redPng: red.canvas.toDataURL('image/png').split(',')[1] };
}
function showPreview() {
  const target = view.units.find(unit => unit.id === actor.id); calls = []; bars = [];
  draw({ ...view, units: [] }, 0); r.ctx.save(); r.ctx.globalAlpha = .55; r.sprite(r.ctx, { ...target, preview: true }, true); r.ctx.restore();
  return describe();
}
function highlight(enabled) {
  const target = view.units.find(unit => unit.id === actor.id); r.selection = enabled ? 'fireball' : null; r.pointer = enabled ? { x: target.x, y: target.y } : null;
  return refresh();
}
function hit() { r.selection = null; r.pointer = null; g.damage(actor, 100, 1 - actor.team, { sourceKey: 'ekans' }); return refresh(); }
function pixels() { return r.ctx.getImageData(0, 0, canvas.width, canvas.height).data; }
function pause() {
  g.pause(); const first = refresh(), baseline = pixels(); let changes = 0, missingBody = 0;
  const engineAt = g.elapsed, effectAt = first.death[0]?.life;
  for (let frame = 0; frame < 24; frame++) { g.step(1 / 30); const current = refresh(); if (!current.calls.length) missingBody++; const rgba = pixels(); for (let p = 0; p < rgba.length; p++) if (rgba[p] !== baseline[p]) changes++; }
  return { frames: 24, changes, missingBody, engineAt, engineAfter: g.elapsed, effectAt, effectAfter: r.effects.find(effect => effect.kind === 'structureDeath')?.life, frame: describe() };
}
function death() { r.selection = null; r.pointer = null; g.resume(); g.damage(actor, actor.hp * 2, 1 - actor.team); g.step(1 / 30); return refresh(1 / 60); }
function resumeDeath() {
  g.resume(); const rows = [];
  for (let frame = 0; frame < 30; frame++) { if (frame % 2 === 0) g.step(1 / 30); rows.push(refresh(1 / 60)); }
  return { middle: rows[10], last: rows.at(-1), rows };
}
globalThis.__hutQA = { init, describe, probes, showPreview, highlight, hit, pause, death, resumeDeath, board,
  assets: { battlefield: { loaded: !!image, width: image?.naturalWidth, height: image?.naturalHeight }, card: null },
  async loadCard() { const card = await r.loadImage('assets/cards/ralts-hut-v1.png'); this.assets.card = { width: card.naturalWidth, height: card.naturalHeight }; return this.assets; } };
