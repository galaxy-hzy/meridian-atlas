"""Refine lower-leg proportional levels on the pinned surface model.
Usage: python register_lower_leg.py BASE.json BODY.glb OUTPUT.json
Uses numpy. Keeps all unrelated point bindings and route segments unchanged.
The fixed knee/malleolar estimates and circumferential angles are not clinical
landmarks validated against bone or muscle layers.
"""
from pathlib import Path
import hashlib,json,sys,copy
import numpy as np
from register_human import Surface,read_mesh
SPEC_PATH=Path(__file__).resolve().parents[1]/'lib/lower-leg-spec.json'

def refine_lower_leg(data,surface,spec):
    digest=hashlib.sha256(SPEC_PATH.read_bytes()).hexdigest()
    if data.get('lowerLeg'):
        if data['lowerLeg']['specSha256']==digest:return data
        raise ValueError('Changed spec: regenerate from the unrefined baseline')
    if data['assetSha256']!=spec['assetSha256']:raise ValueError('Wrong model')
    before=copy.deepcopy(data['points']);land=spec['landmarks'];knee_y=land['kneeY']
    medial_y=before[land['medialTip']]['position'][1];lateral_y=before[land['lateralTip']]['position'][1]
    medial=(knee_y-medial_y)/spec['units']['medial'];lateral=(knee_y-lateral_y)/spec['units']['lateral']
    assert 0<medial<.05 and 0<lateral<.05
    a=np.array(land['ankleCenter']);b=np.array(land['kneeCenter'])
    def center(y):return a+(b-a)*(y-a[1])/(b[1]-a[1])
    def ray(origin,direction):
        direction=direction/np.linalg.norm(direction)
        ids=np.flatnonzero((surface.lo[:,1]<=origin[1]+1e-9)&(surface.hi[:,1]>=origin[1]-1e-9)&(surface.hi[:,0]>0))
        faces=surface.faces[ids];v0=faces[:,0];e1=faces[:,1]-v0;e2=faces[:,2]-v0
        h=np.cross(np.broadcast_to(direction,e2.shape),e2);det=np.einsum('ij,ij->i',e1,h)
        inv=np.divide(1.,det,out=np.zeros_like(det),where=np.abs(det)>1e-12)
        delta=origin-v0;u=np.einsum('ij,ij->i',delta,h)*inv;q=np.cross(delta,e1)
        v=(q@direction)*inv;t=np.einsum('ij,ij->i',e2,q)*inv
        valid=(np.abs(det)>1e-12)&(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)&(t>1e-7)
        candidates=np.flatnonzero(valid)
        if not len(candidates):raise ValueError('No same-leg horizontal surface intersection: '+str(origin))
        index=candidates[np.argmin(t[candidates])]
        binding=surface.finish(ids[index],np.array([1-u[index]-v[index],u[index],v[index]]),'lower-leg-horizontal-ray',origin)
        offset=direction*.003;position=np.array(binding['barycentric'])@surface.faces[binding['face']]+offset
        binding['offset']=offset.tolist();binding['position']=position.tolist()
        assert abs(position[1]-origin[1])<1e-8 and position[0]>0
        return binding
    def radial(y,angle):
        theta=np.deg2rad(angle);return ray(center(y),np.array([np.cos(theta),0,np.sin(theta)]))
    for id,rule in spec['rules'].items():
        kind=rule['kind'];old=before[id]['position']
        if kind=='knee':
            y=knee_y
            if 'view' in rule:
                binding=surface.z_project([old[0] if rule['view']=='front' else center(y)[0],y,old[2]],1 if rule['view']=='front' else -1)
            else:binding=radial(y,rule['angle'])
        elif kind in ['medial','lateral','below-knee']:
            y=(medial_y+rule['cun']*medial if kind=='medial' else lateral_y+rule['cun']*lateral if kind=='lateral' else knee_y-rule['cun']*lateral)
            binding=radial(y,rule['angle'])
        elif kind=='front-line':
            y=knee_y-rule['cun']*lateral
            first=np.array(data['points']['ST35']['position']);last=np.array(data['points']['ST41']['position'])
            seed=first+(last-first)*(first[1]-y)/(first[1]-last[1]);binding=surface.z_project(seed,1)
        elif kind=='behind':
            ref=np.array(data['points'][rule['reference']]['position']);origin=center(ref[1]);origin[2]=ref[2]-rule['cun']*medial
            binding=ray(origin,np.array([-1.,0,0]))
        elif kind=='medial-line':
            y=medial_y+rule['cun']*medial;first,last=[np.array(data['points'][p]['position']) for p in rule['line']]
            seed=first+(last-first)*(y-first[1])/(last[1]-first[1]);origin=center(y);origin[2]=seed[2];binding=ray(origin,np.array([-1.,0,0]))
        else:raise ValueError(kind)
        binding['regionRule']='lower-leg-proportional'
        binding['proportionNote']='已按小腿内侧15寸、外侧16寸基准约束纵向层级；骨肌边缘及端点仍为模型估计。'
        if rule.get('derived'):binding['proportionNote']+=' '+rule['derived']
        if rule.get('approximate'):binding['proportionNote']+=' 本条高度为原标准的约当关系。'
        data['points'][id]=binding
    key=lambda p:tuple(round(float(n),9) for n in p)
    known={key(v['position']) for v in before.values()}
    replacements={key(before[id]['position']):data['points'][id]['position'] for id in spec['rules']}
    def connect(first,last):
        first,last=np.array(first),np.array(last);n=max(1,int(np.ceil(np.linalg.norm(last-first)/.012)))
        points=[first.tolist()]+[surface.nearest(first+(last-first)*i/n)['position'] for i in range(1,n)]+[last.tolist()]
        if any(np.linalg.norm(np.array(q)-p)>.025 for p,q in zip(points,points[1:])):points=surface.surface_path(first,last)
        return points
    changed_routes=[]
    for channel,paths in data['routes'].items():
        if channel not in ['ST','SP','BL','KI','GB','LR']:continue
        rebuilt=[];touched=False
        for path in paths:
            if not any(key(p) in replacements for p in path):rebuilt.append(path);continue
            anchors=sorted({0,len(path)-1}|{i for i,p in enumerate(path) if key(p) in known})
            result=[replacements.get(key(path[0]),path[0])]
            for lo,hi in zip(anchors,anchors[1:]):
                first,last=path[lo],path[hi]
                segment=(connect(replacements.get(key(first),first),replacements.get(key(last),last)) if key(first) in replacements or key(last) in replacements else path[lo:hi+1])
                result.extend(segment[1:])
            rebuilt.append(result);touched=True
        if touched:data['routes'][channel]=rebuilt;changed_routes.append(channel)
    data['lowerLeg']={'specSha256':digest,'sourceSha256':spec['standardSha256'],'source':spec['source'],'kneeY':knee_y,'medialTipY':medial_y,'lateralTipY':lateral_y,'medialUnit':medial,'lateralUnit':lateral,'pointIds':list(spec['rules']),'changedPrimaryRoutes':changed_routes,'note':land['note']+' '+spec['note']}
    return data

if __name__=='__main__':
    baseline,model,output=map(Path,sys.argv[1:4]);data=json.loads(baseline.read_text());raw,v,n,i=read_mesh(model)
    if hashlib.sha256(raw).hexdigest()!=data['assetSha256']:raise ValueError('Model SHA mismatch')
    surface=Surface(v,n,i);result=refine_lower_leg(data,surface,json.loads(SPEC_PATH.read_text()))
    # Shared points moved; regenerate extraordinary route anchors as well.
    from register_vessel_routes import refine,SPEC_PATH as VESSEL_SPEC
    result=refine(result,surface,json.loads(VESSEL_SPEC.read_text()))
    output.write_text(json.dumps(result,separators=(',',':'))+'\n');print(json.dumps(result['lowerLeg'],ensure_ascii=False,indent=2))
