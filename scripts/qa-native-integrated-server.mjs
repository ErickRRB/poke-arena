import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export async function createNativeIntegratedServer({ checkpoint, root = path.resolve(import.meta.dirname, '..'), qaRoutes = {} } = {}) {
  assert.ok(checkpoint, 'An explicit immutable checkpoint is required.');
  const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, maxBuffer: 24_000_000 });
  const sha = git('rev-parse', `${checkpoint}^{commit}`).toString('utf8').trim();
  assert.match(sha, /^[a-f0-9]{40}$/);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex'), cache = new Map(), sourceHashes = {}, qaHashes = {}, engineURLs = new Set(), missing = [];
  function product(relative) {
    if (!cache.has(relative)) {
      const bytes = git('show', `${sha}:dist/${relative}`); cache.set(relative, bytes);
      sourceHashes[`dist/${relative}`] = { bytes: bytes.length, sha256: hash(bytes) };
    }
    return cache.get(relative);
  }
  const files = git('ls-tree', '-r', '--name-only', sha, 'dist').toString('utf8').trim().split(/\r?\n/);
  const engineReferences = [];
  for (const file of files.filter(file => /^dist\/[^/]+\.js$/.test(file))) {
    const text = product(file.slice(5)).toString('utf8');
    for (const match of text.matchAll(/(?:from\s*|import\s*\()\s*['"](\.\/engine\.js[^'"]*)['"]/g)) engineReferences.push({ file, specifier: match[1] });
  }
  assert.deepEqual([...new Set(engineReferences.map(entry => entry.specifier))], ['./engine.js?v=26'], 'The checkpoint must use one engine URL.');
  const routes = new Map(Object.entries({ '/__qa/native-integrated-harness.mjs': path.join(root, 'scripts/qa-native-integrated-harness.mjs'), ...qaRoutes }));
  const qa = new Map();
  for (const [url, file] of routes) { const bytes = Buffer.isBuffer(file) ? file : await readFile(file); qa.set(url, bytes); qaHashes[url] = hash(bytes); }
  const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
  const server = http.createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/engine.js') engineURLs.add(request.url);
      if (qa.has(pathname)) { response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }).end(qa.get(pathname)); return; }
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (relative.split('/').some(part => !part || part === '..' || part === '.')) { response.writeHead(403).end(); return; }
      let bytes = product(relative);
      if (relative === 'app.js') bytes = Buffer.from("document.getElementById('arena').getContext('2d',{alpha:false,willReadFrequently:true});\n" + bytes.toString('utf8') + '\nglobalThis.__nativeIntegratedApp={CARDS,get game(){return game},renderer,sfx};');
      response.writeHead(200, { 'Content-Type': mime[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
    } catch (error) { missing.push(request.url); response.writeHead(404).end('Not present in the immutable checkpoint.'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, checkpoint: sha, sourceHashes, qaHashes, engineURLs, engineReferences, missing, product,
    async close() { await new Promise(resolve => server.close(resolve)); } };
}
