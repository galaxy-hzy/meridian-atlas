"""Render ear surface comparison. Usage: python review_ear_arc.py BODY.glb REGISTRATION.json OUTPUT.png"""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
model,registration,output=map(Path,sys.argv[1:4]);data=json.loads(registration.read_text());
raw,v,n,t=read_mesh(model);assert hashlib.sha256(raw).hexdigest()==data['assetSha256'];p=data['points']
f=v[t];f=f[(f[:,:,1].max(axis=1)>1.59)&(f[:,:,1].min(axis=1)<1.755)&(f[:,:,0].min(axis=1)>.035)]
normal=np.cross(f[:,1]-f[:,0],f[:,2]-f[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15);shade=np.clip(100+130*np.maximum(0,normal@np.array([.9,.3,.2])),0,255).astype(int)
im=Image.new('RGB',(1000,1100),'white');d=ImageDraw.Draw(im)
def xy(p):return 820-(p[2]+.02)*6000,1040-(p[1]-1.59)*6000
for i in np.argsort(f[:,:,0].mean(axis=1)):
 c=int(shade[i]);d.polygon([xy(p) for p in f[i]],fill=(c,)*3,outline=(max(c-12,0),)*3)
chain=[np.array(data['earArcReference']['referenceVertices'][str(i)]) for i in data['earArcReference']['vertexChain']]
d.line([xy(p) for p in chain],fill='#047857',width=2)
for id in ['TE18','TE19','TE20']:
 
 for label,pos,color in [('before',data['earArcReference']['previousPositions'][id],'#c2410c'),('new',p[id]['position'],'#2563eb')]:
  x,y=xy(pos);d.ellipse((x-4,y-4,x+4,y+4),fill=color);d.text((x+6,y),id+' '+label,fill=color)
d.rectangle((0,0,999,40),fill='white');d.text((20,15),'Retained mesh - lateral view, front is left; orange = previous, blue = revised, green = provisional scalp edge chain',fill='black')
im.save(output)
