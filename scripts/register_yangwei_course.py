"""Yang-wei terminal ear region, retaining registered route through Yangbai.
Usage: python register_yangwei_course.py MESH.json OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
registration,output=map(Path,sys.argv[1:3]);data=json.loads(registration.read_text())
source=json.loads((Path(__file__).resolve().parents[1]/'lib/yangwei-source.json').read_text());assert source['revision']=='2305131'
point=lambda id:data['points'][id]['position']
base=data['routes']['YANGWEI'][0];idx=next(i for i,p in enumerate(base) if p==point('GB14'))
a,b=point('TE21'),point('SI19');ear=[(a[0]+b[0])/2-.012,(a[1]+b[1])/2,(a[2]+b[2])/2]
paths={
 'body':{'label':'金门、膝股胁肩、耳后、头部至阳白','kind':'surface','points':base[:idx+1]},
 'ear':{'label':'循头入耳（区域连接）','kind':'region','points':[point('GB14'),[.07,1.76,.09],ear]},
 'return':{'label':'耳部上至本神（区域连接）','kind':'region','points':[ear,[.082,1.75,.075],point('GB13')]},
}
result={'channel':'YANGWEI','assetSha256':data['assetSha256'],'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},'passage':source['passage'],'paths':paths,
 'nodes':[{'label':'循头入耳区域','position':ear}],
 'note':'按《奇经八脉考》该版保留金门至阳白的既有路线，补循头入耳、上至本神的区域连接；该段为串行回行，不凭空增加分叉。耳部用耳门、听宫周围的模型区域作几何参照，不新增阳维交会穴，也不改变穴位归属。原文没有给出耳内深度与明确连接曲线，使用虚线并待解剖校准；不把外关八脉交会穴当路线起点。原文三十二穴和字形保留，原书影印仍待复核。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:len(v['points']) for k,v in paths.items()})
