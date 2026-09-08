"""Refine only six extraordinary routes on the pinned existing point bindings.

python register_vessel_routes.py BINDINGS.json BODY.glb OUTPUT.json
Uses the same numpy Surface implementation as register_human.py. Preserve the
original point records, fourteen regular routes, model identity and guides.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from register_human import read_mesh, Surface


def refine(data, surface, specs):
    if data['assetSha256'] != specs['assetSha256']:
        raise ValueError('Vessel route specification belongs to a different model')
    metadata={}
    def bind_node(node, mirror=False):
        p=np.array(data['points'][node]['position'] if isinstance(node,str) else surface.nearest(node['position'])['position'])
        if mirror:p[0]*=-1
        return p
    def ring_position(y, angle):
        # Cast outward from the torso axis, taking the first exit surface.
        # An outside-nearest query can jump onto the hanging forearm.
        origin=np.array([0.,y,0.]); direction=np.array([np.cos(angle),0.,np.sin(angle)])
        ids=np.flatnonzero((surface.lo[:,1]<=y)&(surface.hi[:,1]>=y))
        faces=surface.faces[ids]; a=faces[:,0]; e1=faces[:,1]-a; e2=faces[:,2]-a
        h=np.cross(np.broadcast_to(direction,e2.shape),e2)
        det=np.einsum('ij,ij->i',e1,h); inv=np.divide(1.,det,out=np.zeros_like(det),where=np.abs(det)>1e-12)
        delta=origin-a; u=np.einsum('ij,ij->i',delta,h)*inv
        q=np.cross(delta,e1); v=(q@direction)*inv; t=np.einsum('ij,ij->i',e2,q)*inv
        valid=(np.abs(det)>1e-12)&(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)&(t>0)
        if not np.any(valid):raise ValueError('Torso ring ray misses surface')
        candidates=np.flatnonzero(valid); index=candidates[np.argmin(t[candidates])]
        return np.array(surface.finish(ids[index],np.array([1-u[index]-v[index],u[index],v[index]]),'torso-radial-exit',origin)['position'])
    def connect(anchors):
        result=[anchors[0].tolist()]
        for a,b in zip(anchors,anchors[1:]):
            count=max(1,int(np.ceil(np.linalg.norm(b-a)/.012)))
            segment=[a.tolist()]+[surface.nearest(a+(b-a)*i/count)['position'] for i in range(1,count)]+[b.tolist()]
            if any(np.linalg.norm(np.array(q)-p)>.025 for p,q in zip(segment,segment[1:])):
                segment=surface.surface_path(a,b)
            result.extend(segment[1:])
        return result
    for channel,spec in specs['channels'].items():
        routes=[];info=[]
        for route in spec['paths']:
            if 'ringAt' in route:
                start=np.array(data['points'][route['ringAt']]['position']); y=start[1]
                # Torso plane ring, intentionally non-directional; not a
                # guessed clinical loop or a ring wrapped around the arms.
                angle0=np.arctan2(start[2],start[0]);anchors=[]
                for angle in np.linspace(angle0,angle0+np.pi*2,97):
                    anchors.append(ring_position(y,angle))
                anchors[0]=start;anchors[-1]=start
                nodes=[route['ringAt']]
            else:
                nodes=route['nodes'];anchors=[bind_node(n,route.get('mirror',False)) for n in nodes]
            positions=connect(anchors)
            routes.append(positions)
            info.append({k:route[k] for k in ['label','kind','closed','animate','mirror'] if k in route} | {'anchorIds':[n for n in nodes if isinstance(n,str)]})
        data['routes'][channel]=routes
        metadata[channel]={'note':spec['note'],'paths':info,'sequential':channel!='DAI'}
    data['vesselRoutes']={'specSha256':hashlib.sha256(SPEC_PATH.read_bytes()).hexdigest(),'channels':metadata}
    return data


SPEC_PATH=Path(__file__).resolve().parents[1]/'lib/vessel-route-specs.json'
if __name__=='__main__':
    original,model,output=map(Path,sys.argv[1:4])
    data=json.loads(original.read_text());raw,vertices,normals,indices=read_mesh(model)
    if hashlib.sha256(raw).hexdigest()!=data['assetSha256']:raise ValueError('Body model hash mismatch')
    result=refine(data,Surface(vertices,normals,indices),json.loads(SPEC_PATH.read_text()))
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({c:{'paths':len(paths),'vertices':sum(map(len,paths))} for c,paths in result['routes'].items() if c in result['vesselRoutes']['channels']},indent=2))
