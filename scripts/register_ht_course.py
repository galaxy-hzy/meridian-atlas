"""Build schematic HT regional branches from the pinned surface model.
Usage: python register_ht_course.py MESH.json OUTPUT.json
Does not modify acupoints. Deep-region nodes are authored diagram positions.
"""
from pathlib import Path
import json,hashlib,sys
if len(sys.argv)!=3:
 raise SystemExit('Usage: python register_ht_course.py MESH.json OUTPUT.json')
registration,output=map(Path,sys.argv[1:3])
if output.suffix.lower()!='.json':
 raise SystemExit('Output must be a JSON file; model assets are not outputs.')
data=json.loads(registration.read_text())
source=json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision']=='2520099'
heart=[0,1.345,.03];system=[0,1.375,.025]
brow=data['points']['EX-HN4']['position']; below=data['points']['ST1']['position']
eye=[(brow[0]+below[0])/2,(brow[1]+below[1])/2,(brow[2]+below[2])/2-.045]
paths={
 'stem':{'label':'心中出属心系','kind':'internal','points':[heart,system]},
 'viscera':{'label':'心系下膈络小肠','kind':'internal','points':[system,[.015,1.30,.025],[0,1.095,.015]]},
 'eye':{'label':'心系上挟咽、联系目系','kind':'internal','points':[system,[.016,1.575,.035],eye]},
 'emerge':{'label':'心系上肺、下出腋下','kind':'internal','points':[system,[.075,1.405,.025],data['points']['HT1']['position']]},
 'arm':{'label':'腋下沿上肢内后侧至小指','kind':'surface','points':data['routes']['HT'][0]},
}
result={'channel':'HT','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['HT'],'paths':paths,'eyeRegionReferences':['EX-HN4','ST1'],
 'nodes':[{'label':'心系','position':system},{'label':'络小肠','position':[0,1.095,.015]},{'label':'目系','position':eye}],
 'note':'心中、心系、小肠、咽和目系为古籍区域关系示意，不是器官或神经实体。经肺出腋下段接极泉作为体表参照，沿用现有心经九穴路线；目系取现有眉中、眶下参照之间的深部区域，不改变参照穴归属；精确解剖位置仍待校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'paths':{k:len(v['points']) for k,v in paths.items()},'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))
