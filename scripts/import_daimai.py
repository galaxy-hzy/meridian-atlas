"""Import the reviewed Dai-mai chapter; preserve this edition's differences.
Usage: python import_daimai.py SOURCE.html OUTPUT.json
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='eb18bf7d6193d1c8c74f8f61042ff8af9b9f45c34799d36fcf26d23aac580836'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
 def handle_endtag(self,tag):
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED
html=raw.decode();assert re.search(r'"wgRevisionId":119710',html)
p=Paragraphs();p.feed(html)
items=[x for x in p.items if x.startswith('帶脈者')];assert len(items)==1
passage=items[0];assert '凡八穴' in passage and '圍身一周' in passage
result={'title':'《奇经八脉考》· 带脉（李时珍）','revision':'119710','url':'https://zh.wikisource.org/w/index.php?title=奇經八脈考/帶脈&oldid=119710','sourceSha256':EXPECTED,'passage':passage,'scope':'固定公开转录；原文围身一周未指定顺逆时针，因此环腰不显示方向动画。侧面列穴连线只是关联穴顺序，不等于完整实测路径。原古代尺寸与八穴记数保留，不替代现代标准；所引足少阴之正另作经别联系，不混作带脉主线。影印校勘仍待完成。'}
relations=[x for x in p.items if '足少陰之正' in x];assert len(relations)==1
result['kidneyDivergent']=relations[0]
result['relationNote']='这是所引足少阴经别与带脉的联系，不能把腘中当作带脉主脉起点；原文十四椎与模型骨骼尚未逐节校准。'
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(passage)
