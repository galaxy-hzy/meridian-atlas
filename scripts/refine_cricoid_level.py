"""Correct LI17/ST10 schematic co-level order without estimating muscle edges.

Usage: python refine_cricoid_level.py BASE.json BODY.glb OUTPUT.json
Keep LI17's existing X, use ST10's existing estimated Y, and project along Z.
This is a relative-position correction, not an anatomical calibration.
"""
from pathlib import Path
import copy, hashlib, json, sys
import numpy as np
from register_human import Surface, read_mesh


def refine(data, surface):
    if 'cricoidLevel' in data:
        raise ValueError('Use the preserved baseline, not an already refined file')
    before = copy.deepcopy(data['points'])
    original = before['LI17']['position']
    reference = before['ST10']['position']
    candidate = surface.z_project(np.array([original[0], reference[1], original[2]]), 1)
    position = candidate['position']
    if abs(position[0] - original[0]) > 1e-9 or abs(position[1] - reference[1]) > 1e-9:
        raise ValueError('Projection changed the constrained coordinates')
    if not position[2] < reference[2] or not position[1] < before['LI18']['position'][1]:
        raise ValueError('Candidate contradicts the relative neck-level relationships')
    if np.linalg.norm(np.array(position) - original) > .04:
        raise ValueError('Candidate left the local neck region')
    note = '已统一天鼎与水突同层，保留既有横向坐标，并校正天鼎位于水突后方的示意次序。软骨真实高度、肌肉边界及扶突直下关系仍需解剖复核。'
    candidate.update(regionRule='shared-cricoid-level', proportionNote=note)
    data['points']['LI17'] = candidate
    key = lambda p: tuple(round(float(v), 9) for v in p)
    known = {key(p['position']) for p in before.values()}
    moved = {key(original): position}
    def connect(a, b):
        a, b = np.array(a), np.array(b)
        count = max(1, int(np.ceil(np.linalg.norm(b-a)/.012)))
        path = [a.tolist()] + [surface.nearest(a+(b-a)*i/count)['position'] for i in range(1, count)] + [b.tolist()]
        return surface.surface_path(a, b) if any(np.linalg.norm(np.array(q)-p) > .025 for p, q in zip(path, path[1:])) else path
    changed = []
    for channel, paths in data['routes'].items():
        rebuilt, touched = [], False
        for path in paths:
            if not any(key(p) in moved for p in path):
                rebuilt.append(path)
                continue
            anchors = sorted({0, len(path)-1} | {i for i,p in enumerate(path) if key(p) in known})
            result = [moved.get(key(path[0]), path[0])]
            for lo, hi in zip(anchors, anchors[1:]):
                a, b = path[lo], path[hi]
                segment = connect(moved.get(key(a), a), moved.get(key(b), b)) if key(a) in moved or key(b) in moved else path[lo:hi+1]
                result.extend(segment[1:])
            rebuilt.append(result)
            touched = True
        if touched:
            data['routes'][channel] = rebuilt
            changed.append(channel)
    if changed != ['LI']:
        raise ValueError('Unexpected affected base routes')
    data['cricoidLevel'] = {
        'pointId': 'LI17', 'reference': 'ST10', 'previousPosition': original,
        'height': reference[1], 'changedRoutes': changed,
        'standard': 'GB/T 12346-2021 PDF 16, 17; WHO 2009 PDF 51, 59',
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'note': note,
    }
    return data


if __name__ == '__main__':
    baseline, model, output = map(Path, sys.argv[1:4])
    data = json.loads(baseline.read_text())
    raw, vertices, normals, indices = read_mesh(model)
    if hashlib.sha256(raw).hexdigest() != data['assetSha256']:
        raise ValueError('Model mismatch')
    result = refine(data, Surface(vertices, normals, indices))
    output.write_text(json.dumps(result, separators=(',', ':'))+'\n')
    print(json.dumps({'before':result['cricoidLevel']['previousPosition'], 'after':result['points']['LI17']['position'], 'reference':result['points']['ST10']['position']}, ensure_ascii=False))
