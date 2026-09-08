"""Extract the public, unencrypted Yang-qiao paragraph from saved Shidian HTML.
Usage: python import_yangqiao.py SOURCE.html OUTPUT.json
"""
from pathlib import Path
import json,hashlib,sys
raw=Path(sys.argv[1]).read_bytes()
expected='25407494fab615aceb15dfb767242d86037cfd95c6ec688cd020fbab95794436'
assert hashlib.sha256(raw).hexdigest()==expected
html=raw.decode();start=html.index('陽蹻者')
pos=html.rfind('"content":',0,start)+len('"content":')
encoded,_=json.JSONDecoder().raw_decode(html[pos:])
paragraph=json.loads(encoded)
lines=paragraph['lines'];assert lines[0]['lineId']=='817' and lines[-1]['lineId']=='826'
passage=''.join(line['content'] for line in lines)
assert passage.startswith('陽蹻者') and passage.endswith('凡二十二穴。')
assert '肩〼' in passage and '入風池而終' in passage
result={'title':'《古今图书集成·艺术典》所录《奇经八脉考》· 阳跷脉','url':'https://www.shidianguji.com/zh/book/GJTS17/chapter/1lpfcduxqylnn','sourceSha256':expected,'snapshot':'2026-09-07','lineIds':[line['lineId'] for line in lines],'passage':passage,'note':'这是识典古籍公开转录快照，保留肩〼、附阳、巨窌等原字。现有肩髃对应参考另一站公开检索片段，尚未完成影印校勘。维基文库同名页误载阳维脉，已排除。原文起于跟中；默认图从申脉开始，可开启“跟中起始与肩面回行”查看新增起始区域，所有区域仍待解剖精校。'}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(passage)
