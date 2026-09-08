"""Use the pinned source eye helpers to constrain an infraorbital reference axis.
Usage: python refine_eye_axis.py BASE.json BODY.glb SOURCE.obj OUTPUT.json
The eye helper center is a model reference, not a verified pupil or orbital bone.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh
from refine_lip_landmarks import SOURCE_SHA

def refine(data,surface,source):
    assert 'eyeAxisReference' not in data, 'Use preserved baseline'
    assert hashlib.sha256(source.read_bytes()).hexdigest()==SOURCE_SHA
    original=[];groups={};group=None
    for line in source.read_text().splitlines():
        p=line.split()
        if not p:continue
        if p[0]=='v':original.append(list(map(float,p[1:4])))
        elif p[0]=='g':group=p[1]
        elif p[0]=='f':groups.setdefault(group,set()).update(int(x.split('/')[0])-1 for x in p[1:])
    body=sorted(groups['body']);original=np.array(original)
    floor=original[body,1].min();scale=1.85/(original[body,1].max()-floor)
    vertices=(original-[0,floor,0])*scale
    # Check source-to-GLB mapping in the unchanged face, independently of helper names.
    for i in [297,343,466,724,7139]:
        assert body[i]==i and np.max(np.abs(vertices[i]-surface.vertices[i]))<1e-7
    references={}
    for side in ['l','r']:
        name='helper-'+side+'-eye';ids=sorted(groups[name]);points=vertices[ids]
        pole_ids=[i for i in ids if abs(vertices[i,2]-max(points[:,2]))<1e-8]
        assert len(ids)==72 and len(pole_ids)==8
        center=vertices[pole_ids].mean(axis=0)
        references[side]={'sourceGroup':name,'frontPoleVertexIds':pole_ids,'frontPoleVertices':vertices[pole_ids].tolist(),'frontPoleCenter':center.tolist()}
    assert np.max(np.abs(np.array(references['l']['frontPoleCenter'])*[-1,1,1]-references['r']['frontPoleCenter']))<1e-8
    before=copy.deepcopy(data['points']);targets=['ST1','ST3'];axis=references['l']['frontPoleCenter'][0]
    for id in targets:
        p=surface.z_project([axis,*before[id]['position'][1:]],1)
        assert p['method']=='front-z-ray' and p['position'][2]>.145
        assert abs(p['position'][1]-before[id]['position'][1])<1e-8
        limit='下睑与眶下缘' if id=='ST1' else '鼻翼下缘'
        p.update(regionRule='provisional-eye-axis',proportionNote='已按同一原始模型眼部前极中心统一瞳孔直下的横向参考，保留现有高度；眼部前极只是模型参考，实际视轴及'+limit+'仍待解剖核对。')
        data['points'][id]=p
    probe=surface.z_project([axis,before['ST1']['position'][1]+.0005,before['ST1']['position'][2]],1)
    assert probe['position'][2]<references['l']['frontPoleCenter'][2]-.02
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
    assert set(changed)=={'ST','YANGQIAO'}
    data['eyeAxisReference']={'sourceObjSha256':SOURCE_SHA,'sourceCommit':data['sourceCommit'],'source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','clauses':['5.3.1','5.3.3'],'pdfPage':17,'eyes':references,'changedPoints':targets,'previousPositions':{id:before[id]['position'] for id in targets},'rejectedST1UpwardProbe':{'dy':.0005,'position':probe['position']},'changedRoutes':changed,'status':'provisional-eye-axis','scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'同源眼部几何不等同于已核实瞳孔。承泣保留原高度，仅作横向统一；另做的向上0.5毫米探测落到眼眶内面，未采用该高度；下睑、眶下缘及巨髎鼻翼下缘仍需独立核对。'}
    return data

if __name__=='__main__':
    baseline,model,source,output=map(Path,sys.argv[1:5]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),source)
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps(result['eyeAxisReference'],ensure_ascii=False,indent=2))
