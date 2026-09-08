"""Author a straight-forearm, palms-forward study pose using CC0 skin weights."""
import json
import math
import hashlib

PINNED_ASSETS = {
    'default.mhskel': '99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24',
    'default_weights.mhw': '0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625',
}


def add(a, b): return [x+y for x,y in zip(a,b)]
def sub(a, b): return [x-y for x,y in zip(a,b)]
def mul(a, s): return [x*s for x in a]
def dot(a, b): return sum(x*y for x,y in zip(a,b))
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def unit(a): return mul(a, 1/math.sqrt(dot(a,a)))


def rotate(v, axis, angle):
    c,s=math.cos(angle),math.sin(angle)
    return add(add(mul(v,c),mul(cross(axis,v),s)),mul(axis,dot(axis,v)*(1-c)))


def pose_forearms(vertices, groups, asset_dir):
    for name, expected in PINNED_ASSETS.items():
        if hashlib.sha256((asset_dir/name).read_bytes()).hexdigest() != expected:
            raise ValueError('Unreviewed pose asset: ' + name)
    weights=json.loads((asset_dir/'default_weights.mhw').read_text())
    rig=json.loads((asset_dir/'default.mhskel').read_text())
    if weights.get('license')!='CC0' or rig.get('license')!='CC0': raise ValueError('Unreviewed rig license')
    centers={}
    for name,faces in groups.items():
        if name.startswith('joint-'):
            ids={i for face in faces for i in face}
            centers[name]=[sum(vertices[i][k] for i in ids)/len(ids) for k in range(3)]
    total=[0.0]*len(vertices)
    for values in weights['weights'].values():
        for i,w in values: total[i]+=w
    output=[list(v) for v in vertices]
    posed_joints={name:list(v) for name,v in centers.items()}
    report={'sourceAssetsSha256': PINNED_ASSETS}
    for side,sign in [('l',1),('r',-1)]:
        suffix=side.upper(); root='lowerarm01.'+suffix
        descendants={root}
        changed=True
        while changed:
            added={name for name,bone in rig['bones'].items() if bone.get('parent') in descendants}
            changed=bool(added-descendants);descendants|=added
        shoulder=centers[f'joint-{side}-shoulder']; elbow=centers[f'joint-{side}-elbow']; wrist=centers[f'joint-{side}-hand']
        old_axis=unit(sub(wrist,elbow)); new_axis=unit(sub(elbow,shoulder))
        axis=unit(cross(old_axis,new_axis)); angle=math.acos(max(-1,min(1,dot(old_axis,new_axis))))
        radial=sub(centers[f'joint-{side}-finger-2-1'],centers[f'joint-{side}-finger-5-1'])
        radial=rotate(radial,axis,angle); radial=unit(sub(radial,mul(new_axis,dot(radial,new_axis))))
        target=unit([-sign*new_axis[1],sign*new_axis[0],0])
        twist=math.atan2(dot(new_axis,cross(radial,target)),dot(radial,target))
        def transform(p): return add(elbow,rotate(rotate(sub(p,elbow),axis,angle),new_axis,twist))
        influence=[0.0]*len(vertices)
        for bone in descendants:
            for i,w in weights['weights'].get(bone,[]): influence[i]+=w
        affected=0
        for i,w in enumerate(influence):
            if not w: continue
            w=min(1,w/total[i]); target_position=transform(vertices[i]); affected+=1
            output[i]=add(mul(vertices[i],1-w),mul(target_position,w))
        for name,p in centers.items():
            if name.startswith((f'joint-{side}-hand',f'joint-{side}-finger')): posed_joints[name]=transform(p)
        report[side]={'extensionDegrees':math.degrees(angle),'twistDegrees':math.degrees(twist),'affectedVertices':affected,'boneCount':len(descendants)}
    return output,posed_joints,report
