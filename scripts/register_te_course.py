"""Build schematic TE chest and ear branches, keeping canonical acupoints.
Usage: python register_te_course.py MESH.json BODY.glb OUTPUT.json
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
    for first,last in zip(nodes,nodes[1:]):
        path = surface.surface_path(first,last)
        result.extend(path if not result else path[1:])
    return result
base = data['routes']['TE'][0]
end = next(i for i,p in enumerate(base) if p == point('TE15'))
chest = point('CV17').copy(); chest[2] -= .055
pericardium = [.018,1.355,.035]
ear = point('TE21').copy(); ear[0] -= .014
before_gb3 = surface.nearest([point('GB3')[0],point('GB3')[1],point('GB3')[2]+.022])['position']
paths = {
 'stem':{'label':'无名指沿手臂、肩背入缺盆','kind':'surface','points':base[:end+1]+connect([point('TE15'),point('GV14'),point('ST12')])[1:]},
 'chest':{'label':'缺盆入胸、布膻中','kind':'internal','points':[point('ST12'),chest]},
 'viscera':{'label':'散络心包、下膈循属三焦','kind':'internal','points':[chest,pericardium,[.018,1.30,.025],[0,1.20,.015],[0,1.07,.015]]},
 'rise':{'label':'膻中上出缺盆','kind':'internal','points':[chest,point('ST12')]},
 'neck':{'label':'上项、系耳后','kind':'surface','points':connect([point('ST12'),point('TE16'),point('TE17')])},
 'upper':{'label':'耳后上耳角、屈下颊至颧部','kind':'surface','points':connect([point('TE17'),point('TE18'),point('TE19'),point('TE20'),point('TE22'),point('SI18')])},
 'ear':{'label':'耳后入耳中、出走耳前','kind':'internal','points':[point('TE17'),ear,point('TE21')]},
 'eye':{'label':'过客主人前、交颊至目外眦','kind':'surface','points':connect([point('TE21'),before_gb3,point('TE23'),point('GB1')])},
}
result = {'channel':'TE','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['TE'],'paths':paths,
 'nodes':[{'label':'膻中区域','position':chest},{'label':'散络心包','position':pericardium},{'label':'循属三焦','position':[0,1.20,.015]},{'label':'耳中','position':ear}],
 'surfaceReferences':['TE15','GV14','ST12','CV17','TE16','TE17','TE18','TE19','TE20','TE21','TE22','TE23','SI18','GB3','GB1'],
 'note':'膻中、心包、三焦、耳中为区域关系示意，非器官模型；膻中向缺盆的上行支路与入胸段共用空间，动画分先后。现代穴位仅作位置参照；“客主人前”取上关前方表面参照，未当作必须经过上关穴。颊、外眦参照不改变他经穴位归属。原文“䪼”保留；深部和肩颈耳部位置仍待精细校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
