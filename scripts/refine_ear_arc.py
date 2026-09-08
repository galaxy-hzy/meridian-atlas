"""Trace a provisional postauricular scalp arc on the retained body.
Usage: python refine_ear_arc.py BASE.json BODY.glb SOURCE.obj OUTPUT.json
Hairline, folded-ear apex and mastoid anatomy remain unverified.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh
from refine_lip_landmarks import SOURCE_SHA

# Reviewed scalp vertices behind the helix, ordered from upper-ear reference
# to the already registered lobe-rear reference. Every pair is a real mesh edge.
CHAIN=[12355,7578,11973,7579,11983,7648,7642,7636,12156,11882,11883]

def refine(data,surface,source):
    assert 'earArcReference' not in data, 'Use preserved baseline'
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
    for i in CHAIN+[12012]:
        assert body[i]==i and np.max(np.abs(v[i]-(original[i]-[0,floor,0])*scale))<1e-7
    edges=[]
    for a,b in zip(CHAIN,CHAIN[1:]):
        faces=np.flatnonzero(np.any(surface.indices==a,axis=1)&np.any(surface.indices==b,axis=1))
        assert len(faces)>0, (a,b)
        edges.append(int(faces[0]))
    lengths=np.linalg.norm(np.diff(v[CHAIN],axis=0),axis=1)
    total=float(lengths.sum());cum=np.r_[0,np.cumsum(lengths)]
    before=copy.deepcopy(data['points']);targets=['TE18','TE19','TE20'];fractions={'TE20':0,'TE19':1/3,'TE18':2/3}
    placements={}
    for id,ratio in fractions.items():
        distance=total*ratio;j=min(int(np.searchsorted(cum,distance,side='right')-1),len(edges)-1)
        t=float((distance-cum[j])/lengths[j]);a,b=CHAIN[j:j+2];face=edges[j]
        bary=np.zeros(3);ids=list(surface.indices[face]);bary[ids.index(a)]=1-t;bary[ids.index(b)]=t
        skin=v[a]*(1-t)+v[b]*t
        p=surface.finish(face,bary,'postauricular-surface-edge',skin)
        p['offset']=[.003,0,0];p['position']=(skin+[.003,0,0]).tolist()
        if id=='TE20':
            note='已移至当前底模耳廓上缘旁的头皮参照，纠正原点明显偏高；该参照尚未核实为耳郭向前对折后的耳尖正对发际，角孙完整定位仍待解剖核对。'
        else:
            fraction='上1/3' if id=='TE19' else '上2/3'
            note=f'已沿当前底模耳后皮肤弧线，从角孙体表参照至翳风体表参照取{fraction}处；两端、耳轮弧线及乳突标志仍待解剖核对，不代表完整定位通过。'
        p.update(regionRule='provisional-ear-arc',proportionNote=note)
        data['points'][id]=p
        placements[id]={'fractionFromTE20':ratio,'segment':j,'segmentFraction':t,'skinPosition':skin.tolist()}
    assert np.allclose(data['points']['TE17']['position'],v[CHAIN[-1]]+[.003,0,0],atol=1e-12,rtol=0)
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
    assert set(changed)=={'TE'}
    data['earArcReference']={'status':'provisional-ear-arc','sourceObjSha256':SOURCE_SHA,'sourceCommit':data['sourceCommit'],'source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','clauses':{'TE18':'5.10.18','TE19':'5.10.19','TE20':'5.10.20'},'pdfPages':[35,36],'vertexChain':CHAIN,'referenceVertices':{str(i):v[i].tolist() for i in CHAIN+[12012]},'edgeLengths':lengths.tolist(),'totalSurfaceLength':total,'placements':placements,'previousPositions':{id:before[id]['position'] for id in targets},'changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'同一网格耳后头皮边链的人工体表参照；比例按这条边链的三维长度计算。该折线不等于已核实的解剖耳轮弧线；耳郭未折叠、发际和乳突骨界缺失，端点和弧线仍待核实。12012仅作自然耳廓上缘邻近参照，不当成折耳后耳尖。'}
    return data

if __name__=='__main__':
    if len(sys.argv)!=5 or Path(sys.argv[4]).suffix!='.json':
        raise SystemExit('Usage: refine_ear_arc.py BASE.json BODY.glb SOURCE.obj OUTPUT.json')
    baseline,model,source,output=map(Path,sys.argv[1:]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),source)
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({'points':{id:result['points'][id]['position'] for id in result['earArcReference']['previousPositions']},'arcLength':result['earArcReference']['totalSurfaceLength']}))
