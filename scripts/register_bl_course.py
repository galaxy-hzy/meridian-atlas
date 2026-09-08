"""Build BL cranial/visceral branches around the existing two back routes.
Usage: python register_bl_course.py MESH.json BODY.glb OUTPUT.json
Canonical point coordinates are preserved; deep nodes are study regions.
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
inner,outer=data['routes']['BL']
index=lambda route,id:next(i for i,p in enumerate(route) if p==point(id))
crown=point('GV20');brain=[.015,1.785,.015];kidney=[.055,1.13,-.015];bladder=[0,.985,.035]
paths={
 'head':{'label':'目内眦上额、交巅','kind':'surface','points':inner[:index(inner,'BL7')+1]+surface.surface_path(point('BL7'),crown)[1:]},
 'ear':{'label':'从巅至耳上角','kind':'surface','points':surface.surface_path(crown,point('TE20'))},
 'brain':{'label':'从巅入络脑、还出','kind':'internal','points':[crown,brain,point('BL8')]},
 'nape':{'label':'还出下项','kind':'surface','points':inner[index(inner,'BL8'):index(inner,'BL10')+1]},
 'back':{'label':'循肩髆内、挟脊抵腰中','kind':'surface','points':inner[index(inner,'BL10'):index(inner,'BL23')+1]},
 'viscera':{'label':'入循膂、络肾属膀胱','kind':'internal','points':[point('BL23'),[.018,1.15,-.005],kidney,bladder]},
 'innerLower':{'label':'腰中下挟脊、贯臀入腘','kind':'surface','points':inner[index(inner,'BL23'):]},
 'outer':{'label':'贯胛挟脊、过髀枢、下合腘中','kind':'surface','points':outer[:index(outer,'BL40')+1]},
 'tail':{'label':'腘中贯腨、外踝后至小趾外侧','kind':'surface','points':outer[index(outer,'BL40'):]},
}
result={'channel':'BL','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['BL'],'paths':paths,
 'nodes':[{'label':'络脑','position':brain},{'label':'络肾','position':kidney},{'label':'属膀胱','position':bladder}],
 'surfaceReferences':['BL7','GV20','TE20','BL8','BL10','BL23','BL40'],
 'note':'脑、循膂、肾和膀胱是区域关系示意，不是器官实体。百会、角孙、络却、天柱、肾俞及委中作现代头顶、耳角、出项、腰中及腘窝参照，原文未逐字指定这些穴名。两条背部路线在腘窝会合后共用小腿至足端路线；动画等两路到达后续行，仅为学习时序。六十七穴及原背腿路线坐标不变，深部解剖待精校。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
