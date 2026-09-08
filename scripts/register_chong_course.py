"""Build separately named Chong-mai branches from a pinned classical transcription.
Usage: python register_chong_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import json, hashlib, sys
from register_human import read_mesh, Surface
registration, model, output = map(Path, sys.argv[1:4])
data = json.loads(registration.read_text())
raw, vertices, normals, indices = read_mesh(model)
assert hashlib.sha256(raw).hexdigest() == data['assetSha256']
source = json.loads((Path(__file__).resolve().parents[1]/'lib/chongmai-source.json').read_text())
assert source['revision'] == '2084064'
surface = Surface(vertices, normals, indices)
point = lambda id: data['points'][id]['position']
def connect(nodes):
 result = []
 for a,b in zip(nodes,nodes[1:]):
  part = surface.surface_path(a,b)
  result.extend(part if not result else part[1:])
 return result
origin = [0,.945,.025]
stem = [0,.97,.025]
throat = [.012,1.575,.035]
lower_lip = surface.nearest([0,1.644,.18])['position']
upper_lip = surface.nearest([0,1.664,.18])['position']
corner = surface.nearest([.03,1.654,.17])['position']
paths = {}
def add(key,label,kind,points):
 paths[key] = {'label':label,'kind':kind,'points':points}
add('origin','胞中起始区域','internal',[origin,stem])
add('emerge','浮而外者出气冲','internal',[stem,[.025,.96,.08],point('ST30')])
add('abdomen','挟脐腹部列穴段','surface',data['routes']['CHONG'][0])
add('upper','胸中、会于咽喉','internal',[point('KI21'),[.03,1.36,.035],throat])
add('nasal','上出颃颡区域','internal',[throat,[.015,1.68,.055]])
add('mouth','咽喉别络唇口','internal',[throat,[.015,1.63,.09],lower_lip])
add('lips','络唇口区域','surface',connect([lower_lip,corner,upper_lip]))
add('back','上循背里（上界示意）','internal',[stem,[.01,1.05,-.02],[.01,1.30,-.015],[.01,1.52,-.005]])
add('lowerOrigin','下行支起肾下、出气街','internal',[stem,[.035,1.06,-.005],[.03,.99,.065],point('ST30')])
add('thigh','循阴股内廉、斜入腘中','internal',[point('ST30'),[.065,.83,.035],[.09,.67,.015],point('KI10')])
add('calf','伏行胫骨内侧至内踝后','internal',[point('KI10'),point('KI9'),point('KI7'),point('KI3')])
add('sole','内踝后入足下','surface',connect([point('KI3'),point('KI1')]))
add('dorsum','别支循足背入大趾间','surface',connect([point('KI3'),point('LR3'),point('LR2')]))
result = {'channel':'CHONG','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':'\n'.join(source[k] for k in ['passage','backAndMouth','descending']),
 'paths':paths,'nodes':[{'label':'胞中区域','position':origin},{'label':'上循背里','position':[.01,1.30,-.015]},{'label':'颃颡区域','position':[.015,1.68,.055]}],
 'surfaceReferences':['ST30','KI21','KI10','KI9','KI7','KI3','KI1','LR3','LR2'],
 'note':'依据《奇经八脉考·冲脉》分别表示腹部、背里、咽口与下行足部支路。原文列穴段记左右，所引《灵枢》句作“循腹右上行”，保留文字差异；图形按列穴段作双侧示意。背里上界、胞中、肾下、颃颡及深浅均为区域示意，未完成器官解剖校准。足下与大趾间借用涌泉、行间作区域参照，不表示古文指定这些穴，也不改变穴位归属；公孙仅为八脉交会穴。各引文未逐一与所引原书校勘，动画不是生理流速。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
