"""Reproduce native 83/534 evidence using tracked assets only.

Requires Python 3.10+, Pillow and NumPy. No qa/ inputs, network, browser or
runtime writes. Use --output to keep the approved evidence directory intact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT / 'docs/visual-followup/native-identities',
                    help='Destination for three JSON files and seven diagnostic contacts.')
parser.add_argument('--font', type=Path,
                    help='Optional diagnostic label font. Approved contacts used Windows Consolas.')
args = parser.parse_args()
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'contacts').mkdir(exist_ok=True)
SOURCE = ROOT / 'dist'
PIN = '576a7f13b5b7f6ad09a5877d5ae6b2d33458c245'
BASE = f'https://github.com/PMDCollab/SpriteCollab/blob/{PIN}/sprite'
SPECIES = [(83, 'farfetchd', ['Idle', 'Walk', 'Attack'], 'head'),
           (534, 'conkeldurr', ['Idle', 'Walk', 'Shoot', 'Attack'], 'body')]
manifest = json.loads((SOURCE / 'assets/pokemon/manifest.json').read_text(encoding='utf8'))
DIRS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW']
COLORS = {'foot': '#ffffff', 'body': '#4cff62', 'head': '#ff6262',
          'left': '#58a6ff', 'right': '#ffa751'}
CACHE = {}
font_path = args.font or Path('C:/Windows/Fonts/consola.ttf')
if args.font or font_path.is_file():
    FONT = ImageFont.truetype(str(font_path), 11)
else:
    try:
        FONT = ImageFont.truetype('DejaVuSansMono.ttf', 11)
    except OSError:
        FONT = ImageFont.load_default(size=11)
sources, animations = [], []


def repo_head():
    result = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    return result.stdout.strip() if result.returncode == 0 else None


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def source(path, sid):
    return {'localPath': path.relative_to(ROOT).as_posix(),
            'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'sourceUrl': f'{BASE}/{sid:04d}/{path.name}'}


def last_pixel(mask):
    found = np.argwhere(mask)
    return [int(found[-1, 1]), int(found[-1, 0])] if len(found) else None


def load_native(species, animation):
    key = (str(species), animation)
    if key in CACHE:
        return CACHE[key]
    meta = manifest[str(species)].get(animation)
    if not meta:
        return None
    path = SOURCE / meta['file']
    art = Image.open(path).convert('RGBA')
    offsets = np.asarray(Image.open(str(path).replace('-Anim.png', '-Offsets.png')).convert('RGBA'))
    shadows = np.asarray(Image.open(str(path).replace('-Anim.png', '-Shadow.png')).convert('RGBA'))
    w, h = meta['width'], meta['height']
    count = len(meta['durations'])
    rows = art.height // h
    poses = []
    for row in range(rows):
        line = []
        for frame in range(count):
            box = (frame*w, row*h, (frame+1)*w, (row+1)*h)
            raster = art.crop(box)
            native = np.asarray(raster)
            mark = offsets[row*h:(row+1)*h, frame*w:(frame+1)*w]
            shadow = shadows[row*h:(row+1)*h, frame*w:(frame+1)*w]
            opaque = mark[:, :, 3] > 0
            parts = {name: last_pixel(opaque & (mark[:, :, channel] > 240))
                     for name, channel in [('left', 0), ('body', 1), ('right', 2)]}
            parts['head'] = last_pixel(opaque & (np.max(mark[:, :, :3], axis=2) < 16))
            parts['foot'] = last_pixel((shadow[:, :, 3] > 0) & (np.min(shadow[:, :, :3], axis=2) > 240))
            present = {name: value is not None for name, value in parts.items()}
            parts['foot'] = parts['foot'] or [w//2, int(h*.65)]
            parts['body'] = parts['body'] or parts['foot']
            for name in ['head', 'left', 'right']:
                parts[name] = parts[name] or parts['body']
            positions = np.argwhere(native[:, :, 3] > 0)
            nearest = {name: (float(np.sqrt(np.min(np.sum((positions[:, ::-1]-point)**2, axis=1))))
                              if len(positions) else None) for name, point in parts.items()}
            line.append({'markers': parts, 'present': present,
                         'flat': sum((parts[name] for name in ['foot', 'body', 'head', 'left', 'right']), []),
                         'opaqueBounds': list(raster.getbbox()) if raster.getbbox() else None,
                         'opaquePixels': int(len(positions)), 'nearestOpaque': nearest,
                         'rasterSha256': hashlib.sha256(raster.tobytes()).hexdigest(), 'raster': raster})
        poses.append(line)
    result = {'meta': meta, 'rows': rows, 'poses': poses, 'path': str(path.relative_to(ROOT))}
    CACHE[key] = result
    return result


def pose_at(native, direction, frame):
    return native['poses'][direction if native['rows'] >= 8 else 0][frame]


def anchor(card, native, direction, frame, body_anchor=None):
    point = pose_at(native, direction, frame)['markers']
    body_anchor = card.get('movementAnchor') == 'body' if body_anchor is None else body_anchor
    if not body_anchor:
        return point['foot']
    rest = pose_at(load_native(card['id'], 'Idle'), direction, 0)['markers']
    return [point['body'][i]+rest['foot'][i]-rest['body'][i] for i in range(2)]


def selected_part(emitter, shot=0):
    return 'body' if emitter == 'body' else ('left' if shot % 2 == 0 else 'right') if emitter in ['hands', 'cannons'] else 'head'


def anchored_raster_signature(card, native, direction, frame):
    p = pose_at(native, direction, frame)
    box = p['opaqueBounds']
    a = anchor(card, native, direction, frame)
    relative = [box[0]-a[0], box[1]-a[1], box[2]-a[0], box[3]-a[1]] if box else []
    cropped = p['raster'].crop(box).tobytes() if box else b''
    return hashlib.sha256(json.dumps(relative).encode()+cropped).hexdigest()


def contact(row, animation, label, selected=None, body_anchor=None):
    card = row['card']
    native = load_native(card['id'], animation)
    if not native:
        return None
    count = len(native['meta']['durations'])
    selected = list(range(count)) if selected is None else selected
    # Keep full original frames and markers visible around one stable ground anchor.
    bounds = []
    for direction in range(8):
        for frame in selected:
            p = pose_at(native, direction, frame)
            a = anchor(card, native, direction, frame, body_anchor)
            b = p['opaqueBounds'] or [0, 0, native['meta']['width'], native['meta']['height']]
            bounds.append([b[0]-a[0], b[1]-a[1], b[2]-a[0], b[3]-a[1]])
    min_x, min_y = min(b[0] for b in bounds)-5, min(b[1] for b in bounds)-5
    max_x, max_y = max(b[2] for b in bounds)+5, max(b[3] for b in bounds)+5
    zoom = 2
    cell_w = max(76, int((max_x-min_x)*zoom))
    cell_h = max(70, int((max_y-min_y)*zoom))+20
    left, top = 35, 62
    image = Image.new('RGB', (left+len(selected)*cell_w, top+8*cell_h), '#19202c')
    draw = ImageDraw.Draw(image)
    draw.text((8, 6), f"{row['key']} / #{card['id']} / {animation} / native 0-based frames / {label}", font=FONT, fill='white')
    draw.text((8, 21), 'R=head G=body B=left O=right W=foot Y=chosen emitter; axes=world ground; nearest-neighbour x2', font=FONT, fill='#c7d2e3')
    draw.text((8, 36), f"bodyAnchor={card.get('movementAnchor') == 'body' if body_anchor is None else body_anchor}; native durations={native['meta']['durations']}", font=FONT, fill='#c7d2e3')
    for direction in range(8):
        y0 = top+direction*cell_h
        draw.text((3, y0+cell_h//2), DIRS[direction], font=FONT, fill='white')
        for column, frame in enumerate(selected):
            x0 = left+column*cell_w
            p = pose_at(native, direction, frame)
            a = anchor(card, native, direction, frame, body_anchor)
            ox = x0-min_x*zoom
            oy = y0+18-min_y*zoom
            draw.line((x0, oy, x0+cell_w, oy), fill='#344055')
            draw.line((ox, y0, ox, y0+cell_h), fill='#344055')
            raster = p['raster'].resize((p['raster'].width*zoom, p['raster'].height*zoom), Image.Resampling.NEAREST)
            image.paste(raster, (int(ox-a[0]*zoom), int(oy-a[1]*zoom)), raster)
            draw.text((x0+3, y0+2), f"f{frame} ({native['meta']['durations'][frame]})", font=FONT, fill='white')
            for name, color in COLORS.items():
                point = p['markers'][name]
                x, y = ox+(point[0]-a[0])*zoom, oy+(point[1]-a[1])*zoom
                draw.ellipse((x-2, y-2, x+2, y+2), outline=color)
            point = p['markers'][selected_part(row['emitter'])]
            x, y = ox+(point[0]-a[0])*zoom, oy+(point[1]-a[1])*zoom
            draw.ellipse((x-5, y-5, x+5, y+5), outline='#fff554', width=1)
    relative = f"contacts/{row['key']}-{animation.lower()}-{label}.png"
    image.save(OUT / relative, optimize=True)
    return relative


for sid, key, names, emitter in SPECIES:
    root = ROOT / 'dist/assets/pokemon' / str(sid)
    xml = ET.parse(root / 'AnimData.xml')
    xml_anims = {node.findtext('Name'): node for node in xml.findall('./Anims/Anim')}
    sources.extend(source(root / name, sid) for name in ['AnimData.xml', 'credits.txt'])
    card = {'id': sid, 'scale': 1}
    idle = load_native(sid, 'Idle')
    for name in names:
        clip = load_native(sid, name)
        meta = clip['meta']
        node = xml_anims[name]
        durations = [int(x.text) for x in node.findall('./Durations/Duration')]
        assert meta['durations'] == durations, (sid, name, 'durations')
        assert clip['rows'] == 8, (sid, name, 'directions')
        assert meta['width'] == int(node.findtext('FrameWidth'))
        assert meta['height'] == int(node.findtext('FrameHeight'))
        hit_text, return_text = node.findtext('HitFrame'), node.findtext('ReturnFrame')
        hit, ret = int(hit_text) if hit_text is not None else None, int(return_text) if return_text is not None else None
        if hit is not None:
            assert meta['hitFrame'] == hit, (sid, name, 'hit')
        for suffix in ['Anim', 'Offsets', 'Shadow']:
            sources.append(source(root / f'{name}-{suffix}.png', sid))
        contact_path = contact({'key': key, 'card': card, 'emitter': emitter}, name, 'native')
        directions = []
        for direction, direction_name in enumerate(DIRS):
            idle_sig = anchored_raster_signature(card, idle, direction, 0)
            sigs = [anchored_raster_signature(card, clip, direction, frame) for frame in range(len(durations))]
            matches_idle = [frame for frame, sig in enumerate(sigs) if sig == idle_sig]
            matches_first = [frame for frame, sig in enumerate(sigs) if sig == sigs[0]]
            frame_groups = [[frame for frame, sig in enumerate(sigs) if sig == first]
                            for first in dict.fromkeys(sigs)]
            last_pose = pose_at(clip, direction, len(durations)-1)['markers']
            idle_pose = pose_at(idle, direction, 0)['markers']
            row = {'direction': direction_name, 'uniqueGroundAnchoredDrawings': len(set(sigs)),
                   'nativeFrameGroupsGroundAnchored': frame_groups,
                   'framesIdenticalToIdle0': matches_idle, 'framesIdenticalToClip0': matches_first,
                   'lastFrameEqualsIdle0': sigs[-1] == idle_sig,
                   'lastFrameEqualsClip0': sigs[-1] == sigs[0],
                   'lastToIdle0MarkerShiftNative': {
                       part: [(idle_pose[part][i]-idle_pose['foot'][i])-(last_pose[part][i]-last_pose['foot'][i]) for i in range(2)]
                       for part in ['head', 'body', 'left', 'right']}}
            if hit is not None:
                pose = pose_at(clip, direction, hit)
                assert all(pose['present'].values()), (sid, name, direction_name, 'hit markers')
                row['hitFrameMarkersNative'] = pose['markers']
                row['hitFrameMarkerPresent'] = pose['present']
                row['hitFrameMarkersRelativeToGround'] = {
                    part: [point[i] - pose['markers']['foot'][i] for i in range(2)]
                    for part, point in pose['markers'].items()}
                row['hitFrameSelectedEmitter'] = emitter
                if sid == 534 and name == 'Shoot':
                    angle = math.pi / 2 - direction * math.pi / 4
                    facing = [math.cos(angle), math.sin(angle)]
                    lead = max(['left', 'right'], key=lambda part: sum(pose['markers'][part][i] * facing[i] for i in range(2)))
                    row['leadHand'] = lead
                    row['leadHandLateralUnitsAtScale'] = {
                        str(scale): round(abs((pose['markers'][lead][0]-pose['markers']['foot'][0]) * facing[1]
                                             -(pose['markers'][lead][1]-pose['markers']['foot'][1]) * facing[0]) * scale, 4)
                        for scale in [1.85, 2.05]}
            directions.append(row)
        animations.append({'speciesId': sid, 'name': name, 'frameSize': [meta['width'], meta['height']],
                           'directions': 8, 'frames': len(durations), 'nativeDurationsTicks': durations,
                           'nativeTotalTicks': sum(durations), 'secondsAt60TicksPerSecond': sum(durations) / 60,
                           'hitFrame': hit, 'hitOnsetNativeTicks': sum(durations[:hit]) if hit is not None else None,
                           'returnFrame': ret, 'returnOnsetNativeTicks': sum(durations[:ret]) if ret is not None else None,
                           'contact': contact_path, 'perDirection': directions})

profiles = {
    'status': 'Approved recommendation for integration; this audit does not apply runtime changes.',
    'frameConvention': 'Zero-based native frame indices; durations are retained without cropping.',
    'gameplayTiming': 'Keep gameplay windup/interval/duration owned by the battle integrator. Native tick times below are source timing, not a request to replace gameplay stats.',
    'geodude': {'speciesId': 83, 'name': "Farfetch'd", 'equivalent': 'Knight',
                'idleAnim': 'Idle', 'moveAnim': 'Walk', 'attackAnim': 'Attack', 'emitter': 'head',
                'hitFrame': 3, 'returnFrame': 6, 'attackFramesOverride': None, 'attackGesturesOverride': None,
                'anchor': 'Native ground/foot marker; no body-anchor override proposed.',
                'reason': 'The leek thrust extends from the beak. Hand markers identify raised wings behind the thrust.',
                'scaleCandidatesOnly': [2.2, 2.25]},
    'graveler': {'speciesId': 534, 'name': 'Conkeldurr', 'equivalent': 'Bowler',
                'idleAnim': 'Idle', 'moveAnim': 'Walk', 'attackAnim': 'Shoot', 'emitter': 'body',
                'hitFrame': 2, 'returnFrame': 5, 'attackFramesOverride': None, 'attackGesturesOverride': None,
                'anchor': 'Native ground/foot marker; no body-anchor override proposed.',
                'reason': 'Shoot is a central preparation/follow-through cue. Neither reviewed clip releases a native boulder; both concrete pillars remain gripped.',
                'rollingAdaptation': {'physicsOrigin': 'actor.x, actor.y (existing rollingShot path)',
                                      'rockVisualCentre': 'rollingPose.x, rollingPose.y - 13/verticalScale (existing renderer)',
                                      'cueOrigin': 'body marker; does not replace the ground rolling origin',
                                      'handToGroundTransfer': 'Not requested. A hand-origin stone would require an explicit visual transfer back to the existing path; do not shift trajectory/collider to a lateral pillar grip.'},
                'scaleCandidatesOnly': [1.85, 2.05]},
    'collision': 'Keep collision radii separate from native transparent canvases, leek reach, pillar bounds, and visual scale.',
    'identityLineage': 'Geodude #74 remains available as the Golemites split token. Parent integrator owns token key and lineage; do not remove the token when replacing the Knight identity.'}
known_paths = {row['localPath'] for row in sources}
for sid, _, _, _ in SPECIES:
    for path in sorted((ROOT / 'dist/assets/pokemon' / str(sid)).glob('*-Offsets.png')):
        if path.relative_to(ROOT).as_posix() not in known_paths:
            sources.append(source(path, sid))
write_json('motion-profiles.json', profiles)
write_json('sources.json', {'sourceRepository': 'PMDCollab/SpriteCollab', 'sourcePin': PIN,
                            'files': sources, 'verification': 'Hashes are computed from checked-out local source bytes. XML metadata matches the local manifest for all seven reviewed clips; every clip has eight rows.'})
write_json('analysis.json', {'reviewDate': '2026-11-14', 'repoHeadAtAudit': repo_head(),
                             'method': 'Original RGBA frames and Offsets/Shadow markers; all frames × eight directions. Diagnostic contacts are ground anchored and enlarged with nearest-neighbour only. Signatures compare native RGBA plus opaque bounds relative to the ground marker.',
                             'limitations': 'This is source-raster/metadata QA, not integrated combat or measured browser frame pacing. Ground-anchored identical drawings exclude translation; XML ReturnFrame is a timing tag, not proof of a restored Idle drawing.',
                             'animations': animations})
print(json.dumps({'output': str(OUT), 'sourceFiles': len(sources), 'clips': len(animations),
                  'directionRows': len(animations)*8,
                  'recovery': [{'id': item['speciesId'], 'clip': item['name'],
                                'lastEqualsIdle0': [row['direction'] for row in item['perDirection'] if row['lastFrameEqualsIdle0']],
                                'lastEqualsClip0': [row['direction'] for row in item['perDirection'] if row['lastFrameEqualsClip0']]}
                               for item in animations]}, ensure_ascii=False))
