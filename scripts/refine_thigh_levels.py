"""Unify explicit anterior-thigh relative heights using retained ST32/ST33.
Usage: python refine_thigh_levels.py BASE.json BODY.glb OUTPUT.json
This corrects relative proportions; patellar and muscle landmarks stay estimated.
"""
from pathlib import Path
import copy, hashlib, json, sys
import numpy as np
from register_human import Surface, read_mesh

def refine(data, surface):
    if 'thighLevels' in data:
        raise ValueError('Use the preserved baseline')
    before = copy.deepcopy(data['points'])
    y6 = before['ST32']['position'][1]
    y3 = before['ST33']['position'][1]
    unit = (y6-y3)/3
    base = y3-3*unit
    assert .02 < unit < .04
    assert abs(base-before['EX-LE2']['position'][1]) < .005
    rules = {'ST34':2, 'SP10':2, 'LR9':4, 'EX-LE1':2, 'EX-LE3':3}
    note = '已按既有伏兔6寸、阴市3寸的参照高度统一股前部2、3、4寸相对层级；保留原横向位置。髌底基准由两参照推算，真实骨点、肌缘及横向距离仍需解剖校准。'
    for id,cun in rules.items():
        old=before[id]
        bindings=[]
        for original in old.get('positions', [old['position']]):
            p=surface.z_project([original[0],base+cun*unit,original[2]],1)
            assert abs(p['position'][0]-original[0])<1e-9
            assert abs(p['position'][1]-(base+cun*unit))<1e-9
            assert np.linalg.norm(np.array(p['position'])-original)<.11
            bindings.append(p)
        updated={**bindings[0], 'regionRule':'shared-thigh-proportion', 'proportionNote':note}
        if len(bindings)>1:
            updated['groupBindings']=bindings
            updated['positions']=[p['position'] for p in bindings]
        data['points'][id]=updated
    key = lambda p: tuple(round(float(v), 9) for v in p)
    known = {key(p['position']) for p in before.values()}
    moved = {key(before[id]['position']):data['points'][id]['position'] for id in rules}
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
            anchors = sorted({0, len(path)-1} | {i for i,p in enumerate(path) if key(p) in known})
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
    assert set(changed) == {'ST','SP','LR'}
    data['thighLevels']={
        'references':{'ST32':before['ST32']['position'],'ST33':before['ST33']['position']},
        'baseY':base,'unit':unit,'rules':rules,'changedRoutes':changed,
        'previousPositions':{id:before[id].get('positions',[before[id]['position']]) for id in rules},
        'source':'GB/T 12346-2021 PDF 19, 21, 40; GB/T 40997-2021 PDF 11',
        'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':note,
    }
    return data

if __name__ == '__main__':
    baseline,model,output=map(Path,sys.argv[1:4])
    data=json.loads(baseline.read_text());raw,v,n,i=read_mesh(model)
    assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i))
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({id:result['points'][id].get('positions',[result['points'][id]['position']]) for id in result['thighLevels']['rules']}))
