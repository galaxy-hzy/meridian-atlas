"""Inspect independent occipital bone and retained head without registering them.
Usage: review_occipital_reference.py BODY.glb REGISTRATION.json RAW_BONE_DIR OUTPUT_DIR
Requires numpy and Pillow. All images are developer diagnostics, not clinical validation.
"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from register_human import read_mesh
from prepare_neck_reference import read_obj

def render(faces, project, depth, size, light):
    im=Image.new('RGB',size,'white');draw=ImageDraw.Draw(im)
    normals=np.cross(faces[:,1]-faces[:,0],faces[:,2]-faces[:,0]);normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-15)
    shade=np.clip(100+130*np.maximum(0,normals@np.array(light)),0,255).astype(int)
    for i in np.argsort(depth(faces)):
        c=int(shade[i]);draw.polygon([project(p) for p in faces[i]],fill=(c,)*3,outline=(max(0,c-8),)*3)
    return im

if __name__=='__main__':
    if len(sys.argv)!=5:raise SystemExit('Usage: review_occipital_reference.py BODY.glb REGISTRATION.json RAW_BONE_DIR OUTPUT_DIR')
    model,registration,bone_dir,output=map(Path,sys.argv[1:]);output.mkdir(parents=True,exist_ok=True)
    raw,v,n,t=read_mesh(model);data=json.loads(registration.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    m=json.loads((bone_dir/'manifest.json').read_text());item=next(s for s in m['structures'] if s['elementId']=='FJ3309');assert item['name']=='occipital bone' and item['fmaId']=='FMA52735'
    bone_path=bone_dir/'FJ3309.obj';assert hashlib.sha256(bone_path.read_bytes()).hexdigest()==item['sha256']
    bv,bf=read_obj(bone_path);bv=np.array(bv);assert all(len(f)==3 for f in bf);bf=np.array(bf);bone=bv[bf]
    head=v[t];head=head[(head[:,:,1].max(axis=1)>1.60)&(head[:,:,1].min(axis=1)<1.87)&(np.abs(head[:,:,0]).max(axis=1)<.14)]
    project=lambda p:(420+p[0]*2600,850-(p[1]-1.60)*2800)
    im=render(head,project,lambda f:-f[:,:,2].mean(axis=1),(850,950),[.3,.25,-.92]);d=ImageDraw.Draw(im)
    for id,color in [('GV17','#b91c1c'),('BL9','#2563eb'),('GB19','#047857')]:
        p=data['points'][id]['position'];x,y=project(p);d.line([(160,y),(710,y)],fill=color,width=1);d.ellipse((x-5,y-5,x+5,y+5),fill=color);d.text((x+8,y-17),id+' Y='+str(round(p[1],6)),fill=color)
    d.rectangle((0,0,849,65),fill='white');d.text((20,18),'Retained MakeHuman head - posterior view; current conflicting reference levels',fill='black');d.text((20,42),'Scalp contours are not verified occipital bone boundaries.',fill='black');im.save(output/'retained-occipital-levels.png')
    lo=bv.min(axis=0);hi=bv.max(axis=0);center=(lo+hi)/2;scale=min(650/(hi[0]-lo[0]),720/(hi[2]-lo[2]))
    project=lambda p:(420+(p[0]-center[0])*scale,470-(p[2]-center[2])*scale)
    im=render(bone,project,lambda f:f[:,:,1].mean(axis=1),(850,950),[.25,.94,.25]);d=ImageDraw.Draw(im);d.rectangle((0,0,849,65),fill='white');d.text((20,18),'BodyParts3D FJ3309 occipital bone - posterior view, independent source coordinates',fill='black');d.text((20,42),'Not aligned to MakeHuman. Source identifies the bone, not a reviewed landmark vertex.',fill='black');d.text((20,905),'BodyParts3D, (c) The Database Center for Life Science; CC BY 4.0',fill='black');im.save(output/'occipital-bone-posterior.png')
    # An independently labeled sagittal section is more useful than overlaying
    # incompatible coordinate systems or selecting the scalp's rear-most point.
    im=Image.new('RGB',(1100,950),'white');d=ImageDraw.Draw(im)
    def profile(faces,plane_axis,project,color):
        count=0
        for face in faces:
            pts=[]
            for a,b in zip(face,np.roll(face,-1,axis=0)):
                if (a[plane_axis]<=0<b[plane_axis]) or (b[plane_axis]<=0<a[plane_axis]):pts.append(a+(b-a)*(-a[plane_axis])/(b[plane_axis]-a[plane_axis]))
            if len(pts)==2:d.line([project(p) for p in pts],fill=color,width=2);count+=1
        return count
    hc=profile(head,0,lambda p:(100+(-p[2]+.21)*1400,820-(p[1]-1.60)*2700),'#475569')
    bc=profile(bone,0,lambda p:(800+(p[1]-center[1])*4,800-(p[2]-lo[2])*5),'#2563eb')
    d.text((20,20),'Separate midline sections at X=0; distinct scales and origins, no registration implied.',fill='black');d.text((40,70),'Retained skin: Y-up, +Z-front; posterior is right',fill='black');d.text((625,70),'Reference bone: Z-up, +Y-posterior',fill='black');d.text((625,870),'BodyParts3D / DBCLS / CC BY 4.0',fill='black');im.save(output/'occipital-sections.png')
    result={'status':'independent-reference-only','modelSha256':data['assetSha256'],'registrationSha256':hashlib.sha256(registration.read_bytes()).hexdigest(),'sourceManifestSha256':hashlib.sha256((bone_dir/'manifest.json').read_bytes()).hexdigest(),'boneSha256':item['sha256'],'sourceBounds':[lo.tolist(),hi.tolist()],'boneVertices':len(bv),'boneFaces':len(bf),'sectionSegments':{'skin':hc,'bone':bc},'currentPoints':{id:data['points'][id]['position'] for id in ['GV17','BL9','GB19']},'landmarkVertex':None,'registrationTransform':None,'note':'No occipital protuberance upper-border vertex or source-to-target anatomical correspondence has been accepted. No point coordinates changed.','attribution':m['attribution'],'licenseUrl':m['licenseUrl']}
    (output/'occipital-reference-review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'boneBounds':result['sourceBounds'],'boneFaces':len(bf),'sections':result['sectionSegments']}))
