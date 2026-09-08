"""Prepare traceable reference geometry, preserving all original files.
Usage: python3 prepare_neck_reference.py RAW_DIRECTORY OUTPUT_DIRECTORY
Exact-coordinate welding is used for connectivity only, not deformation.
"""
from pathlib import Path
from collections import defaultdict
import hashlib
import json
import sys


def read_obj(path):
    vertices, faces = [], []
    for line in path.read_text().splitlines():
        if line.startswith('v '):
            vertices.append(tuple(map(float, line.split()[1:4])))
        elif line.startswith('f '):
            faces.append([int(t.split('/')[0])-1 for t in line.split()[1:]])
    if not vertices or not faces or any(i < 0 or i >= len(vertices) for f in faces for i in f):
        raise ValueError('Missing or invalid geometry')
    return vertices, faces


def components(vertices, faces):
    parent = list(range(len(vertices)))
    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    seen = {}
    for i, point in enumerate(vertices):
        if point in seen:
            parent[root(i)] = root(seen[point])
        else:
            seen[point] = i
    for face in faces:
        for i in face[1:]:
            parent[root(i)] = root(face[0])
    groups = defaultdict(list)
    for index, face in enumerate(faces):
        groups[root(face[0])].append(index)
    return sorted(groups.values(), key=len, reverse=True)


def bounds(vertices):
    return [[min(v[j] for v in vertices) for j in range(3)],
            [max(v[j] for v in vertices) for j in range(3)]]


if __name__ == '__main__':
    raw, output = map(Path, sys.argv[1:3])
    manifest = json.loads((raw/'manifest.json').read_text())
    output.mkdir(parents=True, exist_ok=True)
    records, unique = [], {}
    for item in manifest['structures']:
        path = raw/(item['elementId']+'.obj')
        if hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
            raise ValueError('Source hash mismatch')
        vertices, faces = read_obj(path)
        signature = hashlib.sha256(json.dumps([vertices, faces], separators=(',', ':')).encode()).hexdigest()
        if signature in unique:
            records.append({'elementId': item['elementId'], 'duplicateOf': unique[signature],
                            'sourceSha256': item['sha256']})
            continue
        unique[signature] = item['elementId']
        groups = components(vertices, faces)
        kept = list(range(len(faces)))
        removed = []
        # This exception applies only to the verified four opposite-side islands.
        if item['elementId'] == 'FJ1595':
            if len(groups) != 5:
                raise ValueError('Unexpected right SCM connectivity; review before preparing')
            kept = groups[0]
            if any(vertices[i][0] >= 0 for f in kept for i in faces[f]):
                raise ValueError('Main component crosses source midline')
            for group in groups[1:]:
                points = [vertices[i] for f in group for i in faces[f]]
                if any(p[0] <= 0 for p in points):
                    raise ValueError('Unexpected non-opposite component')
                removed.append({'sourceFaceIndicesZeroBased': group, 'bounds': bounds(points)})
        kept = sorted(kept)
        used = sorted({i for f in kept for i in faces[f]})
        index = {old: new+1 for new, old in enumerate(used)}
        target = output/(item['elementId']+'.obj')
        lines = ['# Independent BodyParts3D reference; not registered to MakeHuman.',
                 '# '+manifest['attribution']]
        lines += ['v '+' '.join(format(x, '.12g') for x in vertices[i]) for i in used]
        lines += ['f '+' '.join(str(index[i]) for i in faces[f]) for f in kept]
        target.write_text('\n'.join(lines)+'\n')
        records.append({'elementId': item['elementId'], 'name': item['name'],
                        'sourceSha256': item['sha256'], 'preparedSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                        'sourceComponentsAfterExactWeld': len(groups), 'keptFaces': len(kept),
                        'removedComponents': removed, 'preparedBounds': bounds([vertices[i] for i in used])})
    result = {'status': 'Independent anatomical reference; registration and landmark review pending.',
              'attribution': manifest['attribution'], 'licenseUrl': manifest['licenseUrl'],
              'sourceManifestSha256': hashlib.sha256((raw/'manifest.json').read_bytes()).hexdigest(),
              'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'structures': records}
    (output/'preparation-manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps([{'id': r['elementId'], 'faces': r.get('keptFaces'),
                       'removedComponents': len(r.get('removedComponents', [])),
                       'duplicateOf': r.get('duplicateOf')} for r in records]))
