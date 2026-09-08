"""Move five misplaced tip seeds to same-source proximal nail-border references.
Usage: refine_nail_roots.py BASE.json BODY.glb NAILS.json OUTPUT.json
Uses the standard's extended lateral/base border intersection description.
Material borders are model references, not clinically validated nail folds.
"""
from pathlib import Path
import copy
import hashlib
import json
import sys
import numpy as np
from register_human import Surface, read_mesh

TARGETS = {'LU11':(1,1), 'LI1':(2,1), 'HT9':(5,1), 'SI1':(5,-1), 'TE1':(4,-1)}

def refine(data,surface,nails):
    assert 'nailRootReferences' not in data, 'Use the preserved baseline'
    assert nails['retainedAssetSha256']==data['assetSha256']
    assert nails['sourceObjSha256']=='8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c'
    assert nails['verification']['all13380PosedVerticesReproduceExactly']
    left={n['digit']:n for n in nails['nails'] if n['side']=='l'}
    centers=np.array([left[d]['centroid'] for d in range(1,6)])
    assignment=np.argmin(np.linalg.norm(surface.vertices[:,None,:]-centers[None,:,:],axis=2),axis=1)+1
    before=copy.deepcopy(data['points']);records={}
    for point_id,(digit,side) in TARGETS.items():
        nail=left[digit];ids=nail['vertices'];boundary=nail['boundaryVertices'];center=np.array(nail['centroid'])
        patch=surface.vertices[ids]-center
        _,eig=np.linalg.eigh(patch.T@patch);normal=eig[:,0]
        if np.dot(normal,surface.vertex_normals[ids].mean(axis=0))<0:normal=-normal
        distal=np.array(nail['distalAxis']);distal-=normal*np.dot(distal,normal);distal/=np.linalg.norm(distal)
        radial=np.cross(distal,normal);radial/=np.linalg.norm(radial)
        frame=np.array([radial,distal,normal]);local=(surface.vertices-center)@frame.T
        lateral_vertex=boundary[int(np.argmax(side*local[boundary,0]))]
        base_vertex=boundary[int(np.argmin(local[boundary,1]))]
        xy=np.array([local[lateral_vertex,0],local[base_vertex,1],0.])
        # Exclude adjacent digits, then preserve the line intersection in the
        # nail plane while projecting onto this finger's dorsal skin.
        face_ids=np.flatnonzero(np.all(assignment[surface.indices]==digit,axis=1)&np.all(np.linalg.norm(surface.faces-center,axis=2)<.03,axis=1))
        assert len(face_ids)>10
        local_surface=Surface(local,surface.vertex_normals@frame.T,surface.indices[face_ids])
        binding=local_surface.z_project(xy,1)
        assert binding['method']=='front-z-ray', 'Do not fall back to another part of the finger'
        binding['face']=int(face_ids[binding['face']])
        binding['position']=(np.array(binding['position'])@frame+center).tolist()
        binding['offset']=(np.array(binding['offset'])@frame).tolist()
        binding['method']='nail-frame-dorsal-ray'
        skin=np.array(binding['position'])-binding['offset']
        old_skin=np.array(before[point_id]['position'])-before[point_id]['offset']
        old_local=(old_skin-center)@frame.T;new_local=(skin-center)@frame.T
        assert old_local[1]>0 and new_local[1]<0, 'Correct distal-to-proximal placement only'
        assert np.max(np.abs(new_local[:2]-xy[:2]))<1e-10
        assert .004<np.linalg.norm(skin-old_skin)<.03
        binding.update(regionRule='provisional-nail-root',proportionNote='已按与底模完全同源的指甲区域，校正到甲侧缘与基底缘延长线交点附近的皮肤；原标记偏向甲尖。此为本模型甲根方向修正，0.1指寸距离及真实甲沟边界仍待核对。')
        data['points'][point_id]=binding
        records[point_id]={'digit':digit,'side':'radial' if side>0 else 'ulnar',
            'lateralBorderVertex':lateral_vertex,'proximalBorderVertex':base_vertex,
            'nailVertices':ids,'frameRows':frame.tolist(),'center':center.tolist(),
            'intersectionLocalXY':xy[:2].tolist(),'surfacePosition':skin.tolist(),
            'previousBinding':before[point_id],'surfaceSeparationMm':float(np.linalg.norm(skin-old_skin)*1000),
            'reviewStatus':'provisional-nail-root-reference'}

    key=lambda p:tuple(round(float(v),9) for v in p)
    known={key(p['position']) for p in before.values()}
    moved={key(before[id]['position']):data['points'][id]['position'] for id in TARGETS}
    def connect(a,b):
        return surface.surface_path(a,b)
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
    assert set(changed)=={'LU','LI','HT','SI','TE'}
    assert data['points']['PC9']==before['PC9'] and data['points']['EX-UE11']==before['EX-UE11']
    data['nailRootReferences']={'status':'provisional-model-nail-roots','points':records,
        'nailGroupSource':{k:nails[k] for k in ['sourceCommit','sourceFile','sourceUrl','sourceGroupsSha256','sourceObjSha256']},
        'source':'GB/T 12346-2021','clauses':{'LU11':'5.1.11','LI1':'5.2.1','HT9':'5.5.9','SI1':'5.6.1','TE1':'5.10.1'},
        'sourceSha256':'777643c116fb3cd543a6a632a3ad36c4bfbedd8880aced0c6979a877694d7692',
        'changedRoutes':changed,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'limitation':'Artist-specified nail material boundaries correspond to the retained mesh; true nail-fold borders and 0.1 F-cun offset remain unverified. No retained body mesh changes.'}
    return data

if __name__=='__main__':
    if len(sys.argv)!=5 or Path(sys.argv[4]).suffix!='.json':raise SystemExit('Usage: refine_nail_roots.py BASE.json BODY.glb NAILS.json OUTPUT.json')
    baseline,model,nails_path,output=map(Path,sys.argv[1:]);data=json.loads(baseline.read_text());raw,v,n,t=read_mesh(model)
    assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    result=refine(data,Surface(v,n,t),json.loads(nails_path.read_text()))
    with output.open('x') as f:f.write(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({id:{'position':p['surfacePosition'],'moveMm':p['surfaceSeparationMm']} for id,p in result['nailRootReferences']['points'].items()}))
