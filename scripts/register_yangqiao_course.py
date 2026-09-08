"""Add heel origin to the existing Yang-qiao route without changing registration.
Usage: python register_yangqiao_course.py MESH.json BODY.glb OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
from register_human import read_mesh,Surface
registration,model,output=map(Path,sys.argv[1:4])
data=json.loads(registration.read_text());raw,vertices,normals,indices=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
source=json.loads((Path(__file__).resolve().parents[1]/'lib/yangqiao-source.json').read_text())
surface=Surface(vertices,normals,indices)
point=lambda id:data['points'][id]['position']
# Lateral heel regional seed; no new canonical point or anatomical claim.
heel=surface.nearest([point('BL62')[0],.025,-.06])['position']
base=data['routes']['YANGQIAO'][0]
idx=next(i for i,p in enumerate(base) if p==point('BL1'))
paths={
 'heel':{'label':'跟中区域出外踝下申脉','kind':'surface','points':surface.surface_path(heel,point('BL62'))},
 'body':{'label':'申脉、绕跟、股胁肩面至睛明','kind':'surface','points':base[:idx+1]},
 'head':{'label':'睛明上发际、下耳后至风池','kind':'surface','points':base[idx:]},
}
result={'channel':'YANGQIAO','assetSha256':data['assetSha256'],'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{'title':source['title'],'revision':'snapshot-2026-09-07','url':source['url'],'sourceSha256':source['sourceSha256']},
 'passage':source['passage'],'paths':paths,'nodes':[{'label':'跟中区域','position':heel}],
 'note':'按所录阳跷脉段补跟中至申脉的体表区域连接，随后沿既有股胁肩面路线到睛明，再经发际、耳后到风池；未增加原文没有记载的体内支路。跟中种子及绕跟、肩颈、发际路径仍为网格示意，待骨肌标志精校。保留原文肩〼缺字；现有肩髃对应尚待影印核对。现代穴位坐标、归属和十一处文献关联均未改。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:len(v['points']) for k,v in paths.items()})
