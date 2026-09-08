"""Build SP regional stomach/heart/tongue branches; preserves canonical points.
Usage: python register_sp_course.py MESH.json OUTPUT.json
Standard library only. Internal nodes are authored learning regions.
"""
from pathlib import Path
import json, hashlib, sys
registration, output = map(Path, sys.argv[1:3])
data = json.loads(registration.read_text())
source = json.loads((Path(__file__).resolve().parents[1]/'lib/jingmai-source.json').read_text())
assert source['revision'] == '2520099'
point = lambda id: data['points'][id]['position']
base = data['routes']['SP'][0]
end = next(i for i,p in enumerate(base) if p == point('SP16'))
spleen = [.075,1.19,.02]; stomach = [0,1.225,.035]; diaphragm = [.018,1.30,.025]
# Authored mouth-region height, visually checked against the actual model.
root = [.008,1.646,.09]
under = [.023,1.650,.135]
heart = [0,1.345,.03]
paths = {
 'stem':{'label':'大趾循腿内侧、入腹','kind':'surface','points':base[:end+1]},
 'viscera':{'label':'入腹属脾、络胃','kind':'internal','points':[point('SP16'),spleen,stomach]},
 'throat':{'label':'胃上膈、挟咽连舌本','kind':'internal','points':[stomach,diaphragm,[.016,1.575,.035],root]},
 'tongue':{'label':'散舌下','kind':'internal','points':[root,under]},
 'heart':{'label':'从胃别上膈、注心中','kind':'internal','points':[stomach,diaphragm,heart]},
}
result = {'channel':'SP','assetSha256':data['assetSha256'],
 'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),
 'source':{k:source[k] for k in ['title','revision','url','sourceSha256']},
 'passage':source['passages']['SP'],'paths':paths,
 'nodes':[{'label':'属脾','position':spleen},{'label':'络胃','position':stomach},{'label':'舌本','position':root},{'label':'注心中','position':heart}],
 'surfaceReferences':['SP16'],
 'note':'本模式按原文展示腹内、咽舌和注心支路；胸侧经穴仍可点选，关闭本模式可看完整体表编号连线。腹哀仅作现代位置参照，原文没有指定从腹哀入腹；脾胃、膈、咽舌和心为区域示意，未建器官实体。舌本和舌下按当前模型口腔区域设定深部参照，精确解剖位置待校准。'}
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({k:len(v['points']) for k,v in paths.items()})
