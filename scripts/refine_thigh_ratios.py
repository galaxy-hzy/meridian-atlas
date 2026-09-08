"""Correct two thigh height ratios using retained reference estimates.
Usage: python refine_thigh_ratios.py BASE.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh

def refine(data,surface,outer_surface):
    assert 'thighRatios' not in data, 'Use the preserved baseline'
    before=copy.deepcopy(data['points'])
    knee=before['BL40']['position'][1]
    upper=before['GB31']['position'][1]
    patella=data['thighLevels']['baseY']
    targets={'GB32':knee+(upper-knee)*7/9,'SP11':patella+(before['SP12']['position'][1]-patella)*2/3}
    for id,y in targets.items():
        old=before[id]['position']
        if id=='GB32':
            p=outer_surface.z_project([old[2],y,old[0]],1)
            assert p['method']=='front-z-ray'
            for key in ['position','offset']:p[key]=[p[key][2],p[key][1],p[key][0]]
            p['method']='thigh-outer-x-ray'
            assert abs(p['position'][2]-old[2])<1e-9
            note='已按现有风市与膝横纹参照约束7:9纵向比例，并投到大腿外侧表面；风市、膝横纹及髂胫束后缘仍为待核对的模型标志。'
        else:
            p=surface.z_project([old[0],y,old[2]],1)
            assert p['method']=='front-z-ray'
            assert abs(p['position'][0]-old[0])<1e-9
            note='已按冲门与推算髌底参照约束上1/3、下2/3的纵向比例，保留原横向位置。髌底内侧端、完整连线及肌缘动脉标志仍需解剖校核。'
        assert abs(p['position'][1]-y)<1e-9
        assert np.linalg.norm(np.array(p['position'])-old)<.08
        p.update(regionRule='shared-thigh-ratio',proportionNote=note)
        data['points'][id]=p
    key = lambda p: tuple(round(float(v), 9) for v in p)
    known = {key(p['position']) for p in before.values()}
    moved = {key(before[id]['position']):data['points'][id]['position'] for id in targets}
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
    assert set(changed)=={'GB','SP'}
    data['thighRatios']={'targets':targets,'patellaBaseY':patella,'references':{id:before[id]['position'] for id in ['BL40','GB31','SP12']},'previousPositions':{id:before[id]['position'] for id in targets},'changedRoutes':changed,'source':'GB/T 12346-2021 PDF 39（5.11.31–32）、21（5.4.11）','scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'只修正纵向比例；参照高度与骨肌标志不据此取得解剖验证。'}
    return data

if __name__=='__main__':
    baseline,model,output=map(Path,sys.argv[1:4]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),Surface(v[:,[2,1,0]],n[:,[2,1,0]],i))
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({id:result['points'][id]['position'] for id in result['thighRatios']['targets']}))
