"""Extract point-name pinyin headings from pinned PDFs (requires pypdf).
Usage: python scripts/import_pronunciation.py GB12346.pdf GB40997.pdf OUTPUT.json
Then: node scripts/prepare-pronunciation.mjs OUTPUT.json
"""
import hashlib,json,re,sys
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
rows=[]
for pdf,index,key in zip(sys.argv[1:3],['national-standard.json','extra-standard.json'],['points','entries']):
 d=json.loads((root/'lib'/index).read_text());p=Path(pdf)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==d['sha256'],'Unreviewed source PDF'
 pages=PdfReader(p).pages
 entries=d[key].items() if key=='points' else [(e['id'],e) for e in d[key]]
 for id,e in entries:
  lines=[l for l in pages[e['pdfPage']-1].extract_text().splitlines() if l.startswith(e['clause']+' ')]
  assert len(lines)==1,(id,lines)
  match=re.match(r'\S+\s+(\S+)\s+([^()]+)',lines[0]);assert match and match[1]==e['name'],id
  rows.append(dict(id=id,name=e['name'],sourcePinyin=match[2].strip(),standard=d['standard'],pdfPage=e['pdfPage'],clause=e['clause'],sourceSha256=d['sha256']))
assert len(rows)==413
Path(sys.argv[3]).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
