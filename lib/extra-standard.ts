import data from './extra-standard.json';
import type { Point, Vec3 } from './atlas';
import { extraIndicationStudies } from './extra-indications';

export const extraStandard = data;
export const extraCodeAliases: Record<string, string> = {
  'EX-HN13': 'EX-HN12',
  'M-HN14': 'EX-HN8',
  'M-UE24': 'EX-UE8',
  'M-LE34': 'EX-LE3',
  'M-LE26': 'ST35',
};
const oldKeys: Record<string, string> = {
  'EX-HN8': 'M-HN14',
  'EX-UE8': 'M-UE24',
  'EX-LE3': 'M-LE34',
};
// Authored template coordinates, subsequently attached to the learning mesh.
// Oral/nasal points use explicit external index markers until an internal
// anatomical model is available; they are not claimed to lie on the skin.
const additions: Record<string, Vec3> = {
  'EX-HN2': [0.067, 1.8, 0.143],
  'EX-HN9': [0.029, 1.674, 0.183],
  'EX-HN10': [0, 1.64, 0.15],
  'EX-HN11': [0, 1.627, 0.145],
  'EXTRA-XINSHE': [0.093, 1.535, -0.072],
  'EXTRA-XUEYADIAN': [0.1, 1.495, -0.092],
  'EXTRA-TITUO': [0.16, 0.944, 0.12],
  'EXTRA-JIEJI': [0, 1.124, -0.164],
  'EX-B6': [0.153, 1.025, -0.13],
  'EX-UE5': [0.71, 0.737, 0.025],
  'EX-UE6': [0.841, 0.69, 0.006],
  'EX-LE1': [0.237, 0.533, 0.115],
  'EX-LE8': [0.148, 0.115, 0.021],
  'EX-LE9': [0.23, 0.103, 0.01],
  'EXTRA-LINEITING': [0.2, 0.008, 0.247],
  'EX-LE11': [0.189, 0.018, 0.283],
  'EX-LE12': [0.193, 0.04, 0.294],
};
const aliases: Record<string, string> = {
  'EX-HN1': '神聪',
  'EX-HN8': '鼻通；鼻穿；M-HN14（旧资料编号）',
  'EX-HN12': '金津；玉液；EX-HN13',
  'EXTRA-XINSHE': '新识',
  'EX-HN15': '颈百劳；百劳（须区分古籍同名穴）',
  'EXTRA-TITUO': '归髎',
  'EX-B1': '喘息',
  'EX-B2': '华佗夹脊；佗脊',
  'EX-B3': '胃管下俞；胃下俞；胰俞；消渴穴（部分教学称呼）',
  'EX-B7': '腰目',
  'EX-B8': '十七椎下',
  'M-UE48': '肩内陵；前腋；腋缝',
  'EX-UE8': '落枕；M-UE24（旧资料编号）',
  'EX-UE11': '鬼城',
  'EX-LE2': '膝顶',
  'EX-LE3': 'M-LE34（旧资料编号）',
  'EX-LE11': '独会',
  'EX-LE10': '八冲',
};
const related: Record<string, string> = {
  'EX-HN12':
    '国标将金津、玉液作为一个条目；左金津、右玉液两个穴点保留。两个标准代码均可检索。',
  'EX-B3':
    '国标规范名为胃脘下俞；附录 C 列胃管下俞、胃下俞。“胰俞”见已收录的消渴公开方案；“消渴穴”仅作为教学检索词，不代表另一独立国标穴。',
  'EX-UE8':
    '“落枕”保留为旧资料检索名称，外劳宫为本标准规范名；对应关系另见南京中医药大学学报 2016 年研究的对照组选穴说明。',
  'EX-UE9':
    '国标注释：第 4、5 指间穴点与液门 TE2 同位。穴组中的重合点不计作新的经穴。',
  'EX-UE11': '国标注释：中指尖端穴点与中冲 PC9 同位。',
  'EX-LE10':
    '国标注释：第 1、2 趾间、第 2、3 趾间及第 4、5 趾间穴点分别与行间 LR2、内庭 ST44、侠溪 GB43 同位。',
  'EX-LE4': '外膝眼按现代定位与犊鼻 ST35 同位；本条仅为内膝眼。',
};

export function standardiseExtras(legacy: Point[]): Point[] {
  const originals = new Map(legacy.map((p) => [p.id, p]));
  const used = new Set(['EX-HN13', 'M-LE26']);
  const standard: Point[] = data.entries.map((entry, index) => {
    const oldId = oldKeys[entry.id] || entry.id;
    const old = originals.get(oldId);
    const study = extraIndicationStudies[entry.id];
    used.add(oldId);
    const position = old?.position || additions[entry.id];
    if (!position)
      throw new Error(`Missing extra-point template: ${entry.name}`);
    const p: Point = {
      ...old,
      id: entry.id,
      name: entry.name,
      channel: 'EX',
      index: index + 1,
      position,
      roles: ['经外奇穴'],
      indications: study?.summary || old?.indications,
      indicationStudy: study,
      catalog: 'standard-extra',
      displayCode: entry.standardCodes.length
        ? entry.standardCodes.join(' / ')
        : '国标未设代码',
      standardCodes: entry.standardCodes,
      aliases: aliases[entry.id] || old?.aliases,
      location: `区域：${entry.region}。定位关系：${entry.relations.join('；')}。`,
      locationReference: {
        label: `${data.standard} · ${entry.clause} · PDF 第 ${entry.pdfPage} 页`,
        url: `${data.documentUrl}#page=${entry.pdfPage}`,
      },
      catalogNote: [
        related[entry.id],
        entry.editorialNote,
        !entry.standardCodes.length
          ? '本标准以汉字和拼音命名，未指定英文代码。旧资料编号保留检索用途。'
          : undefined,
      ]
        .filter(Boolean)
        .join(' '),
      source: study
        ? '主治摘要据下列文献；名称与定位另据 GB/T 40997-2021。'
        : old?.source ||
          '本条名称与基本定位据 GB/T 40997-2021；该标准不提供本条主治摘要，主治另待文献核对。',
    };
    if (!entry.standardCodes.length && old)
      p.aliases = [p.aliases, old.id + '（旧资料编号）']
        .filter(Boolean)
        .join('；');
    if (['EX-HN9', 'EX-HN10', 'EX-HN11', 'EX-HN12'].includes(p.id))
      p.modelPlacement =
        '本穴位于口鼻内部；现有模型没有黏膜与舌部解剖层，面部标记仅作条目索引。';
    if (p.id === 'EX-HN12') {
      p.positions = [
        originals.get('EX-HN12')!.position,
        originals.get('EX-HN13')!.position,
      ];
      p.bilateral = false;
    }
    if (['EX-HN10', 'EX-HN11', 'EXTRA-JIEJI'].includes(p.id))
      p.bilateral = false;
    if (p.id === 'EX-LE1')
      p.positions = [
        [0.177, 0.533, 0.115],
        [0.297, 0.533, 0.115],
      ];
    if (p.id === 'EX-LE12')
      p.positions = [
        [0.135, 0.041, 0.298],
        [0.18, 0.044, 0.302],
        [0.217, 0.042, 0.292],
        [0.25, 0.038, 0.278],
        [0.277, 0.032, 0.26],
      ];
    return p;
  });
  const other = legacy
    .filter((p) => !used.has(p.id))
    .map((p) =>
      p.id === 'EX-HN3'
        ? p
        : {
            ...p,
            catalog: 'supplement-extra' as const,
            displayCode: '资料 ' + p.id,
            catalogNote:
              p.id === 'EX-B9'
                ? '腰奇未收入 GB/T 40997-2021。这里保留旧资料条目供对照，不计入 51 个国标奇穴。'
                : p.id === 'EX-LE5'
                  ? '膝眼为内、外膝眼的合称；国标奇穴目录单列内膝眼，外膝眼与犊鼻 ST35 同位。此处保留穴组资料，不计入国标奇穴数。'
                  : '此为补充资料条目，未收入 GB/T 40997-2021 的 51 个奇穴；资料编号不作为本标准代码。',
          },
    );
  return [...standard, ...other].map((p, index) => ({
    ...p,
    ...(extraIndicationStudies[p.id]
      ? {
          indications: extraIndicationStudies[p.id].summary,
          indicationStudy: extraIndicationStudies[p.id],
          source: '主治摘要据所附文献；目录归属与定位来源另列。',
        }
      : {}),
    index: index + 1,
  }));
}
