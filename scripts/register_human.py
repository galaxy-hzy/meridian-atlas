"""Bind authored study coordinates to the pinned learning mesh.

Usage: python register_human.py TEMPLATE.json MODEL_DIRECTORY OUTPUT.json
Requires numpy. Geometry attachment is reproducible; anatomical review remains
pending. No nearest-surface algorithm can establish a clinical point location.
"""
import hashlib
import json
import pathlib
import struct
import sys
import heapq
import numpy as np


def read_mesh(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', raw)
    if (magic, version, length) != (0x46546C67, 2, len(raw)):
        raise ValueError('Invalid GLB')
    json_length, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4E4F534A: raise ValueError('Missing GLB JSON')
    doc = json.loads(raw[20:20+json_length])
    binary = raw[28+json_length:]
    def accessor(index, dtype, width):
        a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
        return np.frombuffer(binary, dtype=dtype, count=a['count']*width,
                             offset=view.get('byteOffset', 0)+a.get('byteOffset', 0)).reshape(-1, width).copy()
    return raw, accessor(0, '<f4', 3).astype(float), accessor(1, '<f4', 3).astype(float), accessor(2, '<u4', 1).reshape(-1, 3)


class Surface:
    def __init__(self, vertices, normals, indices):
        self.vertices,self.vertex_normals,self.indices=vertices,normals,indices
        self.faces = vertices[indices]
        self.normals = normals[indices]
        self.lo, self.hi = self.faces.min(axis=1), self.faces.max(axis=1)
        self.graph=None

    def surface_path(self, start, end):
        """Follow connected mesh edges across concavities instead of jumping
        between disconnected nearest projections (not an anatomical route)."""
        if self.graph is None:
            self.graph=[{} for _ in self.vertices]
            for a,b,c in self.indices:
                for i,j in [(a,b),(b,c),(c,a)]:
                    d=float(np.linalg.norm(self.vertices[i]-self.vertices[j]))
                    self.graph[i][int(j)]=d; self.graph[j][int(i)]=d
        def closest_vertex(p):
            face=self.indices[self.nearest(p)['face']]
            return int(face[np.argmin(np.linalg.norm(self.vertices[face]-p,axis=1))])
        first,last=closest_vertex(start),closest_vertex(end)
        queue=[(0.,first)]; costs={first:0.}; previous={}
        while queue:
            _,current=heapq.heappop(queue)
            if current==last: break
            for neighbor,d in self.graph[current].items():
                cost=costs[current]+d
                if cost>=costs.get(neighbor,float('inf')): continue
                costs[neighbor]=cost; previous[neighbor]=current
                heuristic=float(np.linalg.norm(self.vertices[neighbor]-self.vertices[last]))
                heapq.heappush(queue,(cost+heuristic,neighbor))
        if last not in costs: raise ValueError('Disconnected surface route')
        ids=[last]
        while ids[-1]!=first: ids.append(previous[ids[-1]])
        points=[np.array(start)]+[self.vertices[i]+unit(self.vertex_normals[i])*.003 for i in reversed(ids)]+[np.array(end)]
        for _ in range(2):
            points=[points[0]]+[np.array(self.nearest((a+2*b+c)/4)['position']) for a,b,c in zip(points,points[1:],points[2:])]+[points[-1]]
        return [p.tolist() for p in points]

    def finish(self, face, bary, method, seed, ray_side=None):
        p = bary @ self.faces[face]
        normal = bary @ self.normals[face]
        normal /= max(np.linalg.norm(normal), 1e-15)
        # Z projection preserves the authored horizontal/proportional levels.
        offset = np.array([0., 0., ray_side*.003]) if ray_side else normal*.003
        return {'face': int(face), 'barycentric': bary.tolist(), 'offset': offset.tolist(),
                'position': (p+offset).tolist(), 'method': method,
                'seedDistance': float(np.linalg.norm(p-seed))}

    def nearest(self, seed):
        p = np.array(seed, dtype=float)
        box_delta = np.maximum(np.maximum(self.lo-p, p-self.hi), 0)
        box_distance = np.einsum('ij,ij->i', box_delta, box_delta)
        # Any excluded triangle is farther than the radius. Expand until the
        # closest candidate is within it, making this an exact nearest query.
        for radius in [.025, .05, .1, .2, 2.]:
            ids = np.flatnonzero(box_distance <= radius*radius)
            if not len(ids): continue
            f = self.faces[ids]; a, b, c = f[:, 0], f[:, 1], f[:, 2]
            ab, ac, ap = b-a, c-a, p-a
            d00 = np.einsum('ij,ij->i', ab, ab); d01 = np.einsum('ij,ij->i', ab, ac)
            d11 = np.einsum('ij,ij->i', ac, ac)
            d20 = np.einsum('ij,ij->i', ap, ab); d21 = np.einsum('ij,ij->i', ap, ac)
            denominator = d00*d11-d01*d01
            safe = np.where(np.abs(denominator)>1e-20, denominator, 1)
            v = (d11*d20-d01*d21)/safe; w = (d00*d21-d01*d20)/safe
            bary = np.stack([1-v-w, v, w], axis=1)
            closest = np.einsum('ij,ijk->ik', bary, f)
            distances = np.sum((closest-p)**2, axis=1)
            distances[(bary.min(axis=1)<0) | (np.abs(denominator)<=1e-20)] = np.inf
            for i, j in [(0,1), (1,2), (2,0)]:
                edge = f[:,j]-f[:,i]
                t = np.clip(np.einsum('ij,ij->i', p-f[:,i], edge)/np.maximum(np.sum(edge*edge, axis=1),1e-20),0,1)
                ep = f[:,i]+t[:,None]*edge; ed = np.sum((ep-p)**2,axis=1)
                better = ed<distances
                eb = np.zeros_like(bary); eb[:,i]=1-t; eb[:,j]=t
                bary[better]=eb[better]; distances[better]=ed[better]
            local = int(np.argmin(distances))
            if distances[local] <= radius*radius:
                return self.finish(ids[local], bary[local], 'nearest-triangle', p)
        raise ValueError('No surface within model bounds')

    def z_project(self, seed, side):
        p = np.array(seed, dtype=float)
        ids = np.flatnonzero(np.all(self.lo[:,:2]-1e-9 <= p[:2],axis=1) & np.all(self.hi[:,:2]+1e-9 >= p[:2],axis=1))
        if not len(ids): return self.nearest(p)
        f = self.faces[ids]; a,b,c=f[:,0],f[:,1],f[:,2]
        u,v = (b-a)[:,:2],(c-a)[:,:2]; q=(p-a)[:,:2]
        d = u[:,0]*v[:,1]-u[:,1]*v[:,0]
        safe=np.where(np.abs(d)>1e-15,d,1)
        s=(q[:,0]*v[:,1]-q[:,1]*v[:,0])/safe
        t=(u[:,0]*q[:,1]-u[:,1]*q[:,0])/safe
        bary=np.stack([1-s-t,s,t],axis=1)
        valid=(np.abs(d)>1e-15)&(bary.min(axis=1)>=-1e-8)
        ids,bary=ids[valid],bary[valid]
        if not len(ids): return self.nearest(p)
        z=np.einsum('ij,ij->i',bary,self.faces[ids,:,2])
        index=int(np.argmax(z*side))
        return self.finish(ids[index],bary[index],'front-z-ray' if side>0 else 'back-z-ray',p,side)


def unit(v):
    return v/max(np.linalg.norm(v),1e-15)


def register(template_path, model_dir, output_path):
    raw, vertices, normals, indices = read_mesh(model_dir/'body-learning-pose.glb')
    meta=json.loads((model_dir/'model-provenance.json').read_text())
    if hashlib.sha256(raw).hexdigest()!=meta['glbSha256']: raise ValueError('Model provenance mismatch')
    source=json.loads(template_path.read_text()); surface=Surface(vertices,normals,indices)
    joints={k:np.array(v) for k,v in meta['joints'].items()}
    shoulder,elbow,wrist=[joints['joint-l-'+s] for s in ['shoulder','elbow','hand']]
    hip=joints['joint-l-upper-leg']; knee=joints['joint-l-knee']; ankle=joints['joint-l-ankle']
    arm_axis=unit(elbow-wrist); radial=unit(np.array([arm_axis[1],-arm_axis[0],0.]))
    # Navel indentation and nipple protrusion are inspected mesh landmarks.
    # Pubic upper edge, xiphoid and rib levels are authored estimates, pending
    # anatomical review; the asset contains no skeleton/rib surface to prove them.
    landmarks={'navelY':1.11141705513,'pubicUpperY':.95,'xiphoidY':1.265,
               'notchY':1.50,'nippleX':.07769180089,'nippleY':1.32561361790}
    lateral_unit=landmarks['nippleX']/4
    ribs=[0]+[landmarks['nippleY']+(4-i)*.031 for i in range(1,8)]
    def abdomen(cun):
        n=landmarks['navelY']
        return n+cun*((landmarks['xiphoidY']-n)/8 if cun>=0 else (n-landmarks['pubicUpperY'])/5)
    def torso_seed(rule):
        k=rule['kind']; x=rule.get('lateral',0)*lateral_unit
        if k=='abdomen': y=abdomen(rule['heightCun'])
        elif k=='rib': y=ribs[rule['space']]
        elif k=='clavicle': y=landmarks['notchY']-(landmarks['notchY']-landmarks['xiphoidY'])/9-.016*(x/(6*lateral_unit))**2
        elif k=='notch': y=landmarks['notchY']
        elif k=='belowNotch': y=landmarks['notchY']-(landmarks['notchY']-landmarks['xiphoidY'])/9
        elif k=='nipple': x,y=landmarks['nippleX'],landmarks['nippleY']
        else: y=landmarks['xiphoidY']
        return [x,y,.17]

    def frame_map(p, old_a, old_b, new_a, new_b, radial_scale):
        old_a,old_b=np.array(old_a),np.array(old_b)
        old_axis=unit(old_b-old_a); new_axis=unit(new_b-new_a)
        old_r=unit(np.array([-old_axis[1],old_axis[0],0.])); new_r=unit(np.array([-new_axis[1],new_axis[0],0.]))
        v=p-old_a; t=np.dot(v,old_axis)/np.linalg.norm(old_b-old_a)
        return new_a+t*(new_b-new_a)+np.dot(v,old_r)*radial_scale*new_r+np.array([0,0,v[2]*radial_scale])

    def generic(old):
        p=np.array(old,dtype=float); sign=-1 if p[0]<0 else 1; p[0]=abs(p[0]); x,y,z=p
        mode=0
        if x>.65 and y<.805:
            # Fallback hand frame; named hand points use digit landmarks below.
            out=frame_map(p,[.727,.8,.045],[.79,.66,.045],wrist,joints['joint-l-finger-3-3'],.55)
        elif x>.46 and y<1.11:
            out=frame_map(p,[.727,.8,.045],[.58,1.1,.02],wrist,elbow,.55)
        elif x>.32 and y<1.49 and y>=1.1:
            out=frame_map(p,[.354,1.397,0],[.58,1.1,.02],shoulder,elbow,.55)
        elif y<.13 and x>.07:
            out=np.array([ankle[0]+(x-.191)*.6,y*ankle[1]/.115,(z-.023)*.76+ankle[2]])
        elif y<.86 and x>.07:
            if y>=.473: out=frame_map(p,[.2,.473,.016],[.157,.87,0],knee,hip,.84)
            else: out=frame_map(p,[.19,.115,.021],[.2,.473,.016],ankle,knee,.84)
        elif y>=1.59:
            yy=np.interp(y,[1.59,1.62,1.636,1.65,1.691,1.715,1.758,1.797,1.849],[1.595,1.611,1.626,1.642,1.688,1.716,1.742,1.785,1.85])
            out=np.array([x*.59,yy,z*(.88 if z>=0 else .6)+(.012 if z>=0 else .005)])
            mode=1 if z>.04 else -1 if z<-.04 else 0
        elif y>=1.49:
            out=np.array([min(x*.55,.07),np.interp(y,[1.49,1.59],[1.505,1.595]),z*.65+.015])
            mode=1 if z>.06 else -1 if z<-.06 else 0
        else:
            # Piecewise map keeps abdominal 8/5 divisions separate from chest.
            yy=np.interp(y,[.84,.88,1.04,1.24,1.321,1.405,1.48],[.90,.95,landmarks['navelY'],landmarks['xiphoidY'],landmarks['nippleY'],ribs[1],1.5])
            out=np.array([x*(lateral_unit/.04 if z>=0 else .53),yy,z*.68+.018])
            mode=1 if z>.045 else -1 if z<-.045 else 0
        out[0]*=sign
        return out,mode

    angles={'LU':.75,'LI':1.8,'HT':-.95,'SI':-2.1,'PC':0.,'TE':np.pi}
    endpoints={'LU9':0,'LU5':1,'LI5':0,'LI11':1,'HT7':0,'HT3':1,'SI5':0,'SI8':1,'PC7':0,'PC3':1,'TE4':0}
    def arm_seed(channel,t):
        angle=angles[channel]; radius=.032+t*.016
        return wrist+t*(elbow-wrist)+radius*(np.sin(angle)*radial+np.array([0,0,np.cos(angle)]))
    def digit(finger,part=1): return joints[f'joint-l-finger-{finger}-{part}']
    distal=unit(digit(3,1)-wrist); hand_radial=unit(digit(2,1)-digit(5,1))
    front=np.array([0,0,.021]); back=-front
    hand={
        'LU11':digit(1,4)+hand_radial*.004+front*.25,
        'LI1':digit(2,4)+hand_radial*.004+back*.2,
        'PC9':digit(3,4)+front*.25,'HT9':digit(5,4)+hand_radial*.004+front*.25,
        'SI1':digit(5,4)-hand_radial*.004+back*.2,'TE1':digit(4,4)-hand_radial*.004+back*.2,
        'LU10':(wrist+digit(1,1))/2+hand_radial*.014+front,
        'LI2':digit(2,1)+distal*.01+hand_radial*.01+back,
        'LI3':digit(2,1)-distal*.014+hand_radial*.01+back,
        'LI4':(digit(2,1)+wrist)/2+hand_radial*.012+back,
        'HT8':(digit(4,1)+digit(5,1))/2-distal*.012+front,
        'PC8':(digit(2,1)+digit(3,1))/2-distal*.015+front,
        'SI2':digit(5,1)+distal*.01-hand_radial*.009+back,
        'SI3':digit(5,1)-distal*.012-hand_radial*.01+back,
        'SI4':(digit(5,1)+wrist)/2-hand_radial*.014+back,
        'TE2':(digit(4,1)+digit(5,1))/2+distal*.012+back,
        'TE3':(digit(4,1)+digit(5,1))/2-distal*.015+back,
        'EX-UE4':digit(3,2)+back,
        'EX-UE5':digit(1,1)+back, 'EX-UE6':digit(5,2)+back,
        'EX-UE3':wrist+radial*.012+back,
        'EX-UE8':(digit(2,1)+digit(3,1))/2-distal*.028+back,
    }
    toe=lambda n,part: joints[f'joint-l-toe-{n}-{part}']
    hand.update({'SP1':toe(1,3)+[-.006,.01,0],'LR1':toe(1,3)+[.006,.01,0],
                 'ST45':toe(2,4)+[.004,.007,0],'GB44':toe(4,4)+[.004,.007,0],
                 'BL67':toe(5,4)+[.004,.007,0],
                 'LR2':(toe(1,2)+toe(2,2))/2+[0,.025,0],
                 'ST44':(toe(2,2)+toe(3,2))/2+[0,.025,0],
                 'GB43':(toe(4,2)+toe(5,2))/2+[0,.025,0],
                 'EX-LE8':ankle+[-.026,.014,0], 'EX-LE9':ankle+[.026,-.004,0],
                 'EXTRA-LINEITING':(toe(2,2)+toe(3,2))/2+[0,-.025,0],
                 'EX-LE11':toe(2,3)+[0,-.012,0]})
    groups={
        'EX-UE11':[digit(f,4)+front*.15 for f in range(1,6)],
        'EX-UE10':[digit(f,2)+front for f in range(2,6)],
        'EX-UE9':[(digit(f,1)+digit(f+1,1))/2+distal*.008+back for f in range(1,5)],
        'EX-LE10':[(toe(f,2)+toe(f+1,2))/2+[0,.025,0] for f in range(1,5)],
        'EX-LE12':[toe(f,3 if f==1 else 4)+[0,.006,.004] for f in range(1,6)],
        'EX-UE2':[arm_seed('PC',4/12)+radial*d for d in [0,.018]],
    }
    points={}
    for p in source['points']:
        id=p['id']; seed,mode=generic(p['position']); method='regional-template'
        if id in source['torsoRules']:
            seed,mode=torso_seed(source['torsoRules'][id]),1; method='proportional-torso'
        elif id in source['forearmRules'] or id in endpoints:
            rule=source['forearmRules'].get(id)
            t=rule['cun']/12 if rule else endpoints[id]
            seed,mode=arm_seed(p['channel'],t),0; method='joint-forearm'
            if id=='TE7': seed=seed-radial*.012
        elif id in hand: seed,mode=hand[id],0; method='digit-landmark'
        if id in ['EX-CA1','EXTRA-TITUO']:
            seed,mode=torso_seed({'kind':'abdomen','heightCun':-4 if id=='EX-CA1' else -3,'lateral':3 if id=='EX-CA1' else 4}),1
            method='extra-abdominal-proportion'
        if id=='M-UE48': seed=shoulder+[0,-.045,.045];mode=0;method='shoulder-estimate'
        if id=='EX-HN2': seed=np.array(points['GB15']['position'])+[0,.018,0];mode=1;method='hairline-estimate'
        if id=='EXTRA-JIEJI': seed=(np.array(points['GV6']['position'])+points['GV5']['position'])/2;mode=-1;method='vertebral-reference'
        spine={'EX-B1':('GV14',.5),'EX-B4':('GV5',3.5),'EX-B6':('GV3',3),'EX-B7':('GV3',3.5)}
        if id in spine:
            ref,lateral=spine[id];seed=np.array(points[ref]['position']);seed[0]=lateral*lateral_unit;mode=-1;method='vertebral-reference'
        if id=='EX-B3': seed=(np.array(points['BL17']['position'])+points['BL18']['position'])/2;mode=-1;method='between-back-shu'
        if id=='EX-LE3': seed=np.array(points['SP10']['position'])+[0,.03,0];mode=0;method='thigh-reference'
        if id=='EX-LE7': seed=np.array(points['ST37']['position'])+(knee-ankle)/16;mode=0;method='leg-reference'
        if id=='KI1': seed=np.array([.24,-.006,.125]);mode=0;method='sole-landmark'
        if id=='CV1': seed=np.array([0,.891,.047]);mode=0;method='perineum-estimate'
        binding=surface.z_project(seed,mode) if mode else surface.nearest(seed)
        binding['regionRule']=method
        if id=='EX-LE1':
            center=np.array(points['ST34']['position'])
            groups[id]=[center+[-1.5*lateral_unit,0,0],center+[1.5*lateral_unit,0,0]]
        if p.get('positions'):
            bindings=[]
            for i,old in enumerate(p['positions']):
                seed,mode=generic(old)
                if id in groups: seed,mode=groups[id][i],0
                b=surface.z_project(seed,mode) if mode else surface.nearest(seed)
                bindings.append(b)
            binding['positions']=[b['position'] for b in bindings]
            binding['groupBindings']=bindings
            binding['position']=bindings[0]['position']
            # Primary attachment must correspond to the displayed first marker.
            for k in ['face','barycentric','offset','method','seedDistance']: binding[k]=bindings[0][k]
        points[id]=binding

    # Map explicit paths through their point anchors when available. Preserve
    # both bladder branches and all original conceptual extraordinary paths.
    coord_points={}
    for p in source['points']: coord_points.setdefault(tuple(p['position']),[]).append(p)
    def route_position(old,channel):
        key=tuple(old)
        if key in coord_points:
            candidates=coord_points[key]
            # Shared source coordinates do not imply identical landmarks:
            # PC9 and the old EX-UE11 group origin are a known example.
            p=next((p for p in candidates if p['channel']==channel),
                   next((p for p in candidates if p['channel']!='EX'),candidates[0]))
            return np.array(points[p['id']]['position'])
        seed,mode=generic(old)
        return np.array((surface.z_project(seed,mode) if mode else surface.nearest(seed))['position'])
    def path(old_path,channel):
        anchors=[route_position(p,channel) for p in old_path]
        result=[anchors[0].tolist()]
        for a,b in zip(anchors,anchors[1:]):
            count=max(1,int(np.ceil(np.linalg.norm(b-a)/.02)))
            segment=[a.tolist()]+[surface.nearest(a+(b-a)*i/count)['position'] for i in range(1,count)]+[b.tolist()]
            if any(np.linalg.norm(np.array(q)-p)>.035 for p,q in zip(segment,segment[1:])):
                segment=surface.surface_path(a,b)
            result.extend(segment[1:])
        return result
    routes={c['id']:[path(p,c['id']) for p in c.get('routes') or [c['route']]] for c in source['channels']}
    # Reference lines use the same piecewise torso mapping and Z surface rays.
    guides=[]
    for index,line in enumerate(source['guides']):
        mapped=[]
        for old in line:
            seed,mode=generic(old)
            if index<6: seed[1]=ribs[index+1]
            mapped.append(surface.z_project(seed,1)['position'])
        guides.append(mapped)
    result={'schemaVersion':1,'assetUrl':'/models/human-learning.glb','assetSha256':meta['glbSha256'],
            'sourceCommit':meta['sourceCommit'],'templateSha256':hashlib.sha256(template_path.read_bytes()).hexdigest(),
            'status':'Surface-attached study geometry; anatomical validation pending.',
            'landmarks':landmarks,'intercostalY':ribs,'points':points,'routes':routes,'guides':guides}
    from register_lower_leg import refine_lower_leg, SPEC_PATH as LEG_SPEC
    result=refine_lower_leg(result,surface,json.loads(LEG_SPEC.read_text()))
    from register_vessel_routes import refine, SPEC_PATH
    result=refine(result,surface,json.loads(SPEC_PATH.read_text()))
    output_path.parent.mkdir(parents=True,exist_ok=True)
    output_path.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({'points':len(points),'routes':len(routes),'guideLines':len(guides),
                      'maxSeedDistance':max(p['seedDistance'] for p in points.values()),
                      'reviewDistances':{k:round(p['seedDistance'],4) for k,p in points.items() if p['seedDistance']>.07}}))


if __name__=='__main__':
    register(*(pathlib.Path(p) for p in sys.argv[1:4]))
