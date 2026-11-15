"""Offline lossless encoding. Requires the development environment's Pillow/WebP."""
import argparse
import hashlib
import json
from pathlib import Path
import PIL
from PIL import Image, features

parser = argparse.ArgumentParser()
parser.add_argument('input', type=Path, help='Directory produced by bake-fire-wheel.mjs')
parser.add_argument('output', type=Path, help='Destination atlas directory')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
sha = lambda data: hashlib.sha256(data).hexdigest()
report = {'kind': 'offline_lossless_webp', 'pillow': PIL.__version__, 'libwebp': features.version('webp'), 'options': {'lossless': True, 'quality': 100, 'method': 6, 'exact': True}, 'rows': []}
for mode in ['normal', 'reduced']:
    source = args.input / f'{mode}.png'
    with Image.open(source) as image:
        rgba = image.convert('RGBA')
        output = args.output / f'{mode}.webp'
        rgba.save(output, format='WEBP', **report['options'])
        with Image.open(output) as decoded:
            if decoded.convert('RGBA').tobytes() != rgba.tobytes():
                raise AssertionError(f'Encoding changed RGBA: {mode}')
        report['rows'].append({'mode': mode, 'width': rgba.width, 'height': rgba.height, 'sourcePngSha256': sha(source.read_bytes()), 'webpSha256': sha(output.read_bytes()), 'rgbaSha256': sha(rgba.tobytes()), 'webpBytes': output.stat().st_size, 'rgbaExact': True})
(args.output / 'encoding.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps({'output': str(args.output.resolve()), 'bytes': sum(row['webpBytes'] for row in report['rows']), 'rgbaExact': True}))
