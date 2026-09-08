"""Extract factual anatomical relations from the pinned national standard.

Usage: python3 scripts/import_standard_locations.py INPUT.pdf OUTPUT.json
Requires pypdf. Only the basic location sentence of each indexed clause is
converted to a region and relation records. Notes and procedural prose are not
copied. The source PDF remains in Datasets and is linked by its indexed page.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from pypdf import PdfReader

EXPECTED='777643c116fb3cd543a6a632a3ad36c4bfbedd8880aced0c6979a877694d7692'
# Checked against rendered PDF pages 19 and 20, not global OCR substitutions.
CORRECTIONS={
    'ST26': [('脐中下l寸','脐中下1寸')],
    'ST41': [('长伸肌腱与趾长伸肌腱','拇长伸肌腱与趾长伸肌腱')],
}


def relation(clause):
    clause=clause.removeprefix('在')
    if clause.startswith('横平'):
        return {'kind':'level','reference':clause[2:]}
    # A distance into the hairline is not measured from the ear/notch below it.
    if '入发际' not in clause:
        m=re.fullmatch(r'(.*?)(侧上方|侧后方|直上|直下|旁开|内下|外侧|上|下|前|后)(\d+(?:\.\d+)?)寸(.*)',clause)
        if m and m[1]:
            reference=m[1];approx=reference.startswith('约当')
            return {'kind':'distance','reference':reference.removeprefix('约当'),
                    'direction':m[2],'cun':float(m[3]),'detail':m[4], 'approximate':approx}
    m=re.fullmatch(r'(.+?)\(([A-Z]{2}\d+\+?)\)与(.+?)\(([A-Z]{2}\d+\+?)\)(?:的)?连线上',clause)
    if m:
        return {'kind':'line','names':[m[1],m[3]],'pointIds':[m[2],m[4]]}
    if clause in ['前正中线上','后正中线上','腋中线上']:
        return {'kind':'axis','reference':clause[:-1]}
    m=re.fullmatch(r'第(\d+)肋间隙(?:中)?',clause)
    if m: return {'kind':'intercostal','space':int(m[1])}
    # Complex muscle/bone relations retain their factual anatomical terms;
    # do not guess a distance, region or direction from an incomplete pattern.
    return {'kind':'anatomical','detail':clause.rstrip('。')}


def generate(pdf,output):
    if hashlib.sha256(pdf.read_bytes()).hexdigest()!=EXPECTED:
        raise ValueError('Unreviewed source PDF')
    root=Path(__file__).resolve().parents[1]
    index=json.loads((root/'lib/national-standard.json').read_text())
    lines=[]
    for page in PdfReader(pdf).pages[13:45]:
        lines.extend(l for l in page.extract_text().splitlines()
                     if not re.match(r'^(订单号|中国中医科学院|GB/T|\s*\d+\s*$)',l.strip()))
    text='\n'.join(lines)
    headings=list(re.finditer(r'(5\.\d+\.\d+)\s+([\u3400-\u9fff]+)\s+[^\n(]+\(([A-Z]{2}\d+\s*\+?\s*)\)',text))
    points={};corrections=[]
    for i,m in enumerate(headings):
        id=re.sub(r'\s','',m[3]);entry=index['points'][id]
        if id in points or entry['clause']!=m[1] or entry['name']!=m[2]: raise ValueError('Index mismatch: '+id)
        body=text[m.end():headings[i+1].start() if i+1<len(headings) else len(text)]
        if '。' not in body: raise ValueError('No complete basic sentence: '+id)
        main=re.sub(r'\s','',body.split('。',1)[0])
        if not main.startswith('在') or any(t in main for t in ['注:', '订单','GB/T','针刺','斜刺']):
            raise ValueError('Unexpected basic location layout: '+id)
        for old,new in CORRECTIONS.get(id,[]):
            if main.count(old)!=1: raise ValueError('Correction no longer matches: '+id)
            main=main.replace(old,new)
            corrections.append({'id':id,'pdfPage':entry['pdfPage'],'extracted':old,'corrected':new})
        region,*clauses=main[1:].split(',')
        if not clauses: raise ValueError('Missing relations: '+id)
        points[id]={'region':region,'relations':[relation(c) for c in clauses],
                    'clause':entry['clause'],'pdfPage':entry['pdfPage']}
    if set(points)!=set(index['points']) or len(points)!=362: raise ValueError('Incomplete standard coverage')
    result={'standard':index['standard'],'sourceSha256':EXPECTED,'sourceUrl':index['documentUrl'],
            'scope':'Basic location facts of all 362 points; commentary notes and procedures excluded; no anatomical validation of 3D coordinates.',
            'extractionCorrections':corrections,'points':points}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'points':len(points),'relations':sum(len(p['relations']) for p in points.values()),'corrections':len(corrections)}))


if __name__=='__main__': generate(*(Path(p) for p in sys.argv[1:3]))
