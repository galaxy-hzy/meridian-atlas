"""Audit selected explicit shared-height constraints, not all anatomy.
Usage: audit_selected_levels.py REGISTRATION.json OUTPUT.json
Reports unresolved contradictions without treating an existing point as proof.
"""
from pathlib import Path
import sys,json,hashlib
GROUPS=[
 ('thyroid',['ST9','LI18','SI16'],'甲状软骨上缘',[24,16],False),
 ('cricoid',['ST10','LI17'],'环状软骨',[16,17],False),
 ('philtrum',['GV26','LI19'],'人中沟上1/3交点',[16,43],False),
 ('navel',['CV8','ST25','SP15','GB26'],'脐中水平',[44,18,22,38],False),
 ('lowerAbdomen',['CV4','GB27'],'脐下3寸',[44,38],False),
 ('pubis',['CV2','ST30','LR12'],'耻骨联合上缘',[44,19,41],False),
 ('occipital',['GV17','BL9','GB19'],'枕外隆凸上缘',[42,26,37],True),
]
def audit(data):
 result=[]
 facts=json.loads((Path(__file__).resolve().parents[1]/'lib/standard-location-facts.json').read_text())['points']
 for key,ids,label,pages,needs_anchor in GROUPS:
  positions={id:data['points'][id]['position'] for id in ids};ys=[p[1] for p in positions.values()];span=max(ys)-min(ys)
  result.append({'id':key,'anatomicalReference':label,'pdfPages':sorted({facts[id]['pdfPage'] for id in ids}),'clauses':{id:facts[id]['clause'] for id in ids},'positions':positions,'heightSpreadMeters':span,'consistentWithin1Micrometer':span<1e-6,'requiresIndependentAnchorReview':needs_anchor,'meaning':'Only shared model-height consistency; no proof of anatomical accuracy.'})
 return result
if __name__=='__main__':
 if len(sys.argv)!=3 or Path(sys.argv[2]).suffix!='.json':raise SystemExit('Usage: audit_selected_levels.py REGISTRATION.json OUTPUT.json')
 source,output=map(Path,sys.argv[1:]);raw=source.read_bytes();data=json.loads(raw)
 result={'scope':'Seven selected explicit height groups; not an exhaustive audit of 419 points.','registrationSha256':hashlib.sha256(raw).hexdigest(),'sourceUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','groups':audit(data)}
 output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({r['id']:round(r['heightSpreadMeters']*1000,6) for r in result['groups']}))
