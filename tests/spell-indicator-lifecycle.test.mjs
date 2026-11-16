import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, CARDS } from '../dist/engine.js?v=34';
import { Renderer } from '../dist/render.js?v=32';

const spells = Object.entries(CARDS).filter(([, card]) => card.spell);
function context() {
  const calls = [], ctx = new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),measureText:()=>({width:80})}, { get: (object, name) => object[name] ?? ((...args) => calls.push({ method: name, args })), set: (object, name, value) => (object[name] = value, true) });
  return { ctx, calls };
}
function fixture(key, team = 0) {
  const game = new Game({ seed: 3601 }); game.start(); game.aiEnabled = false; game.energy[team] = 10;
  const pointer = team ? { x: 311, y: 281 } : { x: 289, y: 519 }, recorded = context();
  const renderer = Object.assign(Object.create(Renderer.prototype), { selection: key, pointer, placementTeam: team, t: 0, reduced: false,
    sprite() { recorded.calls.push({ method: 'ghostSprite', args: [] }); }, combatArt(...args) { recorded.calls.push({ method: 'previewArt', args }); }, fireWheel(...args){recorded.calls.push({method:'previewArt',args});}, capsule(...args){recorded.calls.push({method:'capsuleGhost',args});} });
  return { game, renderer, ...recorded };
}
for (const [key, card] of spells) for (const team of [0, 1]) {
  test(`${key} shows its exact area or initial ground ghost while aiming, team${team}`, () => {
    const { game, renderer, ctx, calls } = fixture(key, team), point = game.resolveDeployment(team, key, renderer.pointer.x, renderer.pointer.y);
    assert.ok(point); renderer.drawPlacement(ctx, game);
    assert.equal(calls.filter(call => ['drawImage', 'ellipse', 'closePath', 'strokeRect'].includes(call.method)).length, 0, 'No hard reticle, grid or connector.');
    assert.equal(calls.filter(call=>call.method==='ghostSprite').length,card.spawnOnImpact?game.summonSpellPositions({card,team,...point}).length:0);
    assert.equal(calls.filter(call=>call.method==='previewArt').length,key==='log'?1:0);
    assert.equal(calls.filter(call=>call.method==='capsuleGhost').length,card.spawnOnImpact?1:0);
    if (card.rolling) {
      assert.equal(key, 'log'); assert.equal(calls.filter(call => call.method === 'arc').length, 1);
      assert.ok(calls.some(call=>call.method==='scale'&&call.args[0]===1&&call.args[1]<.3),'The ground hint is shallow, not a circular damage area.');
      const fills=calls.filter(call=>call.method==='fillRect').map(call=>call.args);
      assert.equal(fills[0][0],point.x-card.splash);assert.equal(fills[0][2],card.splash*2);assert.ok(fills[0][3]<=card.travelDistance);
      assert.equal(calls.filter(call=>['moveTo','lineTo','stroke'].includes(call.method)).length,0,'Log keeps one soft cell anchor without a corridor or reticle.');
    } else {
      assert.deepEqual(calls.filter(call => call.method === 'arc').map(call => call.args), [[point.x, point.y, card.splash, 0, Math.PI * 2]]);
      assert.equal(calls.filter(call => call.method === 'fillRect').length, 0);
      const paths = calls.filter(call => ['moveTo', 'lineTo'].includes(call.method));
      assert.equal(paths.length,0,'There are no cardinal ticks.');
      assert.equal(calls.filter(call=>call.method==='stroke').length,0,'The soft area has no outline.');
    }
  });
  test(`${key} clears its aiming graphics on pointer exit and cancellation, team${team}`, () => {
    const { game, renderer, ctx, calls } = fixture(key, team); renderer.pointer = null; renderer.drawPlacement(ctx, game);
    assert.equal(calls.filter(call => !['save', 'restore'].includes(call.method)).length, 0);
    calls.length = 0; renderer.selection = null; renderer.pointer = { x: 300, y: 500 }; renderer.drawPlacement(ctx, game); assert.deepEqual(calls, []);
  });
}
test('all cast spells keep their physical data and do not draw a pending destination guide in Renderer.draw', () => {
  for (const [key, card] of spells) {
    const { game, renderer, ctx, calls } = fixture(key); game.hands[0][0] = key; assert.equal(game.deploy(0, 0, 288, 508).ok, true);
    const physical = JSON.stringify(game.spells), forwarded = { projectile: 0, rolling: 0 };
    Object.assign(renderer, { ctx, canvas: { width: 600, height: 800 }, viewport: { width: 600, height: 800 }, projection: { scale: 1, x: 0, y: 0 },
      worldBounds: { left: 0, top: 0, right: 600, bottom: 800 }, battleArt: {}, background: {}, healthStates: new Map(), visualActors: new Map(), visualProjectiles: new Map(), visualFlights: new Map(), particles: [],
      visualActor: actor => ({ ...actor }), drawWater() {}, tower() {}, sprite() {}, frozen() {}, drawEffects() {}, drawPlacement() {}, drawDeployments() {}, field() {},
      spellFlight() { forwarded.projectile++; }, rollingSpell() { forwarded.rolling++; } });
    renderer.draw(game, 0);
    assert.equal(calls.filter(call => ['arc', 'ellipse', 'moveTo', 'lineTo', 'closePath'].includes(call.method)).length, 0, key);
    assert.equal(JSON.stringify(game.spells), physical, `${key}: rendering must retain physical cast/destination data.`);
    assert.equal(forwarded.rolling, card.rolling ? 1 : 0); assert.equal(forwarded.projectile, card.travelSpeed && !card.rolling ? 1 : 0);
  }
});
