"""Inspect neck surface sections without changing registered points.

Usage: python inspect_neck_sections.py BODY.glb OUTPUT_DIRECTORY
Requires numpy. Outputs a surface diagnostic, not anatomical landmarks.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from register_human import read_mesh


def section(vertices, indices, height):
    segments = []
    for triangle in vertices[indices]:
        intersections = []
        for a, b in ((triangle[0], triangle[1]), (triangle[1], triangle[2]), (triangle[2], triangle[0])):
            if (a[1] <= height < b[1]) or (b[1] <= height < a[1]):
                intersections.append(a + (b-a) * ((height-a[1])/(b[1]-a[1])))
        if len(intersections) == 2:
            segments.append([p[[0, 2]].tolist() for p in intersections])
    return segments


def nearest_on_section(segments, position):
    seed = np.array(position)[[0, 2]]
    best = None
    for a, b in np.array(segments):
        edge = b-a
        t = np.clip(np.dot(seed-a, edge)/max(np.dot(edge, edge), 1e-20), 0, 1)
        candidate = a+t*edge
        distance = float(np.linalg.norm(seed-candidate))
        if best is None or distance < best[0]:
            best = (distance, candidate.tolist())
    if best is None:
        raise ValueError('Empty section')
    return {'distanceXZ': best[0], 'candidateXZ': best[1]}


if __name__ == '__main__':
    model, output = map(Path, sys.argv[1:3])
    root = Path(__file__).resolve().parents[1]
    mesh_path = root/'lib/mesh-registration.json'
    mesh = json.loads(mesh_path.read_text())
    raw, vertices, normals, indices = read_mesh(model)
    assert hashlib.sha256(raw).hexdigest() == mesh['assetSha256']
    groups = [('cricoid', 'ST10', ['ST10', 'LI17']),
              ('thyroid', 'ST9', ['ST9', 'LI18', 'SI16'])]
    result = {'registrationSha256': hashlib.sha256(mesh_path.read_bytes()).hexdigest(),
              'modelSha256': mesh['assetSha256'],
              'note': 'Existing reference heights are estimates. Nearest section candidates are diagnostic only; no anatomy or point changes are inferred.',
              'sections': []}
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620">',
           '<rect width="1000" height="620" fill="white"/>',
           '<g font-family="sans-serif" font-size="15" fill="#172a38">',
           '<text x="25" y="28">Neck surface inspection: existing points vs horizontal section candidates</text>',
           '<text x="25" y="52">Top = anterior (+Z). Filled dot = current XZ; hollow dot = nearest section candidate.</text>',
           '<text x="25" y="76">Diagnostic only. Reference heights are estimates; anatomy has not been established.</text>']
    for number, (name, reference, ids) in enumerate(groups):
        height = mesh['points'][reference]['position'][1]
        segments = section(vertices, indices, height)
        item = {'name': name, 'reference': reference, 'height': height, 'points': {}}
        center = 250 + 500*number
        def xy(p):
            return center + p[0]*2000, 380-p[1]*2000
        svg.append(f'<text x="{center-190}" y="116">{name}: {reference}, Y={height:.6f}</text>')
        svg.append(f'<defs><clipPath id="panel{number}"><rect x="{number*500+10}" y="130" width="480" height="440"/></clipPath></defs>')
        svg.append(f'<g clip-path="url(#panel{number})">')
        for a, b in segments:
            ax, ay = xy(a); bx, by = xy(b)
            svg.append(f'<path d="M{ax},{ay} L{bx},{by}" stroke="#94a3b8" fill="none"/>')
        for point_id, color in zip(ids, ['#2563eb', '#dc2626', '#15803d']):
            position = mesh['points'][point_id]['position']
            diagnostic = nearest_on_section(segments, position)
            item['points'][point_id] = {'position': position, **diagnostic}
            px, py = xy([position[0], position[2]])
            qx, qy = xy(diagnostic['candidateXZ'])
            svg.append(f'<path d="M{px},{py} L{qx},{qy}" stroke="{color}" stroke-dasharray="3 3"/>')
            svg.append(f'<circle cx="{px}" cy="{py}" r="4" fill="{color}"/>')
            svg.append(f'<circle cx="{qx}" cy="{qy}" r="6" stroke="{color}" fill="none"/>')
            svg.append(f'<text x="{px+9}" y="{py-9}" fill="{color}">{point_id}</text>')
        svg.append('</g>')
        result['sections'].append(item)
    svg.extend(['</g>', '</svg>'])
    output.mkdir(parents=True, exist_ok=True)
    (output/'neck-sections.json').write_text(json.dumps(result, indent=2)+'\n')
    (output/'neck-sections.svg').write_text('\n'.join(svg)+'\n')
