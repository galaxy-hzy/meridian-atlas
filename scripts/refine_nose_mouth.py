"""Review nasal tip and improve two provisional nose/mouth surface references.
Usage: python refine_nose_mouth.py BASE.json BODY.glb SOURCE.obj OUTPUT.json
The philtrum boundaries and Dicang distance retain explicit review limitations.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh
from refine_lip_landmarks import SOURCE_SHA

def refine(data,surface,source):
    assert 'noseMouthLandmarks' not in data, 'Use preserved baseline'
    assert hashlib.sha256(source.read_bytes()).hexdigest()==SOURCE_SHA
    original=[];used=set();group=None
    for line in source.read_text().splitlines():
        p=line.split()
        if not p:continue
        if p[0]=='v':original.append(list(map(float,p[1:4])))
        elif p[0]=='g':group=p[1]
        elif p[0]=='f' and group=='body':used.update(int(x.split('/')[0])-1 for x in p[1:])
    used=sorted(used);original=np.array(original);v=surface.vertices
    floor=original[used,1].min();scale=1.85/(original[used,1].max()-floor)
    ids=[297,5054,302,343,5072,5342,362,455,466,7129,7139,10407]
    for i in ids:
        assert used[i]==i and np.max(np.abs(v[i]-(original[i]-[0,floor,0])*scale))<1e-7
    before=copy.deepcopy(data['points']);targets=['GV25','GV26','ST4']
    def vertex_binding(vid):
        face=int(np.flatnonzero(np.any(surface.indices==vid,axis=1))[0]);bary=np.zeros(3)
        bary[list(surface.indices[face]).index(vid)]=1
        return surface.finish(face,bary,'reviewed-surface-vertex',v[vid],1)
    nasal_midline=np.flatnonzero((abs(v[:,0])<1e-8)&(v[:,1]>1.66)&(v[:,1]<1.70))
    assert nasal_midline[np.argmax(v[nasal_midline,2])]==297
    p=vertex_binding(297)
    p.update(regionRule='reviewed-nasal-surface',proportionNote='已按当前底模可见鼻尖正中凸起校正，保留原始顶点溯源及正中轮廓证据；仅完成此模型的体表形态对应，非个体临床定位验证。')
    data['points']['GV25']=p
    # Follow the actual midsagittal mesh edges, not a straight line through skin.
    chain=[343,5072,5342,362,455,466]
    for a,b in zip(chain,chain[1:]):assert np.any(np.any(surface.indices==a,axis=1)&np.any(surface.indices==b,axis=1))
    lengths=np.linalg.norm(np.diff(v[chain],axis=0),axis=1);remaining=float(sum(lengths)/3);chosen_segment=None
    for j,length in enumerate(lengths):
        if remaining<=length:
            alpha=remaining/length;seed=v[chain[j]]*(1-alpha)+v[chain[j+1]]*alpha;chosen_segment=j;break
        remaining-=length
    p=surface.z_project(seed,1);assert p['method']=='front-z-ray'
    assert np.linalg.norm(np.array(p['position'])-[0,0,.003]-seed)<1e-7
    p.update(regionRule='provisional-philtrum-surface',proportionNote='已按鼻小柱下端至上唇结节的模型正中表面链上1/3重新估计人中沟位置，纠正原点偏低；模型沟界仍待独立校核，尚不列为完整解剖校准通过。')
    data['points']['GV26']=p
    p=vertex_binding(7139)
    assert p['position'][0]>v[7129,0] and abs(p['position'][1]-v[7129,1])<.0001
    p.update(regionRule='provisional-mouth-surface',proportionNote='已按当前模型口角旁、鼻唇沟延长线的体表参照纠正原点偏低；口角旁开0.4寸及沟线形态仍需独立核实，尚不列为完整解剖校准通过。')
    data['points']['ST4']=p
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
    assert set(changed)=={'GV','ST','YANGQIAO'}
    data['noseMouthLandmarks']={'sourceObjSha256':SOURCE_SHA,'sourceCommit':data['sourceCommit'],'source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','sourceSha256':'777643c116fb3cd543a6a632a3ad36c4bfbedd8880aced0c6979a877694d7692','vertices':{str(i):v[i].tolist() for i in ids},'previousPositions':{id:before[id]['position'] for id in targets},'points':{'GV25':{'status':'model-surface-reviewed','vertex':297,'clause':'5.13.26','pdfPage':43},'GV26':{'status':'provisional-boundaries','chain':chain,'fraction':1/3,'surfaceLength':float(sum(lengths)),'segment':chosen_segment,'segmentFraction':float(alpha),'clause':'5.13.27','pdfPage':43},'ST4':{'status':'provisional-distance','vertex':7139,'cornerVertex':7129,'clause':'5.3.4','pdfPage':17}},'changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'只将素髎记为本模型可见体表标志复核；水沟沟界与地仓0.4寸仍待独立核对，不以局部曲率或回归测试宣称完成。'}
    return data

if __name__=='__main__':
    baseline,model,source,output=map(Path,sys.argv[1:5]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i),source)
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({id:result['points'][id]['position'] for id in result['noseMouthLandmarks']['points']}))
