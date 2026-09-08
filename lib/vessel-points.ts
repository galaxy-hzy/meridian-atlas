export type VesselStudy = {
  chapter: string;
  references: { label: string; url: string }[];
  members: { id: string; sourceName: string; landmark?: boolean }[];
  note: string;
};
const members = (pairs: string): VesselStudy['members'] =>
  pairs.split(' ').map((pair) => {
    const [id, sourceName] = pair.split(':');
    return { id, sourceName };
  });
const source = (chapter: string) => [
  {
    label: `《奇经八脉考》· ${chapter}（维基文库转录）`,
    url: `https://zh.wikisource.org/wiki/奇經八脈考/${chapter}`,
  },
];
export const confluentPointIds: Record<string, string[]> = {
  CHONG: ['SP4'],
  DAI: ['GB41'],
  YINQIAO: ['KI6'],
  YANGQIAO: ['BL62'],
  YINWEI: ['PC6'],
  YANGWEI: ['TE5'],
  CV: ['LU7'],
  GV: ['SI3'],
};
// A book-specific association index, not a modern standardized list of all
// crossing points. Point IDs refer to existing national-standard records.
export const vesselStudies: Record<string, VesselStudy> = {
  CHONG: {
    chapter: '沖脈',
    references: source('沖脈'),
    members: members(
      'ST30:氣衝 KI11:橫骨 KI12:大赫 KI13:氣穴 KI14:四滿 KI15:中注 KI16:肓腧 KI17:商曲 KI18:石關 KI19:陰都 KI20:通谷 KI21:幽門',
    ),
    note: '按本篇“浮而外者”自气冲至幽门的列穴整理，共12个名称。肓腧对应肓俞，通谷依本段腹部语境对应腹通谷 KI20，不是足通谷 BL66。公孙是八脉交会穴，另列，不当作本段循行中的穴。',
  },
  DAI: {
    chapter: '帶脈',
    references: source('帶脈'),
    members: members('LR13:章門 GB26:帶脈 GB27:五樞 GB28:維道'),
    note: '本篇从章门起，继列带脉、五枢、维道，原文作“凡八穴”。目录按4个穴名列出，左右穴点不重复造编号；足临泣另属八脉交会穴。',
  },
  YINQIAO: {
    chapter: '陰蹻脈',
    references: source('陰蹻脈'),
    members: [
      { id: 'KI2', sourceName: '然谷', landmark: true },
      ...members('KI6:照海 KI8:交信 BL1:睛明'),
    ],
    note: '然谷是原文起点的参照：“然谷穴之后”，不把它直接改称交会穴。原转录将然谷写作足少阳，与现行规范归属足少阴不同；代码仍用 KI2。缺盆、人迎在此用于经过区域的描述，未直接当作新增交会穴。',
  },
  YANGQIAO: {
    chapter: '陽蹻脈',
    references: [
      {
        label:
          '《古今图书集成·艺术典》所录《奇经八脉考》· 阳跷脉（识典古籍转录）',
        url: 'https://www.shidianguji.com/zh/book/GJTS17/chapter/1lpfcduxqylnn',
      },
      {
        label: '《奇经八脉考》· 阳跷脉（中国哲学书电子化计划，肩髃文字对照）',
        url: 'https://ctext.org/wiki.pl?chapter=741969&if=en',
      },
    ],
    members: members(
      'BL62:申脉 BL61:僕參 BL59:附陽 SI10:臑俞 LI16:巨骨 LI15:肩髃 ST4:地倉 ST3:巨窌 ST1:承泣 BL1:睛明 GB20:風池',
    ),
    note: '依所录阳跷脉段列11个穴名，保留古文附阳、巨窌等字形，对应现行跗阳、巨髎。识典“肩”后缺字，以中国哲学书电子化计划公开索引中的“会手阳明、少阳于肩髃”校对；该站全文本轮未取到。维基文库同名页误载阳维正文，未采用。此表不宣称穷尽其他版本的列穴。',
  },
  YINWEI: {
    chapter: '陰維脈',
    references: source('陰維脈'),
    members: members(
      'KI9:築賓 SP13:府舍 SP15:大橫 SP16:腹哀 LR14:期門 CV22:天突 CV23:廉泉',
    ),
    note: '本篇明确列出7个穴名。原文“凡一十四穴”保留为古籍记数，不能直接按现代正中穴与双侧穴的计数换算；也不把其他版本的增补穴混作本篇原文。内关是八脉交会穴，另列。',
  },
  YANGWEI: {
    chapter: '陽維脈',
    references: source('陽維脈'),
    members: members(
      'BL63:金門 GB35:陽交 GB29:居髎 LI14:臂臑 TE13:臑會 TE15:天髎 GB21:肩井 SI10:臑腧 GB20:風池 GB19:腦空 GB18:承靈 GB17:正營 GB16:目窗 GB15:臨泣 GB14:陽白 GB13:本神',
    ),
    note: '按本篇金门至本神列16个穴名，顺序是该版本的叙述顺序。临泣依头部语境对应头临泣 GB15，不是足临泣 GB41；臑腧对应臑俞。外关另属八脉交会穴。',
  },
};
