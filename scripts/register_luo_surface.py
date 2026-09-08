"""Fit existing collateral surface references to the retained skin.
Usage: python register_luo_surface.py INPUT.json BODY.glb OUTPUT.json
Generate INPUT with export_luo_surface.mjs. Internal/uncertain region links
remain schematic; existing acupoints constrain drawing, not anatomy.
"""
from pathlib import Path
import hashlib,json,sys
from register_human import read_mesh,Surface
source,model,output=map(Path,sys.argv[1:4])
data=json.loads(source.read_text()); raw,v,n,i=read_mesh(model)
assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
surface=Surface(v,n,i); paths={}; count=0
for channel,segments in data['segments'].items():
 paths[channel]=[]
 for segment in segments:
  nodes=segment['nodes']; points=[]; spans=[]
  if segment.get('fixedPath'):
   points=segment['fixedPath']
  else:
   for index,(a,b) in enumerate(zip(nodes,nodes[1:])):
    fitted=a['surface'] and b['surface']
    connection=surface.surface_path(a['position'],b['position']) if fitted else [a['position'],b['position']]
    begin=max(0,len(points)-1)
    points.extend(connection if not points else connection[1:])
    spans.append({'nodePair':index,'from':begin,'to':len(points)-1,'surface':fitted})
    count+=int(fitted)
  paths[channel].append({'points':points,'spans':spans,'references':nodes})
result={'assetSha256':data['assetSha256'],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'paths':paths,'note':'只将既有体表参照之间的连接贴合当前皮肤网格；内部区域仍为联系示意。参照穴不改变归属，也不意味着络脉必经这些穴位。'}
output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'surfaceConnections':count,'points':sum(len(p['points']) for ps in paths.values() for p in ps)}))
