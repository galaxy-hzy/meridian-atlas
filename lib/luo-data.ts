// Classical route summaries and modern point identities are kept separate from geometry.
export const luoSource = {
  title: '《灵枢经》四库全书本 · 卷三 · 经脉第十',
  url: 'https://zh.wikisource.org/w/index.php?title=靈樞經_(四庫全書本)/卷03&oldid=640550',
  note: '依据公开古籍转录整理循行，原文节选补加标点；古文距离、异名与现代国标定位分开阅读。十五络不是十五个新穴，也不另配十五个时辰。',
};
export type LuoStudy = {
  id: string;
  name: string;
  parent: string;
  pointId: string;
  connection: string;
  summary: string;
  excerpt: string;
  note?: string;
};
export const luoStudies: LuoStudy[] = [
  {
    id: 'LUO-LU',
    name: '手太阴络脉',
    parent: 'LU',
    pointId: 'LU7',
    connection: '别走手阳明',
    summary: '列缺分出，随手太阴经直入掌中，散于鱼际；并与手阳明相联系。',
    excerpt:
      '手太隂之别名曰列缺，起於腕上分間，並太隂之經，直入掌中，散入於魚際。',
    note: '原文中的古代距离不替代列缺现行国标定位。别走表里经不等于直接连到对方原穴。',
  },
  {
    id: 'LUO-LI',
    name: '手阳明络脉',
    parent: 'LI',
    pointId: 'LI6',
    connection: '别入手太阴',
    summary:
      '偏历分出，联系手太阴；另一支沿臂、肩髃上行至颊、齿，又分支入耳，合于宗脉。',
    excerpt:
      '手陽明之别名曰偏歴，去腕三寸，别入太隂。其别者上循臂乘肩髃，上曲頰偏齒；其别者入耳，合於宗脈。',
  },
  {
    id: 'LUO-ST',
    name: '足阳明络脉',
    parent: 'ST',
    pointId: 'ST40',
    connection: '别走足太阴',
    summary:
      '丰隆分出，联系足太阴；沿胫骨外侧向上联系头项、会合诸经之气，再向下联系喉咽。',
    excerpt:
      '足陽明之别名曰豐隆，去踝八寸，别走太隂。其别者循脛骨外亷，上絡頭項，合諸經之氣，下絡喉嗌。',
  },
  {
    id: 'LUO-SP',
    name: '足太阴络脉',
    parent: 'SP',
    pointId: 'SP4',
    connection: '别走足阳明',
    summary: '公孙分出，联系足阳明；另一支向内联系肠胃。',
    excerpt: '足太隂之别名曰公孫，去本節之後一寸，别走陽明。其别者入絡腸胃。',
  },
  {
    id: 'LUO-HT',
    name: '手少阴络脉',
    parent: 'HT',
    pointId: 'HT5',
    connection: '别走手太阳',
    summary: '通里分出，上行入心中，联系舌根和目系；并与手太阳相联系。',
    excerpt:
      '手少隂之别名曰通里，去腕一寸半，别而上行，循經入於心中，繫舌本，屬目系。',
    note: '本转录先写“去腕一寸半”，后有“取之掌后一寸”；穴位详情以现行国标为准。',
  },
  {
    id: 'LUO-SI',
    name: '手太阳络脉',
    parent: 'SI',
    pointId: 'SI7',
    connection: '内注手少阴',
    summary: '支正分出，向内联系手少阴；另向上至肘，联系肩髃区域。',
    excerpt: '手太陽之别名曰支正，上腕五寸，内注少隂。其别者上走肘，絡肩髃。',
  },
  {
    id: 'LUO-BL',
    name: '足太阳络脉',
    parent: 'BL',
    pointId: 'BL58',
    connection: '别走足少阴',
    summary: '飞扬分出，联系足少阴。原文未列出这段联系的全部经过区域。',
    excerpt: '足太陽之别名曰飛陽，去踝七寸，别走少隂。',
    note: '古名“飞阳”对应今名飞扬；示意只表达经间联系，不编造固定终点穴。',
  },
  {
    id: 'LUO-KI',
    name: '足少阴络脉',
    parent: 'KI',
    pointId: 'KI4',
    connection: '别走足太阳',
    summary:
      '大钟在内踝后分出，绕跟联系足太阳；另随经上达心包，并向下贯入腰脊。',
    excerpt:
      '足少隂之别名曰大鍾，當踝後繞跟，别走太陽。其别者并經上走于心包，下外貫腰脊。',
    note: '绕跟段已贴合当前模型脚跟表面；昆仑只作足太阳侧的绘图参照，不认定为固定终点。体表贴合不等于精确解剖验证。',
  },
  {
    id: 'LUO-PC',
    name: '手厥阴络脉',
    parent: 'PC',
    pointId: 'PC6',
    connection: '联系心包络、心系',
    summary: '内关从两筋之间分出，随经上行，联系心包络与心系。',
    excerpt:
      '手心主之别名曰内關，去腕二寸，出於兩筋之間，循經以上，繫於心包絡心系。',
    note: '所选《灵枢》本条没有逐字写“别走少阳”，本图按该条实际记载绘制；表里配穴另见配穴页。',
  },
  {
    id: 'LUO-TE',
    name: '手少阳络脉',
    parent: 'TE',
    pointId: 'TE5',
    connection: '合于心主',
    summary: '外关分出，绕臂外侧，注入胸中，与心主相合。',
    excerpt: '手少陽之别名曰外闗，去腕二寸，外遶臂，注胷中，合心主。',
  },
  {
    id: 'LUO-GB',
    name: '足少阳络脉',
    parent: 'GB',
    pointId: 'GB37',
    connection: '别走足厥阴',
    summary: '光明分出，联系足厥阴，并向下散布于足背。',
    excerpt: '足少陽之别名曰光明，去踝五寸，别走厥隂，下絡足跗。',
  },
  {
    id: 'LUO-LR',
    name: '足厥阴络脉',
    parent: 'LR',
    pointId: 'LR5',
    connection: '别走足少阳',
    summary: '蠡沟分出，联系足少阳；另沿小腿上行至阴部。',
    excerpt:
      '足厥隂之别名曰蠡溝，去内踝五寸，别走少陽。其别者徑脛上睪，結於莖。',
  },
  {
    id: 'LUO-CV',
    name: '任脉络',
    parent: 'CV',
    pointId: 'CV15',
    connection: '散布腹部',
    summary: '从鸠尾区域分出，向下散布腹部。',
    excerpt: '任脈之别名曰尾翳，下鳩尾，散於腹。',
    note: '本条络名为“尾翳”，现代络穴用鸠尾 CV15；保留古今名称对应。',
  },
  {
    id: 'LUO-GV',
    name: '督脉络',
    parent: 'GV',
    pointId: 'GV1',
    connection: '左右别走足太阳',
    summary:
      '长强分出，沿脊旁上达项部、散于头部；至肩胛部左右分走足太阳，并贯入脊旁。',
    excerpt:
      '督脈之别名曰長强，挾膂上項，散頭上，下當肩胛左右，别走太陽，入貫膂。',
  },
  {
    id: 'LUO-SP-MAJOR',
    name: '脾之大络',
    parent: 'SP',
    pointId: 'SP21',
    connection: '布于胸胁',
    summary: '大包分出，分布于胸胁，联系周身络脉。',
    excerpt: '脾之大絡名曰大包，出淵腋下三寸，布胸脇。',
    note: '大包与公孙是十五络中的两个独立条目。胃之大络虚里不计入本次十五络目录。',
  },
];
export function getLuoStudy(id: string | null | undefined) {
  return luoStudies.find((study) => study.id === id);
}
export const luoMemory =
  '肺列缺，大肠偏历，胃丰隆，脾公孙；心通里，小肠支正，膀胱飞扬，肾大钟；心包内关，三焦外关，胆光明，肝蠡沟；任鸠尾，督长强，脾大络大包。';
