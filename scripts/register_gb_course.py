"""Build GB ear/visceral/hip-merge and great-toe branches on pinned geometry.
Usage: python register_gb_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
from register_human import read_mesh,Surface
registration,model,output=map(Path,sys.argv[1:4])
data=json.loads(registration.read_text())
raw,vertices,normals,indices=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
source=json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision']=='2520099'
surface=Surface(vertices,normals,indices)
point=lambda id:data['points'][id]['position']
def connect(nodes):
    result=[]
    for first,last in zip(nodes,nodes[1:]):
        path=surface.surface_path(first,last)
        result.extend(path if not result else path[1:])
    return result
base=data['routes']['GB'][0]
index=lambda id:next(i for i,p in enumerate(base) if p==point(id))
ear=point('TE21').copy();ear[0]-=.014
behind_eye=point('GB1').copy();behind_eye[2]-=.012
pubic=surface.nearest([.025,.92,.135])['position']
nail=surface.nearest([(point('LR1')[0]+point('SP1')[0])/2,.028,(point('LR1')[2]+point('SP1')[2])/2])['position']
hair=surface.nearest([nail[0],nail[1]+.006,nail[2]-.022])['position']
paths={
 'head':{'label':'目外眦上头角、下耳后','kind':'surface','points':base[:index('GB12')+1]},
 'ear':{'label':'耳后入耳中、出耳前至外眦后','kind':'internal','points':[point('GB12'),ear,point('GB2'),behind_eye]},
 'neck':{'label':'循颈肩、入缺盆','kind':'surface','points':base[index('GB12'):index('GB21')+1]+connect([point('GB21'),point('ST12')])[1:]},
 'face':{'label':'别外眦、下大迎经颧颊、合缺盆','kind':'surface','points':connect([point('GB1'),point('ST5'),point('SI18'),point('ST6'),point('ST12')])},
 'viscera':{'label':'下胸贯膈、络肝属胆、出气街','kind':'internal','points':[point('ST12'),[.04,1.37,.035],[.025,1.30,.025],[.075,1.24,.025],[.075,1.22,.04],[.10,1.13,.025],point('ST30')]},
 'pelvis':{'label':'绕毛际、横入髀厌','kind':'surface','points':connect([point('ST30'),pubic,point('GB30')])},
 'trunk':{'label':'缺盆下腋、循胸季胁、合髀厌','kind':'surface','points':connect([point('ST12'),point('GB22')])+base[index('GB22')+1:index('GB30')+1]},
 'leg':{'label':'髀阳、膝外至外踝前、足跗','kind':'surface','points':base[index('GB30'):index('GB41')+1]},
 'fourth':{'label':'足跗至第四趾端','kind':'surface','points':base[index('GB41'):]},
 'great':{'label':'别足跗、至大趾端、贯甲出三毛','kind':'surface','points':connect([point('GB41'),point('LR3'),point('LR2'),point('SP1'),nail,hair])},
}
result={'channel':'GB','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['GB'],'paths':paths,
 'nodes':[{'label':'耳中','position':ear},{'label':'络肝','position':[.075,1.24,.025]},{'label':'属胆','position':[.075,1.22,.04]},{'label':'出三毛','position':hair}],
 'surfaceReferences':['GB12','TE21','GB2','GB21','ST12','ST5','SI18','ST6','ST30','GB22','GB30','GB41','LR3','LR2','SP1','LR1'],
 'note':'耳中、肝胆等为区域关系；外眦后、毛际、爪甲及三毛是模型参照，未建耳内、甲床或毛发解剖。现代参照穴不改变归属。面颊及体内支路与胸胁直行路线在髀部会合，足背再分向第四趾与大趾；“还贯爪甲”保留为大趾端返回甲面参照的示意。四十四穴与既有小腿坐标不变，细部定位待校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
