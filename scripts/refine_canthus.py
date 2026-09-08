"""Review visible canthus relations and correct the cheek reference axis.
Usage: python refine_canthus.py BASE.json BODY.glb SOURCE.obj OUTPUT.json
Canthus surface references are not verified orbital or zygomatic landmarks.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh
from refine_lip_landmarks import SOURCE_SHA

def refine(data,surface,source):
    assert 'canthusReference' not in data, 'Use preserved baseline'
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
    for i in [6805,6850]:
        assert body[i]==i and np.max(np.abs(v[i]-(original[i]-[0,floor,0])*scale))<1e-7
    before=copy.deepcopy(data['points']);targets=['SI18']
    axis=float(v[6805,0]);p=surface.z_project([axis,*before['SI18']['position'][1:]],1)
    assert p['method']=='front-z-ray' and p['position'][2]>.12
    assert abs(p['position'][1]-before['SI18']['position'][1])<1e-8
    p.update(regionRule='provisional-canthus-axis',proportionNote='已按当前底模外眼角体表顶点统一颧髎的纵向参照，修正原点偏外，保留现有高度；外眼角精细边界及颧骨下缘凹陷仍待解剖核对。')
    data['points']['SI18']=p
    inner=v[6850];outer=v[6805]
    assert before['BL1']['position'][0]<inner[0] and before['BL1']['position'][1]>inner[1]
    assert before['GB1']['position'][0]>outer[0]
    data['points']['BL1'].update(regionRule='provisional-canthus-relation',proportionNote='已核对现有坐标位于当前底模内眼角体表参照的内上方，本次保留坐标；闭目体位、内上方0.1寸与眶内侧壁凹陷仍待解剖核对。')
    data['points']['GB1'].update(regionRule='provisional-canthus-relation',proportionNote='已核对现有坐标位于当前底模外眼角体表参照的外侧，本次保留坐标；外侧0.5寸及局部凹陷仍待解剖核对。')
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
    assert set(changed)=={'SI'}
    data['canthusReference']={'status':'provisional-canthus-reference','sourceObjSha256':SOURCE_SHA,'sourceCommit':data['sourceCommit'],'source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','clauses':{'BL1':'5.7.1','GB1':'5.11.1','SI18':'5.6.18'},'pdfPages':[25,36],'innerReferenceVertex':6850,'outerReferenceVertex':6805,'referenceVertices':{str(i):v[i].tolist() for i in [6805,6850]},'changedPositions':['SI18'],'retainedPositions':['BL1','GB1'],'previousPositions':{id:before[id]['position'] for id in ['BL1','GB1','SI18']},'changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'由同一网格可见睑缘辨认的内外眼角体表顶点参照，并非已验证的解剖标注。保留睛明与瞳子髎位置只代表粗略方位未见冲突，不代表标准寸距或骨性凹陷验证通过。颧髎仅统一横向参考，高度与颧骨下缘仍待核对。'}
    return data

if __name__=='__main__':
    if len(sys.argv)!=5 or Path(sys.argv[4]).suffix!='.json':
        raise SystemExit('Usage: refine_canthus.py BASE.json BODY.glb SOURCE.obj OUTPUT.json')
    baseline,model,source,output=map(Path,sys.argv[1:]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),source)
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({id:result['points'][id]['position'] for id in result['canthusReference']['previousPositions']}))
