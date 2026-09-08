"""Prepare the pinned CC0 MakeHuman body asset without executing MakeHuman.

Usage: python3 scripts/prepare_human_model.py INPUT.obj OUTPUT_DIRECTORY [POSE_ASSETS]
Only the body group is exported; helper surfaces and joint cubes are excluded.
Joint centers are retained as separate retargeting metadata. Optional pinned
rig assets extend and rotate the forearms into a palms-forward study pose.
This does not attach or validate any acupuncture point.
"""
import hashlib
import json
import math
import pathlib
import struct
import sys

EXPECTED_SHA256 = '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c'
SOURCE_COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'


def prepare(source, destination, pose_assets=None):
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA256:
        raise ValueError('Unexpected source asset; inspect its version and license before conversion')
    vertices, groups, group = [], {}, ''
    for line in raw.decode('utf-8').splitlines():
        parts = line.split()
        if not parts:
            continue
        if parts[0] == 'v':
            vertices.append(tuple(map(float, parts[1:4])))
        elif parts[0] == 'g':
            group = parts[1]
        elif parts[0] == 'f':
            face = [int(p.split('/')[0]) - 1 for p in parts[1:]]
            if len(face) < 3 or min(face) < 0 or max(face) >= len(vertices):
                raise ValueError('Invalid face')
            groups.setdefault(group, []).append(face)
    posed_joints,pose_report=None,None
    if pose_assets:
        from pose_human import pose_forearms
        vertices,posed_joints,pose_report=pose_forearms(vertices,groups,pose_assets)
    body_faces = groups['body']
    used = sorted({v for face in body_faces for v in face})
    remap = {original: i for i, original in enumerate(used)}
    floor = min(vertices[i][1] for i in used)
    height = max(vertices[i][1] for i in used) - floor
    scale = 1.85 / height

    def normalize(v):
        return [v[0] * scale, (v[1] - floor) * scale, v[2] * scale]

    positions = [normalize(vertices[i]) for i in used]
    indices = []
    for face in body_faces:
        for i in range(1, len(face) - 1):
            indices.extend([remap[face[0]], remap[face[i]], remap[face[i + 1]]])
    normals = [[0.0, 0.0, 0.0] for _ in positions]
    for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
        u = [positions[b][k] - positions[a][k] for k in range(3)]
        v = [positions[c][k] - positions[a][k] for k in range(3)]
        n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        for index in (a, b, c):
            for k in range(3):
                normals[index][k] += n[k]
    for n in normals:
        length = math.sqrt(sum(x*x for x in n))
        if length:
            for k in range(3):
                n[k] /= length
    bounds = [[min(v[k] for v in positions) for k in range(3)], [max(v[k] for v in positions) for k in range(3)]]
    position_data = struct.pack('<' + 'f' * (len(positions)*3), *(v for p in positions for v in p))
    normal_data = struct.pack('<' + 'f' * (len(normals)*3), *(v for n in normals for v in n))
    index_data = struct.pack('<' + 'I' * len(indices), *indices)
    binary = position_data + normal_data + index_data
    gltf = {
        'asset': {'version': '2.0', 'generator': 'Meridian Atlas CC0 asset preparation'},
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': 'MakeHuman body - palms-forward study pose' if pose_assets else 'MakeHuman body - source pose'}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': 2, 'material': 0}]}],
        'materials': [{'name': 'Neutral study surface', 'pbrMetallicRoughness': {'baseColorFactor': [0.54, 0.69, 0.73, 1], 'metallicFactor': 0, 'roughnessFactor': 0.7}}],
        'buffers': [{'byteLength': len(binary)}],
        'bufferViews': [
            {'buffer': 0, 'byteOffset': 0, 'byteLength': len(position_data), 'target': 34962},
            {'buffer': 0, 'byteOffset': len(position_data), 'byteLength': len(normal_data), 'target': 34962},
            {'buffer': 0, 'byteOffset': len(position_data)+len(normal_data), 'byteLength': len(index_data), 'target': 34963},
        ],
        'accessors': [
            {'bufferView': 0, 'componentType': 5126, 'count': len(positions), 'type': 'VEC3', 'min': bounds[0], 'max': bounds[1]},
            {'bufferView': 1, 'componentType': 5126, 'count': len(normals), 'type': 'VEC3'},
            {'bufferView': 2, 'componentType': 5125, 'count': len(indices), 'type': 'SCALAR'},
        ],
    }
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12+8+len(encoded)+8+len(binary)) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + struct.pack('<II', len(binary), 0x004E4942) + binary
    joint_centers = {}
    for name, faces in groups.items():
        if name.startswith('joint-'):
            ids = sorted({i for face in faces for i in face})
            joint_centers[name] = normalize(posed_joints[name] if posed_joints else [sum(vertices[i][k] for i in ids)/len(ids) for k in range(3)])
    metadata = {
        'sourceCommit': SOURCE_COMMIT, 'sourceSha256': EXPECTED_SHA256,
        'sourceUrl': f'https://github.com/makehumancommunity/makehuman/blob/{SOURCE_COMMIT}/makehuman/data/3dobjs/base.obj',
        'license': 'CC0-1.0', 'sourceGroup': 'body',
        'vertexCount': len(positions), 'triangleCount': len(indices)//3,
        'normalization': {'scale': scale, 'sourceFloorY': floor, 'targetHeight': 1.85, 'up': '+Y', 'front': '+Z'},
        'bounds': bounds, 'joints': joint_centers,
        'glbSha256': hashlib.sha256(glb).hexdigest(),
        'pose': pose_report,
        'status': 'Palms-forward study pose, weighted elbow transformation; no clinical anatomical validation.' if pose_assets else 'Prepared asset only. Source pose is unchanged. No acupuncture registration or anatomical validation has been performed.',
    }
    destination.mkdir(parents=True, exist_ok=True)
    (destination/('body-learning-pose.glb' if pose_assets else 'body-source-pose.glb')).write_bytes(glb)
    (destination/'model-provenance.json').write_text(json.dumps(metadata, indent=2)+'\n')
    print(json.dumps({k: metadata[k] for k in ['vertexCount', 'triangleCount', 'glbSha256']}))


if __name__ == '__main__':
    prepare(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]) if len(sys.argv)>3 else None)
