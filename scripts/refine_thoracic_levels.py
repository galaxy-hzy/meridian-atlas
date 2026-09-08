"""Align cervical/thoracic back points to shared, still-estimated GV levels.
Usage: python refine_thoracic_levels.py BASE.json BODY.glb OUTPUT.json
Does not validate vertebrae anatomically or change lateral proportions.
"""
from pathlib import Path
import copy, hashlib, json, re, sys
import numpy as np
from register_human import Surface, read_mesh

ROOT = Path(__file__).resolve().parents[1]
FACTS = ROOT / 'lib/standard-location-facts.json'
PATTERN = re.compile(r'第(\d+)([颈胸腰])椎棘突下')

def level(fact):
    for relation in fact['relations']:
        if relation['kind'] != 'anatomical':
            continue
        match = PATTERN.search(relation['detail'])
        if match:
            number, region = match.groups()
            return int(number) + {'颈': 0, '胸': 7, '腰': 19}[region], region
    return None

def refine(data, surface):
    if 'thoracicLevels' in data:
        raise ValueError('Use the preserved unrefined baseline')
    facts = json.loads(FACTS.read_text())['points']
    before = copy.deepcopy(data['points'])
    anchors = {level(p)[0]: id for id, p in facts.items()
               if id.startswith('GV') and level(p)}
    def height(index):
        if index in anchors:
            ref = anchors[index]
            return before[ref]['position'][1], [ref]
        lo = max(n for n in anchors if n < index)
        hi = min(n for n in anchors if n > index)
        a, b = [before[anchors[n]]['position'][1] for n in [lo, hi]]
        return a + (b-a)*(index-lo)/(hi-lo), [anchors[lo], anchors[hi]]
    rules = {}
    for id, fact in facts.items():
        found = level(fact)
        if id.startswith(('BL', 'SI')) and found and found[1] in ['颈', '胸']:
            rules[id] = {'index': found[0], 'clause': fact['clause'], 'pdfPage': fact['pdfPage']}
    rules['EX-B3'] = {'index': 15, 'standard': 'GB/T 40997-2021', 'clause': '7.3.3', 'pdfPage': 9}
    for id, rule in rules.items():
        y, refs = height(rule['index'])
        seed = np.array(before[id]['position']); seed[1] = y
        binding = surface.z_project(seed, -1)
        if abs(binding['position'][1]-y) > 1e-9:
            raise ValueError('Projection changed requested height: '+id)
        binding['regionRule'] = 'shared-thoracic-level'
        binding['proportionNote'] = '已统一同椎水平；督脉参照点仍为模型估计，旁开距离及真实椎体标志待解剖复核。'
        data['points'][id] = binding
        rule.update({'references': refs, 'height': y, 'previousPosition': before[id]['position']})
    key = lambda p: tuple(round(float(n), 9) for n in p)
    known = {key(p['position']) for p in before.values()}
    replacements = {key(before[id]['position']): data['points'][id]['position'] for id in rules}
    def connect(first, last):
        first, last = np.array(first), np.array(last)
        count = max(1, int(np.ceil(np.linalg.norm(last-first)/.012)))
        result = [first.tolist()] + [surface.nearest(first+(last-first)*i/count)['position'] for i in range(1,count)] + [last.tolist()]
        if any(np.linalg.norm(np.array(b)-a)>.025 for a,b in zip(result,result[1:])):
            return surface.surface_path(first,last)
        return result
    changed = []
    for channel, paths in data['routes'].items():
        rebuilt = []; touched = False
        for path in paths:
            if not any(key(p) in replacements for p in path):
                rebuilt.append(path); continue
            indexes = sorted({0,len(path)-1} | {i for i,p in enumerate(path) if key(p) in known})
            result = [replacements.get(key(path[0]),path[0])]
            for lo,hi in zip(indexes,indexes[1:]):
                first,last = path[lo],path[hi]
                segment = connect(replacements.get(key(first),first),replacements.get(key(last),last)) if key(first) in replacements or key(last) in replacements else path[lo:hi+1]
                result.extend(segment[1:])
            rebuilt.append(result); touched=True
        if touched: data['routes'][channel]=rebuilt; changed.append(channel)
    data['thoracicLevels'] = {'factsSha256':hashlib.sha256(FACTS.read_bytes()).hexdigest(),
        'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'rules':rules, 'changedRoutes':changed,
        'note':'同椎水平一致性修复，缺少直接督脉参照的胸椎层级在相邻参照之间插值；不是实际椎体定位证明。'}
    return data

if __name__ == '__main__':
    baseline,model,output=map(Path,sys.argv[1:4])
    data=json.loads(baseline.read_text());raw,v,n,i=read_mesh(model)
    if hashlib.sha256(raw).hexdigest()!=data['assetSha256']:raise ValueError('Model mismatch')
    result=refine(data,Surface(v,n,i))
    output.write_text(json.dumps(result,separators=(',',':'))+'\n')
    print(json.dumps({'changed':list(result['thoracicLevels']['rules']),'routes':result['thoracicLevels']['changedRoutes']},ensure_ascii=False))
