"""Unify ST9/LI18/SI16 schematic level and anterior-middle-posterior order.

Usage: python refine_thyroid_level.py BASE.json BODY.glb OUTPUT.json
This establishes relationships only, not the underlying muscle boundaries.
"""
from pathlib import Path
import copy, hashlib, json, sys
import numpy as np
from register_human import Surface, read_mesh
from inspect_neck_sections import section
from neck_surface_arc import half_contour, locate, at


def refine(data, surface, vertices, indices):
    if 'thyroidLevel' in data:
        raise ValueError('Use the preserved unrefined baseline')
    before = copy.deepcopy(data['points'])
    height = before['ST9']['position'][1]
    contour = half_contour(section(vertices, indices, height))
    front = locate(contour, np.array(before['ST9']['position'])[[0, 2]])
    back = locate(contour, np.array(before['SI16']['position'])[[0, 2]])
    if not 0 < back[1]-front[1] < .08:
        raise ValueError('Reference arc is outside the local neck region')
    targets = {'LI18': at(contour, (front[1]+back[1])/2), 'SI16': back[2]}
    note = '已统一与人迎同层，并保持前缘、中间、后缘的示意顺序；皮肤弧线中点不是实测肌肉中点，软骨高度及肌肉边界仍待复核。'
    for point_id, (x, z) in targets.items():
        result = surface.z_project(np.array([x, height, z]), 1)
        if abs(result['position'][1]-height) > 1e-9 or abs(result['position'][2]-.003-z) > 1e-9:
            raise ValueError('Projection selected another surface region')
        result.update(regionRule='shared-thyroid-level', proportionNote=note)
        data['points'][point_id] = result

    key = lambda p: tuple(round(float(v), 9) for v in p)
    known = {key(p['position']) for p in before.values()}
    moved = {key(before[pid]['position']): data['points'][pid]['position'] for pid in targets}
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
    data['thyroidLevel'] = {'reference': 'ST9', 'height': height,
        'previousPositions': {pid: before[pid]['position'] for pid in targets},
        'surfaceArcDistances': {'ST9': front[1], 'LI18': (front[1]+back[1])/2, 'SI16': back[1]},
        'changedRoutes': changed, 'standard': 'GB/T 12346-2021 PDF 16, 17, 25',
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'helperSha256': hashlib.sha256(Path(__file__).with_name('neck_surface_arc.py').read_bytes()).hexdigest(),
        'note': note}
    return data


if __name__ == '__main__':
    baseline, model, output = map(Path, sys.argv[1:4])
    data = json.loads(baseline.read_text())
    raw, vertices, normals, indices = read_mesh(model)
    if hashlib.sha256(raw).hexdigest() != data['assetSha256']:
        raise ValueError('Model mismatch')
    result = refine(data, Surface(vertices, normals, indices), vertices, indices)
    output.write_text(json.dumps(result, separators=(',', ':'))+'\n')
    print(json.dumps(result['thyroidLevel'], ensure_ascii=False))
