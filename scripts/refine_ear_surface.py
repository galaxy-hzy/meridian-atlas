"""Improve four ear-region surface references on the retained body.
Usage: python refine_ear_surface.py BASE.json BODY.glb SOURCE.obj OUTPUT.json
Bone boundaries and open-mouth pose remain unverified.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh
from refine_lip_landmarks import SOURCE_SHA

def refine(data,surface,outer,source):
    assert 'earSurfaceReferences' not in data, 'Use preserved baseline'
    assert hashlib.sha256(source.read_bytes()).hexdigest()==SOURCE_SHA
    original=[];body=set();group=None
    for line in source.read_text().splitlines():
        p=line.split()
        if not p:continue
        if p[0]=='v':original.append(list(map(float,p[1:4])))
        elif p[0]=='g':group=p[1]
        elif p[0]=='f' and group=='body':body.update(int(x.split('/')[0])-1 for x in p[1:])
    body=sorted(body);original=np.array(original);v=surface.vertices
    floor=original[body,1].min();scale=1.85/(original[body,1].max()-floor)
    ids=[12258,12077,12042,12330,11883]
    for i in ids:assert body[i]==i and np.max(np.abs(v[i]-(original[i]-[0,floor,0])*scale))<1e-7
    before=copy.deepcopy(data['points']);targets=['TE21','SI19','GB2','TE17']
    references={'TE21':12258,'SI19':12077,'GB2':12042}
    # Reviewed lateral view suggests this common anterior skin line. The 5.5 mm
    # is a provisional model-space placement choice, not a standard cun value.
    front_z=float(v[12042,2]+.0055)
    for id,vid in references.items():
        p=outer.z_project([front_z,v[vid,1],.09],1)
        assert p['method']=='front-z-ray'
        for key in ['position','offset']:p[key]=[p[key][2],p[key][1],p[key][0]]
        p['method']='ear-outer-x-ray'
        assert p['position'][2]>v[vid,2] and abs(p['position'][1]-v[vid,1])<1e-8
        p.update(regionRule='provisional-ear-surface',proportionNote='已按当前底模耳屏及切迹的体表参照重排到耳前皮肤，纠正原点落在耳廓上的错位；前方距离、下颌骨髁突及微张口凹陷仍待解剖核对。')
        data['points'][id]=p
    vid=11883;face=int(np.flatnonzero(np.any(surface.indices==vid,axis=1))[0]);bary=np.zeros(3)
    bary[list(surface.indices[face]).index(vid)]=1
    p=surface.finish(face,bary,'ear-lobe-surface-vertex',v[vid])
    # Use the same lateral display offset as the other three points.
    p['offset']=[.003,0,0];p['position']=(v[vid]+[.003,0,0]).tolist()
    p.update(regionRule='provisional-ear-surface',proportionNote='已按当前底模耳垂后方的皮肤参照纠正原点偏至颈侧下方；乳突下端及其前方凹陷仍待解剖核对，尚不列为完整校准通过。')
    data['points']['TE17']=p
    for id in targets:assert np.linalg.norm(np.array(data['points'][id]['position'])-before[id]['position'])<.08
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
    assert set(changed)=={'SI','TE','GB'}
    data['earSurfaceReferences']={'status':'provisional-ear-surface','sourceObjSha256':SOURCE_SHA,'sourceCommit':data['sourceCommit'],'source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','clauses':{'TE21':'5.10.21','SI19':'5.6.19','GB2':'5.11.2','TE17':'5.10.17'},'pdfPages':[25,35,36],'referenceVertices':{str(i):v[i].tolist() for i in ids},'earFrontHeightReferences':references,'earFrontZ':front_z,'earFrontZOffsetChoice':.0055,'lobeRearVertex':11883,'previousPositions':{id:before[id]['position'] for id in targets},'changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'侧面网格辨认用于纠正明显错位；耳屏/切迹轮廓参照、前方距离、乳突及下颌骨髁突尚需独立核实。耳后TE18/TE19/TE20未在本批修正。'}
    return data

if __name__=='__main__':
    baseline,model,source,output=map(Path,sys.argv[1:5]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),Surface(v[:,[2,1,0]],n[:,[2,1,0]],i),source)
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({id:result['points'][id]['position'] for id in result['earSurfaceReferences']['previousPositions']}))
