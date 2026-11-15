"""Measure specified original effect sheets without changing other sprite bounds."""
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('effects',nargs='+')
args=parser.parse_args()
assets=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {BATTLE_ASSETS} from './dist/assets/battle/manifest.js';console.log(JSON.stringify(BATTLE_ASSETS))"],cwd=root))
output=root/'dist/assets/battle/projectile-bounds.js'
bounds=json.loads(output.read_text().split('export const PROJECTILE_BOUNDS=',1)[1].strip().removesuffix(';'))
measured={}
for name in args.effects:
 if name not in assets: parser.error('Unknown effect '+name)
 meta=assets[name]
 image=Image.open(root/'dist'/meta['file']).convert('RGBA')
 union=None
 for row in range(meta['rows']):
  for frame in range(meta['columns']):
   w,h=meta['width'],meta['height']
   box=image.crop((frame*w,row*h,(frame+1)*w,(row+1)*h)).getbbox()
   if box: union=box if union is None else (min(union[0],box[0]),min(union[1],box[1]),max(union[2],box[2]),max(union[3],box[3]))
 if not union: parser.error('Empty effect '+name)
 bounds[name]=union
 measured[name]=union
output.write_text('// Union alpha bounds keep animated projectile silhouettes at a consistent scale.\nexport const PROJECTILE_BOUNDS='+json.dumps(bounds)+';\n',encoding='utf-8')
print(json.dumps(measured))
