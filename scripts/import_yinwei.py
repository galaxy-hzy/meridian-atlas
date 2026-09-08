"""Import the reviewed Yin-wei chapter; preserve this edition's differences.
Usage: python import_yinwei.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='35985e2b0cde48cbecea91c944c54c552ee82d332648c1f4c39d1c051c5252bc'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":119698',html)
p=Paragraphs();p.feed(html)
items=[x for x in p.items if x.startswith('陰維起於')];assert len(items)==1
passage=items[0];assert '凡一十四穴' in passage and '上至頂前而終' in passage
result={'title':'《奇经八脉考》· 阴维脉（李时珍）','revision':'119698','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/陰維脈&oldid=119698','sourceSha256':EXPECTED,'passage':passage,'scope':'固定公开转录；保留顶前终点、古代尺寸与十四穴记数，不把它们替代现代定位标准。顶前未指定现代穴名，仍待影印与跨版本核对。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(passage)
