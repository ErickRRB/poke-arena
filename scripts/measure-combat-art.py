"""Measure original raster silhouettes for the visual review. Does not edit images."""
import json, pathlib, subprocess
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
cards=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CARDS} from './dist/engine.js';console.log(JSON.stringify(CARDS))"],cwd=root))
manifest=json.loads((root/'dist/assets/pokemon/manifest.json').read_text())
profiles={}
for card in cards.values():
 if card.get('spell') or str(card['id']) in profiles: continue
 meta=manifest[str(card['id'])]['Idle']; im=Image.open(root/'dist'/meta['file']).convert('RGBA'); body=0
 for row in range(8):
  box=im.crop((0,row*meta['height'],meta['width'],(row+1)*meta['height'])).getbbox()
  if box: body=max(body,box[2]-box[0],box[3]-box[1])
 profiles[str(card['id'])]={'body':body,'name':card['name']}
output='// Native Idle silhouette in source pixels, measured in all eight directions.\nexport const POKEMON_SILHOUETTES=Object.freeze('+json.dumps(profiles,ensure_ascii=False,indent=2)+');\n'
(root/'dist/pokemon-silhouettes.js').write_text(output,encoding='utf-8')
assets=json.loads((root/'dist/assets/battle/manifest.json').read_text())['animations']; bounds={}
for name,meta in assets.items():
 if name not in ['hydro','bubble','shadow','psychic','poison','rock','leaf','snow','flame','lightningHead','coin','egg','song','waterBeamHead','fireOrb','fireTrail','hydroShot','emberShot','songShot','petalShot']: continue
 im=Image.open(root/'dist'/meta['file']).convert('RGBA'); union=None
 for row in range(meta['rows']):
  for frame in range(meta['columns']):
   box=im.crop((frame*meta['width'],row*meta['height'],(frame+1)*meta['width'],(row+1)*meta['height'])).getbbox()
   if box: union=box if union is None else (min(union[0],box[0]),min(union[1],box[1]),max(union[2],box[2]),max(union[3],box[3]))
 if union: bounds[name]=union
(root/'dist/assets/battle/projectile-bounds.js').write_text('// Union alpha bounds keep animated projectile silhouettes at a consistent scale.\nexport const PROJECTILE_BOUNDS='+json.dumps(bounds)+';\n')
print('Measured',len(profiles),'species and',len(bounds),'effect sheets')
