"""Extract visible frame bounds from original PNGs without modifying their pixels."""
from pathlib import Path
import json
from PIL import Image
root = Path(__file__).resolve().parent.parent
image = Image.open(root / 'dist/assets/battle/Particle__Gust_Blue.None.png')
bounds = [image.crop((index * 80, 0, (index + 1) * 80, 80)).getbbox() for index in range(image.width // 80)]
(root / 'dist/assets/battle/frame-bounds.js').write_text('export const WHIRLPOOL_BOUNDS=' + json.dumps(bounds, separators=(',', ':')) + ';\n', encoding='utf-8')
