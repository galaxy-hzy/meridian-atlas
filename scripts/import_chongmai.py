"""Import the reviewed Chong-mai chapter; preserve this edition's differences.
Usage: python import_chongmai.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='587ef329c472d7e67cde3780419b42def764c3e9258526bb5eb25faee3c57b07'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":2084064',html)
p=Paragraphs();p.feed(html)
items=[x for x in p.items if x.startswith('冲为经脉之海')];assert len(items)==1
chapter=items[0]
main=chapter.split('灵枢经曰：')[0].strip()
back=chapter.split('灵枢经曰：',1)[1].split('血气盛则')[0].strip()
lower='夫冲脉者'+chapter.split('夫冲脉者',1)[1].split('故其脉常动')[0]
assert '上循背里' in back and '入大指之间' in lower
result={'title':'《奇经八脉考》· 冲脉（李时珍）','revision':'2084064','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/沖脈&oldid=2084064&variant=zh-hans','sourceSha256':EXPECTED,'passage':main,'backAndMouth':back,'descending':lower,'scope':'固定公开转录，仅提取循行相关段；保留右上行等原文，原书引文与各原典尚待影印交叉校勘。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(main);print(back);print(lower)
