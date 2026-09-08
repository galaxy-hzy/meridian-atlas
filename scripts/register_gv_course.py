"""Build Du-mai main and separately named collateral from Qijing Bamai Kao.
Usage: python register_gv_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
from register_human import read_mesh,Surface
registration,model,output=map(Path,sys.argv[1:4])
data=json.loads(registration.read_text());raw,vertices,normals,indices=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
source=json.loads((Path(__file__).resolve().parents[1]/'lib/dumai-source.json').read_text());assert source['revision']=='119708'
surface=Surface(vertices,normals,indices);point=lambda id:data['points'][id]['position']
def connect(nodes):
 result=[]
 for a,b in zip(nodes,nodes[1:]):
  path=surface.surface_path(a,b);result.extend(path if not result else path[1:])
 return result
def mirror(points,shared_end=False):
 result=[[-v[0],v[1],v[2]] for v in points];result[0]=points[0]
 if shared_end:result[-1]=points[-1]
 return result
base=data['routes']['GV'][0];index=lambda id:next(i for i,p in enumerate(base) if p==point(id))
origin=[0,.945,.025];brain=[0,1.785,.015]
entry=connect([point('CV1'),surface.nearest([.045,.87,-.05])['position'],point('BL35'),point('GV1')])
spine=[point('GV1')]+[[v[0],v[1],v[2]+.025] for v in base[1:index('GV15')]]+[point('GV15')]
corner=surface.nearest([.03,1.654,.17])['position'];lip=surface.nearest([0,1.664,.18])['position']
face=connect([point('CV24'),corner,lip,point('ST1'),point('BL1'),point('GV20')])
back=data['routes']['BL'][0];bi=lambda id:next(i for i,p in enumerate(back) if p==point(id))
returning=[brain,point('GV16'),point('BL11')]+[[v[0],v[1],v[2]+.02] for v in back[bi('BL11')+1:bi('BL23')+1]]+[[.055,1.13,-.015]]
paths={
 'origin':{'label':'胞中少腹、至会阴共同区域','kind':'internal','points':[origin,[0,.91,.09],point('CV1')]},
 'entryLeft':{'label':'绕臀经会阳、合长强（左）','kind':'surface','points':entry},
 'entryRight':{'label':'绕臀经会阳、合长强（右）','kind':'surface','points':mirror(entry,True)},
 'spine':{'label':'并脊里上行至哑门','kind':'internal','points':spine},
 'tongue':{'label':'哑门入系舌本','kind':'internal','points':[point('GV15'),[0,1.60,.035],[0,1.646,.09]]},
 'brain':{'label':'风府入脑、循脑户','kind':'internal','points':[point('GV15'),point('GV16'),brain,point('GV17')]},
 'head':{'label':'脑户上巅、循额鼻至龈交','kind':'surface','points':base[index('GV17'):]},
 'frontCollateral':{'label':'别络走任、贯脐心喉上颐','kind':'internal','points':[point('GV1'),[0,.99,.07],[0,1.111,.10],[0,1.345,.03],[0,1.575,.035],point('CV24')]},
 'faceLeft':{'label':'别络环唇、目下内眦上巅（左）','kind':'surface','points':face},
 'faceRight':{'label':'别络环唇、目下内眦上巅（右）','kind':'surface','points':mirror(face,True)},
 'collateralBrain':{'label':'别络从巅入脑','kind':'internal','points':[point('GV20'),brain]},
 'returnLeft':{'label':'别络下项肩胛、循膂络肾（左）','kind':'internal','points':returning},
 'returnRight':{'label':'别络下项肩胛、循膂络肾（右）','kind':'internal','points':mirror(returning)},
}
result={'channel':'GV','assetSha256':data['assetSha256'],'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},'passage':source['passage']+'\n'+source['collateral'],'paths':paths,
 'nodes':[{'label':'胞中区域','position':origin},{'label':'入脑区域','position':brain},{'label':'别络络肾','position':[.055,1.13,-.015]}],
 'surfaceReferences':['CV1','BL35','GV1','GV15','GV16','GV17','GV20','CV24','ST1','BL1','BL11','BL23'],
 'note':'按《奇经八脉考》分别显示主脉和该书所述别络；不将前腹回行当作背部主线。原文三十一穴、冲道等保留，不改现行国标督脉二十九穴（含印堂 GV24+）及他经参照归属。男女外生殖段仅显示共同会阴区域，未建性别差异解剖。脊里深度、胞中、脑、舌本及别络形状为学习示意，不能据图确定针刺位置或深度。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:len(v['points']) for k,v in paths.items()})
