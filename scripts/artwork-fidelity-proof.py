"""Compose review evidence; never modifies game artwork."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parents[1]
folder = root / 'docs/pokemon-fidelity'
before = {card['key']: card for card in json.loads((folder / 'before.json').read_text(encoding='utf-8'))}
after = {card['key']: card for card in json.loads((folder / 'inventory.json').read_text(encoding='utf-8'))}
review = json.loads((folder / 'review.json').read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
sheet = Image.new('RGB', (1140, 888), '#f4efdc')
draw = ImageDraw.Draw(sheet)
cards = Image.new('RGB', (390, 510), '#f4efdc')
labels = ImageDraw.Draw(cards)
for index, key in enumerate(review['generation']['correctedArtworks']):
    x, y = index % 3 * 380, index // 3 * 296
    draw.text((x + 10, y + 7), after[key]['name'], font=font, fill='#273c32')
    for column, inventory in enumerate((before, after)):
        meta = inventory[key]
        with Image.open(root / 'dist' / meta['file']) as source:
            w, h = source.width / meta['columns'], source.height / meta['rows']
            tile = source.crop(tuple(round(value) for value in (meta['x'] * w, meta['y'] * h, (meta['x'] + 1) * w, (meta['y'] + 1) * h)))
            tile = ImageOps.fit(tile.convert('RGB'), (170, 212), Image.Resampling.LANCZOS)
            sheet.paste(tile, (x + 10 + column * 190, y + 38))
        draw.text((x + 10 + column * 190, y + 258), ('Antes', 'Ahora')[column], font=small, fill='#52604c')
    with Image.open(folder / 'ui' / f'card-{key}.png') as card:
        cx, cy = index % 3 * 130, index // 3 * 170
        cards.paste(card.convert('RGB'), (cx + (130 - card.width) // 2, cy + 9))
        labels.text((cx + 5, cy + 145), after[key]['name'].replace('Horda ', '').replace('Trío ', ''), font=small, fill='#273c32')
sheet.save(folder / 'before-after.jpg', quality=94)
cards.save(folder / 'cards-in-ui.png')
print(folder / 'before-after.jpg')
print(folder / 'cards-in-ui.png')
