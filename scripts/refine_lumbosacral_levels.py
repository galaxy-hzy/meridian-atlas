"""Align explicitly co-level lumbar/sacral points to existing model references.
Usage: python refine_lumbosacral_levels.py BASE.json BODY.glb OUTPUT.json
References are estimates; this does not establish bony or lateral accuracy.
"""
from pathlib import Path
import copy, hashlib, json, sys
import numpy as np
from register_human import Surface, read_mesh

REFS = {'BL22':'GV5','BL23':'GV4','BL51':'GV5','BL52':'GV4',
        'BL27':'BL31','BL28':'BL32','BL29':'BL33','BL30':'BL34',
        'BL53':'BL32','BL54':'BL34'}

def refine(data, surface):
    if 'lumbosacralLevels' in data: raise ValueError('Use unrefined baseline')
    before = copy.deepcopy(data['points']); rules = {}
    for id,ref in REFS.items():
        seed=np.array(before[id]['position']);seed[1]=before[ref]['position'][1]
        binding=surface.z_project(seed,-1)
        if abs(binding['position'][1]-seed[1])>1e-9:raise ValueError('Height changed during projection')
        binding['regionRule']='shared-lumbosacral-level'
        binding['proportionNote']='已按标准统一同腰椎或同骶后孔水平；参照点仍为通用模型估计，真实骨性标志及旁开距离待复核。'
        data['points'][id]=binding
        rules[id]={'reference':ref,'previousPosition':before[id]['position']}
    key=lambda p:tuple(round(float(x),9) for x in p)
    known={key(v['position']) for v in before.values()}
    moved={key(before[id]['position']):data['points'][id]['position'] for id in REFS}
    def connect(a,b):
        a,b=np.array(a),np.array(b);count=max(1,int(np.ceil(np.linalg.norm(b-a)/.012)))
        result=[a.tolist()]+[surface.nearest(a+(b-a)*i/count)['position'] for i in range(1,count)]+[b.tolist()]
        return surface.surface_path(a,b) if any(np.linalg.norm(np.array(q)-p)>.025 for p,q in zip(result,result[1:])) else result
    changed=[]
    for channel,paths in data['routes'].items():
        rebuilt=[];touched=False
        for path in paths:
            if not any(key(p) in moved for p in path):rebuilt.append(path);continue
            anchors=sorted({0,len(path)-1}|{i for i,p in enumerate(path) if key(p) in known})
            result=[moved.get(key(path[0]),path[0])]
            for lo,hi in zip(anchors,anchors[1:]):
                a,b=path[lo],path[hi]
                segment=connect(moved.get(key(a),a),moved.get(key(b),b)) if key(a) in moved or key(b) in moved else path[lo:hi+1]
                result.extend(segment[1:])
            rebuilt.append(result);touched=True
        if touched:data['routes'][channel]=rebuilt;changed.append(channel)
    facts=Path(__file__).resolve().parents[1]/'lib/standard-location-facts.json'
    data['lumbosacralLevels']={'rules':rules,'changedRoutes':changed,
        'factsSha256':hashlib.sha256(facts.read_bytes()).hexdigest(),
        'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'note':'仅统一标准明确的同层对应关系；没有推算或改动缺少直接参考的腰椎层级。'}
    return data

if __name__=='__main__':
    baseline,model,output=map(Path,sys.argv[1:4]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model)
    if hashlib.sha256(raw).hexdigest()!=data['assetSha256']:raise ValueError('Model mismatch')
    data=refine(data,Surface(v,n,i));output.write_text(json.dumps(data,separators=(',',':'))+'\n')
    print(json.dumps(data['lumbosacralLevels'],ensure_ascii=False))
