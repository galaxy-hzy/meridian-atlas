"""Build LR regional genital, liver, eye, crown, lip and lung course.
Usage: python register_lr_course.py MESH.json BODY.glb OUTPUT.json
All deep coordinates are study regions; canonical points are not modified.
"""
from pathlib import Path
import json, hashlib, sys
from register_human import read_mesh, Surface
registration,model,output=map(Path,sys.argv[1:4])
data=json.loads(registration.read_text())
raw,vertices,normals,indices=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
source=json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision']=='2520099'
surface=Surface(vertices,normals,indices)
point=lambda id:data['points'][id]['position']
base=data['routes']['LR'][0]
end=next(i for i,p in enumerate(base) if p==point('LR12'))
liver=[.075,1.24,.025]; gall=[.075,1.22,.04]
brow=point('EX-HN4');below=point('ST1')
eye=[(brow[0]+below[0])/2,(brow[1]+below[1])/2,(brow[2]+below[2])/2-.045]
forehead=surface.nearest([.025,1.78,.15])['position']
lip_top=[0,1.664,.147];lip_bottom=[0,1.644,.147]
paths={
 'stem':{'label':'大趾循足背、腿内侧至腹股沟','kind':'surface','points':base[:end+1]},
 'liver':{'label':'过阴器、抵小腹、挟胃属肝','kind':'internal','points':[point('LR12'),[.015,.90,.065],[.012,1.02,.065],[.03,1.22,.035],liver]},
 'gall':{'label':'从肝络胆','kind':'internal','points':[liver,gall]},
 'eye':{'label':'贯膈布胁肋、喉后颃颡连目系','kind':'internal','points':[gall,[.025,1.30,.025],[.13,1.36,.035],[.01,1.575,.015],[.015,1.68,.055],eye]},
 'forehead':{'label':'目系上出额','kind':'internal','points':[eye,forehead]},
 'crown':{'label':'上额与督脉会于巅','kind':'surface','points':surface.surface_path(forehead,point('GV20'))},
 'cheek':{'label':'目系下颊里','kind':'internal','points':[eye,[.035,1.673,.11],lip_top]},
 'lips':{'label':'环唇内','kind':'internal','points':[lip_top,[.026,1.654,.147],lip_bottom]},
 'lung':{'label':'从肝别贯膈、上注肺','kind':'internal','points':[liver,[.025,1.30,.025],[.075,1.405,.025]]},
}
result={'channel':'LR','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['LR'],'paths':paths,
 'nodes':[{'label':'属肝','position':liver},{'label':'络胆','position':gall},{'label':'目系','position':eye},{'label':'环唇内','position':lip_bottom}],
 'surfaceReferences':['LR12','EX-HN4','ST1','GV20'],
 'note':'阴器、小腹、脏腑、喉后、颃颡和目系为区域示意，不是器官实体或神经模型。环唇内以左右半弧表示，动画不表示实测方向或反复绕唇循环。急脉、眉中、眶下和百会只作现代位置参照，不改变穴位归属。十四穴仍可点选，关闭模式查看完整体表编号连线；深部与骨肌定位仍待精校。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
