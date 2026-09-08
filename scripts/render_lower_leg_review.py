"""Render four orthographic lower-leg before/after views (numpy, Pillow).
Usage: python render_lower_leg_review.py BODY.glb BEFORE.json AFTER.json OUTPUT.png
Open circles show old positions; filled dots show new. Labels are schematic.
"""
from pathlib import Path
import sys,json
from register_human import read_mesh
import numpy as np
from PIL import Image,ImageDraw,ImageFont
_,vertices,normals,indices=read_mesh(Path(sys.argv[1]))
old=json.loads(Path(sys.argv[2]).read_text());new=json.loads(Path(sys.argv[3]).read_text())
out=Image.new('RGB',(2400,1120),'#10212a');draw=ImageDraw.Draw(out);font_path=next((p for p in ['/System/Library/Fonts/Menlo.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).exists()),None);font=ImageFont.truetype(font_path,17) if font_path else ImageFont.load_default()
ids_by_view=[['ST35','ST36','ST37','ST38','ST39','ST40','ST41'],['GB34','GB35','GB36','GB37','GB38','GB39','GB40'],['BL40','BL55','BL56','BL57','BL58','BL59','BL60'],['SP9','SP8','SP7','SP6','KI3','KI7','KI8','KI9','LR5','LR6','LR7','KI10','LR8']]
colors={'ST':'#e8c264','SP':'#e49a72','BL':'#83a6f1','KI':'#b7a7ff','GB':'#a5c978','LR':'#67bf9e'}
mask=(vertices[indices][:,:,0].min(axis=1)>.06)&(vertices[indices][:,:,1].max(axis=1)<.60)
faces_ids=np.flatnonzero(mask)
for panel,angle in enumerate([0,-np.pi/2,np.pi,np.pi/2]):
 matrix=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]])
 v=(vertices-np.array([.22,0,0]))@matrix.T;n=normals@matrix.T
 def screen(p):return(panel*600+300+p[0]*1700,1060-p[1]*1700)
 faces=v[indices];ns=n[indices].mean(axis=1)
 for i in sorted(faces_ids,key=lambda i:faces[i,:,2].mean()):
  if ns[i,2]<-.05:continue
  light=np.clip(.47+.45*np.dot(ns[i],[-.3,.4,.85]),.15,1)
  draw.polygon([screen(p) for p in faces[i]],fill=tuple(int(light*c) for c in [147,184,192]))
 labels=[]
 for id in ids_by_view[panel]:
  p=(np.array(new['points'][id]['position'])-[.22,0,0])@matrix.T;op=(np.array(old['points'][id]['position'])-[.22,0,0])@matrix.T
  x,y=screen(p);ox,oy=screen(op);color=colors[id[:2]]
  draw.ellipse((ox-6,oy-6,ox+6,oy+6),outline='#d2a1a1',width=2);draw.line((ox,oy,x,y),fill='#806f76',width=1)
  draw.ellipse((x-5,y-5,x+5,y+5),fill=color);labels.append((y,x,id,color))
 previous_y=90
 for y,x,id,color in sorted(labels):
  label_y=max(previous_y+24,y);previous_y=label_y
  label_x=panel*600+450
  draw.line((x,y,label_x-8,label_y+9),fill=color,width=1);draw.text((label_x,label_y),id,font=font,fill=color)
 draw.text((panel*600+18,20),['FRONT','LATERAL','BACK','MEDIAL'][panel],font=font,fill='white')
 draw.text((panel*600+18,49),'ring: before / dot: after',font=font,fill='#b6c9d0')
out.save(sys.argv[4])
