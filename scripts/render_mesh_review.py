"""Render geometry evidence from mesh data, using numpy and Pillow."""
import json
import pathlib
import sys
import numpy as np
from PIL import Image, ImageDraw
from register_human import read_mesh

raw, vertices, normals, indices = read_mesh(pathlib.Path(sys.argv[1]))
data=json.loads(pathlib.Path(sys.argv[2]).read_text())
out=Image.new('RGB',(1800,1200),'#10212a'); draw=ImageDraw.Draw(out)
colors={'LU':'#65d9eb','LI':'#efb36a','ST':'#e8c264','SP':'#e49a72','HT':'#f184a0','SI':'#dc85b8',
        'BL':'#83a6f1','KI':'#9e9dea','PC':'#ba8ce6','TE':'#7dc8b0','GB':'#a5c978','LR':'#67bf9e','CV':'#e3d58c','GV':'#f7bb79'}
for panel,angle in enumerate([0,np.pi/2,np.pi]):
    matrix=np.array([[np.cos(angle),0,np.sin(angle)],[0,1,0],[-np.sin(angle),0,np.cos(angle)]])
    v=vertices@matrix.T; n=normals@matrix.T
    def screen(p): return (panel*600+300+p[0]*410,1130-p[1]*570)
    faces=v[indices]; face_norm=n[indices].mean(axis=1)
    for i in np.argsort(faces[:,:,2].mean(axis=1)):
        if face_norm[i,2]<-.05: continue
        brightness=np.clip(.47+.45*np.dot(face_norm[i],[-.3,.4,.85]),.15,1)
        color=tuple(int(brightness*c) for c in [147,184,192])
        draw.polygon([screen(p) for p in faces[i]],fill=color)
    for id,binding in data['points'].items():
        channel=''.join(c for c in id if c.isalpha())
        color=colors.get(channel,'#f5de93')
        # Surface orientation culls the far-facing markers in this review only.
        for b in binding.get('groupBindings') or [binding]:
            normal=np.array(b['barycentric'])@normals[indices[b['face']]]
            if (normal@matrix.T)[2]<.1: continue
            p=np.array(b['position'])@matrix.T; x,y=screen(p)
            draw.ellipse((x-2,y-2,x+2,y+2),fill=color)
            if id in ['LU1','LU5','LU9','LU11','PC6','LI4','CV8','ST17','ST36','KI1','GV20','GV24+','BL13','BL23']:
                draw.text((x+5,y-8),id,fill=color)
    draw.text((panel*600+20,20),['FRONT','LEFT','BACK'][panel],fill='white')
out.save(sys.argv[3])
