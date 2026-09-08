"""Unify explicitly shared point positions and the knee-eye level.
Usage: python refine_shared_groups.py BASE.json BODY.glb OUTPUT.json
Keeps the current ST35 reference. No new anatomical landmark is inferred.
"""
from pathlib import Path
import copy,hashlib,json,sys
import numpy as np
from register_human import read_mesh,Surface

baseline,model,output=map(Path,sys.argv[1:4])
data=json.loads(baseline.read_text())
assert 'sharedGroups' not in data, 'Use the preserved baseline'
raw,v,n,i=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
surface=Surface(v,n,i);before=copy.deepcopy(data['points'])
inner=before['EX-LE4']['position'];outer=before['ST35']['position']
binding=surface.z_project([inner[0],outer[1],inner[2]],1)
assert binding['method']=='front-z-ray'
assert abs(binding['position'][0]-inner[0])<1e-9
assert abs(binding['position'][1]-outer[1])<1e-9
assert binding['position'][0]<outer[0]
assert np.linalg.norm(np.array(binding['position'])-inner)<.025
binding.update(regionRule='shared-knee-level', proportionNote='内膝眼已与现有犊鼻参照统一高度，保留原横向位置；实际髌韧带边缘和凹陷仍待解剖校核。')
data['points']['EX-LE4']=binding
links={'EX-LE5':{0:'EX-LE4',1:'ST35'},'EX-UE9':{3:'TE2'},'EX-UE11':{2:'PC9'},'EX-LE10':{0:'LR2',1:'ST44',3:'GB43'}}
keys=['face','barycentric','offset','position','method','seedDistance']
for group,refs in links.items():
 entry=data['points'][group]
 for index,ref in refs.items():
  shared=data['points'][ref]
  entry['groupBindings'][index]={key:copy.deepcopy(shared[key]) for key in keys}
 entry['positions']=[b['position'] for b in entry['groupBindings']]
 entry.update({key:copy.deepcopy(entry['groupBindings'][0][key]) for key in keys})
 entry['sharedAnchorRefs']={str(index):ref for index,ref in refs.items()}
 entry['proportionNote']='穴组中与已有经穴或奇穴同位的标记已共用对应模型坐标；仍保留各自名称、目录归属与文献资料。同位关系不代表其他组员或解剖定位均已校准。'
data['sharedGroups']={'source':'GB/T 40997-2021 PDF 11；膝眼合称及外膝眼与犊鼻同位见现有独立条目来源。','links':links,'kneeReference':'ST35','previousPositions':{id:p.get('positions',[p['position']]) for id,p in before.items() if id in links or id=='EX-LE4'},'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
output.write_text(json.dumps(data,separators=(',',':'))+'\n')
print(json.dumps({'innerBefore':inner,'innerAfter':binding['position'],'links':links}))
