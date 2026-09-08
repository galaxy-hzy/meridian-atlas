"""Correct three abdominal shared levels and the dependent bilateral belt ring.
Usage: refine_abdominal_levels.py BASE.json BODY.glb OUTPUT.json
Retains the existing navel/pubic reference estimates and their uncertainty.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import Surface,read_mesh

def refine(data,surface):
    assert 'abdominalSharedLevels' not in data, 'Use preserved baseline'
    torso_ids=np.flatnonzero(np.max(np.abs(surface.vertices[surface.indices][:,:,0]),axis=1)<.2)
    outer=Surface(surface.vertices[:,[2,1,0]],surface.vertex_normals[:,[2,1,0]],surface.indices[torso_ids])
    before=copy.deepcopy(data['points']);targets={'GB26':'CV8','GB27':'CV4','LR12':'CV2'}
    for id,ref in targets.items():
        old=before[id]['position'];height=before[ref]['position'][1]
        if id=='GB26':
            p=outer.z_project([old[2],height,old[0]],1)
            assert p['method']=='front-z-ray'
            for key in ['position','offset']:p[key]=[p[key][2],p[key][1],p[key][0]]
            p['face']=int(torso_ids[p['face']])
            p['method']='abdominal-outer-x-ray'
            assert abs(p['position'][0])<.2
            limits='第11肋游离端的垂线与侧卧体位'
        else:
            p=surface.z_project([old[0],height,old[2]],1)
            assert p['method']=='front-z-ray'
            limits='髂前上棘内侧' if id=='GB27' else '耻骨联合骨缘及旁开2.5寸'
        assert abs(p['position'][1]-height)<1e-9
        p.update(regionRule='shared-abdominal-level',sharedLevelRefs=[ref],proportionNote='已与当前'+{'CV8':'脐中','CV4':'关元','CV2':'曲骨'}[ref]+'体表参照统一高度；共享参照及'+limits+'仍待解剖核对，等高修正不代表完整定位通过。')
        data['points'][id]=p
    key = lambda p: tuple(round(float(v), 9) for v in p)
    known = {key(p['position']) for p in before.values()}
    moved = {key(before[id]['position']):data['points'][id]['position'] for id in targets}
    for id in ['GB26','GB27']:
        a=before[id]['position'];b=data['points'][id]['position']
        moved[key([-a[0],*a[1:]])]=[-b[0],*b[1:]]
    known |= {key([-p['position'][0],*p['position'][1:]]) for p in before.values()}
    def connect(a, b):
        a, b = np.array(a), np.array(b)
        count = max(1, int(np.ceil(np.linalg.norm(b-a)/.012)))
        path = [a.tolist()] + [surface.nearest(a+(b-a)*i/count)['position'] for i in range(1, count)] + [b.tolist()]
        return surface.surface_path(a, b) if any(np.linalg.norm(np.array(q)-p) > .025 for p, q in zip(path, path[1:])) else path
    changed = []
    for channel, paths in data['routes'].items():
        rebuilt, touched = [], False
        for path_index,path in enumerate(paths):
            if channel=='DAI' and path_index==2:
                rebuilt.append(path)
                continue
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
    assert set(changed)=={'GB','LR','DAI'}
    # Rebuild the entire waist loop in the new horizontal body section. Do not
    # merely move its acupoint endpoints and leave the old high loop in place.
    y=data['points']['GB26']['position'][1];tri=surface.vertices[surface.indices]
    segments=[]
    for face in tri:
        if np.max(np.abs(face[:,0]))>=.2 or not (face[:,1].min()<=y<face[:,1].max()):continue
        hits=[]
        for a,b in zip(face,np.roll(face,-1,axis=0)):
            if (a[1]<=y<b[1]) or (b[1]<=y<a[1]):hits.append(a+(b-a)*(y-a[1])/(b[1]-a[1]))
        if len(hits)==2:segments.append((hits[0],hits[1]))
    loop=[];center=np.array([0.,.02]);old_loop=data['routes']['DAI'][2]
    for old in old_loop[:-1]:
        direction=np.array([old[0],old[2]])-center;direction/=np.linalg.norm(direction);candidates=[]
        for a,b in segments:
            a2=a[[0,2]];delta=(b-a)[[0,2]];matrix=np.column_stack((direction,-delta))
            if abs(np.linalg.det(matrix))<1e-12:continue
            distance,t=np.linalg.solve(matrix,a2-center)
            if distance>0 and -.000001<=t<=1.000001:candidates.append(float(distance))
        assert candidates, old
        distance=max(candidates)+.003;point=center+distance*direction
        loop.append([float(point[0]),y,float(point[1])])
    loop[0]=data['points']['GB26']['position'];loop.append(loop[0].copy())
    assert all(abs(p[0])<.2 and abs(p[1]-y)<1e-9 for p in loop)
    data['routes']['DAI'][2]=loop
    data['abdominalSharedLevels']={'status':'provisional-shared-levels','references':targets,'referencePositions':{ref:before[ref]['position'] for ref in targets.values()},'previousPositions':{id:before[id]['position'] for id in targets},'changedRoutes':changed,'beltRing':{'method':'horizontal torso section radial intersections','height':y,'centerXZ':center.tolist(),'displayOffset':.003,'pointCount':len(loop),'note':'水平环腰示意，原文不指定精确三维曲线或方向；未当作解剖测量。'},'sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','clauses':{'GB26':'5.11.26','GB27':'5.11.27','LR12':'5.12.12'},'pdfPages':[38,41],'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'note':'共享现有脐与耻骨上缘推算参照；第11肋、髂前上棘、耻骨与相应寸距仍待核实。后脑共同骨性参照未确定，本批不改。'}
    return data
if __name__=='__main__':
    if len(sys.argv)!=4 or Path(sys.argv[3]).suffix!='.json':raise SystemExit('Usage: refine_abdominal_levels.py BASE.json BODY.glb OUTPUT.json')
    baseline,model,output=map(Path,sys.argv[1:]);data=json.loads(baseline.read_text());raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,i));output.write_text(json.dumps(result,separators=(',',':'))+'\n');print(json.dumps({id:result['points'][id]['position'] for id in result['abdominalSharedLevels']['references']}))
