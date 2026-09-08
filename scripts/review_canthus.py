"""Review canthus relations on the retained GLB. Usage: review_canthus.py BODY.glb REGISTRATION.json OUTPUT.png"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
model,registration,output=map(Path,sys.argv[1:4]);raw,v,n,t=read_mesh(model);data=json.loads(registration.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
r=data['canthusReference'];f=v[t];f=f[(f[:,:,1].max(axis=1)>1.64)&(f[:,:,1].min(axis=1)<1.755)&(f[:,:,2].min(axis=1)>.09)]
normal=np.cross(f[:,1]-f[:,0],f[:,2]-f[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15);shade=np.clip(100+130*np.maximum(0,normal@np.array([-.4,.4,.82])),0,255).astype(int)
im=Image.new('RGB',(1200,1000),'white');d=ImageDraw.Draw(im)
def xy(a):return 500+a[0]*6000,910-(a[1]-1.64)*6900
for i in np.argsort(f[:,:,2].mean(axis=1)):
 c=int(shade[i]);d.polygon([xy(a) for a in f[i]],fill=(c,)*3,outline=(max(c-10,0),)*3)
for key in ['innerReferenceVertex','outerReferenceVertex']:
 a=v[r[key]];x,y=xy(a);d.ellipse((x-4,y-4,x+4,y+4),fill='#047857');d.text((x-55,y+12),str(r[key]),fill='#047857')
a=v[r['outerReferenceVertex']];x,y=xy(a);d.line([(x,y),(x,xy(data['points']['SI18']['position'])[1])],fill='#047857',width=2)
for id in ['BL1','GB1','SI18']:
 labels=[('retained',data['points'][id]['position'],'#2563eb')] if id!='SI18' else [('before',r['previousPositions'][id],'#c2410c'),('new',data['points'][id]['position'],'#2563eb')]
 for name,pos,color in labels:
  x,y=xy(pos);d.ellipse((x-4,y-4,x+4,y+4),fill=color);d.text((x+7,y-15),id+' '+name,fill=color)
d.rectangle((0,0,1199,65),fill='white');d.text((20,15),'Same mesh: canthus surface references in green, SI18 transverse alignment corrected.',fill='black');d.text((20,40),'BL1 / GB1 retained; orbital and zygomatic bone margins, closed-eye pose and cun distances remain unverified.',fill='black')
im.save(output)
