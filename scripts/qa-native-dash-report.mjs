import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const checkpoint = process.argv.find(value => value.startsWith('--checkpoint='))?.slice(13);
assert.ok(checkpoint, 'Pass --checkpoint=<SHA>.');
const root = path.resolve(import.meta.dirname, '..');
const folder = path.join(root, 'docs/visual-followup/native-dash', checkpoint.slice(0, 7));
const report = JSON.parse(await readFile(path.join(folder, 'verification.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.ok(report.checkpoint.startsWith(checkpoint));
assert.deepEqual(report.findings, []);
assert.deepEqual(report.missing, []);
assert.equal(hash(await readFile(path.join(root, 'scripts/qa-native-dash-audio.mjs'))), report.runnerSha256);
const ffprobe = process.env.FFPROBE || 'C:/Users/Mapa/AppData/Local/Programs/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffprobe.exe';
const probes = {};
for (const mode of ['local30', 'snapshots15']) {
  const sample = report.cases.find(item => item.mode === mode);
  assert.equal(sample.videoFrames, 480);
  assert.deepEqual(sample.encoderErrors, []);
  assert.equal(sample.failedAssets, 0);
  assert.ok(sample.peakRms > 0);
  assert.equal(sample.events.filter(event => event.type === 'dashStart').length, 2);
  assert.equal(sample.events.filter(event => event.type === 'attackRelease' && event.style === 'dash').length, 2);
  assert.equal(sample.events.filter(event => event.type === 'attackRelease' && event.style === 'shadow').length, 5);
  probes[mode] = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,duration,nb_read_frames,sample_rate,channels', '-of', 'json', path.join(folder, mode + '.mp4')], { encoding: 'utf8', windowsHide: true }));
  const video = probes[mode].streams.find(stream => stream.codec_type === 'video');
  const audio = probes[mode].streams.find(stream => stream.codec_type === 'audio');
  assert.equal(video.nb_read_frames, '480');
  assert.equal(video.avg_frame_rate, '60/1');
  assert.equal(Number(video.duration), 8);
  assert.equal(audio.codec_name, 'aac');
}
await writeFile(path.join(folder, 'ffprobe.json'), JSON.stringify(probes, null, 2) + '\n');
await writeFile(path.join(folder, '.gitattributes'), '* -text\n** -text\n');
await writeFile(path.join(folder, 'README.md'), `# Sableye: dos embestidas con el audio actualizado

Corte inmutable \`${report.checkpoint}\`, capturado el ${report.generatedAt}. Incluye la cámara A540, contacto instantáneo y emisor físico corregidos, y la mezcla de Main que reemplazó los impactos genéricos anteriores. [Local a 30 Hz](local30.mp4) y [snapshots a 15 Hz](snapshots15.mp4) muestran dos embestidas contra blancos distintos y cinco básicos posteriores contra el segundo blanco que sigue cerca.

Cada vídeo contiene **480 renders a 60 fps y 8 segundos**. VideoEncoder conserva cada render con su timestamp individual. FFmpeg convierte VP8 a H.264 y añade audio AAC; ffprobe confirma 480 frames, 60/1 y 8,000 s. La presentación sigue el tiempo real aunque el monitor funcione a 144 Hz. Se conservan también los flujos IVF y WebM de origen.

SoundSystem decodifica los 131 recursos reales del mismo commit, sin recursos fallidos. Su salida WebAudio se graba con MediaRecorder; las preparaciones, salidas y contactos producen salida real en ambos modos. Esta evidencia comprueba reproducción y sincronía de la mezcla elegida; no sustituye la revisión estética del sonido. El informe anterior 4bd550b conserva su aviso sobre el impacto genérico que el usuario rechazó.

Las dos salidas se producen a separaciones entre cuerpos de 117,6 y 104 u, frente al mínimo nativo de 84 u; los básicos ocurren a 15 u. Los contactos muestran Attack3, el fotograma nativo de Sableye. No hay una tercera embestida contra el blanco cercano.

La escena mantiene Poochyena y Regice inmóviles y pasivos, con vida ampliada en el segundo para observar los básicos. Sableye conserva sus números, selección de blancos y relojes. La partida principal y su audio se detienen durante la captura. Son dos modos controlados de entrega periódica, sin jitter variable ni una partida pública entre personas.

[Visor](index.html) · [Eventos, frames, sonido y fuentes](verification.json) · [Metadatos de vídeo](ffprobe.json) · [Hashes](SHA256SUMS.json).

Repetir la captura: \`node scripts/qa-native-dash-audio.mjs --checkpoint=${checkpoint}\`. Empaquetar y verificar: \`node scripts/qa-native-dash-report.mjs --checkpoint=${checkpoint}\`. Se necesitan las instalaciones existentes de Playwright/Edge y FFmpeg; FFPROBE permite cambiar la ruta del verificador. El servidor usa un solo módulo \`engine.js?v=26\` y sirve las fuentes mediante git show del commit indicado.
`);
await writeFile(path.join(folder, 'index.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sableye: dos embestidas con audio actualizado</title><style>body{font:16px/1.5 system-ui;background:#f4efdb;color:#293e31;margin:24px;max-width:1000px}video{width:370px;max-width:100%;image-rendering:pixelated}article{display:inline-block;vertical-align:top;margin-right:24px}a{color:#395f59}</style><h1>Sableye: dos embestidas y básicos</h1><p>Corte ${checkpoint.slice(0, 7)} con el audio actualizado de Main. Cada vídeo conserva 480 renders a 60 fps y 8 segundos. Activá el sonido en el reproductor para oír la salida real grabada.</p><article><h2>Motor local a 30 Hz</h2><video controls playsinline preload="metadata" src="local30.mp4"></video></article><article><h2>Snapshots a 15 Hz</h2><video controls playsinline preload="metadata" src="snapshots15.mp4"></video></article><p><a href="README.md">Método y alcance</a> · <a href="verification.json">Mediciones</a> · <a href="ffprobe.json">Metadatos</a> · <a href="SHA256SUMS.json">Hashes de artefactos</a></p></html>`);
const hashes = {};
for (const file of (await readdir(folder)).sort()) {
  if (file !== 'SHA256SUMS.json') hashes[file] = hash(await readFile(path.join(folder, file)));
}
await writeFile(path.join(folder, 'SHA256SUMS.json'), JSON.stringify(hashes, null, 2) + '\n');
console.log(JSON.stringify({ checkpoint: report.checkpoint, videos: 2, framesEach: 480, fps: 60, durationSeconds: 8, hashes: Object.keys(hashes).length }));
