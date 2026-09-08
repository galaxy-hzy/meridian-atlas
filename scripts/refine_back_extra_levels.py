"""Unify explicit back levels while retaining the current model and BL spacing.

Usage: python refine_back_extra_levels.py BASE.json BODY.glb OUTPUT.json
The BL levels remain surface estimates, not verified vertebral landmarks.
"""
from pathlib import Path
import copy
import hashlib
import json
import sys
import numpy as np
from register_human import Surface, read_mesh

REFERENCES = {'GV3': 'BL25', 'EX-B6': 'BL25', 'EX-B7': 'BL25', 'EX-B8': 'BL26'}
JIAJI_REFERENCES = [f'BL{i}' for i in range(11, 18)] + ['EX-B3'] + [f'BL{i}' for i in range(18, 27)]


def refine(data, surface):
    if 'backExtraLevels' in data:
        raise ValueError('Use the preserved baseline without this refinement')
    before = copy.deepcopy(data['points'])
    rules = {}
    note = '已统一国标所述同椎水平；参照层级沿用现有人体估计，真实椎体标志及旁开距离仍待复核。'

    def bind(position, reference):
        seed = np.array(position)
        seed[1] = before[reference]['position'][1]
        result = surface.z_project(seed, -1)
        if max(abs(result['position'][i] - seed[i]) for i in [0, 1]) > 1e-9:
            raise ValueError('Surface projection changed the requested plane')
        return result

    # Keep the existing, ordered L1-L5 lateral sequence; the old GV3 was almost
    # level with L5. Do not move L4 down into L5 merely to preserve the GV seed.
    for point_id, reference in REFERENCES.items():
        result = bind(before[point_id]['position'], reference)
        result.update(regionRule='shared-back-extra-level', proportionNote=note)
        data['points'][point_id] = result
        rules[point_id] = {'reference': reference, 'previousPosition': before[point_id]['position']}

    old_group = before['EX-B2']['positions']
    if len(old_group) != 17 or len(JIAJI_REFERENCES) != 17:
        raise ValueError('Jiaji must contain 17 unilateral locations')
    group = [bind(position, ref) for position, ref in zip(old_group, JIAJI_REFERENCES)]
    data['points']['EX-B2'] = dict(group[0], positions=[b['position'] for b in group],
        groupBindings=group, regionRule='shared-back-extra-level', proportionNote=note)

    key = lambda position: tuple(round(float(v), 9) for v in position)
    known = {key(p['position']) for p in before.values()}
    moved = {key(before[pid]['position']): data['points'][pid]['position'] for pid in REFERENCES}
    for old, new in zip(old_group, group):
        known.add(key(old))
        moved[key(old)] = new['position']

    def connect(a, b):
        a, b = np.array(a), np.array(b)
        count = max(1, int(np.ceil(np.linalg.norm(b-a)/.012)))
        path = [a.tolist()] + [surface.nearest(a+(b-a)*i/count)['position'] for i in range(1, count)] + [b.tolist()]
        return surface.surface_path(a, b) if any(np.linalg.norm(np.array(q)-p) > .025 for p, q in zip(path, path[1:])) else path

    changed = []
    for channel, paths in data['routes'].items():
        rebuilt = []
        touched = False
        for path in paths:
            if not any(key(p) in moved for p in path):
                rebuilt.append(path)
                continue
            anchors = sorted({0, len(path)-1} | {i for i, p in enumerate(path) if key(p) in known})
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

    data['backExtraLevels'] = {'rules': rules, 'jiajiReferences': JIAJI_REFERENCES,
        'previousJiajiPositions': old_group, 'changedRoutes': changed,
        'standardReferences': ['GB/T 12346-2021 PDF 27, 41', 'GB/T 40997-2021 PDF 9'],
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'note': note}
    return data


if __name__ == '__main__':
    baseline, model, output = map(Path, sys.argv[1:4])
    data = json.loads(baseline.read_text())
    raw, vertices, normals, indices = read_mesh(model)
    if hashlib.sha256(raw).hexdigest() != data['assetSha256']:
        raise ValueError('Model mismatch')
    result = refine(data, Surface(vertices, normals, indices))
    output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(json.dumps(result['backExtraLevels'], ensure_ascii=False))
