"""Inspect AcuSim's companion DAZ files without importing or executing them.

Usage: python3 review_acusim_companion.py COMPANION_DIR ACUSIM_DIR OUTPUT.json
Reports geometry availability and coordinate metadata. Never reconstructs missing
topology or treats animation rig centers as anatomical landmark annotations.
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys
from urllib.parse import unquote

from audit_acusim_reference import COMMIT, SCENE, SavedBlend


def sha(data):
    return hashlib.sha256(data).hexdigest()


def verified_files(directory):
    manifest = json.loads((directory / 'manifest.json').read_text())
    if manifest['commit'] != COMMIT:
        raise ValueError('Unexpected reference revision')
    for item in manifest['files']:
        path = (directory / item['path']).resolve()
        if not path.is_relative_to(directory.resolve()):
            raise ValueError('Manifest path escapes reference directory')
        data = path.read_bytes()
        if len(data) != item['size'] or sha(data) != item['sha256']:
            raise ValueError(f'Checksum mismatch: {item["path"]}')
        if 'gitBlob' in item and hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() != item['gitBlob']:
            raise ValueError('Git blob mismatch')
    return manifest


def read_json(path):
    data = path.read_bytes()
    if data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    return json.loads(data)


def bounds(vertices):
    if not vertices:
        return None
    if any(len(p) != 3 or not all(math.isfinite(x) for x in p) for p in vertices):
        raise ValueError('Invalid vertex coordinates')
    return [[min(p[i] for p in vertices) for i in range(3)],
            [max(p[i] for p in vertices) for i in range(3)]]


def review(companion, reference):
    manifest = verified_files(companion)
    verified_files(reference)
    dbz = read_json(companion / 'M_Asher_N_HD.dbz')
    duf = read_json(companion / 'M_Asher_N_HD.duf')
    if dbz.get('application') != 'export_to_blender':
        raise ValueError('Unexpected DBZ application')
    scene = SavedBlend((reference / SCENE).read_bytes())
    objects = scene.objects()
    tree = json.loads((reference / 'tree.json').read_text())
    if tree['truncated']:
        raise ValueError('Incomplete repository inventory')
    repository_basenames = {Path(e['path']).name for e in tree['tree'] if e['type'] == 'blob'}
    geometries = []
    for node in duf['scene']['nodes']:
        for geometry in node.get('geometries', []):
            url = geometry['url']
            asset_path = unquote(url.split('#', 1)[0])
            geometries.append({'node': node['id'], 'name': geometry['name'],
                               'assetUrl': url, 'assetPath': asset_path,
                               'sameFilenameInRepository': Path(asset_path).name in repository_basenames})
    figures = []
    for figure in dbz['figures']:
        vertices = figure.get('vertices', [])
        if len(vertices) != figure.get('num verts', 0):
            raise ValueError('DBZ vertex count mismatch')
        figures.append({'name': figure['name'], 'vertexCount': len(vertices),
                        'boundsDazCentimeters': bounds(vertices),
                        'topologyKeysPresent': [key for key in ('faces', 'edges', 'polylines', 'hd faces') if key in figure],
                        'rigBoneCount': len(figure.get('bones', []))})
    bodies = [f for f in dbz['figures'] if f['name'] == 'Genesis8Male']
    if len(bodies) != 1:
        raise ValueError('Expected one Genesis8Male body')
    body = bodies[0]
    head = [p for p in body['vertices'] if p[1] >= 150 and abs(p[0]) < 15]
    # Document unit/axis conversion only. No fitting, translation or anatomical acceptance.
    converted = [[p[0] * .01, -p[2] * .01, p[1] * .01] for p in head]
    point_objects = [o for o in objects if o['objectType'] == 1]
    head_bones = [b for b in body.get('bones', [])
                  if b['name'] in ['head', 'neckLower', 'neckUpper', 'lowerJaw', 'lEye', 'rEye']]
    return {
        'status': 'incomplete-companion-reference-no-point-transfer',
        'commit': COMMIT,
        'companionManifestSha256': sha((companion / 'manifest.json').read_bytes()),
        'annotationManifestSha256': sha((reference / 'manifest.json').read_bytes()),
        'sourceFiles': manifest['files'], 'dbzVersion': dbz['version'],
        'figures': figures, 'dufGeometryReferences': geometries,
        'headRigMetadata': [{k: b.get(k) for k in ('name', 'center_point', 'end_point', 'origin', 'ws_transform')}
                            for b in head_bones],
        'headVertexSelection': {'rule': 'DAZ Y >= 150cm and abs(X) < 15cm; not an anatomical segmentation',
                                'count': len(head), 'boundsDazCentimeters': bounds(head),
                                'axisUnitConversion': '[0.01*x, -0.01*z, 0.01*y]',
                                'boundsAfterUnitAxisConversion': bounds(converted)},
        'savedAnnotationBounds': bounds([o['savedTranslation'] for o in point_objects]),
        'sourceToAnnotationTransform': None, 'sourceToRetainedModelTransform': None,
        'meshTopologyReconstructed': False, 'rigAcceptedAsAnatomicalBones': False,
        'pointTransferAccepted': False, 'applicationCoordinatesChanged': False,
        'notes': ['Bounds alone do not establish a source-to-annotation transform.',
                  'Missing mesh faces cannot be recovered by inventing nearest-neighbor triangles.',
                  'Animation rig bones are transforms, not segmented bones or reviewed acupoint landmarks.'],
    }


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    companion, reference, output = map(Path, sys.argv[1:])
    if output.suffix != '.json' or any(output.resolve().is_relative_to(p.resolve()) for p in (companion, reference)):
        raise SystemExit('Output must be a separate .json outside both reference directories')
    result = review(companion, reference)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'figures': result['figures'],
                      'geometryReferences': len(result['dufGeometryReferences'])}, ensure_ascii=False))
