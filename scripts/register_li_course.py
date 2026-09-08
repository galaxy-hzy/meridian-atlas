"""Build LI study branches, including contralateral facial termination.
Usage: python register_li_course.py MESH.json BODY.glb OUTPUT.json
Requires numpy; deep regions are explicitly authored schematic coordinates.
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
        path = surface.surface_path(first,last)
        result.extend(path if not result else path[1:])
    return result

base = data['routes']['LI'][0]
end = next(i for i,p in enumerate(base) if p == point('LI16'))
stem = base[:end+1] + connect([point('LI16'),point('GV14'),point('ST12')])[1:]
cheek = surface.nearest([.045,1.615,.14])['position']
teeth = [.018,1.617,.105]
opposite_nose = [-point('LI20')[0],*point('LI20')[1:]]
paths = {
    'stem': {'label':'食指、手臂、肩背至缺盆', 'kind':'surface', 'points':stem},
    'internal': {'label':'缺盆络肺、下膈、属大肠', 'kind':'internal', 'points':[point('ST12'),[.07,1.405,.025],[.025,1.30,.025],[0,1.04,.015]]},
    'neck': {'label':'缺盆循颈上颊', 'kind':'surface', 'points':connect([point('ST12'),point('LI17'),point('LI18'),cheek])},
    'oral': {'label':'入下齿、还出挟口', 'kind':'internal', 'points':[cheek,teeth,point('ST4')]},
    'face': {'label':'口旁交人中、至对侧鼻旁', 'kind':'surface', 'points':connect([point('ST4'),point('LI19'),point('GV26'),opposite_nose])},
}
result = {
    'channel':'LI','assetSha256':data['assetSha256'],
    'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
    'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
    'passage':source['passages']['LI'],'paths':paths,
    'nodes':[{'label':'络肺','position':[.07,1.405,.025]},{'label':'属大肠','position':[0,1.04,.015]}, {'label':'下齿','position':teeth}],
    'surfaceReferences':['LI16','GV14','ST12','LI17','LI18','ST4','LI19','GV26','LI20'],
    'note':'依据原文“左之右，右之左”显示头面交叉，左右两条支脉分别止于对侧鼻旁。大椎、缺盆、地仓、水沟等只作现代体表参照，不改变穴位归属。深部及下齿节点为区域示意，未建器官、牙列或校准精确解剖位置。',
}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'paths':{k:len(v['points']) for k,v in paths.items()},'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
