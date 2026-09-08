"""Render LI19 level review. Usage: review_philtrum_level.py BODY.glb REGISTRATION.json OUTPUT.png"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
model,registration,output=map(Path,sys.argv[1:4]);raw,v,n,t=read_mesh(model);data=json.loads(registration.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
r=data['philtrumLevelReference'];f=v[t];f=f[(f[:,:,1].max(axis=1)>1.60)&(f[:,:,1].min(axis=1)<1.70)&(f[:,:,2].min(axis=1)>.13)]
normal=np.cross(f[:,1]-f[:,0],f[:,2]-f[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15);shade=np.clip(100+130*np.maximum(0,normal@np.array([-.4,.4,.82])),0,255).astype(int)
im=Image.new('RGB',(1100,1050),'white');d=ImageDraw.Draw(im)
def xy(a):return 530+a[0]*10000,980-(a[1]-1.60)*9000
for i in np.argsort(f[:,:,2].mean(axis=1)):
 c=int(shade[i]);d.polygon([xy(a) for a in f[i]],fill=(c,)*3,outline=(max(c-10,0),)*3)
d.line([xy(data['points'][id]['position']) for id in ['GV26','LI19']],fill='#047857',width=2)
for label,pos,color in [('LI19 before',r['previousPosition'],'#c2410c'),('LI19 new',data['points']['LI19']['position'],'#2563eb'),('GV26 reference',data['points']['GV26']['position'],'#047857'),('LI20 retained',data['points']['LI20']['position'],'#475569')]:
 x,y=xy(pos);d.ellipse((x-4,y-4,x+4,y+4),fill=color);d.text((x+7,y-18),label,fill=color)
d.rectangle((0,0,1099,65),fill='white');d.text((20,15),'Same mesh: LI19 corrected from below the lips to the existing GV26 reference level.',fill='black');d.text((20,40),'Philtrum boundaries, lateral nostril edge and proportional distance remain provisional. LI20 unchanged.',fill='black')
im.save(output)
