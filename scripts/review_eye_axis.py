"""Render same-source eye reference evidence against the retained face mesh.
Usage: python review_eye_axis.py BODY.glb REGISTRATION.json OUTPUT.png
"""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
model,registration,output=map(Path,sys.argv[1:4]);raw,v,n,t=read_mesh(model)
data=json.loads(registration.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
r=data['eyeAxisReference'];axis=r['eyes']['l']['frontPoleCenter'][0]
im=Image.new('RGB',(1400,900),'white');d=ImageDraw.Draw(im)
f=v[t];f=f[(f[:,:,1].max(axis=1)>1.65)&(f[:,:,1].min(axis=1)<1.744)&(f[:,:,2].min(axis=1)>.115)]
normal=np.cross(f[:,1]-f[:,0],f[:,2]-f[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15)
shade=np.clip(100+130*np.maximum(0,normal@np.array([-.4,.4,.82])),0,255).astype(int)
def front(p):return 350+p[0]*4700,800-(p[1]-1.65)*7300
def side(p):return 780+(p[2]-.115)*12000,790-(p[1]-1.699)*21000
left=Image.new('RGB',(700,830),'white');ld=ImageDraw.Draw(left)
for i in np.argsort(f[:,:,2].mean(axis=1)):
 c=int(shade[i]);ld.polygon([front(p) for p in f[i]],fill=(c,)*3,outline=(max(c-10,0),)*3)
im.paste(left,(0,0));d=ImageDraw.Draw(im)
for face in f:
 pts=[]
 for a,b in zip(face,np.roll(face,-1,axis=0)):
  if (a[0]<=axis<b[0]) or (b[0]<=axis<a[0]):pts.append(a+(b-a)*((axis-a[0])/(b[0]-a[0])))
 if len(pts)==2 and all(1.699<p[1]<1.731 for p in pts):d.line([side(p) for p in pts],fill='#64748b',width=2)
for e in r['eyes'].values():
 pole=e['frontPoleVertices'];d.line([front(p) for p in pole+[pole[0]]],fill='#166534',width=2)
 a=e['frontPoleCenter'];x,y=front(a);d.line([(x,y),(x,front(data['points']['ST3']['position'])[1])],fill='#166534',width=1)
for id in ['ST1','ST3']:
 for label,p,color in [('before',r['previousPositions'][id],'#c2410c'),('new',data['points'][id]['position'],'#2563eb')]:
  x,y=front(p);d.ellipse((x-4,y-4,x+4,y+4),fill=color);d.text((x+6,y+5 if label=='before' else y-14),id+' '+label,fill=color)
p=data['points']['ST1']['position'];x,y=side(p);d.ellipse((x-5,y-5,x+5,y+5),fill='#2563eb');d.text((x+8,y-18),'ST1 at retained height',fill='#2563eb')
p=r['rejectedST1UpwardProbe']['position'];x,y=side(p);d.ellipse((x-5,y-5,x+5,y+5),fill='#b91c1c');d.text((x+8,y+12),'+0.5 mm probe: rejected',fill='#b91c1c')
d.rectangle((0,0,1399,70),fill='white');d.text((20,20),'Eye axis reference: front view (left); mesh section at left eye X (right)',fill='black')
d.text((20,45),'Green: front-pole ring from pinned source eye helper; no new eyeball added to the displayed body.',fill='black')
d.text((20,850),'Only transverse alignment changed. True visual axis, lower eyelid, orbital margin and alar border remain unverified.',fill='black')
im.save(output)
