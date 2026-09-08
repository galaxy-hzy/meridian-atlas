"""Bind two lip/chin points to visually reviewed vertices of the retained mesh.
Usage: python refine_lip_landmarks.py BASE.json BODY.glb SOURCE.obj OUTPUT.json
Vertex identity and local shape checks support model surface review only.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh

SOURCE_SHA='8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c'
LANDMARKS={
 'GV27':{'vertex':466,'name':'上唇结节中点','clause':'5.13.28','pdfPage':43,'neighbors':[455,467],'extremum':'maximum'},
 'CV24':{'vertex':724,'name':'颏唇沟正中凹陷','clause':'5.14.24','pdfPage':45,'neighbors':[491,733],'extremum':'minimum'},
}

def refine(data,surface,source):
    assert 'lipLandmarks' not in data, 'Use preserved baseline'
    assert hashlib.sha256(source.read_bytes()).hexdigest()==SOURCE_SHA
    original=[];used=set();group=None
    for line in source.read_text().splitlines():
        p=line.split()
        if not p:continue
        if p[0]=='v':original.append(list(map(float,p[1:4])))
        elif p[0]=='g':group=p[1]
        elif p[0]=='f' and group=='body':used.update(int(x.split('/')[0])-1 for x in p[1:])
    used=sorted(used);original=np.array(original)
    assert len(used)==len(surface.vertices)
    floor=original[used,1].min();scale=1.85/(original[used,1].max()-floor)
    before=copy.deepcopy(data['points']);targets=list(LANDMARKS);evidence={}
    for id,mark in LANDMARKS.items():
        original_id=mark['vertex'];vid=used.index(original_id);v=surface.vertices[vid]
        expected=(original[original_id]-[0,floor,0])*scale
        assert np.max(np.abs(v-expected))<1e-7, 'Head must match pinned original topology'
        neighbors=surface.vertices[[used.index(i) for i in mark['neighbors']]]
        assert v[0]==0 and neighbors[0,1]>v[1]>neighbors[1,1]
        assert (v[2]>max(neighbors[:,2])) if mark['extremum']=='maximum' else (v[2]<min(neighbors[:,2]))
        face=int(np.flatnonzero(np.any(surface.indices==vid,axis=1))[0]);bary=np.zeros(3)
        bary[list(surface.indices[face]).index(vid)]=1
        binding=surface.finish(face,bary,'reviewed-surface-vertex',v,1)
        binding.update(regionRule='reviewed-lip-surface',proportionNote='已按当前底模可见的'+mark['name']+'校正，并核对正面与正中剖面；仅完成此模型的体表形态对应，非个体临床定位验证。')
        data['points'][id]=binding
        evidence[id]={**mark,'originalVertex':original_id,'glbVertex':vid,'surfacePosition':v.tolist(),'previousPosition':before[id]['position'],'reviewStatus':'model-surface-reviewed','limitation':'通用模型的可见体表标志，未取得独立临床解剖验证。'}
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
    assert set(changed)=={'CV','GV'}
    data['lipLandmarks']={'points':evidence,'sourceObjSha256':SOURCE_SHA,'sourceCommit':data['sourceCommit'],'source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','sourceSha256':'777643c116fb3cd543a6a632a3ad36c4bfbedd8880aced0c6979a877694d7692','changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'兑端对应可见上唇结节凸起，承浆对应颏唇沟凹陷；动画骨架名称不作为解剖结论。水沟及其他面穴不在本次通过范围。'}
    return data

if __name__=='__main__':
    baseline,model,source,output=map(Path,sys.argv[1:5]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),source)
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps(result['lipLandmarks'],ensure_ascii=False,indent=2))
