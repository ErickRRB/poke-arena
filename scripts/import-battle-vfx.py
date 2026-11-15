"""Import the pinned, freely downloaded CC0 archive without changing source pixels."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
plan = json.loads((root / 'scripts/battle-vfx-source.json').read_text(encoding='utf8'))
archive = args.archive.read_bytes()
digest = lambda data: hashlib.sha256(data).hexdigest()
if len(archive) != plan['archiveBytes'] or digest(archive) != plan['archiveSha256']:
    raise ValueError('The pinned archive has changed')

output = root / 'dist/assets/battle/pvfx-v1'
output.mkdir(exist_ok=True)
assets, rows = {}, []
with zipfile.ZipFile(args.archive) as source:
    for effect in plan['effects']:
        artifact = effect['artifact']
        sheet, metadata = source.read(artifact['sheet']), source.read(artifact['manifest'])
        for name, data in [('sheet', sheet), ('manifest', metadata)]:
            if 'sha256:' + digest(data) != artifact[name + '_sha256']:
                raise ValueError('Source hash mismatch: ' + effect['id'])
        frames = json.loads(metadata)['frames']
        visible = [frame for frame in frames if frame['visible_bounds']]
        bounds = [min(frame['visible_bounds'][0] for frame in visible),
                  min(frame['visible_bounds'][1] for frame in visible),
                  max(frame['visible_bounds'][2] for frame in visible),
                  max(frame['visible_bounds'][3] for frame in visible)]
        width, height = effect['size']
        if not (0 <= bounds[0] < bounds[2] <= width and 0 <= bounds[1] < bounds[3] <= height):
            raise ValueError('Invalid visible bounds: ' + effect['id'])
        name = effect['id'].replace('/', '-') + '-strict'
        (output / (name + '.png')).write_bytes(sheet)
        (output / (name + '.json')).write_bytes(metadata)
        assets[effect['key']] = dict(file='assets/battle/pvfx-v1/' + name + '.png', width=width,
            height=height, columns=8, rows=(effect['frames'] + 7) // 8, grid=True,
            frameCount=effect['frames'], fps=1000 / effect['frameMs'], loop=effect['loop'],
            pivot=effect['pivot'], bounds=bounds, firstVisible=visible[0]['frame'], lastVisible=visible[-1]['frame'])
        rows.append(dict(key=effect['key'], id=effect['id'], tier='strict', sourceSheet=artifact['sheet'],
            sourceManifest=artifact['manifest'], sheetSha256=digest(sheet), manifestSha256=digest(metadata),
            path=assets[effect['key']]['file'], metadata='assets/battle/pvfx-v1/' + name + '.json',
            processing='Original PNG and JSON bytes. Runtime controls placement, size, opacity and palette filtering.'))
    (output / 'LICENSE.txt').write_bytes(source.read('LICENSE.txt'))

(output / 'SOURCES.json').write_text(json.dumps({**plan, 'files': rows}, indent=2) + '\n', encoding='utf8')
(root / 'dist/assets/battle/vfx-manifest.js').write_text(
    '// Native geometry and timing from the pinned CC0 grid export.\nexport const PVFX_ASSETS=' +
    json.dumps(assets, separators=(',', ':')) + ';\n', encoding='utf8')
print(json.dumps(dict(effects=len(assets), archiveSha256=plan['archiveSha256'])))
