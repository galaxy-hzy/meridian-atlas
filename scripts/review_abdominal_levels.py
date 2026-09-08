"""Render abdominal level and belt-plane evidence. Usage: review_abdominal_levels.py BODY.glb REGISTRATION.json BASE.json OUTPUT.png"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
model,registration,baseline,output=map(Path,sys.argv[1:5]);raw,v,n,t=read_mesh(model);data=json.loads(registration.read_text());base=json.loads(baseline.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']==base['assetSha256']
f=v[t];f=f[(f[:,:,1].max(axis=1)>.90)&(f[:,:,1].min(axis=1)<1.28)&(np.abs(f[:,:,0]).max(axis=1)<.21)]
normal=np.cross(f[:,1]-f[:,0],f[:,2]-f[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15);shade=np.clip(100+130*np.maximum(0,normal@np.array([-.4,.4,.82])),0,255).astype(int)
im=Image.new('RGB',(1500,1000),'white');d=ImageDraw.Draw(im)
def front(p):return 370+p[0]*1600,900-(p[1]-.90)*2100
def top(p):return 1120+p[0]*1600,510-p[2]*1600
for i in np.argsort(f[:,:,2].mean(axis=1)):
 c=int(shade[i]);d.polygon([front(a) for a in f[i]],fill=(c,)*3,outline=(max(c-10,0),)*3)
for id,ref in data['abdominalSharedLevels']['references'].items():
 d.line([front(data['points'][x]['position']) for x in [id,ref]],fill='#047857',width=2)
 for label,p,color in [('before',base['points'][id]['position'],'#c2410c'),('new',data['points'][id]['position'],'#2563eb')]:
  x,y=front(p);d.ellipse((x-4,y-4,x+4,y+4),fill=color);d.text((x+8,y-15 if label=='new' else y+5),id+' '+label,fill=color)
 x,y=front(data['points'][ref]['position']);d.text((x-45,y),ref,fill='#047857')
for label,s,color in [('before',base,'#c2410c'),('new',data,'#2563eb')]:
 ring=s['routes']['DAI'][2];d.line([top(p) for p in ring],fill=color,width=2);d.text((900,740 if label=='new' else 715),'Belt '+label+': Y = '+str(round(ring[0][1],6)),fill=color)
d.rectangle((0,0,1499,70),fill='white');d.text((20,20),'Shared abdominal reference levels (front) and rebuilt horizontal belt ring (top view)',fill='black');d.text((20,45),'Green: shared model levels. Rib tip, ASIS and pubic bone boundaries remain unverified.',fill='black')
im.save(output)
