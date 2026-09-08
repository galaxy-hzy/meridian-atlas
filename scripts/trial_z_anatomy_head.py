"""Compare source head skin/landmarks with the retained atlas, without moving points.
Usage: trial_z_anatomy_head.py HEAD.json LANDMARKS.json BODY.glb REGISTRATION.json OUTPUT_DIR
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
from register_human import read_mesh, Surface
from trial_head_landmarks import vertex_normals, evaluate


def unique(vertices):
    # Sampling deduplication only; do not change triangle vertices or surfaces.
    _, ids = np.unique(np.round(vertices, 7), axis=0, return_index=True)
    return vertices[np.sort(ids)]


def source_anchor(meshes, prefix, coordinate, mode, central=True):
    candidates = []
    for mesh in meshes:
        if not mesh['name'].startswith(prefix):
            continue
        v = np.array(mesh['vertices'])
        ids = np.flatnonzero(np.abs(v[:, 0]) < .1) if central else np.arange(len(v))
        if len(ids):
            index = int(ids[np.argmin(v[ids, coordinate]) if mode == 'min' else np.argmax(v[ids, coordinate])])
            candidates.append({'mesh': mesh['name'], 'expandedVertex': index, 'position': v[index].tolist()})
    assert len(candidates) == 2, (prefix, len(candidates))
    p = np.mean([c['position'] for c in candidates], axis=0)
    p[0] = 0  # Explicit bilateral average projected to the anatomical sagittal plane.
    return p, {'prefix': prefix, 'extremum': mode, 'coordinate': coordinate,
               'centralAbsXLimitFbxUnits': .1 if central else None, 'candidates': candidates,
               'averagedMidlinePosition': p.tolist()}


def fit(source, target):
    # Similarity fit in the sagittal plane: preserve midline, no shear or nonuniform scale.
    a = source[:, 1] + 1j * source[:, 2]
    b = target[:, 1] + 1j * target[:, 2]
    scale_rotation = np.vdot(a-a.mean(), b-b.mean()) / np.vdot(a-a.mean(), a-a.mean())
    shift = b.mean() - scale_rotation*a.mean()
    c, s = scale_rotation.real, scale_rotation.imag
    matrix = np.array([[abs(scale_rotation), 0, 0], [0, c, -s], [0, s, c]])
    translation = np.array([0, shift.real, shift.imag])
    return matrix, translation


if __name__ == '__main__':
    if len(sys.argv) != 6:
        raise SystemExit(__doc__)
    head_path, landmark_path, model_path, registration_path, output = map(Path, sys.argv[1:])
    output.mkdir(parents=True, exist_ok=False)
    head = json.loads(head_path.read_text())
    assert head['sourceSha256'] == '9d8da01d4719f9a61ee6ccfcaef85f788c4c67e9bcd74f5725c6946ab8b44199'
    reference = json.loads(landmark_path.read_text())
    registration = json.loads(registration_path.read_text())
    raw, target, normals, faces = read_mesh(model_path)
    assert hashlib.sha256(raw).hexdigest() == registration['assetSha256'] == '1be7f0f1fcb0e79de628fb03ec0d7f6a414813e95798ebfe0140d66c1fb4a579'
    assert reference['inputs']['fbx']['sha256'] == '294a649765cd060a62a4095da52b9c8ef2d97769aa447e196448aa5f7d596dea'
    source_vertices, source_faces, offset = [], [], 0
    for mesh in head['meshes']:
        v = np.array(mesh['vertices'])
        ix = np.array(mesh['index'] if mesh['index'] is not None else np.arange(len(v))).reshape(-1, 3)
        source_vertices.append(v)
        source_faces.append(ix + offset)
        offset += len(v)
    source = np.concatenate(source_vertices)
    sf = np.concatenate(source_faces)
    assert np.isfinite(source).all()
    settings = [('Nasal_region', 2, 'max', True), ('Parietal_region', 1, 'max', False),
                ('Tubercle_of_upper_lip', 2, 'max', True), ('Mentolabial_sulcus', 2, 'min', True)]
    anchors_and_evidence = [source_anchor(head['meshes'], *setting) for setting in settings]
    anchors = np.array([x[0] for x in anchors_and_evidence])
    target_ids = [297, 881, 466, 724]
    target_anchors = target[target_ids]
    target_face_ids = np.flatnonzero(target[faces][:, :, 1].min(axis=1) > 1.57)
    tf = faces[target_face_ids]
    target_surface = Surface(target, normals, tf)
    tp = unique(target[np.unique(tf)])
    posterior = lambda p: p[(p[:, 1] >= 1.65) & (p[:, 1] <= 1.83) & (p[:, 2] <= .04)]
    retained_refs = {key: registration['points'][key]['position'] for key in ['GV17', 'BL9', 'GB19']}
    results = []
    for name, selected in [('nose-crown', [0, 1]), ('four-surface-candidates', [0, 1, 2, 3])]:
        matrix, translation = fit(anchors[selected], target_anchors[selected])
        aligned = source @ matrix.T + translation
        surface = Surface(aligned, vertex_normals(aligned, sf), sf)
        predictions = []
        for landmark in reference['landmarks']:
            if landmark['name'] not in ['External occipital protuberance', 'Superior nuchal line', 'Mastoid process']:
                continue
            p = np.array(landmark['positionFbxWorld']) @ matrix.T + translation
            record = {'name': landmark['name'], 'sourceModelName': landmark['sourceModelName'], 'predictedBonePosition': p.tolist()}
            if landmark['name'] == 'External occipital protuberance':
                hit = target_surface.z_project([0, float(p[1]), float(p[2])], -1)
                assert hit['method'] == 'back-z-ray'
                hit['face'] = int(target_face_ids[hit['face']])
                hit['faceIndexDomain'] = 'retained-full-mesh'
                record['retainedPosteriorSurfaceAtPredictedLevel'] = hit
                record['heightDifferenceToCurrentPoints'] = {key: float(p[1]-pos[1]) for key, pos in retained_refs.items()}
            predictions.append(record)
        homogeneous = np.eye(4)
        homogeneous[:3, :3] = matrix
        homogeneous[:3, 3] = translation
        result = {'name': name, 'fitAnchorIndices': selected, 'matrix': homogeneous.tolist(),
                  'uniformScale': float(np.linalg.norm(matrix[:, 0])), 'pitchDegrees': float(np.degrees(np.arctan2(matrix[2, 1], matrix[1, 1]))),
                  'allCandidateResiduals': np.linalg.norm(anchors @ matrix.T + translation-target_anchors, axis=1).tolist(),
                  'posteriorSourceToRetained': evaluate(posterior(unique(aligned)), target_surface, 400),
                  'posteriorRetainedToSource': evaluate(posterior(tp), surface, 400),
                  'sourcePredictions': predictions}
        # This source contains head regions only, while the retained mesh continues
        # down the nape. Do not count the missing source neck as registration error.
        occipital = np.concatenate([np.array(m['vertices']) for m in head['meshes'] if m['name'].startswith('Occipital_region')]) @ matrix.T + translation
        lower = max(1.65, float(occipital[:, 1].min()) + .005)
        overlap = lambda points: points[(points[:, 1] >= lower) & (points[:, 1] <= 1.83) & (points[:, 2] <= .04)]
        result['commonPosteriorDomain'] = {'yMin': lower, 'yMax': 1.83, 'zMax': .04,
            'basis': 'Source occipital region lowest Y plus 5 mm, excluding source head/neck cut boundary.',
            'sourceToRetained': evaluate(overlap(unique(aligned)), target_surface, 400),
            'retainedToSource': evaluate(overlap(tp), surface, 400)}
        results.append(result)
        im = Image.new('RGB', (1400, 950), 'white')
        draw = ImageDraw.Draw(im)
        for panel in [0, 1]:
            def xy(p):
                return (350 + panel*700 + (p[0] if panel == 0 else -p[2]+.065)*1900, 870-(p[1]-1.57)*2300)
            for points, color in [(tp, '#2563eb'), (unique(aligned), '#c2410c')]:
                for p in points[np.linspace(0, len(points)-1, min(6000, len(points)), dtype=int)]:
                    x, y = xy(p)
                    if panel*700+5 < x < (panel+1)*700-5 and 95 < y < 910:
                        draw.ellipse((x-1, y-1, x+1, y+1), fill=color)
            for record in predictions:
                if record['name'] != 'External occipital protuberance':
                    continue
                x, y = xy(record['predictedBonePosition'])
                draw.ellipse((x-5, y-5, x+5, y+5), fill='#16a34a')
                draw.text((x+8, y), 'source EOP endpoint', fill='#166534')
            for key, p in retained_refs.items():
                x, y = xy(p)
                draw.ellipse((x-4, y-4, x+4, y+4), fill='black')
                draw.text((x+6, y), key, fill='black')
        draw.text((20, 20), f'{name}: blue = retained head; orange = source head; green = trial source bone endpoint', fill='black')
        draw.text((20, 44), 'Front (left), side (right); source endpoint is not the upper border required by the point standard.', fill='black')
        draw.text((20, 66), 'Z-Anatomy / BodyParts3D source attribution retained; no atlas coordinates changed.', fill='black')
        im.save(output/f'{name}.png')
    report = {'status': 'registration-candidate-comparison-not-anatomical-acceptance',
              'inputs': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in [head_path, landmark_path, model_path, registration_path]},
              'sourceAnchorEvidence': [x[1] for x in anchors_and_evidence],
              'targetAnchorVertexIds': target_ids, 'targetAnchorNames': ['nose surface extreme', 'crown surface extreme', 'upper lip tubercle surface', 'mentolabial groove surface'],
              'targetAnchors': target_anchors.tolist(), 'currentPositions': retained_refs, 'trials': results,
              'limitations': ['Surface extrema are explicit candidates, not independent clinical observations.',
                             'A shared best fit cannot remove real shape differences between two people/models.',
                             'Source EOP label endpoint does not identify its superior border.',
                             'Posterior surface distance is a geometric diagnostic, not proof of anatomical correspondence.',
                             'All three acupoints and their routes remain unchanged.']}
    (output/'trial.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps([{'name': r['name'], 'allCandidateResiduals': r['allCandidateResiduals'],
                       'commonPosteriorDomain': r['commonPosteriorDomain']} for r in results], ensure_ascii=False))
