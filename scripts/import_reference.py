"""Extract factual indication keywords; do not redistribute source prose or needling instructions.
Usage: python3 scripts/import_reference.py /path/to/authorized-input/acupoints.csv
"""
import csv, json, re, sys, pathlib, hashlib
source=pathlib.Path(sys.argv[1]); root=pathlib.Path(__file__).resolve().parents[1]
dictionary='''headache=头痛
asthma=哮喘
cough=咳嗽
diarrhea=泄泻
epilepsy=癫痫
vomiting=呕吐
irregular menstruation=月经不调
sore throat=咽喉痛
constipation=便秘
abdominal distension=腹胀
tinnitus=耳鸣
abdominal pain=腹痛
borborygmus=肠鸣
hernia=疝气
toothache=牙痛
febrile diseases=热病
deafness=耳聋
blurred vision=视物模糊
epistaxis=鼻衄
nocturnal emission=遗精
dysuria=小便不利
enuresis=遗尿
mental disorder=神志病
mastitis=乳痈
edema=水肿
pain in the hypochondriac region=胁痛
palpitation=心悸
mania=癫狂
dysmenorrhea=痛经
hiccup=呃逆
cardiac pain=心痛
pain in the chest=胸痛
neck rigidity=项强
nasal obstruction=鼻塞
dysentery=痢疾
insomnia=失眠
retention of urine=尿潴留
impotence=阳痿
scrofula=瘰疬
morbid leukorrhea=带下病
vertigo=眩晕
dizziness=头晕
gastric pain=胃痛
indigestion=消化不良
prolapse of the uterus=子宫脱垂
muscular atrophy=肌肉萎缩
uterine bleeding=崩漏
jaundice=黄疸
low back pain=腰痛
infantile convulsion=小儿惊风
migraine=偏头痛
facial paralysis=面瘫
rhinorrhea=流涕
hemorrhoids=痔疮
lower abdominal pain=小腹痛
acid regurgitation=反酸
swelling of the cheek=颊肿
anorexia=食欲不振
leukorrhea=带下病
malaria=疟疾
nausea=恶心
fullness in the chest=胸满
hemoptysis=咯血
goiter=瘿气
eyelid twitching=眼睑瞤动
beriberi=脚气
convulsion=抽搐
loss of consciousness=昏厥
ophthalmalgia=眼痛
amenorrhea=闭经
deviation of the mouth=口歪
lacrimation=流泪
insufficient lactation=乳少
irritability=烦躁
hemiplegia=半身不遂
night sweat=盗汗
spitting of blood=唾血
stomachache=胃痛
swelling and pain of the eye=目肿痛
redness of the eye=目赤
sudden loss of voice=暴喑
pain in the external genitalia=外阴痛
backache=背痛
difficulty in swallowing=吞咽困难
hoarseness=声音嘶哑
loss of voice=失音
fever=发热
pain in the wrist=腕痛
pain in the shoulder=肩痛
pain in the arm=臂痛
pain in the elbow=肘痛
pain in the knee=膝痛
pain in the neck=颈痛
pain in the leg=腿痛
pain in the heel=足跟痛
pain in the lumbar=腰痛
pain in the hypochondrium=胁痛
pain in the medial aspect of the upper arm=上臂内侧痛
spasmodic pain of the elbow and arm=肘臂挛痛
spasmodic pain of the thumb=拇指挛痛
feverish sensation in the palm=掌心热
pain and weakness of the wrist=腕痛无力
pain in the lower limbs=下肢疼痛
motor impairment=活动不利
dryness=干燥相关症状
thirst=口渴
diabetes=消渴相关症状
hematuria=尿血
lethargy=嗜睡
somnolence=嗜睡
sweating=汗出异常
stiffness=拘急强直
numbness=麻木
urticaria=荨麻疹
pruritus=瘙痒
eczema=湿疹
urinary incontinence=小便失禁
dysphagia=吞咽困难
prolapse of rectum=脱肛
prolapse of the rectum=脱肛
fainting=昏厥
apoplexy=中风
tonsillitis=乳蛾
trismus=牙关紧闭
stomatitis=口腔炎症
aphasia=失语
dyspepsia=消化不良
facial swelling=面肿
pain of the eye=眼痛
diplopia=复视
facial pain=面痛
chest pain=胸痛
abdominal fullness=腹满
chest distress=胸闷
nasal discharge=流涕
sinusitis=鼻窦炎
ascaris=蛔虫相关腹痛
pain in the sole=足心痛
calf=小腿部症状
ankle=踝部症状
hip joint=髋部症状
stiff tongue=舌强
pain of the shoulder=肩痛
depression=情志抑郁
fear=惊恐
pain and swelling of the knee=膝肿痛
pain and swelling of the throat=咽喉肿痛
pain and swelling of the eye=目肿痛
pain in the fingers=手指疼痛'''
terms=dict(line.split('=',1) for line in dictionary.splitlines())
manual={
 'HT2':['心痛','胁痛','肩臂痛'],'SI10':['肩部肿痛','肩臂酸痛无力'],'SI14':['肩背酸痛','颈项拘急疼痛'],
 'ST17':['乳中用作定位标志；现代针灸标准通常禁针禁灸，不作为操作穴'],
 'SI15':['咳嗽','气喘','肩背痛'],'BL16':['心痛','胸腹痛','寒热'],'BL26':['腰骶痛','腹胀','泄泻'],
 'BL27':['小腹胀痛','遗精','遗尿','腰骶痛'],'BL28':['小便不利','遗尿','腰骶痛'],
 'TE11':['头痛','目痛','肩臂痛'],'GB18':['头痛','眩晕','鼻塞'],'GB34':['胁痛','黄疸','膝痛','下肢痿痹'],
 'LR7':['膝部肿痛','下肢内侧疼痛'],'GV3':['腰骶痛','下肢痿痹','月经不调'],'GV26':['昏厥','口眼歪斜','腰脊痛'],
}
regions=[('anterior thoracic','胸前部'),('lateral thoracic','胸侧部'),('hypochondriac','胁肋部'),('abdomen','腹部'),('abdominal','腹部'),('thoracic region','胸部'),('lumbar','腰部'),('sacral','骶部'),('thoracic vertebra','胸椎旁背部'),('thoracic vertebrae','胸椎旁背部'),('cervical vertebra','颈椎旁'),('posterior thoracic','背部'),('back','背部'),('wrist','腕部'),('elbow','肘部'),('forearm','前臂'),('upper arm','上臂'),('aspect of the arm','上臂'),('finger','手指'),('thumb','拇指'),('palm','手掌'),('hand','手部'),('shoulder','肩部'),('axilla','腋部'),('sole','足底'),('toe','足趾'),('ankle','踝部'),('foot','足部'),('knee','膝部'),('thigh','大腿'),('leg','小腿'),('buttock','臀部'),('neck','颈部'),('face','面部'),('head','头部'),('scalp','头部'),('chin','颏部'),('mouth','口周'),('nasal','鼻部'),('ear','耳周'),('eyebrow','眉部'),('eye','眼周'),('perine','会阴部')]
out={};missing=[]
for row in csv.DictReader(source.open()):
 raw=row['Acupoint']; match=re.fullmatch(r'(LU|LI|ST|SP|HT|SI|BL|KI|PC|TE|GB|LR|CV|RN|Du) (\d+)',raw)
 if not match:continue
 channel=match[1].replace('Du','GV').replace('RN','CV');id=channel+match[2]
 ind=row['Indications'].lower();hits=[]
 for phrase,zh in terms.items():
  m=re.search(r'(?<![a-z])'+re.escape(phrase)+r'(?![a-z])',ind)
  if m:hits.append((m.start(),-len(phrase),zh))
 symptoms=[]
 for _,_,zh in sorted(hits):
  if zh not in symptoms:symptoms.append(zh)
 if id in manual:symptoms=manual[id]
 if not symptoms:missing.append((id,row['Indications']))
 loc=row['WHO Location'].lower().split(',')[0];region=next((zh for en,zh in regions if en in loc),'体表相关区域')
 # Broad region index is intentionally distinct from a clinical location definition.
 page=re.search(r'Page\s+(\d+)',row['Reference-WHO'])
 out[id]={'indications':'、'.join(symptoms[:6])+'。' if symptoms else '', 'region':region,'referencePage':int(page[1]) if page else None,'reference':'WHO 2008；Chinese Acupuncture and Moxibustion, 1999（经 TARA 整理）','sourceId':raw,'curation':'关键词摘编，人工补录条目已单独标识' if id in manual else '从来源提取常见主治关键词；非全文翻译','manual':id in manual}
(root/'lib'/'point-reference.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'count':len(out),'missing':missing,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()},ensure_ascii=False,indent=2))
