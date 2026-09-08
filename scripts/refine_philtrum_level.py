"""Align LI19 with the existing philtrum reference without claiming full localization.
Usage: python refine_philtrum_level.py BASE.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh

def refine(data,surface):
    assert 'philtrumLevelReference' not in data, 'Use preserved baseline'
    before=copy.deepcopy(data['points']);targets=['LI19']
    assert before['GV26']['regionRule']=='provisional-philtrum-surface'
    assert data['noseMouthLandmarks']['points']['GV26']['status']=='provisional-boundaries'
    p=surface.z_project([before['LI19']['position'][0],before['GV26']['position'][1],before['LI19']['position'][2]],1)
    assert p['method']=='front-z-ray' and p['position'][2]>.15
    assert abs(p['position'][1]-before['GV26']['position'][1])<1e-9
    p.update(regionRule='shared-philtrum-level',sharedLevelRefs=['GV26'],proportionNote='已将口禾髎由原先口唇下方修正至当前水沟体表参照的同一高度，保留横向位置；水沟的人中沟边界、鼻孔外缘及旁开0.5寸仍待解剖核对，不代表完整定位通过。')
    data['points']['LI19']=p
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
    assert set(changed)=={'LI'}
    data['philtrumLevelReference']={'status':'provisional-shared-level','source':'GB/T 12346-2021','sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','clause':'5.2.19','pdfPage':16,'reference':'GV26','referencePosition':before['GV26']['position'],'referenceStatus':before['GV26']['regionRule'],'previousPosition':before['LI19']['position'],'changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'从已保留的人中沟体表参照继承高度及其不确定性；不重新证明水沟，也不证明鼻孔外缘纵线或0.5寸距离。迎香位置本次保持，鼻翼中点和鼻唇沟仍待辨认。'}
    return data

if __name__=='__main__':
    if len(sys.argv)!=4 or Path(sys.argv[3]).suffix!='.json':
        raise SystemExit('Usage: refine_philtrum_level.py BASE.json BODY.glb OUTPUT.json')
    baseline,model,output=map(Path,sys.argv[1:]);data=json.loads(baseline.read_text())
    raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i))
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps(result['points']['LI19']))
