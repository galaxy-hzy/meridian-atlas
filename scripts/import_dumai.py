"""Import the reviewed Du-mai chapter; preserve this edition's differences.
Usage: python import_dumai.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='0e17f2d7e244f259f957721497e4a16f4732c0164b8433457482bac242f70cac'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":119708',html)
p=Paragraphs();p.feed(html)
main=[x for x in p.items if x.startswith('督乃阳脉之海')];collateral=[x for x in p.items if x.startswith('督脉别络')]
assert len(main)==len(collateral)==1
result={'title':'《奇经八脉考》· 督脉（李时珍）','revision':'119708','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/督脈&oldid=119708&variant=zh-hans','sourceSha256':EXPECTED,'passage':main[0],'collateral':collateral[0].split('《难经》')[0], 'scope':'固定公开转录；保留古文三十一穴、冲道等字形及主脉与别络区分，不将后文丹家论述并入循行；不等同于原书影印校勘。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(main[0]);print(result['collateral'])
