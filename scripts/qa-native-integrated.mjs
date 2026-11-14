import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createNativeIntegratedServer } from './qa-native-integrated-server.mjs';

const root = path.resolve(import.meta.dirname, '..'), argument = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const checkpoint = argument('checkpoint', ''), draft = process.argv.includes('--draft'), noImages = process.argv.includes('--no-images');
assert.ok(checkpoint, 'Pass --checkpoint=<final immutable SHA>. A working-tree capture is deliberately unsupported.');
const server = await createNativeIntegratedServer({ checkpoint, qaRoutes: { '/__qa/native-integrated-cases.mjs': path.join(root, 'scripts/qa-native-integrated-cases.mjs') } });
const output = draft ? path.join(root, 'qa/native-integrated', server.checkpoint.slice(0, 7)) : path.join(root, 'docs/visual-followup/native-integrated', server.checkpoint.slice(0, 7));
await mkdir(path.join(output, 'frames'), { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), report = { generatedAt: new Date().toISOString(), status: draft ? 'draft' : 'final-checkpoint', checkpoint: server.checkpoint,
  scope: argument('keys', 'roselia,charmander,log,raltsHut,centralElectrode').split(','), model: { simulationHz: 30, publicSnapshotsHz: 15, rendererSamplingHz: 60, perspectives: [0, 1],
    viewportSizes: [[390, 844], [768, 1024], [1440, 1000]], network: 'No network jitter; publicSnapshot/publicEvent/unpackEvent/perspective/unpackGame from the checkpoint.' },
  instrumentation: 'Real served app and immutable Game/Renderer. The original app simulation is suspended; controlled scenarios use canonical cards. Context readback is fixture-only. HUD is the initial app state.',
  limits: 'This is controlled combat QA, not an online match or collection/detail QA. No material, gameplay or statistics are changed. Browser capture is not proof of publication.', cases: [], screenshots: [], findings: [] };
let playwright, browser;
for (const location of [process.env.POKE_ARENA_PLAYWRIGHT_MODULE, new URL('../../pokemon-arena/qa/node_modules/playwright/index.mjs', import.meta.url).href, 'playwright'].filter(Boolean)) {
  try { playwright = await import(/^[A-Za-z]:[\\/]/.test(location) ? pathToFileURL(location).href : location); break; } catch {}
}
const errors = [], invalidRequests = [], urls = new Set();
try {
  assert.ok(playwright, 'Playwright is required.'); browser = await playwright.chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true }); report.browser = await browser.version();
  for (const [width, height] of report.model.viewportSizes.filter(([width]) => argument('widths', '390,768,1440').split(',').includes(String(width)))) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', error => errors.push({ viewport: width, message: error.message }));
    page.on('request', request => { urls.add(new URL(request.url()).pathname + new URL(request.url()).search); if (/assets\/pokemon\/(undefined|null|NaN)(\/|\?)/.test(request.url())) invalidRequests.push(request.url()); });
    await page.addInitScript(() => localStorage.setItem('poke-arena:sound', 'false'));
    await page.goto(server.url); await page.waitForFunction(() => globalThis.__nativeIntegratedApp && !document.getElementById('start-btn').disabled);
    await page.locator('#start-btn').click();
    await page.evaluate(async () => { await import('/__qa/native-integrated-harness.mjs'); await __nativeIntegrated.ready; await document.fonts.ready; await import('/__qa/native-integrated-cases.mjs'); });
    for (const key of report.scope) for (const side of [0, 1]) {
      const result = await page.evaluate(({ key, side }) => __nativeIntegratedCases.run(key, side), { key, side }); result.viewport = { width, height };
      for (const [check, passed] of Object.entries(result.checks)) if (!passed) report.findings.push({ viewport: width, key, side, check });
      report.cases.push(result);
      if (!noImages) {
        let phases;
        if (width === 390) phases = side === 0 || key === 'log' ? result.phases : result.phases.filter(phase => ['impact', 'preview', 'ralts-out', 'fire-projectile', 'token-impact'].includes(phase.name));
        else phases = side === 0 ? [result.phases.find(phase => phase.name === 'preview') || result.phases.at(-1)] : [];
        for (const phase of phases) {
          await page.evaluate(name => __nativeIntegratedCases.show(name), phase.name);
          const file = `frames/${width}-${key}-side${side}-${phase.name}.png`, bytes = await page.screenshot(); await writeFile(path.join(output, file), bytes);
          report.screenshots.push({ file, bytes: bytes.length, sha256: hash(bytes), key, side, width, phase: phase.name, engineAt: phase.engineAt });
        }
      }
      console.log(JSON.stringify({ viewport: width, key, side, checks: Object.keys(result.checks).length, failed: Object.entries(result.checks).filter(([, value]) => !value).map(([key]) => key) }));
    }
    await page.close();
  }
  report.engineURLs = [...server.engineURLs]; assert.deepEqual(report.engineURLs, ['/engine.js?v=26']);
  report.errors = errors; report.invalidRequests = invalidRequests; report.missingRequests = server.missing.filter(url => !url.startsWith('/favicon'));
  if (errors.length || invalidRequests.length || report.missingRequests.length) report.findings.push({ check: 'browser-resources', errors, invalidRequests, missing: report.missingRequests });
  assert.deepEqual(report.findings, [], 'Integrated QA found failures; preserve the report and fix the actual issue before closing.');
} catch (error) { report.error = error.stack; throw error; }
finally {
  if (browser) await browser.close(); await server.close(); report.engineReferences = server.engineReferences; report.sourceHashes = server.sourceHashes; report.qaHashes = server.qaHashes;
  report.scriptHashes = Object.fromEntries(await Promise.all(['qa-native-integrated.mjs', 'qa-native-integrated-server.mjs', 'qa-native-integrated-harness.mjs', 'qa-native-integrated-cases.mjs'].map(async file => [file, hash(await readFile(path.join(root, 'scripts', file)))])));
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
}
