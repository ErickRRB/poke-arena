import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const base = 'docs/visual-followup/native-camera/';
const load = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const legal = await load(base + 'A540-final/legal.json');
const foot = await load(base + 'A540-selected/ray-foot-audit.json');
const physics = await load(base + 'ray-anchor-review/physics-A540-final.json');
const baseline = await load(base + 'ray-anchor-review/physics-baseline.json');
const camera = { left: 30, top: -122, width: 540, height: 934 };
assert.equal(legal.sourceHead, '99b30d0ad5b72dec7c49c023886b58a0fc4b5bea');
assert.deepEqual(legal.findings, []);
assert.deepEqual(legal.pageErrors, []);
assert.equal(legal.viewports.length, 3);
const viewports = legal.viewports.map(({ viewport, layout, scenarios, usefulAreaCss }) => {
  assert.deepEqual(layout.camera, camera);
  assert.equal(layout.verticalScale, 1);
  assert.deepEqual(layout.grid, { size: 24, left: 84, top: 16, columns: 18, rows: 32 });
  assert.equal(layout.cellCss.width, layout.cellCss.height);
  assert.deepEqual(layout.rects.before, layout.rects.selected);
  assert.deepEqual(layout.rects.before, layout.rects.transient);
  for (const point of layout.points) {
    assert.ok(Math.abs(point.roundTrip.x - point.world.x) < 1e-9);
    assert.ok(Math.abs(point.roundTrip.y - point.world.y) < 1e-9);
  }
  const { origin, width, height } = layout.backgroundCache;
  assert.ok(origin.x <= layout.worldBounds.left && origin.y <= layout.worldBounds.top);
  assert.ok(origin.x + width >= layout.worldBounds.right);
  assert.ok(origin.y + height >= layout.worldBounds.bottom);
  assert.equal(scenarios.length, 5);
  let visibleBodyFrames = 0;
  let maxProjectionErrorCss = 0;
  for (const scenario of scenarios) {
    assert.equal(scenario.deployments.length, 2);
    assert.ok(scenario.deployments.every(d => d.requestedCellLegal && d.result.ok));
    assert.equal(scenario.summary.clippedBodyFrames, 0);
    assert.equal(scenario.summary.hudIntersectingBodyFrames, 0);
    assert.equal(scenario.summary.maxHudProjectedAreaCss, 0);
    assert.ok(scenario.summary.maxProjectionErrorCss < 1e-4);
    visibleBodyFrames += scenario.summary.visibleBodyFrames;
    maxProjectionErrorCss = Math.max(maxProjectionErrorCss, scenario.summary.maxProjectionErrorCss);
  }
  assert.equal(visibleBodyFrames, 1528);
  return { viewport, canvas: layout.board, usefulAreaCss, cellCss: layout.cellCss,
    backgroundCache: layout.backgroundCache, visibleBodyFrames, clippedBodyFrames: 0,
    hudIntersectingBodyFrames: 0, maxProjectionErrorCss };
});
assert.equal(foot.frames, 184);
assert.equal(foot.rows.length, 184);
assert.ok(foot.rows.every(row => row.frame === row.actualFrame));
assert.ok(foot.maxEmitterErrorWorld < 0.71);
assert.equal(foot.recovery.length, 8);
for (const row of foot.recovery) {
  assert.ok(row.shootLastEqualsWalk0 && row.walk0EqualsIdle0);
  assert.deepEqual(row.headDelta, [0, 0]);
  assert.deepEqual(row.bodyDelta, [0, 0]);
}
assert.deepEqual(physics.visual, { movementAnchor: 'foot', scale: 1.25 });
assert.deepEqual(physics.physicalProfile, baseline.physicalProfile);
assert.equal(physics.cases.length, 5);
for (const row of physics.cases) {
  assert.equal(row.identical, true);
  assert.equal(row.sha256, baseline.cases.find(b => b.name === row.name)?.sha256);
}

const artifactPaths = [
  base + 'README.md',
  base + 'A540-selected/legal.json',
  base + 'A540-selected/ray-foot-audit.json',
  base + 'A540-foot125/reading.json',
  base + 'A540-foot125/390-roles-reading.png',
  base + 'B528-foot115/reading.json',
  base + 'B528-foot115/390-roles-reading.png',
  base + 'legal-588x900-final/verification.json',
  'scripts/qa-native-camera.mjs',
  'scripts/qa-native-camera-harness.mjs',
  'scripts/native-camera-legal-scenarios.mjs',
  'scripts/check-ray-visual-physics.mjs',
  'scripts/verify-native-camera-evidence.mjs',
];
for (const folder of ['A540-final/', 'ray-anchor-review/']) {
  for (const file of await readdir(new URL(base + folder, root))) {
    if (/\.(png|json)$/.test(file)) artifactPaths.push(base + folder + file);
  }
}
const artifacts = [];
for (const path of [...new Set(artifactPaths)].sort()) {
  const raw = await readFile(new URL(path, root));
  const binary = path.endsWith('.png');
  const bytes = binary ? raw : Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'));
  artifacts.push({ path, hashMode: binary ? 'binary' : 'lf-normalized-text',
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const report = {
  schemaVersion: 1,
  result: 'PASS for the five documented reachable scenarios in three viewports',
  capturedHead: legal.sourceHead,
  sourceNote: 'HEAD at capture plus working-tree A540 changes. sourceHashes preserve the frozen bytes; this matrix predates c8d41d1/8126d04 and does not certify later UI changes.',
  sourceHashes: legal.sourceHashes,
  camera,
  rayVisual: foot.profile,
  totalVisibleBodyFrames: viewports.reduce((sum, v) => sum + v.visibleBodyFrames, 0),
  totalClippedBodyFrames: 0,
  totalHudIntersectingBodyFrames: 0,
  nativeAudit: { frames: foot.frames, recoveryDirections: foot.recovery.length,
    maxEmitterErrorWorld: foot.maxEmitterErrorWorld },
  physicalTraceMatches: physics.cases.length,
  viewports,
  artifacts,
};
const manifest = new URL(base + 'verification.json', root);
if (process.argv.includes('--write')) {
  await writeFile(manifest, JSON.stringify(report, null, 2) + '\n');
} else {
  assert.deepEqual(JSON.parse(await readFile(manifest, 'utf8')), report);
}
console.log(JSON.stringify({ result: 'PASS', visibleBodyFrames: report.totalVisibleBodyFrames,
  clippedBodyFrames: 0, hudIntersectingBodyFrames: 0, physicalTraceMatches: 5,
  nativeFrames: 184, artifacts: artifacts.length, manifest: base + 'verification.json' }));
