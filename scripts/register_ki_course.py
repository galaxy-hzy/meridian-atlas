"""Build KI sole, heel and regional courses from pinned mesh; no point edits.
Usage: python register_ki_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import json, hashlib, sys
from register_human import read_mesh, Surface
registration, model, output = map(Path,sys.argv[1:4])
data = json.loads(registration.read_text())
raw, vertices, normals, indices = read_mesh(model)
assert hashlib.sha256(raw).hexdigest() == data['assetSha256']
source = json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision'] == '2520099'
surface = Surface(vertices,normals,indices)
point = lambda id: data['points'][id]['position']
def connect(nodes):
    result=[]
    for first,last in zip(nodes,nodes[1:]):
        path=surface.surface_path(first,last)
        result.extend(path if not result else path[1:])
    return result
base=data['routes']['KI'][0]
index=lambda id:next(i for i,p in enumerate(base) if p==point(id))
toe_seed=point('BL67').copy();toe_seed[1]-=.025
little=surface.nearest(toe_seed)['position']
heel=surface.nearest([point('KI3')[0]+.012,.035,-.075])['position']
leg=base[:index('KI3')+1]+connect([point('KI3'),heel,point('KI4')])[1:]+base[index('KI4')+1:index('KI10')+1]
thigh=[surface.nearest(seed)['position'] for seed in [[.11,.64,-.055],[.07,.78,-.04],[.035,.90,-.055]]]
kidney=[.055,1.13,-.015]; bladder=[0,.985,.035];lung=[.075,1.405,.025]
chest=point('CV17').copy();chest[2]-=.055
paths={
 'sole':{'label':'小趾下斜走足心','kind':'surface','points':connect([little,point('KI1')])},
 'leg':{'label':'足心循内踝、入跟中、上腨至腘内','kind':'surface','points':leg},
 'thigh':{'label':'上股内后廉至脊旁','kind':'surface','points':connect([point('KI10'),*thigh])},
 'kidney':{'label':'贯脊属肾','kind':'internal','points':[thigh[-1],[.015,1.0,-.02],kidney]},
 'bladder':{'label':'从肾络膀胱','kind':'internal','points':[kidney,bladder]},
 'lung':{'label':'从肾贯肝膈、入肺中','kind':'internal','points':[kidney,[.045,1.24,.03],[.018,1.30,.025],lung]},
 'tongue':{'label':'循喉咙、挟舌本','kind':'internal','points':[lung,[.016,1.575,.035],[.008,1.646,.09]]},
 'heart':{'label':'从肺络心、注胸中','kind':'internal','points':[lung,[0,1.345,.03],chest]},
}
result={'channel':'KI','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['KI'],'paths':paths,
 'nodes':[{'label':'小趾下','position':little},{'label':'跟中','position':heel},{'label':'属肾','position':kidney},{'label':'络膀胱','position':bladder},{'label':'舌本','position':[.008,1.646,.09]}],
 'surfaceReferences':['BL67','KI1','KI3','KI4','KI10','CV17'],
 'note':'起点为小趾下方表面参照，不把至阴归入肾经；足跟、股内后侧和脊旁按模型表面设置示意节点。深部肾、膀胱、肝、膈、肺、心和咽舌为区域关系，不是器官模型。腹胸经穴仍可点选，关闭本模式可看完整体表编号连线。足踝与股内后侧路线仍待骨肌标志精校。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
