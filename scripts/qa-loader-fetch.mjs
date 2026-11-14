import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..'), output = path.join(root, 'docs/visual-followup/loader/inputs/public');
const origin = 'https://poke-arena-erick.eriqrb.chatgpt.site', files = ['index.html', 'loader-art.js', 'editor.css?v=32', 'transient-ui.css?v=26', 'testing.html', 'testing.js?v=26', 'testing.css?v=26', 'assets/ui/pokeball-v2.webp'];
await mkdir(output, { recursive: true });
const results = await Promise.allSettled(files.map(async file => {
  const response = await fetch(origin + '/' + (file === 'index.html' ? '' : file), { signal: AbortSignal.timeout(15000) }), bytes = Buffer.from(await response.arrayBuffer());
  const saved = file.split('?')[0]; await mkdir(path.dirname(path.join(output, saved)), { recursive: true }); await writeFile(path.join(output, saved), bytes);
  return { url: response.url, file: saved, status: response.status, contentType: response.headers.get('content-type'), date: response.headers.get('date'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
const report = { retrievedAt: new Date().toISOString(), scope: 'Read-only public HTTP GET of the current live source and loading asset. The task identifies this deployment as V35; no native hosting version is inferred from branch files.', results };
await writeFile(path.join(output, 'retrieval.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
