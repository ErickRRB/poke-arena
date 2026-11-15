import { Game, CARDS } from '/engine.js?v=26';
import { publicSnapshot, publicEvent, unpackEvent } from '/online-wire.js?v=26';
import { perspective, unpackGame } from '/snapshot.js?v=26';

const app = globalThis.__nativeIntegratedApp, renderer = app.renderer, canvas = renderer.canvas, render = renderer.draw.bind(renderer);
if (CARDS !== app.CARDS) throw new Error('The app and fixture loaded different engine instances.');
renderer.draw = () => {}; app.game.step = () => {};
let game, side = 0, view, frame = 0, mode = 'snapshots15', queue = [], eventLog = [];
const listeners = new Set();
function sync() {
  view = mode === 'local30' && !side ? game : unpackGame(perspective(publicSnapshot(game, side), side));
  for (const event of queue) { const converted = perspective(unpackEvent(event), side); renderer.onEvent(converted,view); for (const listener of listeners) listener(converted); }
  queue = [];
}
function draw(dt = 0) { sync(); render(view, game.state === 'paused' ? 0 : dt); return view; }
function init({ seed = 61031, side: nextSide = 0, reduced = false, mode: nextMode = 'snapshots15', passiveTowers = true } = {}) {
  side = nextSide; mode = nextMode; frame = 0; queue = []; eventLog = [];
  renderer.resetVisuals(); renderer.effects = []; renderer.particles = []; renderer.numbers = []; renderer.healthStates.clear();
  renderer.t = 0; renderer.reduced = reduced; renderer.selection = null; renderer.pointer = null; renderer.tutorialSpot = false; renderer.placementTeam = 0;
  game = new Game({ seed, onEvent(event) { const packed = publicEvent(event); queue.push(packed); eventLog.push({ at: game?.elapsed || 0, event: packed }); } });
  game.start(); game.aiEnabled = false;
  if (passiveTowers) for (const tower of game.towers) { tower.active = false; tower.cooldown = 1000; }
  draw(0); return game;
}
function step(frames = 1) {
  for (let i = 0; i < frames; i++) {
    frame++; if (frame % 2 === 0) game.step(1 / 30);
    if (mode === 'local30' || frame % 4 === 0) sync();
    if (mode === 'snapshots15' && view.state === 'playing') for (const unit of [...view.units, ...view.towers]) {
      unit.anim += 1 / 60; unit.hit = Math.max(0, (unit.hit || 0) - 1 / 60); if (unit.card) unit.spawn = Math.max(0, unit.spawn - 1 / 60);
    }
    render(view, game.state === 'paused' ? 0 : 1 / 60);
  }
  return view;
}
const ready = renderer.ensureSpecies([315, 4, 143, 280, 101, 100, 74]);
globalThis.__nativeIntegrated = { renderer, canvas, draw, init, step, ready, CARDS, sfx: app.sfx,
  get game() { return game; }, get side() { return side; }, get view() { return view; }, get frame() { return frame; }, get eventLog() { return eventLog; },
  onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  board() { const b = canvas.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, projection: renderer.projection }; } };
init();
