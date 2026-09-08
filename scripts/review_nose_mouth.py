"""Render nasal tip and provisional nose/mouth surface evidence; developer inspection, not a clinical figure.
Usage: python review_nose_mouth.py BODY.glb REGISTRATION.json OUTPUT.png
Requires numpy and Pillow; does not modify model or registration.
"""
from pathlib import Path
import hashlib,json,sys
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
model,registration,output=map(Path,sys.argv[1:4]);raw,v,n,t=read_mesh(model)
data=json.loads(registration.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
im=Image.new('RGB',(1400,880),'white');d=ImageDraw.Draw(im)
faces=v[t];faces=faces[(faces[:,:,1].max(axis=1)>1.625)&(faces[:,:,1].min(axis=1)<1.70)&(faces[:,:,2].min(axis=1)>.13)]
normal=np.cross(faces[:,1]-faces[:,0],faces[:,2]-faces[:,0]);normal/=np.maximum(np.linalg.norm(normal,axis=1)[:,None],1e-15)
shade=np.clip(100+130*np.maximum(0,normal@np.array([-.4,.4,.82])),0,255).astype(int)
def front(p):return 340+p[0]*7200,810-(p[1]-1.625)*8000
def side(p):return 770+(p[2]-.16)*17000,810-(p[1]-1.625)*8000
left=Image.new('RGB',(700,800),'white');ld=ImageDraw.Draw(left)
for i in np.argsort(faces[:,:,2].mean(axis=1)):
 c=int(shade[i]);ld.polygon([front(p) for p in faces[i]],fill=(c,)*3,outline=(max(c-12,0),)*3)
im.paste(left,(0,0));d=ImageDraw.Draw(im)
for face in faces:
 pts=[]
 for a,b in zip(face,np.roll(face,-1,axis=0)):
  if (a[0]<=0<b[0]) or (b[0]<=0<a[0]):pts.append(a+(b-a)*(-a[0]/(b[0]-a[0])))
 if len(pts)==2 and min(p[2] for p in pts)>.164:d.line([side(p) for p in pts],fill='#64748b',width=2)
for id,item in data['noseMouthLandmarks']['points'].items():
 record={'previousPosition':data['noseMouthLandmarks']['previousPositions'][id], 'surfacePosition':(np.array(data['points'][id]['position'])-[0,0,.003]).tolist()}
 for project in ([front,side] if id!='ST4' else [front]):
  for label,pos,color in [('before',record['previousPosition'],'#c2410c'),('surface',record['surfacePosition'],'#166534'),('marker',data['points'][id]['position'],'#2563eb')]:
   x,y=project(pos);d.ellipse((x-4,y-4,x+4,y+4),fill=color)
   if label!='surface':d.text((x+8,y-14 if label=='marker' else y+4),id+' '+label,fill=color)
 d.text((730,30+22*list(data['noseMouthLandmarks']['points']).index(id)),id+': '+item['status'],fill='black')
d.rectangle((0,0,699,54),fill='white');d.text((20,18),'Retained mesh: nose/mouth surface review',fill='black')
d.text((30,825),'Orange: previous marker | Green: surface anchor | Blue: updated marker (3 mm display offset)',fill='black')
d.text((30,850),'GV25: visible nasal tip. GV26 philtrum boundaries and ST4 proportional distance remain provisional.',fill='black')
im.save(output)
