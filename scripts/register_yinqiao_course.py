"""Yin-qiao regional course; preserve calibrated leg, no canonical point edits.
Usage: python register_yinqiao_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
from register_human import read_mesh,Surface
registration,model,output=map(Path,sys.argv[1:4])
data=json.loads(registration.read_text());raw,vertices,normals,indices=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
source=json.loads((Path(__file__).resolve().parents[1]/'lib/yinqiao-source.json').read_text());assert source['revision']=='119701'
surface=Surface(vertices,normals,indices);point=lambda id:data['points'][id]['position']
def connect(nodes):
 result=[]
 for a,b in zip(nodes,nodes[1:]):
  part=surface.surface_path(a,b);result.extend(part if not result else part[1:])
 return result
leg=data['routes']['YINQIAO'][0]
pelvis=[.025,.96,.035];chest=[.04,1.36,.035]
throat=surface.nearest([.015,1.575,.085])['position']
renying=point('ST9').copy();renying[0]-=.012;renying=surface.nearest(renying)['position']
cheek=[.025,1.665,.11]
paths={
 'leg':{'label':'跟中、照海、交信、股内侧','kind':'surface','points':leg},
 'pelvis':{'label':'入阴区域','kind':'internal','points':[leg[-1],pelvis]},
 'chest':{'label':'上循胸里、入缺盆','kind':'internal','points':[pelvis,[.035,1.12,.045],chest,point('ST12')]},
 'neck':{'label':'出人迎之前、至喉咙','kind':'surface','points':connect([point('ST12'),renying,throat])},
 'cheek':{'label':'交贯冲脉、入頄内廉','kind':'internal','points':[throat,[.018,1.59,.05],cheek]},
 'eye':{'label':'属目内眦、会睛明','kind':'internal','points':[cheek,[.018,1.695,.125],point('BL1')]},
}
result={'channel':'YINQIAO','assetSha256':data['assetSha256'],'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},'passage':source['passage'],'paths':paths,
 'nodes':[{'label':'入阴区域','position':pelvis},{'label':'胸里','position':chest},{'label':'頄内廉区域','position':cheek}],
 'surfaceReferences':['KI2','KI6','KI8','ST12','ST9','BL1'],
 'note':'按《奇经八脉考》医家循行段示意，保留原足踝股内侧路径，胸里改为体内区域。原文“足少阳然谷”保留，现代然谷 KI2 仍属肾经；起点是跟中区域而非然谷穴。人迎之前与頄内廉为区域参照，不把人迎作为沿线交会穴。原文“会于睛明而上行”未明确后续终点，本图暂止于睛明，不擅接脑部。交贯冲脉为文字关系提示，未声称两脉具有实测交点。盆腔、胸里、颊部深浅及性别差异未作解剖校准；后文丹家路线不混入本段。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:len(v['points']) for k,v in paths.items()})
