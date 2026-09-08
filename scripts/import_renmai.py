"""Import the reviewed Ren-mai chapter; preserve this edition's differences.
Usage: python import_renmai.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='2458e7ec3c1ba5d3d7def9cc322233aa92959c41aad791e96b34f6086d3c565b'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":119706',html)
p=Paragraphs();p.feed(html)
main=[x for x in p.items if x.startswith('任为阴脉之海')];collateral=[x for x in p.items if x.startswith('任冲之别络')]
assert len(main)==len(collateral)==1
result={'title':'《奇经八脉考》· 任脉（李时珍）','revision':'119706','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/任脈&oldid=119706&variant=zh-hans','sourceSha256':EXPECTED,'passage':main[0],'collateral':collateral[0].split('实则')[0], 'scope':'固定公开转录；保留古文列穴数、承桨字形及与难经甲乙经的差异说明；不等同于原书影印校勘。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(main[0]);print(result['collateral'])
