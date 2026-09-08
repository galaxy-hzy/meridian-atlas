"""Import the reviewed Yin-qiao chapter; preserve this edition's differences.
Usage: python import_yinqiao.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='72ae75afad40a67800fd4dc2998d3b7eb6b88c078dfb01f509c0e3a9c7463c6c'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":119701',html)
p=Paragraphs();p.feed(html)
items=[x for x in p.items if x.startswith('陰蹻者')];assert len(items)==1
passage=items[0];assert '凡八穴' in passage and '交貫沖脈' in passage
result={'title':'《奇经八脉考》· 阴跷脉（李时珍）','revision':'119701','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/陰蹻脈&oldid=119701','sourceSha256':EXPECTED,'passage':passage,'scope':'仅提取医家循行段；保留足少阳然谷等转录文字，现行然谷属足少阴肾经。后续丹家论述不并入路线，尚待影印校勘。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(passage)
