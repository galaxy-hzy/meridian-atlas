"""Build the Ren-mai account in Qijing Bamai Kao, including bilateral face.
Usage: python register_cv_course.py MESH.json BODY.glb OUTPUT.json
No canonical point coordinates or modern point counts are changed.
"""
from pathlib import Path
import json,hashlib,sys
from register_human import read_mesh,Surface
registration,model,output=map(Path,sys.argv[1:4])
data=json.loads(registration.read_text())
raw,vertices,normals,indices=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
source=json.loads((Path(__file__).resolve().parents[1]/'lib/renmai-source.json').read_text())
assert source['revision']=='119706'
surface=Surface(vertices,normals,indices)
point=lambda id:data['points'][id]['position']
def connect(nodes):
 result=[]
 for a,b in zip(nodes,nodes[1:]):
  path=surface.surface_path(a,b);result.extend(path if not result else path[1:])
 return result
base=data['routes']['CV'][0]
index=lambda id:next(i for i,p in enumerate(base) if p==point(id))
origin=[0,.94,.025]
abdomen=[point('CV2')]+[[*point('CV'+str(i))[:2],point('CV'+str(i))[2]-.04] for i in range(3,15)]+[point('CV15')]
upper=surface.nearest([0,1.664,.18])['position'];lower=surface.nearest([0,1.644,.18])['position']
corner=surface.nearest([.03,1.654,.17])['position']
left_lip=connect([point('CV24'),corner,upper])
right_lip=[left_lip[0]]+[[-v[0],v[1],v[2]] for v in left_lip[1:-1]]+[left_lip[-1]]
face=connect([lower,corner,point('ST1')])
right_face=[face[0]]+[[-v[0],v[1],v[2]] for v in face[1:]]
paths={
 'origin':{'label':'少腹内、出会阴','kind':'internal','points':[origin,point('CV1')]},
 'emerge':{'label':'外出循曲骨毛际','kind':'surface','points':base[:index('CV2')+1]},
 'abdomen':{'label':'并行腹里、循关元至鸠尾参照','kind':'internal','points':abdomen},
 'chest':{'label':'循胸喉、上颐至承浆','kind':'surface','points':base[index('CV15'):]},
 'lipLeft':{'label':'左侧环唇','kind':'surface','points':left_lip},
 'lipRight':{'label':'右侧环唇','kind':'surface','points':right_lip},
 'gums':{'label':'下龈交区域、复出','kind':'internal','points':[upper,[0,1.650,.105],lower]},
 'faceLeft':{'label':'分行左面、至目下承泣','kind':'surface','points':face},
 'faceRight':{'label':'分行右面、至目下承泣','kind':'surface','points':right_face},
 'collateralLeft':{'label':'尾翳别络散腹（左侧示意）','kind':'internal','points':[point('CV15'),[.035,1.16,.11],[.06,1.09,.105]]},
 'collateralRight':{'label':'尾翳别络散腹（右侧示意）','kind':'internal','points':[point('CV15'),[-.035,1.16,.11],[-.06,1.09,.105]]},
}
result={'channel':'CV','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passage']+'\n'+source['collateral'],'paths':paths,
 'nodes':[{'label':'少腹内','position':origin},{'label':'下龈交区域','position':[0,1.650,.105]}],
 'surfaceReferences':['CV1','CV2','CV15','CV24','ST1'],
 'note':'采用《奇经八脉考》任脉篇的叙述；该篇自述《难经》《甲乙经》无循面以下之说，保留版本差异。古文“承桨”按现代承浆参照，原文不改；“下龈交”仅作区域，不增造穴号，也不等同于督脉龈交。原书称二十七穴不改现行任脉二十四穴；承泣仍属胃经。腹里深度与尾翳散腹左右形状为学习示意，不能据此取穴。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
