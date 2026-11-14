import { Game, CARDS } from '/engine.js?v=26';
import { Renderer } from '/render.js?v=29';
import { publicSnapshot, publicEvent, unpackEvent } from '/online-wire.js?v=26';
import { unpackGame, perspective } from '/snapshot.js?v=26';
import { attackAnimationFrame, movementAnchor } from '/sprite-motion.js?v=26';
import { SPRITE_GEOMETRY } from '/sprite-geometry.js';
import { FlightWings } from '/wing-motion.js';
import { spellPreviewTargets } from '/spell-preview.js';
import { BATTLE_ASSETS } from '/assets/battle/manifest.js';
import { PROJECTILE_BOUNDS } from '/assets/battle/projectile-bounds.js';

const canvases = [...document.querySelectorAll('canvas')], renderers = canvases.map(canvas => new Renderer(canvas));
const round = value => Math.round(value * 1e6) / 1e6;
let activeSide = 0, rigCalls = [], artCalls = [[], []], rigImages = new WeakSet(), rigDraws = [0, 0];
const sourceCache = new Map();
let capsuleGeometry;
function measureCapsule() {
  const meta = BATTLE_ASSETS.pokeball, image = renderers[0].battleArt.image('pokeball'), canvas = document.createElement('canvas'); canvas.width = meta.width; canvas.height = meta.height;
  const c = canvas.getContext('2d'); c.drawImage(image, 0, 0); const pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = meta.width, right = -1, top = meta.height, bottom = -1;
  for (let y = 0; y < meta.height; y++) for (let x = 0; x < meta.width; x++) if (pixels[(y * meta.width + x) * 4 + 3]) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const bounds = PROJECTILE_BOUNDS.pokeball || [0, 0, meta.width, meta.height], diameter = 52 * (right - left + 1) / Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
  return { sourceSize: [meta.width, meta.height], alphaBounds: [left, top, right + 1, bottom + 1], trimBounds: PROJECTILE_BOUNDS.pokeball || null, requestedCanvasSize: 52, visibleCanvasDiameter: diameter, visibleCssDiameterAt390: diameter * 370 / 600 };
}
const oldRig = FlightWings.prototype.frame;
FlightWings.prototype.frame = function (id, animation, direction, frame, image, meta, clock, reduced) {
  const out = oldRig.call(this, id, animation, direction, frame, image, meta, clock, reduced);
  if (id === 6 && out) {
    rigImages.add(out.image);
    const key = `${animation}:${direction}:${frame}`;
    if (!sourceCache.has(key)) {
      const c = document.createElement('canvas'); c.width = meta.width; c.height = meta.height;
      c.getContext('2d').drawImage(image, frame * meta.width, direction * meta.height, meta.width, meta.height, 0, 0, meta.width, meta.height);
      sourceCache.set(key, c.getContext('2d').getImageData(0, 0, meta.width, meta.height).data);
    }
    const raw = sourceCache.get(key), pixels = out.image.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, out.image.width, out.image.height).data;
    const points = SPRITE_GEOMETRY[6][animation].points[direction][frame], resolution = out.resolution || 1;
    let changes = 0, checked = 0, hash = 2166136261;
    for (const offset of [2, 4]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = points[offset] + dx, y = points[offset + 1] + dy;
      const s = (y * meta.width + x) * 4, d = ((Math.floor((y + out.padding + .5) * resolution)) * out.image.width + Math.floor((x + out.padding + .5) * resolution)) * 4;
      if (raw[s + 3] !== 255) continue;
      checked++; if ([0, 1, 2, 3].some(channel => raw[s + channel] !== pixels[d + channel])) changes++;
    }
    for (let i = 3; i < pixels.length; i += 4) hash = Math.imul(hash ^ pixels[i], 16777619);
    rigCalls.push({ side: activeSide, animation, direction, frame, clock: round(clock), protectedChanges: changes, protectedPixels: checked, silhouette: (hash >>> 0).toString(16) });
  }
  return out;
};
for (let side = 0; side < 2; side++) {
  const r = renderers[side], art = r.combatArt.bind(r), draw = r.ctx.drawImage.bind(r.ctx);
  r.combatArt = (c, name, x, y, size, angle, height, options) => { artCalls[side].push({ name, x, y, size, height }); return art(c, name, x, y, size, angle, height, options); };
  r.ctx.drawImage = (image, ...args) => { if (rigImages.has(image)) rigDraws[side]++; return draw(image, ...args); };
}
function reset() {
  rigCalls = []; rigImages = new WeakSet(); rigDraws = [0, 0];
  for (const r of renderers) { r.resetVisuals(); r.effects = []; r.particles = []; r.numbers = []; r.t = 0; r.reduced = false; r.healthStates.clear(); }
}
function still(unit) { unit.card = { ...unit.card, speed: 0, passive: true, damage: 0 }; unit.hp = unit.maxHp = 1e6; unit.entryPending = false; return unit; }
function headError(r, actor) {
  const card = actor.card, meta = r.metadata[6][actor.attackAnim || card.attackAnim], age = actor.attackDuration - actor.attack;
  if (!(actor.attack > 0)) return null;
  const frame = attackAnimationFrame(meta, age, actor.attackDuration, actor.attackWindup ?? card.windup, card.attackFrames, card), direction = actor.dy < 0 ? 4 : 0;
  const points = SPRITE_GEOMETRY[6][actor.attackAnim || card.attackAnim].points[direction][frame], anchor = movementAnchor(6, actor.attackAnim || card.attackAnim, direction, frame, { x: points[0], y: points[1] });
  const clock = r.flightWings.phases.get(actor.id).phase, scale = actor.scale ?? card.scale, bob = Math.sin(clock * 2.6 + actor.id) * 1.5;
  const expected = { x: actor.x + (points[4] - anchor.x + actor.dx * 2) * scale, y: actor.y + ((points[5] - anchor.y + actor.dy * 2) * scale - 16 - bob) / r.verticalScale };
  const actual = r.visualEmission(actor);
  return round(Math.hypot(expected.x - actual.x, expected.y - actual.y));
}
function makeStage(key, time, views, counts) {
  const stage = document.createElement('canvas'); stage.width = 780; stage.height = 844; const c = stage.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#f7f0d5'; c.fillRect(0, 0, 780, 844);
  for (let side = 0; side < 2; side++) {
    c.drawImage(canvases[side], side * 390 + 10, 2, 370, 677); c.fillStyle = '#203d32'; c.font = 'bold 14px sans-serif';
    c.fillText(`${key} · perspectiva ${side}`, side * 390 + 12, 706); c.font = '12px monospace';
    c.fillText(`t=${time.toFixed(3)} s · snapshot15/render60`, side * 390 + 12, 729);
    c.fillText(`Pika=${counts.pikachu} Char=${counts.charizard} Sneasel=${counts.sneaselToken}`, side * 390 + 12, 751);
    const actor = [...renderers[side].frameActors.values()].find(unit => unit.key === 'charizard');
    if (actor) { const point = renderers[side].visualEmission(actor); c.strokeStyle = '#ffdf5e'; c.beginPath(); c.arc(side * 390 + 10 + point.x * 370 / 600, 2 + point.y * 677 / 800, 3, 0, Math.PI * 2); c.stroke(); }
    c.fillText('Base aislada · tablero anterior', side * 390 + 12, 786);
  }
  return stage.toDataURL('image/png').split(',')[1];
}
function antiLock() {
  const rows = [];
  for (const team of [0, 1]) for (const reverse of [false, true]) for (const stress of [false, true]) {
    const game = new Game({ seed: 908 }); game.state = 'playing'; game.aiEnabled = false; game.towers = []; const actors = {}, releases = [];
    for (const key of reverse ? ['charizard', 'pikachu'] : ['pikachu', 'charizard']) {
      const side = key === 'pikachu' ? team : 1 - team, actor = game.spawn(key, side, 300, side ? 490 : 550, 0);
      actor.card = { ...actor.card, speed: 0, ...(stress && key === 'pikachu' ? { windup: .26 } : {}) }; actor.hp = actor.maxHp = 1e6; actor.entryPending = false; actors[key] = actor;
    }
    game.onEvent = event => { if (event.type === 'attackRelease' && event.attacker === actors.charizard) releases.push(round(game.elapsed)); };
    for (let tick = 0; tick < 600; tick++) game.step(1 / 30);
    rows.push({ team, reverse, stressPikachuWindup: stress ? .26 : null, charizardReleases: releases.length, releaseTimes: releases });
  }
  return rows;
}
function run(key, capture = true) {
  reset(); let game, actors = {}, queue = [], views = [], vulnerability = null, landing = null;
  const events = [], frames = [], pngs = [], counts = { pikachu: 0, charizard: 0, sneaselToken: 0 }, beforeHp = {};
  const onEvent = event => {
    queue.push(publicEvent(event));
    if (['attackStart', 'attackRelease', 'damage', 'spellHit', 'spawn', 'beam', 'flame'].includes(event.type)) {
      events.push({ type: event.type, key: event.attacker?.key || event.sourceKey || event.key || event.unit?.key, id: event.attacker?.id || event.unit?.id, targetId: event.target?.id || event.targetId,
        at: round(game?.elapsed || 0), shot: event.shot, amount: event.amount, dot: event.dot, spawn: event.unit?.spawn, from: event.from, to: event.to,
        front: game?.projectiles.filter(p => p.flameCone).map(p => ({ id: p.id, travelled: p.travelled, length: p.totalDistance })) });
    }
    if (event.type === 'attackRelease' && counts[event.attacker?.key] !== undefined) counts[event.attacker.key]++;
  };
  game = new Game({ seed: 1114, onEvent }); game.state = 'playing'; game.aiEnabled = false;
  if (key === 'sneaselAmbush') {
    game.towers.forEach(tower => { tower.active = false; tower.cooldown = 999; tower.hp = tower.maxHp = 1e6; });
    game.hands[0][0] = key; game.energy[0] = 10; game.deploy(0, 0, 158, 172); actors.spell = game.spells[0];
  } else {
    game.towers = [];
    if (key === 'pikachu') {
      for (const [name, team, y] of [['pikachu', 0, 550], ['charizard', 1, 490]]) {
        const actor = game.spawn(name, team, 300, y, 0); actor.card = { ...actor.card, speed: 0 }; actor.hp = actor.maxHp = 1e6; actor.entryPending = false; actors[name] = actor;
      }
    } else {
      const actor = game.spawn('charizard', 0, 300, 550, 0); actor.entryPending = false; actors.charizard = actor;
      actors.front = still(game.spawn('geodude', 1, 300, 450, 0)); actors.behind = still(game.spawn('geodude', 1, 300, 625, 0)); actors.outside = still(game.spawn('geodude', 1, 400, 450, 0));
      for (const name of ['front', 'behind', 'outside']) beforeHp[name] = actors[name].hp;
      game.attack(actor, actors.front); actor.cooldown = 999;
    }
  }
  const duration = key === 'sneaselAmbush' ? 5.1 : key === 'pikachu' ? 4.2 : 1.5, total = Math.ceil(duration * 60);
  for (let index = 0; index <= total; index++) {
    if (index && index % 2 === 0) game.step(1 / 30);
    if (key === 'sneaselAmbush' && !vulnerability && game.units.some(unit => unit.key === 'sneaselToken')) {
      const minion = game.units.find(unit => unit.key === 'sneaselToken'); landing = round(game.elapsed);
      const defender = { card: CARDS.treecko, team: 1, hp: 100, x: minion.x + 10, y: minion.y };
      const before = minion.hp, targetable = game.validTarget(defender, minion), spellTargetable = spellPreviewTargets(game, CARDS.thunder, minion, 1).some(unit => unit.id === minion.id);
      game.damage(minion, 10, 1); vulnerability = { at: landing, spawnDelay: minion.spawn, targetable, spellTargetable, hpBefore: before, hpAfter: minion.hp, id: minion.id, position: { x: minion.x, y: minion.y } };
    }
    if (index % 4 === 0) {
      views = [0, 1].map(side => unpackGame(perspective(publicSnapshot(game, side), side)));
      for (let side = 0; side < 2; side++) for (const event of queue) renderers[side].onEvent(perspective(unpackEvent(event), side));
      queue = [];
    }
    const row = { index, at: round(index / 60), engineAt: round(game.elapsed), views: [] };
    for (let side = 0; side < 2; side++) {
      const r = renderers[side], view = views[side]; activeSide = side; artCalls[side] = [];
      if (index) for (const unit of [...view.units, ...view.towers]) {
        unit.anim += 1 / 60; unit.hit = Math.max(0, (unit.hit || 0) - 1 / 60);
        if (unit.card && view.state === 'playing') unit.spawn = Math.max(0, unit.spawn - 1 / 60);
      }
      r.draw(view, index ? 1 / 60 : 0);
      const charizard = [...r.frameActors.values()].find(unit => unit.key === 'charizard'), spell = view.spells.find(spell => spell.key === 'sneaselAmbush');
      const capsule = artCalls[side].find(call => call.name === 'pokeball' && call.size === 52);
      const flight = spell && r.visualFlights?.get(spell.visualId);
      const minion = vulnerability && view.units.find(unit => unit.id === vulnerability.id);
      row.views.push({ side, charizard: charizard ? { attack: round(charizard.attack), sequence: charizard.attackSeq, x: charizard.x, y: charizard.y, emitterError: headError(r, charizard) } : null,
        capsule: capsule ? { ...capsule, elapsed: flight?.elapsed, logical: spell.flightElapsed, flightTime: spell.flightTime } : null,
        fire: artCalls[side].filter(call => call.name === 'flame'),
        minion: minion ? { hp: minion.hp, spawn: minion.spawn, x: minion.x, y: minion.y, attack: minion.attack, sequence: minion.attackSeq } : null });
    }
    frames.push(row); if (capture) pngs.push(makeStage(key, index / 60, views, counts));
  }
  const damage = key === 'charizard' ? Object.fromEntries(['front', 'behind', 'outside'].map(name => [name, beforeHp[name] - actors[name].hp])) : null;
  const firstRelease = events.find(event => event.type === 'attackRelease' && event.key === 'sneaselToken');
  const rig = rigCalls.slice(), animatedGroups = {};
  for (const call of rig) { const group = `${call.side}:${call.animation}:${call.frame}`; (animatedGroups[group] ||= new Set()).add(call.silhouette); }
  return { key, duration, events, frames, counts, damage, flight: actors.spell ? { time: actors.spell.flightTime, castDelay: CARDS.sneaselAmbush.castDelay, speed: CARDS.sneaselAmbush.travelSpeed, landing, vulnerability,
    firstRelease: firstRelease?.at, afterLanding: firstRelease ? round(firstRelease.at - landing) : null, geometry: capsuleGeometry } : null,
    rig: { calls: rig, actualDraws: rigDraws.slice(), protectedChanges: rig.reduce((sum, call) => sum + call.protectedChanges, 0), protectedPixels: rig.reduce((sum, call) => sum + call.protectedPixels, 0),
      silhouettesPerNativeFrame: Object.fromEntries(Object.entries(animatedGroups).map(([key, values]) => [key, values.size])) }, pngs };
}
let videoFrames = [];
globalThis.__firstGroup = { ready: Promise.all(renderers.map(r => r.load(['pikachu', 'charizard', 'sneaselToken', 'geodude']))).then(() => { capsuleGeometry = measureCapsule(); }), run, antiLock,
  capture(key) { const result = run(key, true); videoFrames = result.pngs; result.frameCount = videoFrames.length; delete result.pngs; return result; },
  frameAt(index) { return videoFrames[index]; }, takeFrames(count = 30) { return videoFrames.splice(0, count); } };
