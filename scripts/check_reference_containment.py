"""Check trial internal structures against the actual target skin envelope.
Usage: python check_reference_containment.py TRIAL.json REFERENCES_DIR HUMAN.glb OUTPUT.json [--source-skin SKIN.obj]
Requires numpy. Z-ray parity is geometry evidence, not anatomical validation.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from prepare_neck_reference import read_obj
from register_human import read_mesh, Surface


def ray_hits(surface, point):
    ids = np.flatnonzero(np.all(surface.lo[:, :2]-1e-9 <= point[:2], axis=1) &
                         np.all(surface.hi[:, :2]+1e-9 >= point[:2], axis=1))
    if not len(ids):
        return []
    f = surface.faces[ids]; a, b, c = f[:, 0], f[:, 1], f[:, 2]
    u, v, q = (b-a)[:, :2], (c-a)[:, :2], (point-a)[:, :2]
    determinant = u[:, 0]*v[:, 1]-u[:, 1]*v[:, 0]
    safe = np.where(np.abs(determinant) > 1e-15, determinant, 1)
    s = (q[:, 0]*v[:, 1]-q[:, 1]*v[:, 0])/safe
    t = (u[:, 0]*q[:, 1]-u[:, 1]*q[:, 0])/safe
    bary = np.stack([1-s-t, s, t], axis=1)
    valid = (np.abs(determinant) > 1e-15) & (bary.min(axis=1) >= -1e-8)
    hits = sorted(np.einsum('ij,ij->i', bary[valid], f[valid, :, 2]).tolist())
    # Adjacent triangles can report the same surface crossing at shared edges.
    return [z for i, z in enumerate(hits) if i == 0 or z-hits[i-1] > 1e-7]


def classify(hits, z, tolerance=.003, envelope=False):
    if not hits:
        return 'outsideRayEnvelope', None
    if len(hits) % 2:
        return 'ambiguousRay', None
    if envelope:
        hits = [hits[0], hits[-1]]
    clearance = min(abs(z-h) for h in hits)
    if clearance <= tolerance:
        return 'nearSurface', clearance
    return ('inside' if sum(h > z for h in hits) % 2 else 'outside'), clearance


if __name__ == '__main__':
    trial_path, references, human_path, output = map(Path, sys.argv[1:5])
    trial = json.loads(trial_path.read_text())
    raw, v, n, i = read_mesh(human_path)
    if hashlib.sha256(raw).hexdigest() != trial['inputSha256'][human_path.name]:
        raise ValueError('Target mesh differs from registration trial')
    transform = np.array(trial['sourceToAtlasColumnVectorMatrix'])
    surface = Surface(v, n, i)
    source_skin = None
    if '--source-skin' in sys.argv[5:]:
        source_skin = Path(sys.argv[sys.argv.index('--source-skin')+1])
        sv, sf = read_obj(source_skin)
        sv = np.array(sv)@transform[:3, :3].T+transform[:3, 3]
        surface = Surface(sv, np.zeros_like(sv), np.array(sf))
    manifest = json.loads((references/'preparation-manifest.json').read_text())
    result = {'status': 'Diagnostic only. A skin-envelope violation rejects direct transfer; containment alone does not validate anatomy.',
              'trialSha256': hashlib.sha256(trial_path.read_bytes()).hexdigest(),
              'targetSha256': hashlib.sha256(raw).hexdigest(), 'nearSurfaceTolerance': .003,
              'sourceControlSkinSha256': hashlib.sha256(source_skin.read_bytes()).hexdigest() if source_skin else None,
              'classification': 'Outermost skin envelope (skin has thickness)' if source_skin else 'Z-ray parity of target surface',
              'sampling': 'Up to 500 evenly indexed vertices per unique structure; not area-uniform.',
              'structures': []}
    for item in manifest['structures']:
        if 'duplicateOf' in item:
            continue
        path = references/(item['elementId']+'.obj')
        if hashlib.sha256(path.read_bytes()).hexdigest() != item['preparedSha256']:
            raise ValueError('Prepared geometry changed')
        vertices, _ = read_obj(path)
        vertices = np.array(vertices)
        ids = np.linspace(0, len(vertices)-1, min(500, len(vertices)), dtype=int)
        transformed = vertices[ids]@transform[:3, :3].T+transform[:3, 3]
        counts, violations = {}, []
        for index, point in zip(ids, transformed):
            state, distance = classify(ray_hits(surface, point), point[2], envelope=source_skin is not None)
            counts[state] = counts.get(state, 0)+1
            if state in ['outside', 'outsideRayEnvelope']:
                violations.append({'sourceVertexIndex': int(index), 'atlasPosition': point.tolist(),
                                   'rayDistance': distance})
        result['structures'].append({'id': item['elementId'], 'name': item['name'],
                                     'sampleCount': len(ids), 'counts': counts, 'violations': violations})
    output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps([{'id': r['id'], 'counts': r['counts']} for r in result['structures']]))
