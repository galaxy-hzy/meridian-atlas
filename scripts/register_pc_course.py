"""Build PC regional and palm branches without moving canonical points.
Usage: python register_pc_course.py MESH.json BODY.glb OUTPUT.json
Requires NumPy for mesh-constrained palm branch generation.
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
base = data['routes']['PC'][0]
fork = next(i for i,p in enumerate(base) if p == point('PC8'))
chest = [0,1.385,.025]; pericardium = [.018,1.355,.035]
paths = {
 'stem': {'label':'胸中出属心包络','kind':'internal','points':[chest,pericardium]},
 'viscera': {'label':'下膈历络三焦','kind':'internal','points':[pericardium,[.018,1.30,.025],[0,1.20,.015],[0,1.07,.015]]},
 'emerge': {'label':'循胸出胁、下腋三寸','kind':'internal','points':[pericardium,[.13,1.36,.065],point('PC1')]},
 'arm': {'label':'上抵腋下、沿臂入掌中','kind':'surface','points':base[:fork+1]},
 'middle': {'label':'循中指出其端','kind':'surface','points':base[fork:]},
 'ring': {'label':'别掌中、循无名指出其端','kind':'surface','points':surface.surface_path(point('PC8'),point('TE1'))},
}
result = {'channel':'PC','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['PC'],'paths':paths,
 'nodes':[{'label':'心包络','position':pericardium},{'label':'历络三焦','position':[0,1.20,.015]}],
 'surfaceReferences':['PC1','PC8','PC9','TE1'],
 'note':'心包络、膈、三焦和出胁段为古籍区域关系示意，不是器官外形；三焦未建为三个实体器官。天池、劳宫、中冲和关冲只作现代位置参照，不表示古籍逐字指定这些穴名。无名指支路从掌中分出，不从中指尖接向无名指；不改变关冲归属。人体比例及深部坐标仍待校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
