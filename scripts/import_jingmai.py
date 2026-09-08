"""Extract only the twelve route passages from a pinned public-domain transcription.
Usage: python scripts/import_jingmai.py SOURCE.html OUTPUT.json
No indications, interventions or source editorial text are silently merged into route prose.
"""
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,sys
EXPECTED='4e358bf3a62201878e9a0ca7efc1a73a07df95b4ed8e503fe340fdd06696c4f9'
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.buf=[];self.items=[]
 def handle_starttag(self,tag,attrs):
  if tag=='p':self.inside=True;self.buf=[]
  if tag=='sub' and self.inside:self.buf.append('〔')
 def handle_endtag(self,tag):
  if tag=='sub' and self.inside:self.buf.append('〕')
  if tag=='p' and self.inside:self.items.append(''.join(self.buf).strip());self.inside=False
 def handle_data(self,data):
  if self.inside:self.buf.append(data)
raw=Path(sys.argv[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED,'Unreviewed source revision'
text=raw.decode();parser=Paragraphs();parser.feed(text)
heads=['肺手太阴','大肠手阳明','胃足阳明','脾足太阴','心手少阴','小肠手太阳','膀胱足太阳','肾足少阴','心主手厥阴','三焦手少阳','胆足少阳','肝足厥阴']
ids=['LU','LI','ST','SP','HT','SI','BL','KI','PC','TE','GB','LR'];passages={}
for id,head in zip(ids,heads):
 found=[n for n in parser.items if n.startswith(head)];assert len(found)==1,(head,len(found));route=found[0].split('是动则病')[0]
 assert '之脉' in route and '其支者' in route
 passages[id]=route
assert re.search(r'"wgRevisionId":2520099',text)
result={'title':'《黄帝内经·灵枢》经脉第十','revision':'2520099','url':'https://zh.wikisource.org/w/index.php?title=黃帝內經/靈樞第三卷&oldid=2520099&variant=zh-hans','sourceSha256':EXPECTED,'scope':'十二正经循行段公开转录；〔〕保留网页异文标注。网页文字未等同于古籍影印逐字校勘。','passages':passages}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Extracted',len(passages),'route passages')
