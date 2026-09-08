"""Constrain Bizhong to a wrist/elbow midpoint plane on the pinned mesh.
Usage: python refine_forearm_midpoint.py BASE.json MODEL_DIR OUTPUT.json
Joint centers remain estimates, not validated anatomical crease locations.
"""
from pathlib import Path
import json, hashlib, sys
import numpy as np
from register_human import Surface, read_mesh

def refine(data, model_dir):
    raw, vertices, normals, indices = read_mesh(model_dir / 'body-learning-pose.glb')
    if hashlib.sha256(raw).hexdigest() != data['assetSha256']:
        raise ValueError('Model mismatch')
    meta = json.loads((model_dir / 'model-provenance.json').read_text())
    wrist, elbow = [np.array(meta['joints']['joint-l-' + key]) for key in ['hand', 'elbow']]
    axis = elbow - wrist
    direction = np.array([0., 0., 1.])
    direction -= axis * np.dot(direction, axis) / np.dot(axis, axis)
    direction /= np.linalg.norm(direction)
    origin = (wrist + elbow) / 2
    surface = Surface(vertices, normals, indices)
    f = surface.faces; e1 = f[:,1]-f[:,0]; e2 = f[:,2]-f[:,0]
    h = np.cross(np.broadcast_to(direction,e2.shape),e2)
    det = np.einsum('ij,ij->i',e1,h)
    inv = np.divide(1.,det,out=np.zeros_like(det),where=np.abs(det)>1e-12)
    delta = origin-f[:,0]; u = np.einsum('ij,ij->i',delta,h)*inv
    q = np.cross(delta,e1); v = (q@direction)*inv; t = np.einsum('ij,ij->i',e2,q)*inv
    valid = (np.abs(det)>1e-12)&(u>=0)&(v>=0)&(u+v<=1)&(t>0)&(t<.1)
    ids = np.flatnonzero(valid)
    if not len(ids): raise ValueError('No local anterior forearm surface')
    i = int(ids[np.argmin(t[ids])]); bary = np.array([1-u[i]-v[i],u[i],v[i]])
    binding = surface.finish(i,bary,'forearm-midpoint-ray',origin)
    binding['offset'] = (direction*.003).tolist()
    binding['position'] = (bary@surface.faces[i]+direction*.003).tolist()
    binding['regionRule'] = 'forearm-midpoint'
    binding['proportionNote'] = '腕肘模型标志之间取中点；已约束纵向比例，横纹与肌腱边界仍待解剖复核。'
    old = data['points']['M-UE30']['position']; new = binding['position']
    fraction = float(np.dot(np.array(new)-wrist,axis)/np.dot(axis,axis))
    assert abs(fraction-.5)<1e-9
    data['points']['M-UE30'] = binding
    for paths in data['routes'].values():
        for path in paths:
            for j,p in enumerate(path):
                if p == old: path[j] = new
    data['forearmMidpoint'] = {'pointId':'M-UE30','wrist':wrist.tolist(),'elbow':elbow.tolist(),'fraction':fraction,'previousPosition':old,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    return data

if __name__ == '__main__':
    baseline, model, output = map(Path,sys.argv[1:4])
    data = refine(json.loads(baseline.read_text()),model)
    output.write_text(json.dumps(data,separators=(',',':'))+'\n')
    print(json.dumps(data['forearmMidpoint'],ensure_ascii=False))
