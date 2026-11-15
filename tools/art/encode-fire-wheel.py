"""Offline Q85 colour encoding with exact alpha; requires Pillow/WebP."""
import argparse
import hashlib
import json
from pathlib import Path
import PIL
from PIL import Image, features

parser = argparse.ArgumentParser()
parser.add_argument('input', type=Path, help='Directory produced by bake-fire-wheel.mjs')
parser.add_argument('output', type=Path, help='Destination atlas directory')
parser.add_argument('--quality', type=int, choices=[85], default=85, help='Reviewed production colour quality; alpha remains exact.')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
sha = lambda data: hashlib.sha256(data).hexdigest()
report = {'kind': 'offline_q85_colour_webp_exact_alpha', 'pillow': PIL.__version__, 'libwebp': features.version('webp'), 'arguments': {'quality': args.quality}, 'options': {'lossless': False, 'quality': args.quality, 'method': 6, 'exact': True}, 'rows': []}
for mode in ['normal', 'reduced']:
    source = args.input / f'{mode}.png'
    with Image.open(source) as image:
        rgba = image.convert('RGBA')
        output = args.output / f'{mode}.webp'
        rgba.save(output, format='WEBP', **report['options'])
        pixels = rgba.tobytes()
        with Image.open(output) as decoded:
            decoded_pixels = decoded.convert('RGBA').tobytes()
            if decoded_pixels[3::4] != pixels[3::4]:
                raise AssertionError(f'Encoding changed alpha: {mode}')
        report['rows'].append({'mode': mode, 'width': rgba.width, 'height': rgba.height, 'sourcePngSha256': sha(source.read_bytes()), 'webpSha256': sha(output.read_bytes()), 'sourceRgbaSha256': sha(pixels), 'rgbaSha256': sha(decoded_pixels), 'alphaSha256': sha(pixels[3::4]), 'webpBytes': output.stat().st_size, 'rgbaExact': pixels == decoded_pixels, 'alphaExact': True})
(args.output / 'encoding.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps({'output': str(args.output.resolve()), 'bytes': sum(row['webpBytes'] for row in report['rows']), 'rgbaExact': all(row['rgbaExact'] for row in report['rows']), 'alphaExact': True}))
