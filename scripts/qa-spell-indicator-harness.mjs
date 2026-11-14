const api = globalThis.__nativeIntegrated, r = api.renderer, cards = api.CARDS;
let scope = 'main', guides = [], operations = [], images = [], sprites = [], captures = new Map(), captureEnabled = false;
globalThis.__spellIndicatorProbe = { record(kind, data) { guides.push({ kind, scope, frame: api.frame, ...data }); } };
for (const [method, name] of Object.entries({ drawPlacement: 'aim', drawDeployments: 'deployment', field: 'field', drawEffects: 'fx', areaImpact: 'impact-fx', fireball: 'projectile', rollingSpell: 'projectile', sprite: 'body', tower: 'body', drawWater: 'background' })) {
  const original = r[method].bind(r); r[method] = (...args) => { const old = scope; scope = name; if (method === 'sprite') sprites.push({ preview: Boolean(args[1]?.preview), key: args[1]?.key, id: args[1]?.id, scope: old }); try { return original(...args); } finally { scope = old; } };
}
for (const method of ['arc', 'ellipse', 'closePath', 'moveTo', 'lineTo', 'fillRect', 'strokeRect']) {
  const original = r.ctx[method].bind(r.ctx); r.ctx[method] = (...args) => { if (scope === 'aim') operations.push({ method, args }); return original(...args); };
}
const drawImage = r.ctx.drawImage.bind(r.ctx);
r.ctx.drawImage = (image, ...args) => { if (['aim', 'field', 'fx', 'impact-fx', 'deployment', 'projectile'].includes(scope)) images.push({ scope, source: image.src || 'canvas' }); return drawImage(image, ...args); };
const art = r.battleArt.draw.bind(r.battleArt);
r.battleArt.draw = (c, name, ...args) => { if (name === 'pokeball') images.push({ scope, name }); return art(c, name, ...args); };
function clearTrace() { guides = []; operations = []; images = []; sprites = []; }
function metrics() { return { guides: structuredClone(guides), operations: structuredClone(operations), imageScopes: images.reduce((out, image) => (out[image.scope] = (out[image.scope] || 0) + 1, out), {}),
  pokeballs: images.filter(image => image.name === 'pokeball'), ghostSprites: sprites.filter(sprite => sprite.preview), targets: [...r.spellTargets] }; }
function paint() { clearTrace(); api.draw(0); return metrics(); }
function save(name) { const data = { name, engineAt: api.game.elapsed, frame: api.frame, board: api.board(), metrics: metrics() }; captures.set(name, { ...data, png: captureEnabled ? api.canvas.toDataURL('image/png') : null }); return data; }
const turn = (point, side) => side ? { x: 600 - point.x, y: 800 - point.y } : { ...point };
async function ready() { await api.ready; await r.ensureSpecies([215, 143]); }
function run(key, side = 0, capture = false) {
  captureEnabled = capture; captures = new Map(); const card = cards[key], team = side, game = api.init({ side }), input = turn(card.rolling ? { x: 179, y: 447 } : { x: 179, y: 255 }, side);
  if (!card.spell) throw new Error('The case must be a canonical spell.');
  const point = game.resolveDeployment(team, key, input.x, input.y), victimPoint = card.rolling ? turn({ x: 168, y: 340 }, side) : point;
  const victim = game.spawn('snorlax', 1 - team, victimPoint.x, victimPoint.y, 0); victim.stun = 30; victim.cooldown = 1000;
  r.selection = key; r.pointer = null; const selectedOnly = paint();
  r.pointer = turn(input, side); const hover = paint(), phases = [save('aim')];
  r.pointer = null; const exited = paint(); r.selection = null; const cancelled = paint();
  game.hands[team][0] = key; game.energy[team] = 10; const result = game.deploy(team, 0, input.x, input.y); if (!result.ok) throw new Error(result.reason);
  const castSpell = game.spells.find(spell => spell.key === key);
  const physicalBefore = JSON.stringify(game.spells); const released = paint(), physicalAfter = JSON.stringify(game.spells); phases.push(save('released'));
  const pending = [], landing = [], maxFrames = 900; let impactAt, resolvedAt, postFxImages = 0;
  for (let frame = 0; frame < maxFrames; frame++) {
    clearTrace(); api.step(); const trace = metrics();
    if (game.spells.some(spell => spell.key === key)) pending.push({ engineAt: game.elapsed, guides: trace.guides, imageScopes: trace.imageScopes });
    else {
      resolvedAt = game.elapsed;
      const hit = api.eventLog.find(row => row.event.type === 'spellHit' && row.event.key === key);
      if (hit) impactAt = hit.at;
      for (let i = 0; i < 12; i++) { clearTrace(); api.step(); const current = metrics(); landing.push(current); postFxImages += (current.imageScopes.field || 0) + (current.imageScopes.fx || 0) + (current.imageScopes['impact-fx'] || 0); }
      phases.push(save('impact-or-field')); break;
    }
    if (pending.length === 12) phases.push(save('in-flight'));
  }
  const area = hover.guides.filter(guide => guide.kind === 'area' && guide.scope === 'aim'), cells = hover.guides.filter(guide => guide.kind !== 'area');
  const postGuides = [...released.guides, ...pending.flatMap(row => row.guides), ...landing.flatMap(row => row.guides)];
  const sourceCounts = api.eventLog.reduce((out, row) => (out[row.event.type] = (out[row.event.type] || 0) + 1, out), {});
  const physical = { beforeRender: physicalBefore, afterRender: physicalAfter, impactAt, resolvedAt,
    rollingEnd: card.rolling ? { x: castSpell.x, y: castSpell.y, startY: castSpell.startY, travelRemaining: castSpell.travelRemaining, hitIds: castSpell.hitIds } : null, victimHp: victim.hp, victimMaxHp: victim.maxHp,
    fields: game.fields.filter(field => field.key === key).map(({ key, x, y, radius, duration, life }) => ({ key, x, y, radius, duration, life })),
    summoned: game.units.filter(unit => unit.key === card.spawnKey).map(({ id, key, x, y, spawn }) => ({ id, key, x, y, spawn })) };
  return { key, side, point, card: { radius: card.splash, rolling: Boolean(card.rolling), fieldDuration: card.fieldDuration || null, travelSpeed: card.travelSpeed || null, spawnOnImpact: Boolean(card.spawnOnImpact) },
    phases, selectedOnly, hover, exited, cancelled, released, pending, postImpactGuides: landing.flatMap(row => row.guides), physical, sourceCounts,
    checks: { selectedWithoutPointerHasNoGuide: selectedOnly.guides.length === 0, oneAreaOrLogAnchor: card.rolling ? area.length === 0 && hover.operations.filter(op => op.method === 'fillRect').length === 1 : area.length === 1 && area[0].radius === card.splash,
      noCellOrTravelGuide: cells.length === 0, noPreviewPokeballOrGhost: hover.pokeballs.length === 0 && hover.ghostSprites.length === 0 && !hover.imageScopes.aim,
      noCenterPointOrGrid: !hover.operations.some(op => ['ellipse', 'closePath', 'strokeRect'].includes(op.method)) && (card.rolling || !hover.operations.some(op => op.method === 'fillRect')),
      pointerExitClears: exited.guides.length === 0 && exited.targets.length === 0, cancellationClears: cancelled.guides.length === 0 && cancelled.targets.length === 0,
      releaseRemovesTacticalGuides: released.guides.length === 0, noDestinationGuideWhilePending: pending.every(row => row.guides.length === 0),
      noTacticalGuideAfterCast: postGuides.length === 0, drawKeepsPhysicalPayload: physicalBefore === physicalAfter,
      resolvesAtPhysicalDestination: card.rolling ? castSpell.travelRemaining === 0 && Math.abs(castSpell.y - castSpell.startY - (team ? 1 : -1) * card.travelDistance) < 1e-6 : Number.isFinite(impactAt),
      impactOrFieldFxRemainVisible: card.rolling ? pending.some(row => row.imageScopes.projectile > 0) && api.eventLog.some(row => row.event.type === 'hit' && row.event.key === key) : postFxImages > 0,
      fieldMechanicsRemain: !card.fieldDuration || physical.fields.length > 0,
      summonMechanicsRemain: !card.spawnOnImpact || physical.summoned.length === card.spawnTotal } };
}
async function materialFlight() {
  const { CAPSULE_TEXTURE } = await import('/capsule-art.js'), response = await fetch(CAPSULE_TEXTURE), bytes = await response.arrayBuffer();
  const digest = async data => [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(value => value.toString(16).padStart(2, '0')).join('');
  const image = r.battleArt.images.get(CAPSULE_TEXTURE), texture = r.capsuleArt?.texture;
  if (!image || !texture) throw new Error('The actual capsule material is not loaded.');
  const probe = document.createElement('canvas'); probe.width = texture.width; probe.height = texture.height; const c = probe.getContext('2d', { willReadFrequently: true }); c.imageSmoothingEnabled = false; c.drawImage(image, 0, 0, probe.width, probe.height);
  const sampled = c.getImageData(0, 0, probe.width, probe.height).data; let changed = 0; for (let p = 0; p < sampled.length; p++) if (sampled[p] !== texture.data[p]) changed++;
  const game = api.init({ seed: 7129, side: 0, mode: 'snapshots15' }); captureEnabled = true; captures = new Map();
  for (const team of [0, 1]) { const target = game.towers.find(tower => tower.team !== team && !tower.king && tower.lane === team); game.hands[team][0] = 'sneaselAmbush'; game.energy[team] = 10; const result = game.deploy(team, 0, target.x, target.y); if (!result.ok) throw new Error(result.reason); }
  const trace = [], phases = [], capsule = r.capsule.bind(r); let calls = [], allDrawsTextured = true;
  r.capsule = (ctx, x, y, size, angle, axis) => { calls.push({ x, y, size, angle, axis, visualElapsed: angle / 4 }); allDrawsTextured &&= r.capsuleArt?.texture === texture; return capsule(ctx, x, y, size, angle, axis); };
  try {
    for (let index = 0; index <= 228; index++) {
      calls = []; clearTrace(); if (index === 60) game.pause(); if (index === 84) game.resume(); if (index) api.step(); else api.draw(0);
      trace.push({ index, engineAt: game.elapsed, paused: game.state === 'paused', calls: structuredClone(calls) });
      if ([24, 108, 196].includes(index)) phases.push(save(index === 24 ? 'sphere-before' : index === 108 ? 'sphere-middle' : 'sphere-arrival-before-impact'));
    }
  } finally { r.capsule = capsule; }
  return { asset: { path: CAPSULE_TEXTURE, url: response.url, httpStatus: response.status, sha256: await digest(bytes),
      loadedImage: { currentSrc: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight },
      texture: { present: true, width: texture.width, height: texture.height, sha256: await digest(texture.data), sourceSampleDifferences: changed }, textureBoundForEveryDraw: allDrawsTextured },
    trace, phases, projection: r.projection,
    checks: { materialHttp200: response.status === 200, realSvgLoaded: CAPSULE_TEXTURE.endsWith('.svg') && image.complete && image.naturalWidth > 0,
      textureMatchesAssetPixels: changed === 0, textureUsedOnEveryCapsuleDraw: allDrawsTextured && trace.some(row => row.calls.length === 2) } };
}
globalThis.__spellIndicators = { ready: ready(), spells: Object.entries(cards).filter(([, card]) => card.spell).map(([key]) => key), run, materialFlight,
  async show(name) { const image = new Image(); image.src = captures.get(name).png; await image.decode(); r.ctx.save(); r.ctx.setTransform(1, 0, 0, 1, 0, 0); r.ctx.drawImage(image, 0, 0); r.ctx.restore(); } };
