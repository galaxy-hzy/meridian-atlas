"""Import basic facts from the pinned GB/T 40997-2021 source PDF.
Usage: python import_extra_standard.py INPUT.pdf OUTPUT.json (requires pypdf).
Eight entries have no English code in this standard. Their application keys
are internal identifiers, never newly assigned standard acupuncture codes.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from pypdf import PdfReader

EXPECTED = 'aa7368f760ef347031e356860000a086d68e51996575cb2dad977691f1b54bf9'
UNCODED = {'安眠':'N-HN54', '牵正':'N-HN20', '新设':'EXTRA-XINSHE',
           '血压点':'EXTRA-XUEYADIAN', '提托':'EXTRA-TITUO', '接脊':'EXTRA-JIEJI',
           '肩前':'M-UE48', '里内庭':'EXTRA-LINEITING'}

def generate(pdf, output):
    if hashlib.sha256(pdf.read_bytes()).hexdigest() != EXPECTED:
        raise ValueError('Unreviewed extra-point source PDF')
    rows=[]
    for number,page in enumerate(PdfReader(pdf).pages,1):
        if not 6 <= number <= 12: continue
        for line in page.extract_text().splitlines():
            if re.match(r'^(订单号|中国中医科学院|GB/T|\s*\d+\s*$|图\s*\d+\s*$)',line.strip()): continue
            rows.append((number,line))
    headings=[]
    for i,(page,line) in enumerate(rows):
        m=re.match(r'^(7\.\d+\.\d+)\s+([\u3400-\u9fff]+)\s+(.+)$',line)
        if m: headings.append((i,page,m))
    entries=[]
    for n,(start,page,m) in enumerate(headings):
        stop=headings[n+1][0] if n+1<len(headings) else len(rows)
        codes=re.findall(r'EX-[A-Z]+\d+',m[3])
        name=m[2]; key=codes[0] if codes else UNCODED[name]
        body=re.sub(r'\s','', ''.join(l for _,l in rows[start+1:stop]))
        main=re.split(r'。|\((?:见|图见)',body,1)[0]
        note=None
        if name=='安眠':
            if main.count('连7线')!=1: raise ValueError('Changed source typography')
            main=main.replace('连7线','连线')
            note='原 PDF 第 7 页排印为“连7线”；定位事实按翳风与风池连线中点整理，原文保留供核对。'
        if not main.startswith('在') or any(t in main for t in ['注:','GB/T','订单','针刺']):
            raise ValueError('Unexpected basic location: '+name+': '+main)
        region,*relations=main[1:].split(',')
        if not relations: raise ValueError('Missing anatomical relations')
        item={'id':key,'name':name,'standardCodes':codes,'clause':m[1],'pdfPage':page,
              'region':region,'relations':relations}
        if note: item['editorialNote']=note
        entries.append(item)
    if len(entries)!=51 or len({e['id'] for e in entries})!=51:
        raise ValueError('Incorrect standard coverage')
    if [sum(e['clause'].startswith(f'7.{n}.') for e in entries) for n in range(1,7)] != [17,2,8,1,11,12]:
        raise ValueError('Incorrect regional coverage')
    result={'standard':'GB/T 40997-2021','sha256':EXPECTED,
            'documentUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192147233032.pdf',
            'statusUrl':'https://std.samr.gov.cn/gb/search/gbDetailed?id=D1E86BE73ADC430EE05397BE0A0A206B',
            'scope':'51 standard entries; basic location facts only. Eight uncoded entries use internal app keys. Indications and clinical procedures are not inferred from this location standard.',
            'entries':entries}
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'entries':len(entries),'uncoded':sum(not e['standardCodes'] for e in entries),'paired':sum(len(e['standardCodes'])>1 for e in entries)}))

if __name__=='__main__': generate(*(Path(a) for a in sys.argv[1:3]))
