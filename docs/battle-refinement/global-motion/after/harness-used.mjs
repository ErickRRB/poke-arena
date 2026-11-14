import { Game, CARDS, directionRow } from '/engine.js?v=26';
import { Renderer } from '/render.js?v=29';
import { attackAnimationFrame, animationFrame, movementAnchor, emissionPoint, emitterPart } from '/sprite-motion.js?v=26';
import { SPRITE_GEOMETRY } from '/sprite-geometry.js';
import { packGame, unpackGame, packEvent } from '/snapshot.js?v=26';
import { movementVisual } from '/combat-visuals.js?v=29';

const KEYS = ["beedrill","snorlax","lugia","rayquaza","koffing","kangaskhan","babyKangaskhan"];
const DIRECTIONS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const canvas = document.querySelector('canvas'); canvas.getContext('2d', { alpha: false, willReadFrequently: true }); const renderer = new Renderer(canvas);
const round = value => Math.round(value * 1e6) / 1e6;
const imageKeys = new Map(), rasterIds = new Map();
let draws = [];
const nativeDraw = renderer.ctx.drawImage.bind(renderer.ctx);
renderer.ctx.drawImage = function (image, ...args) {
  const key = imageKeys.get(image);
  if (key && args.length === 8) {
    const [id, animation] = key.split(':'), meta = renderer.metadata[id][animation];
    draws.push({ id: Number(id), animation, frame: args[0] / meta.width, direction: args[1] / meta.height, destination: args.slice(4).map(round) });
  }
  return nativeDraw(image, ...args);
};
function pose(actor) {
  const card = actor.card, moving = movementVisual(card), attacking = actor.attack > 0;
  const animation = attacking ? actor.attackAnim || card.attackAnim : actor.moving || card.flying ? moving.animation : actor.hit > 0 ? 'Hurt' : card.idleAnim || 'Idle';
  const meta = renderer.metadata[card.id][animation], age = Math.max(0, (actor.attackDuration || card.attackDuration) - actor.attack);
  const direction = directionRow(actor.dx, actor.dy);
  let frame;
  if (attacking) frame = attackAnimationFrame(meta, age, actor.attackDuration, actor.attackWindup ?? card.windup, card.attackFrames, card);
  else if (moving.frames && animation === moving.animation) frame = moving.frames[animationFrame({ durations: moving.frames.map(() => moving.frameDuration) }, (renderer.t + actor.id * .173) * 60)];
  else frame = animationFrame(meta, animation === 'Hurt' ? Math.max(0, .24 - actor.hit) * 60 : (renderer.t + actor.id * .173) * 60 * (actor.moving || card.flying ? .85 : .75));
  return { animation, direction, frame, age: round(age), raster: rasterIds.get(`${card.id}:${animation}:${direction}:${frame}`) || null };
}
function reset() {
  renderer.resetVisuals(); renderer.effects = []; renderer.particles = []; renderer.numbers = []; renderer.t = 0;
  renderer.healthStates.clear(); renderer.flightWings?.phases.clear(); renderer.reduced = false;
}
function fixture(key, direction, onEvent) {
  const game = new Game({ seed: 833, onEvent }); game.state = 'playing'; game.aiEnabled = false; game.towers = [];
  const actor = game.spawn(key, 0, 300, 520, 0), angle = (2 - direction) * Math.PI / 4;
  const target = game.spawn('diglett', 1, 300 + Math.cos(angle) * 20, 520 + Math.sin(angle) * 20, 0);
  target.card = { ...target.card, passive: true, damage: 0, speed: 0, structure: !!actor.card.building, lifetime: 1e12 }; target.hp = target.maxHp = 1e6;
  game.units = [actor, target]; actor.entryPending = target.entryPending = false; actor.anim = target.anim = 0;
  game.face(actor, target); game.attack(actor, target); actor.cooldown = 999;
  return { game, actor, target };
}
function markers(actor, shot) {
  const p = pose(actor), card = actor.card, geometry = SPRITE_GEOMETRY[card.id][p.animation];
  const points = geometry.points[p.direction][p.frame], scale = actor.scale ?? card.scale;
  const anchor = card.movementAnchor === 'body' ? movementAnchor(card.id, p.animation, p.direction, p.frame, { x: points[0], y: points[1] }) : { x: points[0], y: points[1] };
  const part = emitterPart(card), leftProjection = points[6] * actor.dx + points[7] * actor.dy, rightProjection = points[8] * actor.dx + points[9] * actor.dy;
  let selected = part === 'leadHand' ? leftProjection >= rightProjection ? 6 : 8 : part === 'body' ? 2 : part === 'hands' || part === 'cannons' ? shot % 2 ? 8 : 6 : 4;
  const forward = part === 'head' ? 2 : 1, lift = card.flying ? 16 : 0;
  const actual = emissionPoint(actor, shot), tiedHands = part === 'leadHand' && Math.abs(leftProjection - rightProjection) < 1e-8;
  // In exactly frontal views both hands can be equally forward. Cancellation
  // order in floating point must not turn either valid marker into a QA failure.
  if (tiedHands) {
    const distance = offset => Math.hypot(actor.x + (points[offset] - anchor.x + actor.dx) * scale - actual.x,
      actor.y - lift + (points[offset + 1] - anchor.y + actor.dy) * scale - actual.y);
    selected = distance(6) <= distance(8) ? 6 : 8;
  }
  const expected = { x: actor.x + (points[selected] - anchor.x + actor.dx * forward) * scale, y: actor.y - lift + (points[selected + 1] - anchor.y + actor.dy * forward) * scale };
  return { part, tiedHands, selectedMarker: selected === 6 ? 'left' : selected === 8 ? 'right' : part, leftProjection: round(leftProjection), rightProjection: round(rightProjection), expected, actual,
    error: round(Math.hypot(expected.x - actual.x, expected.y - actual.y)), native: points, anchor, scale };
}
function compose(key, mode, time, current, events, emitter) {
  const stage = document.createElement('canvas'); stage.width = 390; stage.height = 844;
  const c = stage.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#f7f0d5'; c.fillRect(0, 0, 390, 844); c.drawImage(canvas, 10, 2, 370, 677);
  c.strokeStyle = '#ffdf5e'; c.lineWidth = 1.5; c.beginPath(); c.arc(10 + emitter.x * 370 / 600, 2 + emitter.y * 677 / 800, 3, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#203d32'; c.font = 'bold 15px sans-serif'; c.fillText(`${CARDS[key].name} · ${mode}`, 12, 708);
  c.font = '12px monospace'; c.fillText(`t=${time.toFixed(3)} s  native=${current.animation}:${current.frame}`, 12, 733);
  c.fillText(`age=${current.age.toFixed(3)}  logic hits=${events.length}/${CARDS[key].burst || 1}`, 12, 753);
  c.fillText('Renderer 60 Hz · cuadros nativos repetidos', 12, 786);
  return stage.toDataURL('image/png').split(',')[1];
}
async function initialize() {
  if (!SPRITE_GEOMETRY[68]?.Punch || !SPRITE_GEOMETRY[123]?.Slice) throw new Error('Regenerate sprite geometry before this browser audit.');
  await renderer.load([...KEYS, 'diglett']);
  for (const [key, image] of renderer.sprites) {
    const separator = key.indexOf('-'); imageKeys.set(image, `${key.slice(0, separator)}:${key.slice(separator + 1)}`);
  }
  for (const key of KEYS) {
    const card = CARDS[key], meta = renderer.metadata[card.id][card.attackAnim], image = renderer.sprites.get(`${card.id}-${card.attackAnim}`);
    const crop = document.createElement('canvas'); crop.width = meta.width; crop.height = meta.height;
    const c = crop.getContext('2d', { willReadFrequently: true });
    for (let direction = 0; direction < 8; direction++) for (let frame = 0; frame < meta.durations.length; frame++) {
      const id = `${card.id}:${card.attackAnim}:${direction}:${frame}`; if (rasterIds.has(id)) continue;
      c.clearRect(0, 0, crop.width, crop.height); c.drawImage(image, frame * meta.width, direction * meta.height, meta.width, meta.height, 0, 0, meta.width, meta.height);
      const bytes = c.getImageData(0, 0, crop.width, crop.height).data;
      let left = meta.width, right = -1, top = meta.height, bottom = -1;
      for (let y = 0; y < meta.height; y++) for (let x = 0; x < meta.width; x++) if (bytes[(y * meta.width + x) * 4 + 3]) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      const trimmed = c.getImageData(left, top, right - left + 1, bottom - top + 1).data;
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', trimmed))].map(value => value.toString(16).padStart(2, '0')).join('');
      rasterIds.set(id, `${right - left + 1}x${bottom - top + 1}:${hash}`);
    }
  }
  return true;
}

function run(key, mode, capture = false, direction = 4, intervention = null) {
  reset(); const rate = mode === 'engine60' ? 60 : 30, remote = mode === 'snapshots15';
  const releases = [], damage = [], queue = [], frames = [], pngs = []; let game, actor, target, view, pendingEvents = [], pausedAt = null, interrupted = false, pausedPixels = null, pausePixelsEqual = true;
  const onEvent = event => {
    if (event.type === 'attackRelease' && event.attacker?.id === actor?.id) {
      const card = actor.card, expectedFrame = card.attackGestures?.length ? card.attackGestures[event.shot % card.attackGestures.length].contact : card.attackContactFrame ?? renderer.metadata[card.id][card.attackAnim].hitFrame;
      const release = { shot: event.shot, at: round(game.elapsed), expectedAt: round(card.windup + event.shot * (card.burstSpacing || 0)), expectedFrame, logic: pose(actor), emitter: markers(actor, event.shot) };
      releases.push(release); queue.push(release);
    }
    if (event.type === 'damage' && event.sourceId === actor?.id) damage.push({ at: round(game.elapsed), amount: event.amount, dot: !!event.dot, pose: pose(actor) });
    if (remote) pendingEvents.push(packEvent(event)); else renderer.onEvent(event);
  };
  ({ game, actor, target } = fixture(key, direction, onEvent));
  if (remote) { view = unpackGame(packGame(game)); for (const event of pendingEvents) renderer.onEvent(event); pendingEvents = []; }
  const total = Math.ceil(((actor.card.attackDuration || 1) + .4 + (intervention === 'pause' ? .35 : 0)) * 60);
  for (let index = 0; index <= total; index++) {
    const time = index / 60;
    if (intervention === 'stun' && !interrupted && game.elapsed >= actor.card.windup * .6) { game.damage(actor, 0, 1, { stun: 1 }); interrupted = true; }
    if (intervention === 'pause' && pausedAt === null && game.elapsed >= actor.card.windup * .6) { game.pause(); pausedAt = time; }
    if (pausedAt !== null && time >= pausedAt + .35 && game.state === 'paused') game.resume();
    if (index && index % (60 / rate) === 0) game.step(1 / rate);
    if (remote && index % 4 === 0) { view = unpackGame(packGame(game)); for (const event of pendingEvents) renderer.onEvent(event); pendingEvents = []; }
    const shown = remote ? view : game;
    if (remote && index) for (const unit of shown.units) unit.anim += 1 / 60;
    draws = []; renderer.draw(shown, game.state === 'paused' ? 0 : index ? 1 / 60 : 0);
    const displayed = renderer.frameActors.get(actor.id), native = draws.filter(draw => draw.id === actor.card.id).at(-1), current = pose(displayed);
    const row = { index, at: round(time), logicalAt: round(game.elapsed), state: game.state, sequence: actor.attackSeq, attack: round(displayed.attack), direction: directionRow(displayed.dx, displayed.dy),
      pose: current, drawn: native || null, visualEmission: renderer.visualEmission(displayed), releases: releases.length, hp: target.hp };
    if (capture) row.tilePng = actorTile(); frames.push(row);
    if (game.state === 'paused') {
      const pixels = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      if (pausedPixels) pausePixelsEqual &&= pixels.every((value, index) => value === pausedPixels[index]);
      else pausedPixels = pixels;
    }
    for (const release of queue) if (release.rendered === undefined && (!remote || index % 4 === 0)) release.rendered = { at: round(time), pose: current, drawn: native || null, marker: renderer.visualEmission(displayed, release.shot) };
    for (const hit of damage) if (hit.rendered === undefined && (!remote || index % 4 === 0)) hit.rendered = { at: round(time), pose: current, drawn: native || null };
    if (capture === true) pngs.push(compose(key, mode, time, { ...current, ...native }, releases, row.visualEmission));
  }
  const attackFrames = frames.filter(frame => frame.pose.animation === actor.card.attackAnim);
  const contacts = releases.map(release => {
    const expectedRaster = rasterIds.get(`${actor.card.id}:${actor.card.attackAnim}:${direction}:${release.expectedFrame}`), drawn = release.rendered?.drawn;
    const raster = drawn && rasterIds.get(`${actor.card.id}:${drawn.animation}:${drawn.direction}:${drawn.frame}`);
    const stop = actor.card.windup + (release.shot + 1) * (actor.card.burstSpacing || actor.card.attackDuration);
    const visible = frames.filter(frame => frame.at >= release.expectedAt - 1 / 60 - 1e-6 && frame.at < stop - 1e-6 && frame.drawn &&
      rasterIds.get(`${actor.card.id}:${frame.drawn.animation}:${frame.drawn.direction}:${frame.drawn.frame}`) === expectedRaster).map(frame => frame.at);
    return { ...release, nativeContactVisible: drawn?.animation === actor.card.attackAnim && raster === expectedRaster,
      nativeFrameMatches: drawn?.animation === actor.card.attackAnim && drawn.frame === release.expectedFrame, visibleAt: visible };
  });
  const pauseRows = frames.filter(frame => frame.state === 'paused');
  const interHit = contacts.slice(0, -1).map((contact, shot) => {
    const gesture = actor.card.attackGestures[shot % actor.card.attackGestures.length], next = contacts[shot + 1];
    const between = frames.filter(frame => frame.at > contact.rendered.at && frame.at < next.rendered.at && frame.drawn?.animation === actor.card.attackAnim);
    return { shot, followVisible: between.some(frame => frame.drawn.frame === gesture.follow), restVisible: between.some(frame => frame.drawn.frame === gesture.rest), frames: [...new Set(between.map(frame => frame.drawn.frame))] };
  });
  return { key, mode, direction, intervention, profile: { id: actor.card.id, animation: actor.card.attackAnim, emitter: emitterPart(actor.card), burst: actor.card.burst || 1,
    windup: actor.card.windup, spacing: actor.card.burstSpacing || 0, duration: actor.card.attackDuration, gestures: actor.card.attackGestures },
    contacts, damage, frames, interHit, clockNeverRewinds: frames.every((frame, index) => !index || !frame.attack || !frames[index - 1].attack || frame.sequence !== frames[index - 1].sequence || frame.pose.age + 1e-6 >= frames[index - 1].pose.age), distinctNativeRasters: new Set(attackFrames.map(frame => frame.pose.raster).filter(Boolean)).size,
    recoveryObserved: frames.some(frame => frame.at > actor.card.attackDuration && frame.attack === 0 && frame.pose.animation !== actor.card.attackAnim),
    stableDirection: frames.every(frame => frame.direction === direction),
    pause: pauseRows.length ? { frames: pauseRows.length, logicalTimes: [...new Set(pauseRows.map(frame => frame.logicalAt))], nativeFrames: [...new Set(pauseRows.map(frame => `${frame.pose.animation}:${frame.pose.frame}`))], identicalPixels: pausePixelsEqual } : null,
    pngs };
}

function sheet(key) {
  reset(); const card = CARDS[key], stages = [{ label: 'reposo', age: 0 }, { label: 'prepara', age: card.windup * .75 }];
  for (let shot = 0; shot < (card.burst || 1); shot++) {
    const age = card.windup + shot * (card.burstSpacing || 0), window = shot === (card.burst || 1) - 1 ? card.attackDuration - age : card.burstSpacing;
    stages.push({ label: `contacto ${shot + 1}`, age, shot }, { label: `follow ${shot + 1}`, age: age + window * .55, shot });
  }
  stages.push({ label: 'recupera', age: card.attackDuration - .005 }, { label: 'vuelve', age: card.attackDuration + .03 });
  const sheet = document.createElement('canvas'); sheet.width = 8 * 138; sheet.height = stages.length * 132 + 40;
  const c = sheet.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#243c30'; c.fillRect(0, 0, sheet.width, sheet.height);
  const draw = c.drawImage.bind(c); let actualDraw = null;
  c.drawImage = (image, ...args) => {
    const key = imageKeys.get(image);
    if (key?.startsWith(`${card.id}:`) && args.length === 8) {
      const animation = key.slice(key.indexOf(':') + 1), meta = renderer.metadata[card.id][animation];
      actualDraw = { animation, frame: args[0] / meta.width, direction: args[1] / meta.height };
    }
    return draw(image, ...args);
  };
  c.fillStyle = '#fff2cc'; c.font = 'bold 15px sans-serif'; c.fillText(`${card.name} · ${card.attackAnim} · amarillo: emisor; cian: cabeza; rojo/azul: manos`, 8, 24);
  const rows = [], vertical = renderer.verticalScale; renderer.verticalScale = 1;
  for (let stage = 0; stage < stages.length; stage++) for (let direction = 0; direction < 8; direction++) {
    const sample = stages[stage], x = direction * 138, y = stage * 132 + 40, angle = (2 - direction) * Math.PI / 4;
    c.fillStyle = '#36503e'; c.fillRect(x + 1, y + 1, 136, 130); c.fillStyle = '#fff2cc'; c.font = '11px monospace'; c.fillText(`${DIRECTIONS[direction]} ${sample.label}`, x + 5, y + 15);
    const actor = { id: 71, key, card, x: x + 69, y: y + 103, dx: Math.cos(angle), dy: Math.sin(angle), team: 0, anim: sample.age,
      attack: Math.max(0, card.attackDuration - sample.age), attackDuration: card.attackDuration, attackWindup: card.windup, attackAnim: card.attackAnim, spawn: 0, hit: 0, moving: false };
    renderer.t = sample.age; actualDraw = null; renderer.sprite(c, actor, true);
    const p = pose(actor); c.fillStyle = '#dce8c9'; c.fillText(`f${p.frame} ${sample.age.toFixed(3)}s`, x + 5, y + 127);
    if (actor.attack > 0) {
      const m = markers(actor, sample.shot || 0), e = renderer.visualEmission(actor, sample.shot || 0);
      const shift = { x: e.x - m.actual.x, y: e.y - m.actual.y };
      for (const [offset, color] of [[4, '#76e3ef'], [6, '#f45e75'], [8, '#7c9aff']]) {
        const px = actor.x + (m.native[offset] - m.anchor.x) * m.scale + shift.x, py = actor.y - (card.flying ? 16 : 0) + (m.native[offset + 1] - m.anchor.y) * m.scale + shift.y;
        c.fillStyle = color; c.fillRect(px - 2, py - 2, 4, 4);
      }
      c.strokeStyle = '#ffdf5e'; c.beginPath(); c.arc(e.x, e.y, 4, 0, 2 * Math.PI); c.stroke();
      rows.push({ stage: sample.label, direction, age: round(sample.age), pose: p, drawn: actualDraw, emitter: m });
    }
  }
  renderer.verticalScale = vertical;
  return { key, rows, png: sheet.toDataURL('image/png').split(',')[1] };
}

globalThis.__combo = { ready: initialize(), run, sheet, keys: KEYS, renderer, canvas };

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
