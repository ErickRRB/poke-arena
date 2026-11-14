"""Review-only contact sheets: active card scenes beside official reference art."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

parser = argparse.ArgumentParser()
parser.add_argument('--inventory', default='docs/pokemon-fidelity/inventory.json')
parser.add_argument('--output', default='docs/pokemon-fidelity')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
cards = json.loads((root / args.inventory).read_text(encoding='utf-8'))
output = root / args.output
output.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
for start in range(0, len(cards), 16):
    sheet = Image.new('RGB', (1520, 1200), '#f2efe5')
    draw = ImageDraw.Draw(sheet)
    for index, card in enumerate(cards[start:start + 16]):
        x, y = index % 4 * 380, index // 4 * 300
        draw.text((x + 8, y + 6), f"{start + index + 1:03} {card['key']}", font=font, fill='#172c26')
        with Image.open(root / 'dist' / card['file']) as original:
            w, h = original.width / card['columns'], original.height / card['rows']
            box = tuple(round(v) for v in (card['x'] * w, card['y'] * h, (card['x'] + 1) * w, (card['y'] + 1) * h))
            scene = ImageOps.contain(original.crop(box).convert('RGB'), (192, 248))
            sheet.paste(scene, (x + 4 + (192 - scene.width) // 2, y + 32 + (248 - scene.height) // 2))
        reference = Path(card['reference']) if card.get('reference') else root / 'dist/assets/pokemon' / str(card.get('id')) / 'art.png'
        if reference.is_file():
            with Image.open(reference) as art:
                art = ImageOps.contain(art.convert('RGBA'), (172, 220))
                sheet.paste(art, (x + 202 + (172 - art.width) // 2, y + 52 + (220 - art.height) // 2), art)
        draw.text((x + 210, y + 280), 'Referencia oficial', font=small, fill='#52615c')
    target = output / f'comparison-{start // 16 + 1:02}.jpg'
    sheet.save(target, quality=92)
    print(target)
