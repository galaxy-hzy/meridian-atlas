"""Build ST facial/visceral/leg/toe branches, preserving source variants.
Usage: python register_st_course.py MESH.json BODY.glb OUTPUT.json
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
base=data['routes']['ST'][0]
index=lambda id:next(i for i,p in enumerate(base) if p==point(id))
nose=surface.nearest([0,1.716,.18])['position']
corner=surface.nearest([.03,1.654,.17])['position']
other_corner=[-corner[0],*corner[1:]]
upper_lip=surface.nearest([0,1.664,.18])['position']
lower_lip=surface.nearest([0,1.644,.18])['position']
stomach=[0,1.225,.035];spleen=[.075,1.19,.02];teeth=[.018,1.661,.115]
third=surface.nearest([(point('ST45')[0]+point('GB44')[0])/2,.022,(point('ST45')[2]+point('GB44')[2])/2])['position']
paths={
 'nose':{'label':'鼻根交頞、下循鼻外','kind':'surface','points':connect([nose,point('BL1'),point('ST1'),point('ST2'),point('ST3')])},
 'teeth':{'label':'入上齿、还出挟口','kind':'internal','points':[point('ST3'),teeth,corner]},
 'lips':{'label':'环唇、下交承浆','kind':'surface','points':connect([corner,upper_lip,other_corner,lower_lip,point('CV24')])},
 'jaw':{'label':'循颐后下廉、出大迎','kind':'surface','points':connect([point('CV24'),point('ST5')])},
 'head':{'label':'颊车耳前、客主人、发际至额','kind':'surface','points':connect([point('ST5'),point('ST6'),point('ST7'),point('GB3'),point('ST8'),point('GV24')])},
 'neck':{'label':'大迎前下人迎、入缺盆','kind':'surface','points':connect([point('ST5'),point('ST9')])+base[index('ST9')+1:index('ST12')+1]},
 'stomach':{'label':'缺盆下膈、属胃','kind':'internal','points':[point('ST12'),[.025,1.30,.025],stomach]},
 'spleen':{'label':'从胃络脾','kind':'internal','points':[stomach,spleen]},
 'abdomen':{'label':'胃口循腹里、合气街','kind':'internal','points':[stomach,[0,1.24,.035],[.01,1.08,.025],point('ST30')]},
 'trunk':{'label':'缺盆下乳内、挟脐入气街','kind':'surface','points':base[index('ST12'):index('ST30')+1]},
 'leg':{'label':'气街下髀关伏兔、膝下','kind':'surface','points':base[index('ST30'):index('ST36')+1]},
 'calf':{'label':'循胫外廉、下足跗','kind':'surface','points':base[index('ST36'):index('ST42')+1]},
 'second':{'label':'足跗至厉兑参照（趾名有异文）','kind':'surface','points':base[index('ST42'):]},
 'third':{'label':'膝下分出、至第三趾区域','kind':'surface','points':connect([point('ST36'),point('ST40'),point('ST41'),third])},
 'great':{'label':'别足跗、至大趾端','kind':'surface','points':connect([point('ST42'),point('LR2'),point('SP1')])},
}
result={'channel':'ST','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['ST'],'paths':paths,
 'nodes':[{'label':'上齿','position':teeth},{'label':'属胃','position':stomach},{'label':'络脾','position':spleen},{'label':'第三趾参照','position':third}],
 'surfaceReferences':['BL1','ST1','ST2','ST3','CV24','ST5','ST6','ST7','GB3','ST8','GV24','ST9','ST12','ST30','ST36','ST40','ST41','ST42','ST45','GB44','LR2','SP1'],
 'note':'本转录保留“中指内间〔一作次指外间〕”；主段沿现代厉兑位置，另示第三趾和大趾支路，不据古文异名移动国标穴位。“下廉三寸”段采用膝下足三里区域为示意分叉，丰隆、解溪仅为表面参照。上齿、脾胃及胃口为区域示意，未建牙列和器官实体。左右环唇线只表示路线联系，不表示实测方向；本循行文件不另行修改四十五穴坐标，当前定位修订见各穴详情，细部待校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
