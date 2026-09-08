"""Import the reviewed Yang-wei chapter; preserve this edition's differences.
Usage: python import_yangwei.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='a56bf16eaf168048ebba9c455b5a04926c4079afe1e0e4b590346cea89d1d2c9'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":2305131',html)
p=Paragraphs();p.feed(html)
items=[x for x in p.items if x.startswith('陽維起於')];assert len(items)==1
passage=items[0];assert '凡三十二穴' in passage and '上至本神而止' in passage
result={'title':'《奇经八脉考》· 阳维脉（李时珍）','revision':'2305131','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/陽維脈&oldid=2305131','sourceSha256':EXPECTED,'passage':passage,'scope':'固定公开转录，保留原段字形及三十二穴记数；循头入耳至本神只指定经过区域，形状和深度未作解剖校准，原书影印仍待核对。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(passage)
