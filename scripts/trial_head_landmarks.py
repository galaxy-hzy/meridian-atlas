"""Two provisional surface-extreme anchors for a falsifiable head-only trial.
Usage: trial_head_landmarks.py SKIN_DIR BONE_DIR HUMAN.glb REGISTRATION.json OUTPUT_DIR
Never changes the human or acupoints. Fit anchors are not independently validated anatomy.
"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from PIL import Image,ImageDraw
from prepare_neck_reference import read_obj
from register_human import read_mesh,Surface

def vertex_normals(v,faces):
    n=np.zeros_like(v);f=v[faces];norm=np.cross(f[:,1]-f[:,0],f[:,2]-f[:,0])
    for i in range(3):np.add.at(n,faces[:,i],norm)
    return n/np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-15)

def evaluate(points,surface,limit=1200):
    ids=np.linspace(0,len(points)-1,min(limit,len(points)),dtype=int);dist=[];signed=[]
    for p in points[ids]:
        hit=surface.nearest(p);q=np.array(hit['position'])-hit['offset'];norm=np.array(hit['offset'])/.003
        dist.append(float(np.linalg.norm(p-q)));signed.append(float(np.dot(p-q,norm)))
    return {'sampleCount':len(ids),'rms':float(np.sqrt(np.mean(np.array(dist)**2))),'p95':float(np.quantile(dist,.95)),'max':max(dist),'outsideMoreThan1mm':sum(s>.001 for s in signed),'maxSignedOutside':max(signed)}

if __name__=='__main__':
    if len(sys.argv)!=6:raise SystemExit('Usage: trial_head_landmarks.py SKIN_DIR BONE_DIR HUMAN.glb REGISTRATION.json OUTPUT_DIR')
    skin_dir,bone_dir,model,registration,output=map(Path,sys.argv[1:]);output.mkdir(parents=True,exist_ok=True)
    skin_path=skin_dir/'FJ2810.obj';skin_manifest=json.loads((skin_dir/'preparation-manifest.json').read_text());skin_record=next(s for s in skin_manifest['structures'] if s['elementId']=='FJ2810');assert hashlib.sha256(skin_path.read_bytes()).hexdigest()==skin_record['preparedSha256']
    bone_path=bone_dir/'FJ3309.obj';bone_manifest=json.loads((bone_dir/'manifest.json').read_text());bone_record=next(s for s in bone_manifest['structures'] if s['elementId']=='FJ3309');assert hashlib.sha256(bone_path.read_bytes()).hexdigest()==bone_record['sha256']
    source,source_faces=read_obj(skin_path);source=np.array(source);source_faces=np.array(source_faces);bone,bone_faces=read_obj(bone_path);bone=np.array(bone)
    raw,target,tn,ti=read_mesh(model);data=json.loads(registration.read_text());assert hashlib.sha256(raw).hexdigest()==data['assetSha256']
    ids=np.flatnonzero((source[:,2]>1430)&(np.abs(source[:,0])<110));hids=np.flatnonzero(target[:,1]>1.60)
    source_ids=[int(ids[np.argmin(source[ids,1])]),int(ids[np.argmax(source[ids,2])])];target_ids=[int(hids[np.argmax(target[hids,2])]),int(hids[np.argmax(target[hids,1])])]
    # Preserve source midline, use only the YZ-plane anchor coordinates. The
    # small source X offsets are retained in residuals, not silently translated.
    axes=np.array([[1.,0.,0.],[0.,0.,1.],[0.,-1.,0.]])
    oriented=source@axes.T;a=oriented[source_ids];b=target[target_ids];da=a[1,1:]-a[0,1:];db=b[1,1:]-b[0,1:]
    scale=float(np.linalg.norm(db)/np.linalg.norm(da));angle=float(np.arctan2(db[1],db[0])-np.arctan2(da[1],da[0]));c,s=np.cos(angle),np.sin(angle)
    rotation=np.array([[1.,0.,0.],[0.,c,-s],[0.,s,c]]);linear=scale*rotation@axes;shift=b[0]-source[source_ids[0]]@linear.T;shift[0]=0
    aligned=source@linear.T+shift;aligned_bone=bone@linear.T+shift;matrix=np.eye(4);matrix[:3,:3]=linear;matrix[:3,3]=shift
    head=lambda v,f:f[(v[f][:,:,1].max(axis=1)>1.60)&(v[f][:,:,1].min(axis=1)<1.89)&(np.abs(v[f][:,:,0]).max(axis=1)<.14)]
    tf=head(target,ti);sf=head(aligned,source_faces);target_surface=Surface(target,tn,tf);source_surface=Surface(aligned,vertex_normals(aligned,sf),sf)
    sp=aligned[(aligned[:,1]>1.60)&(aligned[:,1]<1.89)&(np.abs(aligned[:,0])<.14)];tp=target[(target[:,1]>1.60)&(np.abs(target[:,0])<.14)]
    st=evaluate(sp,target_surface);ts=evaluate(tp,source_surface);contain=evaluate(aligned_bone,target_surface,1200)
    posterior=lambda p:p[(p[:,1]>=1.65)&(p[:,1]<=1.83)&(p[:,2]<=.04)]
    posterior_metrics={'region':{'y':[1.65,1.83],'zMax':.04},'sourceToTarget':evaluate(posterior(sp),target_surface),'targetToSource':evaluate(posterior(tp),source_surface)}
    result={'status':'rejected-for-point-transfer-pending-anatomical-correspondence','inputSha256':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [skin_path,bone_path,model,registration]},'sourceAnchorVertexIds':source_ids,'targetAnchorVertexIds':target_ids,'anchorNames':['anterior-most head skin candidate','superior-most skin candidate'],'sourceAnchors':source[source_ids].tolist(),'targetAnchors':b.tolist(),'transformedAnchors':aligned[source_ids].tolist(),'anchorResiduals':np.linalg.norm(aligned[source_ids]-b,axis=1).tolist(),'scale':scale,'pitchRadians':angle,'sourceToAtlasColumnVectorMatrix':matrix.tolist(),'sourceToTargetSurface':st,'targetToSourceSurface':ts,'boneContainmentDiagnostic':contain,'posteriorSurface':posterior_metrics,'limitations':['Two provisional extrema constrain a trial, not a validated anatomical registration.','Source crown extremum may change under pitch; closed-eye and ear shape differ.','Vertex samples are not area-uniform or independent anatomical observations.','Nearest-surface normal gives local signed-distance diagnostics, not a robust volumetric containment proof.','No landmark for upper border of external occipital protuberance has been accepted; no acupoints moved.'],'attribution':bone_manifest['attribution'],'licenseUrl':bone_manifest['licenseUrl']}
    (output/'head-landmark-trial.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    im=Image.new('RGB',(1400,900),'white');draw=ImageDraw.Draw(im)
    def xy(p,panel):return (340+(p[0] if panel==0 else -p[2]+.08)*1800+panel*700,790-(p[1]-1.60)*2300)
    for panel in [0,1]:
        for points,color in [(tp,'#2563eb'),(sp,'#c2410c'),(aligned_bone,'#047857')]:
            use=points[np.linspace(0,len(points)-1,min(3500,len(points)),dtype=int)]
            for p in use:
                x,y=xy(p,panel)
                if panel*700+10<x<(panel+1)*700-10 and 95<y<840:draw.ellipse((x-1,y-1,x+1,y+1),fill=color)
        for p in b:
            x,y=xy(p,panel);draw.ellipse((x-5,y-5,x+5,y+5),outline='#111827',width=2)
    draw.text((20,20),'Provisional nose/crown head trial: blue = retained skin; orange = source skin; green = source occipital bone',fill='black');draw.text((20,45),'Front (left), side with posterior to right (right). Two fitted extrema do not establish anatomical accuracy.',fill='black');draw.text((20,68),'BodyParts3D / The Database Center for Life Science / CC BY 4.0. No atlas coordinates changed.',fill='black');im.save(output/'head-landmark-trial.png')
    print(json.dumps({'sourceToTarget':st,'targetToSource':ts,'bone':contain,'posterior':posterior_metrics,'scale':scale,'pitchDegrees':angle*180/np.pi,'anchorResiduals':result['anchorResiduals']}))
