import { Game, CARDS } from '/engine.js?v=26';
import { publicSnapshot, publicEvent, unpackEvent } from '/online-wire.js?v=26';
import { unpackGame, perspective } from '/snapshot.js?v=26';

const app = globalThis.__visualApp, r = app.renderer, canvas = r.canvas;
const draw = r.draw.bind(r); r.draw = () => {}; app.game.step = () => {};
app.game.hands[0] = ['sneaselAmbush', 'golem', 'fireball', 'log']; app.game.energy[0] = 10; app.updateUi();
const round = value => Math.round(value * 1e6) / 1e6;
let backdrop = null;
function captureFrame() {
  if (!backdrop) return canvas.toDataURL('image/png').split(',')[1];
  const stage = document.createElement('canvas'); stage.width = innerWidth; stage.height = innerHeight;
  const c = stage.getContext('2d'), b = canvas.getBoundingClientRect(); c.imageSmoothingEnabled = false;
  c.drawImage(backdrop, 0, 0, stage.width, stage.height); c.drawImage(canvas, b.x, b.y, b.width, b.height);
  return stage.toDataURL('image/png').split(',')[1];
}
const imageKeys = new Map(); let nativeDraws = [], capsuleCalls = [], activeCapsule = null;
const nativeImage = r.ctx.drawImage.bind(r.ctx), nativeArc = r.ctx.arc.bind(r.ctx), nativeRotate = r.ctx.rotate.bind(r.ctx);
r.ctx.drawImage = (image, ...args) => {
  const key = imageKeys.get(image);
  if (key && args.length === 8) { const meta = r.metadata[76][key]; nativeDraws.push({ animation: key, frame: args[0] / meta.width, direction: args[1] / meta.height, destination: args.slice(4) }); }
  return nativeImage(image, ...args);
};
r.ctx.arc = (...args) => {
  if (activeCapsule) { const m = r.ctx.getTransform(); activeCapsule.arcs.push({ args, matrix: [m.a, m.b, m.c, m.d, m.e, m.f] }); }
  return nativeArc(...args);
};
r.ctx.rotate = (...args) => { if (activeCapsule) activeCapsule.rotations.push(args[0]); return nativeRotate(...args); };
const capsule = r.capsule.bind(r);
r.capsule = (c, x, y, size, angle) => {
  if (c !== r.ctx) return capsule(c, x, y, size, angle);
  activeCapsule = { x, y, size, angle, arcs: [], rotations: [] }; capsule(c, x, y, size, angle);
  capsuleCalls.push(activeCapsule); activeCapsule = null;
};
function reset(reduced = false) {
  r.resetVisuals(); r.effects = []; r.particles = []; r.numbers = []; r.t = 0; r.reduced = reduced; r.selection = null; r.pointer = null; r.healthStates.clear();
}
function rect() { const b = canvas.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, verticalScale: r.verticalScale }; }
function scene(onEvent) {
  const g = new Game({ seed: 3117, onEvent }); g.start(); g.aiEnabled = false;
  for (const tower of g.towers) { tower.active = false; tower.cooldown = 999; tower.hp = tower.maxHp = 1e6; }
  return g;
}
const wireView = (g, side) => unpackGame(perspective(publicSnapshot(g, side), side));
const deliver = (events, side) => { for (const event of events) r.onEvent(perspective(unpackEvent(event), side)); };
function tickView(view, dt) {
  if (view.state !== 'playing') return;
  for (const unit of [...view.units, ...view.towers]) { unit.anim += dt; unit.hit = Math.max(0, (unit.hit || 0) - dt); if (unit.card) unit.spawn = Math.max(0, unit.spawn - dt); }
}
function measureSphere(angle, capture) {
  const b = rect(), sx = b.width / canvas.width, sy = b.height / canvas.height, expected = 52 * sx, zoom = 4;
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(expected * zoom + 56); const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.translate(c.width / 2, c.height / 2); ctx.scale(sx * zoom, sy * zoom); r.capsule(ctx, 0, 0, 52, angle);
  const pixels = ctx.getImageData(0, 0, c.width, c.height).data; let left = c.width, right = -1, top = c.height, bottom = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (pixels[(y * c.width + x) * 4 + 3] >= 240) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  return { angle, expectedCss: expected, opaqueCssWidth: (right - left + 1) / zoom, opaqueCssHeight: (bottom - top + 1) / zoom,
    png: capture ? c.toDataURL('image/png').split(',')[1] : undefined };
}
function capsuleScene(side, capture = false) {
  reset(); let queued = [], g; const events = [], frames = [], pngs = [];
  g = scene(event => { queued.push(publicEvent(event)); if (['cast', 'spellHit'].includes(event.type)) events.push({ type: event.type, team: event.team, at: round(g?.elapsed || 0) }); });
  for (const team of [0, 1]) { g.hands[team][0] = 'sneaselAmbush'; g.energy[team] = 10; const result = g.deploy(team, 0, team ? 442 : 158, team ? 628 : 172); if (!result.ok) throw new Error(result.reason); }
  let view;
  for (let index = 0; index <= 204; index++) {
    if (index && index % 2 === 0) g.step(1 / 30);
    if (index % 4 === 0) { view = wireView(g, side); deliver(queued, side); queued = []; }
    tickView(view, index ? 1 / 60 : 0); capsuleCalls = []; draw(view, index ? 1 / 60 : 0);
    const b = rect(), sx = b.width / canvas.width, sy = b.height / canvas.height;
    const calls = capsuleCalls.map((call, i) => {
      const first = call.arcs[0], m = first.matrix, radius = first.args[2], spell = view.spells.filter(spell => spell.card.spawnOnImpact)[i];
      return { x: call.x, y: call.y, size: call.size, angle: call.angle, arcs: call.arcs.length, rotations: call.rotations.length,
        projectedWidth: 2 * radius * sx * Math.hypot(m[0], m[2]), projectedHeight: 2 * radius * sy * Math.hypot(m[1], m[3]),
        visualId: spell?.visualId, viewTeam: spell?.team, elapsed: r.visualFlights.get(spell?.visualId)?.elapsed };
    });
    frames.push({ index, at: round(index / 60), engineAt: round(g.elapsed), calls });
    if (capture) pngs.push(captureFrame());
  }
  const calls = frames.flatMap(frame => frame.calls.map(call => ({ ...call, at: frame.at, index: frame.index }))), phases = {};
  for (const [name, angle] of [['front', 0], ['side', Math.PI / 2], ['back', Math.PI], ['return', Math.PI * 2]]) {
    phases[name] = calls.reduce((best, call) => Math.abs(call.angle - angle) < Math.abs(best.angle - angle) ? call : best);
  }
  const measurements = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2].map(angle => measureSphere(angle, capture));
  return { side, viewport: { width: innerWidth, height: innerHeight }, board: rect(), events, frames, phases, measurements, pngs };
}
function pixelsFor(draw) {
  const [x, y, w, h] = draw.destination, left = Math.max(0, Math.floor(x - 5)), top = Math.max(0, Math.floor(y - 5));
  const width = Math.min(canvas.width - left, Math.ceil(w + 10)), height = Math.min(canvas.height - top, Math.ceil(h + 10));
  return { rect: [left, top, width, height], data: r.ctx.getImageData(left, top, width, height).data };
}
function golemScene(kind, team, side, reduced = false, capture = false) {
  reset(reduced); let queued = [], g, acted = false, pauseAt = null, resumed = false, pausedReference = null, pausedRect = null, pausedDifferentPixels = 0;
  const events = [], frames = [], pngs = [];
  g = scene(event => { queued.push(publicEvent(event)); if (['damage', 'faint', 'spellHit'].includes(event.type)) events.push({ type: event.type, at: round(g?.elapsed || 0), key: event.key || event.sourceKey, amount: event.amount }); });
  const unit = g.spawn('golem', team, 300, team ? 500 : 300, 0); unit.card = { ...unit.card, speed: 0, passive: true }; unit.entryPending = false;
  const origin = { x: unit.x, y: unit.y, hp: unit.hp }, caster = 1 - team;
  if (kind === 'fireball' || kind === 'log') {
    g.hands[caster][0] = kind; g.energy[caster] = 10;
    const x = kind === 'fireball' ? unit.x - 20 : unit.x, y = kind === 'log' ? unit.y + (caster ? -110 : 110) : unit.y;
    const result = g.deploy(caster, 0, x, y); if (!result.ok) throw new Error(`${kind}: ${result.reason}`);
  }
  let view;
  for (let index = 0; index <= 126; index++) {
    if (index && index % 2 === 0) g.step(1 / 30);
    if (!acted && g.elapsed >= .3 - 1e-7 && (kind === 'chip' || kind === 'death')) { acted = true; g.damage(unit, kind === 'death' ? unit.hp * 2 : 5, caster, { sourceKey: 'ekans' }); }
    const affected = unit.hp < origin.hp;
    if (index % 4 === 0) {
      if (affected && pauseAt === null) { g.pause(); pauseAt = index; }
      view = wireView(g, side); deliver(queued, side); queued = [];
    }
    if (pauseAt !== null && index >= pauseAt + 24 && !resumed) { g.resume(); view.state = 'playing'; resumed = true; }
    const dt = g.state === 'paused' ? 0 : index ? 1 / 60 : 0;
    tickView(view, dt); nativeDraws = []; draw(view, dt);
    const ghost = r.effects.find(effect => effect.kind === 'golemDeath');
    const row = { index, at: round(index / 60), engineAt: round(g.elapsed), paused: g.state === 'paused', hp: unit.hp, x: unit.x, y: unit.y, pushHurt: unit.pushHurt || 0,
      ghostLife: ghost?.life ?? null, native: nativeDraws.map(entry => ({ ...entry, destination: entry.destination.map(round) })) };
    if (row.paused && nativeDraws.length) {
      if (!pausedReference) { const pixels = pixelsFor(nativeDraws.at(-1)); pausedReference = pixels.data; pausedRect = pixels.rect; }
      else { const bytes = r.ctx.getImageData(...pausedRect).data; for (let p = 0; p < bytes.length; p++) if (bytes[p] !== pausedReference[p]) pausedDifferentPixels++; }
    }
    frames.push(row); if (capture) pngs.push(captureFrame());
  }
  const paused = frames.filter(frame => frame.paused);
  return { kind, team, side, reduced, board: rect(), origin, final: { x: unit.x, y: unit.y, hp: unit.hp, pushHurt: unit.pushHurt || 0 }, events, frames, pause: {
    frames: paused.length, engineTimes: [...new Set(paused.map(row => row.engineAt))], nativeImages: [...new Set(paused.flatMap(row => row.native.map(draw => `${draw.animation}:${draw.frame}:${draw.direction}`)))],
    visibleInEveryFrame: paused.every(row => row.native.length > 0), ghostLives: [...new Set(paused.map(row => row.ghostLife))], pixelRect: pausedRect, differentChannels: pausedDifferentPixels }, pngs };
}
function blockedPush() {
  const g = scene(() => {}); g.towers = []; const u = g.spawn('golem', 0, 44, 500, 0), legal = g.constrainMovement(u, u.x, u.y);
  u.x = legal.x; u.y = legal.y; const before = { x: u.x, y: u.y };
  g.pushUnit(u, -24, 0, { force: true }); return { before, after: { x: u.x, y: u.y }, pushHurt: u.pushHurt || 0 };
}
let captures = [];
globalThis.__visualFollowup = {
  ready: r.ensureSpecies([76, 74, 215, 31, 34, 52]).then(() => { for (const animation of ['Idle', 'Walk', 'Hurt', 'Attack']) { const image = r.sprites.get(`76-${animation}`); if (image) imageKeys.set(image, animation); } }),
  capsuleScene, golemScene, blockedPush,
  captureCapsule(side) { const result = capsuleScene(side, true); captures = result.pngs; result.frameCount = captures.length; delete result.pngs; return result; },
  captureGolem(kind, team, side, reduced) { const result = golemScene(kind, team, side, reduced, true); captures = result.pngs; result.frameCount = captures.length; delete result.pngs; return result; },
  frame(index) { return captures[index]; }, takeFrames(count = 30) { return captures.splice(0, count); }, board: rect,
  async setBackdrop(base64) { const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode(); backdrop = image; },
};
