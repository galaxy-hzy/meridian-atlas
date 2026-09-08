"""Extract only factual identifiers and page references from the pinned standard PDF.
Requires pypdf. Usage: python3 scripts/import_standard_index.py INPUT.pdf
The PDF stays in Datasets; its prose is not copied into the app.
"""
from pypdf import PdfReader
from pathlib import Path
import re,json,hashlib,sys
source=Path(sys.argv[1])
root=Path(__file__).resolve().parents[1]
expected_sha256='777643c116fb3cd543a6a632a3ad36c4bfbedd8880aced0c6979a877694d7692'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected_sha256:
 raise ValueError('Unexpected PDF version; review page bounds and layout before importing')
entries={}
for page,doc in enumerate(PdfReader(source).pages,1):
 text=doc.extract_text()
 if not 14<=page<=45: continue
 for m in re.finditer(r'(5\.(\d+)\.(\d+))\s+([\u3400-\u9fff]+)\s+[^\n(]+\(([A-Z]{2}\d+\s*\+?\s*)\)',text):
  clause,_,_,name,code=m.groups(); code=re.sub(r'\s','',code)
  if code in entries: raise ValueError(code)
  entries[code]={'name':name,'clause':clause,'pdfPage':page}
print('count',len(entries),'counts',{c:sum(k.startswith(c) for k in entries) for c in ['LU','LI','ST','SP','HT','SI','BL','KI','PC','TE','GB','LR','GV','CV']})
print('GV24+',entries.get('GV24+'))
assert len(entries)==362
out={'standard':'GB/T 12346-2021','statusUrl':'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=397548AE7248D3D87DD15E0AB8107185','documentUrl':'https://www.ntcamsac.ac.cn/upload/std_info/202306192125376309.pdf','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'checkedAt':'2026-09-07','scope':'名称、代码、条款和 PDF 文件页码索引；不包含标准定位原文，不表示三维坐标已校准。','points':entries}
(root / 'lib/national-standard.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
