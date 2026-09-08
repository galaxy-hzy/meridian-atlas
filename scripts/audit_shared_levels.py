"""Read-only consistency audit; co-level agreement is not anatomical accuracy.

Usage: python3 scripts/audit_shared_levels.py [output.json]
Groups only explicit level relations and named vertebral/sacral landmarks.
No coordinate changes or inferred levels are made.
"""
from pathlib import Path
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def reference(relation):
    if relation['kind'] == 'level':
        return relation['reference']
    if relation['kind'] != 'anatomical':
        return None
    detail = relation.get('detail', '')
    # Exclude intervertebral spaces, upper margins and other nearby landmarks.
    match = re.fullmatch(r'(第\d+[颈胸腰]椎棘突下)(?:凹陷中)?', detail)
    if match:
        return match[1]
    match = re.fullmatch(r'正对(第\d+骶后孔)中', detail)
    return match[1] if match else None


def audit(facts, mesh, tolerance=1e-6):
    groups = {}
    for point_id, fact in facts['points'].items():
        for relation in fact['relations']:
            key = reference(relation)
            if key:
                groups.setdefault(key, {})[point_id] = {
                    'y': mesh['points'][point_id]['position'][1],
                    'pdfPage': fact['pdfPage'],
                    'clause': fact['clause'],
                }
    result = []
    for key, points in sorted(groups.items()):
        if len(points) < 2:
            continue
        heights = [point['y'] for point in points.values()]
        spread = max(heights) - min(heights)
        result.append({'reference': key, 'points': points,
                       'spreadModelUnits': spread,
                       'status': 'inconsistent' if spread > tolerance else 'consistent'})
    return {'scope': 'Explicit shared levels only; excludes individual placement and inferred relations.',
            'toleranceModelUnits': tolerance,
            'note': 'Agreement proves internal consistency only. Differences require anatomical review, not automatic averaging.',
            'groupCount': len(result),
            'inconsistentCount': sum(g['status'] == 'inconsistent' for g in result),
            'groups': result}


if __name__ == '__main__':
    paths = [ROOT / 'lib/standard-location-facts.json', ROOT / 'lib/mesh-registration.json']
    data = [json.loads(path.read_text()) for path in paths]
    result = audit(*data)
    result['inputSha256'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    output = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(output)
    else:
        print(output, end='')
