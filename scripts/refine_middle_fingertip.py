"""Bind PC9 and its shared Shixuan member to the reviewed retained-mesh tip.
Usage: refine_middle_fingertip.py BASE.json BODY.glb OUTPUT.json
Only a visible surface landmark is reviewed; no bone or clinical claim.
"""
from pathlib import Path
import copy
import hashlib
import json
import sys
import numpy as np
from register_human import Surface, read_mesh

def refine(data, surface):
    assert 'middleFingertipReference' not in data, 'Use preserved baseline'
    vid = 8787
    p = surface.vertices[vid]
    assert np.allclose(p, [.6317498087882996,.9603039622306824,.07019006460905075], atol=1e-12, rtol=0)
    before = copy.deepcopy(data['points']['PC9'])
    old = np.asarray(before['position']) - before['offset']
    assert .005 < np.linalg.norm(old-p) < .007
    face = int(np.flatnonzero(np.any(surface.indices == vid, axis=1))[0])
    bary = np.zeros(3)
    bary[list(surface.indices[face]).index(vid)] = 1
    binding = surface.finish(face, bary, 'reviewed-surface-vertex', p)
    binding.update(regionRule='reviewed-middle-fingertip',
        proportionNote='中冲已按当前底模可见的中指末端顶点作体表形态校正，并与十宣中指端标记共用位置；不代表骨骼、甲根或个体临床定位均已校准。')
    data['points']['PC9'] = binding
    shared = data['points']['EX-UE11']
    assert shared['sharedAnchorRefs']['2'] == 'PC9'
    keys = ['face','barycentric','offset','position','method','seedDistance']
    shared['groupBindings'][2] = {key:copy.deepcopy(binding[key]) for key in keys}
    shared['positions'] = [b['position'] for b in shared['groupBindings']]
    # Only the last PC8-to-PC9 span moves. Retain every other authored route.
    paths = data['routes']['PC']
    matches = [i for i, path in enumerate(paths) if path[-1] == before['position']]
    assert len(matches) == 1
    path = paths[matches[0]]
    anchor = data['points']['PC8']['position']
    start = path.index(anchor)
    replacement = surface.surface_path(anchor, binding['position'])
    paths[matches[0]] = path[:start] + replacement
    data['middleFingertipReference'] = {
        'status':'model-surface-reviewed', 'point':'PC9', 'glbVertex':vid,
        'surfacePosition':p.tolist(), 'previousBinding':before,
        'surfaceSeparationMm':float(np.linalg.norm(old-p)*1000),
        'sharedMember':{'id':'EX-UE11','index':2}, 'changedRoutes':['PC'],
        'source':'GB/T 12346-2021', 'sourceClause':'5.9.9',
        'basis':'中指末端最高点；已检查当前网格两个局部投影视图。',
        'limitation':'这是保留底模的可见体表形态复核；动画辅助关节仅用于搜索初始方向，不作为真实骨点。未据此校准其他指端、甲根及腕部穴位。',
        'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    return data

if __name__ == '__main__':
    if len(sys.argv) != 4 or Path(sys.argv[3]).suffix != '.json':
        raise SystemExit('Usage: refine_middle_fingertip.py BASE.json BODY.glb OUTPUT.json')
    baseline, model, output = map(Path,sys.argv[1:])
    data = json.loads(baseline.read_text())
    raw, v, n, i = read_mesh(model)
    assert hashlib.sha256(raw).hexdigest() == data['assetSha256']
    result = refine(data, Surface(v,n,i))
    with output.open('x') as f:
        f.write(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps(result['middleFingertipReference'],ensure_ascii=False))
