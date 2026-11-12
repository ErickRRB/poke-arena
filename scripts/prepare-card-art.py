"""Prepare a complete generated card illustration for mobile without cropping."""
import argparse
import json
import re
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--key', required=True)
args = parser.parse_args()
if not re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', args.key):
    raise SystemExit('Invalid card key')
destination = Path(__file__).resolve().parents[1] / 'dist' / 'assets' / 'cards' / (args.key + '.webp')
with Image.open(args.source) as original:
    if original.width < 768 or original.height < 768:
        raise SystemExit('Generated artwork is below the expected resolution')
    image = original.convert('RGB')
    image.thumbnail((768, 960), Image.Resampling.LANCZOS)
    image.save(destination, 'WEBP', quality=90, method=6)
    print(json.dumps({'key': args.key, 'file': str(destination), 'size': list(image.size), 'bytes': destination.stat().st_size}))
