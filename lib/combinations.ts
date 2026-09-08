export const diabetesSource = {
  title: '山西省卫生健康委员会公开诊疗方案 · 消渴病',
  url: 'https://wjw.shanxi.gov.cn/tzgg/zcwj/202203/P020220311553533901443.pdf#page=106',
  date: '2022 年公开文件',
  section: 'PDF 第 106 页（印刷页 106），针灸治疗',
};
export const diabetesCore = ['EX-B3', 'BL13', 'BL20', 'BL23', 'SP6', 'KI3'];
export const diabetesPatterns = [
  {
    id: 'core',
    name: '基础配穴',
    points: [],
    explanation:
      '该公开方案将背俞穴与足少阴、足太阴经相关穴位配合，以下按原文件整理。',
  },
  {
    id: 'upper',
    name: '上消',
    points: ['LU9', 'HT8'],
    explanation:
      '原方案上消配穴：在基础穴组上加入太渊、少府。仅用于文献比照，不能据“口渴”自行判断证型。',
  },
  {
    id: 'middle',
    name: '中消',
    points: ['ST44', 'SP8'],
    explanation: '原方案中消配穴：在基础穴组上加入内庭、地机。',
  },
  {
    id: 'lower',
    name: '下消',
    points: ['KI7', 'LR3'],
    explanation: '原方案下消配穴：在基础穴组上加入复溜、太冲。',
  },
];
export const classicalDiabetes = {
  title: '《针灸大成》鼻口门 · 消渴条',
  url: 'https://zh.wikisource.org/wiki/針灸大成/卷十#鼻口門',
  points: [
    'GV26',
    'CV24',
    'EX-HN12',
    'LI11',
    'PC8',
    'LR3',
    'LR2',
    'SP5',
    'KI2',
    'SP1',
  ],
  note: '原文金津、玉液两名均保留于“金津玉液”组穴详情；按现行标准合并显示为 10 个条目，仍包含左右两个穴点。此为古籍同一病候条下的用穴集合，原文未要求所有穴同时使用。古代“消渴”不能直接等同于全部现代糖尿病。',
};
export const confluentPairs = [
  { name: '公孙 · 内关', vessels: '冲脉 / 阴维脉', points: ['SP4', 'PC6'] },
  { name: '足临泣 · 外关', vessels: '带脉 / 阳维脉', points: ['GB41', 'TE5'] },
  { name: '后溪 · 申脉', vessels: '督脉 / 阳跷脉', points: ['SI3', 'BL62'] },
  { name: '列缺 · 照海', vessels: '任脉 / 阴跷脉', points: ['LU7', 'KI6'] },
];
