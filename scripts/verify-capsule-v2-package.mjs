import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..'), folder = path.join(root, 'docs/visual-followup/capsule-v2');
const write = process.argv.includes('--write'), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportBytes = await readFile(path.join(folder, 'verification.json')), report = JSON.parse(reportBytes);
assert.equal(hash(await readFile(path.join(folder, 'inputs/capsule-live-v34.js'))), report.baseline.sha256, 'Packaged authentic baseline must retain its exact captured bytes.');
const firstBytes = await readFile(path.join(folder, 'first-review.json')), first = JSON.parse(firstBytes);
const readGit = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8_000_000 });
const previousHead = '01ec423b12a46c5d5acfbadf43607f5571b7eb15', capturedHead = report.base.gitHead;
function geometry(text) {
  const marker = 'export const SPRITE_GEOMETRY=', index = text.indexOf(marker);
  assert.ok(index >= 0, 'Missing geometry export.');
  return JSON.parse(text.slice(index + marker.length).trim().replace(/;$/, ''));
}
const previous = geometry(readGit('show', `${previousHead}:dist/sprite-geometry.js`));
const capturedGeometry = readGit('show', `${capturedHead}:dist/sprite-geometry.js`), current = geometry(capturedGeometry), changedSpecies = {};
for (const id of new Set([...Object.keys(previous), ...Object.keys(current)])) {
  const changed = [...new Set([...Object.keys(previous[id] || {}), ...Object.keys(current[id] || {})])]
    .filter(animation => JSON.stringify(previous[id]?.[animation]) !== JSON.stringify(current[id]?.[animation]));
  if (changed.length) changedSpecies[id] = changed;
}
assert.deepEqual(changedSpecies, { 101: ['Shoot'] });
const geometryLineEndings = [
  ['LF', capturedGeometry.replace(/\r\n/g, '\n')],
  ['CRLF', capturedGeometry.replace(/\r?\n/g, '\r\n')],
].find(([, text]) => hash(text) === report.sourceHashes['dist/sprite-geometry.js'])?.[0];
assert.ok(geometryLineEndings, 'Captured geometry must match the commit content, allowing checkout line endings.');

const summary = { kind: 'derived-numeric-summary', capturedAt: report.generatedAt,
  sourceReport: { file: 'verification.json', sha256: hash(reportBytes), note: 'Extracted from the final capture. No new simulation, images or videos were generated.' },
  base: report.base, model: report.model, browser: report.browser, baseline: report.baseline,
  checks: report.checks, findings: report.findings, material: report.material, budget: report.budget,
  cases: report.cases.map(({ mode, side, reduced, variant, camera, board, projection, summary, pausedPixelChanges, cache, drawMs }) =>
    ({ mode, side, reduced, variant, camera, board, projection, summary, pausedPixelChanges, cache, drawMs })) };
if (write) await writeFile(path.join(folder, 'numeric-verification.json'), JSON.stringify(summary, null, 2) + '\n');
const actualSummary = JSON.parse(await readFile(path.join(folder, 'numeric-verification.json')));
assert.deepEqual(actualSummary, summary, 'Numeric summary must be the explicit extract of this capture.');

const checkedArtifacts = [];
for (const [cut, data] of [['first-review', first], ['final', report]]) for (const artifact of data.artifacts) {
  assert.equal(hash(await readFile(path.join(folder, artifact.file))), artifact.sha256, `Artifact changed: ${artifact.file}`);
  checkedArtifacts.push({ cut, file: artifact.file, sha256: artifact.sha256 });
}
const checkedLinks = [];
for (const file of ['README.md', 'index.html']) {
  const text = await readFile(path.join(folder, file), 'utf8');
  assert.ok(text.includes(capturedHead.slice(0, 7)), `${file} must identify the captured HEAD.`);
  const matches = file.endsWith('.md') ? [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)] : [...text.matchAll(/(?:href|src)="([^"]+)"/g)];
  for (const match of matches) {
    const target = match[1]; if (/^(?:https?:|#)/.test(target)) continue;
    const resolved = path.resolve(folder, decodeURIComponent(target.split('#')[0]));
    assert.ok(resolved.startsWith(folder + path.sep), `Link escapes package: ${target}`);
    if (target !== 'package-audit.json' || !write) await access(resolved);
    checkedLinks.push({ from: file, target });
  }
}
const sourceDrift = [];
for (const [file, capturedHash] of Object.entries(report.sourceHashes)) {
  try { if (hash(await readFile(path.join(root, file))) !== capturedHash) sourceDrift.push(file); }
  catch { sourceDrift.push(file); }
}
const audit = { checkedAt: new Date().toISOString(), status: 'passed', finalCut: { generatedAt: report.generatedAt, gitHead: capturedHead, report: 'verification.json', reportSha256: hash(reportBytes),
    localChanges: 'The captured sourceHashes remain authoritative for uncommitted renderer, camera and material changes.' },
  firstReviewCut: { generatedAt: first.generatedAt, gitHead: null, report: 'first-review.json', reportSha256: hash(firstBytes), note: 'HEAD was not recorded. Original source and artifact hashes remain unchanged.' },
  deltaFromNativeBase: { from: previousHead, to: capturedHead, files: readGit('diff', '--name-only', previousHead, capturedHead).trim().split(/\r?\n/),
    changedSpecies, capturedGeometryMatchesHead: true, checkoutLineEndings: geometryLineEndings,
    scope: 'Only species 101 Shoot changed in served data; capsule scenes contain no species 101. The commit blob reproduces the recorded byte hash with the specified checkout line endings.' },
  numericSummary: { file: 'numeric-verification.json', sha256: hash(await readFile(path.join(folder, 'numeric-verification.json'))), kind: summary.kind },
  checkedArtifacts, checkedLinks, sourceFilesAtCapture: Object.keys(report.sourceHashes).length, sourceDriftAfterCapture: sourceDrift,
  note: 'Artifact checks are historical. Current-tree drift is reported separately and never changes recorded capture hashes. This audit does not run the browser or regenerate media.' };
if (write) await writeFile(path.join(folder, 'package-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ status: audit.status, capturedHead, artifacts: checkedArtifacts.length, localLinks: checkedLinks.length, changedSpecies, sourceDriftAfterCapture: sourceDrift }));
