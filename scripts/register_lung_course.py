"""Build a schematic LU internal prelude and wrist branch on the pinned model.
Usage: python register_lung_course.py MESH.json BODY.glb OUTPUT.json
Requires numpy. Internal regional nodes are authored diagram coordinates;
surface references do not assign LI points to the Lung channel.
"""
from pathlib import Path
import sys, json, hashlib
from register_human import read_mesh, Surface

registration, model, output = map(Path, sys.argv[1:4])
data = json.loads(registration.read_text())
raw, vertices, normals, indices = read_mesh(model)
assert hashlib.sha256(raw).hexdigest() == data['assetSha256']
source = json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision'] == '2520099'
surface = Surface(vertices, normals, indices)
nodes = [
    {'label': '中焦', 'position': [0, 1.18, .025]},
    {'label': '络大肠', 'position': [0, 1.04, .015]},
    {'label': '胃口', 'position': [0, 1.225, .035]},
    {'label': '膈', 'position': [.025, 1.30, .025]},
    {'label': '属肺', 'position': [.075, 1.405, .025]},
    {'label': '肺系', 'position': [.025, 1.475, .025]},
    {'label': '出腋下', 'position': [.16, 1.405, .065]},
]
internal = [n['position'] for n in nodes] + [data['points']['LU1']['position']]
references = ['LU7', 'LI3', 'LI2', 'LI1']
branch = []
for first, last in zip(references, references[1:]):
    path = surface.surface_path(data['points'][first]['position'], data['points'][last]['position'])
    branch.extend(path if not branch else path[1:])
result = {
    'channel': 'LU', 'assetSha256': data['assetSha256'],
    'registrationSha256': hashlib.sha256(registration.read_bytes()).hexdigest(),
    'source': {k: source[k] for k in ['title', 'revision', 'url', 'sourceSha256']},
    'passage': source['passages']['LU'],
    'nodes': nodes, 'internal': internal, 'branch': branch,
    'branchStart': 'LU7', 'branchEndReference': 'LI1',
    'surfaceReferences': references,
    'note': '体内节点表示古籍所述区域，坐标与器官外形未作解剖校准。以列缺所在腕后区域作为分叉参照，以商阳作为食指端参照；不是古籍对现代穴名的指定，也不把大肠经穴归入肺经。',
}
output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'internalNodes': len(internal), 'branchNodes': len(branch), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))
