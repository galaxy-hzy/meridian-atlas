"""Build schematic SI branches from pinned surface geometry; does not move acupoints.
Usage: python register_si_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import sys, json, hashlib
from register_human import read_mesh, Surface
registration, model, output = map(Path, sys.argv[1:4])
data = json.loads(registration.read_text())
raw, vertices, normals, indices = read_mesh(model)
assert hashlib.sha256(raw).hexdigest() == data['assetSha256']
source = json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision'] == '2520099'
surface = Surface(vertices, normals, indices)
point = lambda id: data['points'][id]['position']
def connect(nodes):
    result = []
    for first, last in zip(nodes, nodes[1:]):
        path = surface.surface_path(first, last)
        result.extend(path if not result else path[1:])
    return result
base = data['routes']['SI'][0]
end = next(i for i,p in enumerate(base) if p == point('SI15'))
ear = point('SI19').copy(); ear[0] -= .012
nose = surface.nearest([.02,1.699,.17])['position']
paths = {
 'stem': {'label':'小指沿臂绕肩胛、交肩至缺盆','kind':'surface','points':base[:end+1]+connect([point('SI15'),point('ST12')])[1:]},
 'internal': {'label':'缺盆络心、循咽下膈、抵胃属小肠','kind':'internal','points':[point('ST12'),[0,1.345,.03],[.016,1.575,.035],[.015,1.30,.025],[0,1.225,.035],[0,1.095,.015]]},
 'neck': {'label':'缺盆循颈上颊','kind':'surface','points':connect([point('ST12'),point('SI16'),point('SI17'),point('SI18')])},
 'outer': {'label':'颊至目外眦','kind':'surface','points':connect([point('SI18'),point('GB1')])},
 'ear': {'label':'目外眦返向耳前','kind':'surface','points':connect([point('GB1'),point('SI19')])},
 'earDepth': {'label':'入耳中','kind':'internal','points':[point('SI19'),ear]},
 'inner': {'label':'别颊、抵鼻至目内眦','kind':'surface','points':connect([point('SI18'),nose,point('BL1')])},
 'cheek': {'label':'目内眦斜络于颧','kind':'surface','points':connect([point('BL1'),point('SI18')])},
}
result = {'channel':'SI','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['SI'],'paths':paths,
 'nodes':[{'label':'络心','position':[0,1.345,.03]},{'label':'属小肠','position':[0,1.095,.015]},{'label':'耳中','position':ear}],
 'surfaceReferences':['SI15','ST12','SI16','SI17','SI18','GB1','SI19','BL1'],
 'note':'深部心、咽、膈、胃、小肠和耳中为区域示意，非器官解剖。缺盆、颧髎、瞳子髎、听宫、睛明仅作现代体表参照，不改变穴位归属；颧部连接不表示再次循环。原转录“䪼 䪼”保留，未解释为两个节点。路线仍待精细解剖校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
