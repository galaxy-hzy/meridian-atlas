"""Yin-wei chest/throat regional course, with book-specific anterior crown.
Usage: python register_yinwei_course.py MESH.json OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
registration,output=map(Path,sys.argv[1:3]);data=json.loads(registration.read_text())
source=json.loads((Path(__file__).resolve().parents[1]/'lib/yinwei-source.json').read_text());assert source['revision']=='119698'
point=lambda id:data['points'][id]['position']
leg=data['routes']['YINWEI'][0];upper=data['routes']['YINWEI'][2]
idx=next(i for i,p in enumerate(upper) if p==point('CV23'))
chest=[.04,1.38,.035]
paths={
 'lower':{'label':'筑宾、股内侧、腹胁至期门','kind':'surface','points':leg},
 'chest':{'label':'上胸膈至天突','kind':'internal','points':[point('LR14'),[.055,1.31,.04],chest,point('CV22')]},
 'throat':{'label':'挟咽、会廉泉','kind':'internal','points':[point('CV22'),[.012,1.53,.055],point('CV23')]},
 'crown':{'label':'本书所述顶前延伸（区域）','kind':'region','points':upper[idx:]},
}
result={'channel':'YINWEI','assetSha256':data['assetSha256'],'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},'passage':source['passage'],'paths':paths,
 'nodes':[{'label':'胸膈区域','position':chest},{'label':'本书顶前区域','position':upper[-1]}],
 'note':'按《奇经八脉考》该版保留筑宾至期门的现有表面路径，将胸膈、挟咽改为体内区域示意，经天突、廉泉后接该书顶前描述。顶前延伸只表示终点区域，经过面部的连接形状是模型推定，原文没有指定面部穴或顶前现代穴名，不新增交会穴；本书十四穴记数不强换算现代双侧与正中计数。内关只作八脉交会穴。胸膈深度、咽部与顶前形状待解剖及原书校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print({k:len(v['points']) for k,v in paths.items()})
