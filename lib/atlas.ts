import standardIndications from './standard-indications.json';
import { getLuoStudy, luoStudies } from './luo-data';
import primaryIndicationScan from './primary-indication-scan.json';
import {
  vesselStudies,
  confluentPointIds,
  type VesselStudy,
} from './vessel-points';
import reference from './point-reference.json';
import { extraCatalog } from './extra-points';
import { extraCodeAliases, extraStandard } from './extra-standard';
import type { IndicationStudy } from './extra-indications';
import { classicSongs, extraordinarySong } from './classics';
import nationalStandard from './national-standard.json';
import { locationFacts, describeLocationFacts } from './location-facts';
import { applyPlacementRules } from './placement-rules';
import { attachHumanMesh } from './human-mesh';
import {
  standardLocations,
  describeStandardLocation,
} from './standard-locations';
export type Vec3 = [number, number, number];
export type Point = {
  id: string;
  name: string;
  channel: string;
  index: number;
  position: Vec3;
  roles: string[];
  location?: string;
  indications?: string;
  indicationStudy?: IndicationStudy;
  additionalIndicationStudies?: IndicationStudy[];
  source?: string;
  aliases?: string;
  displayCode?: string;
  standardCodes?: string[];
  catalog?: 'standard-extra' | 'supplement-extra';
  catalogNote?: string;
  positions?: Vec3[];
  bilateral?: boolean;
  locationReference?: { label: string; url: string };
  modelPlacement?: string;
  templatePosition?: Vec3;
  templatePositions?: Vec3[];
};
export type RoutePresentation = {
  note: string;
  sequential: boolean;
  paths: {
    label: string;
    kind: string;
    closed?: boolean;
    animate?: boolean;
    mirror?: boolean;
    anchorIds: string[];
  }[];
};
export type Channel = {
  id: string;
  name: string;
  short: string;
  polarity: string;
  color: string;
  hour?: number;
  branch?: string;
  pair?: string;
  points: Point[];
  confluentPointIds?: string[];
  vesselStudy?: VesselStudy;
  routePresentation?: RoutePresentation;
  route: Vec3[];
  routes?: Vec3[][];
  templateRoute?: Vec3[];
  templateRoutes?: Vec3[][];
  note: string;
};

// Coordinates are authored schematic positions, not anatomical measurements.
type Seed = [
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  string,
];
const seeds: Seed[] = [
  [
    'LU',
    '手太阴肺经',
    '肺',
    '手三阴',
    '#65d9eb',
    3,
    '寅',
    'LI',
    '中府 云门 天府 侠白 尺泽 孔最 列缺 经渠 太渊 鱼际 少商',
  ],
  [
    'LI',
    '手阳明大肠经',
    '大肠',
    '手三阳',
    '#efb36a',
    5,
    '卯',
    'LU',
    '商阳 二间 三间 合谷 阳溪 偏历 温溜 下廉 上廉 手三里 曲池 肘髎 手五里 臂臑 肩髃 巨骨 天鼎 扶突 口禾髎 迎香',
  ],
  [
    'ST',
    '足阳明胃经',
    '胃',
    '足三阳',
    '#e8c264',
    7,
    '辰',
    'SP',
    '承泣 四白 巨髎 地仓 大迎 颊车 下关 头维 人迎 水突 气舍 缺盆 气户 库房 屋翳 膺窗 乳中 乳根 不容 承满 梁门 关门 太乙 滑肉门 天枢 外陵 大巨 水道 归来 气冲 髀关 伏兔 阴市 梁丘 犊鼻 足三里 上巨虚 条口 下巨虚 丰隆 解溪 冲阳 陷谷 内庭 厉兑',
  ],
  [
    'SP',
    '足太阴脾经',
    '脾',
    '足三阴',
    '#e49a72',
    9,
    '巳',
    'ST',
    '隐白 大都 太白 公孙 商丘 三阴交 漏谷 地机 阴陵泉 血海 箕门 冲门 府舍 腹结 大横 腹哀 食窦 天溪 胸乡 周荣 大包',
  ],
  [
    'HT',
    '手少阴心经',
    '心',
    '手三阴',
    '#f184a0',
    11,
    '午',
    'SI',
    '极泉 青灵 少海 灵道 通里 阴郄 神门 少府 少冲',
  ],
  [
    'SI',
    '手太阳小肠经',
    '小肠',
    '手三阳',
    '#dc85b8',
    13,
    '未',
    'HT',
    '少泽 前谷 后溪 腕骨 阳谷 养老 支正 小海 肩贞 臑俞 天宗 秉风 曲垣 肩外俞 肩中俞 天窗 天容 颧髎 听宫',
  ],
  [
    'BL',
    '足太阳膀胱经',
    '膀胱',
    '足三阳',
    '#83a6f1',
    15,
    '申',
    'KI',
    '睛明 攒竹 眉冲 曲差 五处 承光 通天 络却 玉枕 天柱 大杼 风门 肺俞 厥阴俞 心俞 督俞 膈俞 肝俞 胆俞 脾俞 胃俞 三焦俞 肾俞 气海俞 大肠俞 关元俞 小肠俞 膀胱俞 中膂俞 白环俞 上髎 次髎 中髎 下髎 会阳 承扶 殷门 浮郄 委阳 委中 附分 魄户 膏肓 神堂 譩譆 膈关 魂门 阳纲 意舍 胃仓 肓门 志室 胞肓 秩边 合阳 承筋 承山 飞扬 跗阳 昆仑 仆参 申脉 金门 京骨 束骨 足通谷 至阴',
  ],
  [
    'KI',
    '足少阴肾经',
    '肾',
    '足三阴',
    '#9e9dea',
    17,
    '酉',
    'BL',
    '涌泉 然谷 太溪 大钟 水泉 照海 复溜 交信 筑宾 阴谷 横骨 大赫 气穴 四满 中注 肓俞 商曲 石关 阴都 腹通谷 幽门 步廊 神封 灵墟 神藏 彧中 俞府',
  ],
  [
    'PC',
    '手厥阴心包经',
    '心包',
    '手三阴',
    '#ba8ce6',
    19,
    '戌',
    'TE',
    '天池 天泉 曲泽 郄门 间使 内关 大陵 劳宫 中冲',
  ],
  [
    'TE',
    '手少阳三焦经',
    '三焦',
    '手三阳',
    '#d4a0e1',
    21,
    '亥',
    'PC',
    '关冲 液门 中渚 阳池 外关 支沟 会宗 三阳络 四渎 天井 清泠渊 消泺 臑会 肩髎 天髎 天牖 翳风 瘈脉 颅息 角孙 耳门 耳和髎 丝竹空',
  ],
  [
    'GB',
    '足少阳胆经',
    '胆',
    '足三阳',
    '#91c97a',
    23,
    '子',
    'LR',
    '瞳子髎 听会 上关 颔厌 悬颅 悬厘 曲鬓 率谷 天冲 浮白 头窍阴 完骨 本神 阳白 头临泣 目窗 正营 承灵 脑空 风池 肩井 渊腋 辄筋 日月 京门 带脉 五枢 维道 居髎 环跳 风市 中渎 膝阳关 阳陵泉 阳交 外丘 光明 阳辅 悬钟 丘墟 足临泣 地五会 侠溪 足窍阴',
  ],
  [
    'LR',
    '足厥阴肝经',
    '肝',
    '足三阴',
    '#63c9ac',
    1,
    '丑',
    'GB',
    '大敦 行间 太冲 中封 蠡沟 中都 膝关 曲泉 阴包 足五里 阴廉 急脉 章门 期门',
  ],
  [
    'CV',
    '任脉',
    '任脉',
    '奇经八脉',
    '#eebd93',
    -1,
    '',
    '',
    '会阴 曲骨 中极 关元 石门 气海 阴交 神阙 水分 下脘 建里 中脘 上脘 巨阙 鸠尾 中庭 膻中 玉堂 紫宫 华盖 璇玑 天突 廉泉 承浆',
  ],
  [
    'GV',
    '督脉',
    '督脉',
    '奇经八脉',
    '#a0c9e6',
    -1,
    '',
    '',
    '长强 腰俞 腰阳关 命门 悬枢 脊中 中枢 筋缩 至阳 灵台 神道 身柱 陶道 大椎 哑门 风府 脑户 强间 后顶 百会 前顶 囟会 上星 神庭 素髎 水沟 兑端 龈交',
  ],
];
type Anchor = [number, number, number, number];
const anchors: Record<string, Anchor[]> = {
  LU: [
    [1, 0.34, 1.39, 0.19],
    [2, 0.36, 1.45, 0.16],
    [3, 0.48, 1.27, 0.13],
    [4, 0.5, 1.21, 0.13],
    [5, 0.58, 1.09, 0.115],
    [6, 0.65, 0.95, 0.12],
    [7, 0.69, 0.84, 0.105],
    [8, 0.7, 0.81, 0.1],
    [9, 0.7, 0.79, 0.1],
    [10, 0.715, 0.75, 0.105],
    [11, 0.704, 0.704, 0.11],
  ],
  LI: [
    [1, 0.785, 0.65, 0.08],
    [4, 0.758, 0.73, 0.065],
    [5, 0.733, 0.8, 0.035],
    [11, 0.616, 1.1, 0.005],
    [15, 0.39, 1.43, 0.035],
    [16, 0.32, 1.48, 0],
    [18, 0.117, 1.5, 0.14],
    [19, 0.036, 1.63, 0.188],
    [20, 0.041, 1.67, 0.19],
  ],
  ST: [
    [1, 0.066, 1.711, 0.18],
    [2, 0.073, 1.692, 0.18],
    [3, 0.078, 1.668, 0.18],
    [4, 0.053, 1.635, 0.184],
    [5, 0.1, 1.612, 0.145],
    [6, 0.123, 1.637, 0.11],
    [7, 0.134, 1.684, 0.087],
    [8, 0.114, 1.79, 0.08],
    [9, 0.065, 1.527, 0.11],
    [12, 0.208, 1.452, 0.145],
    [13, 0.19, 1.42, 0.183],
    [18, 0.172, 1.262, 0.189],
    [19, 0.09, 1.23, 0.188],
    [25, 0.09, 1.04, 0.18],
    [30, 0.08, 0.87, 0.135],
    [31, 0.172, 0.84, 0.157],
    [32, 0.2, 0.69, 0.134],
    [34, 0.22, 0.53, 0.108],
    [35, 0.23, 0.465, 0.115],
    [36, 0.23, 0.42, 0.117],
    [40, 0.23, 0.24, 0.105],
    [41, 0.206, 0.1, 0.11],
    [42, 0.206, 0.065, 0.17],
    [45, 0.232, 0.04, 0.29],
  ],
  SP: [
    [1, 0.115, 0.04, 0.29],
    [3, 0.121, 0.052, 0.215],
    [4, 0.123, 0.055, 0.18],
    [5, 0.13, 0.103, 0.05],
    [6, 0.13, 0.17, 0.028],
    [9, 0.12, 0.445, 0.025],
    [10, 0.134, 0.51, 0.11],
    [11, 0.13, 0.7, 0.11],
    [12, 0.09, 0.873, 0.12],
    [15, 0.19, 1.04, 0.148],
    [16, 0.225, 1.19, 0.155],
    [17, 0.255, 1.27, 0.15],
    [20, 0.26, 1.405, 0.165],
    [21, 0.285, 1.3, 0.035],
  ],
  HT: [
    [1, 0.37, 1.355, 0.012],
    [2, 0.49, 1.21, 0.031],
    [3, 0.547, 1.095, 0.051],
    [4, 0.67, 0.851, 0.078],
    [7, 0.704, 0.79, 0.068],
    [8, 0.751, 0.724, 0.07],
    [9, 0.812, 0.683, 0.057],
  ],
  SI: [
    [1, 0.828, 0.669, 0.012],
    [3, 0.792, 0.71, -0.022],
    [4, 0.768, 0.764, -0.035],
    [5, 0.743, 0.8, -0.048],
    [8, 0.606, 1.083, -0.069],
    [9, 0.372, 1.365, -0.09],
    [10, 0.345, 1.419, -0.109],
    [11, 0.219, 1.345, -0.144],
    [12, 0.229, 1.447, -0.135],
    [13, 0.174, 1.437, -0.148],
    [14, 0.128, 1.454, -0.129],
    [15, 0.076, 1.469, -0.101],
    [16, 0.08, 1.518, 0.007],
    [17, 0.113, 1.589, 0.048],
    [18, 0.1, 1.665, 0.139],
    [19, 0.148, 1.687, 0.04],
  ],
  BL: [
    [1, 0.028, 1.715, 0.179],
    [2, 0.04, 1.753, 0.17],
    [3, 0.04, 1.785, 0.136],
    [7, 0.062, 1.823, -0.026],
    [9, 0.063, 1.753, -0.146],
    [10, 0.064, 1.538, -0.087],
    [11, 0.075, 1.463, -0.144],
    [17, 0.08, 1.29, -0.173],
    [23, 0.074, 1.101, -0.13],
    [30, 0.07, 0.888, -0.137],
    [31, 0.037, 0.965, -0.166],
    [34, 0.039, 0.895, -0.148],
    [35, 0.026, 0.865, -0.12],
    [36, 0.182, 0.823, -0.135],
    [37, 0.193, 0.68, -0.111],
    [40, 0.184, 0.476, -0.063],
    [41, 0.16, 1.451, -0.144],
    [46, 0.175, 1.288, -0.15],
    [50, 0.15, 1.166, -0.121],
    [54, 0.18, 0.866, -0.134],
    [55, 0.193, 0.402, -0.097],
    [57, 0.203, 0.294, -0.092],
    [58, 0.254, 0.246, -0.033],
    [60, 0.239, 0.105, -0.023],
    [62, 0.248, 0.071, 0.017],
    [64, 0.26, 0.049, 0.164],
    [67, 0.286, 0.032, 0.236],
  ],
  KI: [
    [1, 0.18, 0.014, 0.175],
    [2, 0.126, 0.066, 0.135],
    [3, 0.132, 0.106, -0.015],
    [4, 0.13, 0.09, -0.03],
    [5, 0.13, 0.068, -0.019],
    [6, 0.127, 0.076, 0.027],
    [7, 0.129, 0.169, -0.022],
    [8, 0.121, 0.171, 0.012],
    [9, 0.122, 0.27, -0.033],
    [10, 0.124, 0.478, -0.016],
    [11, 0.026, 0.877, 0.156],
    [16, 0.026, 1.04, 0.19],
    [21, 0.027, 1.245, 0.184],
    [22, 0.09, 1.279, 0.196],
    [27, 0.091, 1.452, 0.142],
  ],
  PC: [
    [1, 0.239, 1.329, 0.167],
    [2, 0.458, 1.307, 0.14],
    [3, 0.565, 1.1, 0.128],
    [4, 0.649, 0.939, 0.126],
    [5, 0.675, 0.878, 0.124],
    [6, 0.687, 0.853, 0.123],
    [7, 0.716, 0.796, 0.112],
    [8, 0.768, 0.718, 0.09],
    [9, 0.802, 0.622, 0.084],
  ],
  TE: [
    [1, 0.827, 0.63, 0.027],
    [3, 0.791, 0.732, -0.013],
    [4, 0.752, 0.8, -0.021],
    [5, 0.729, 0.855, -0.028],
    [6, 0.715, 0.887, -0.028],
    [7, 0.721, 0.9, -0.031],
    [10, 0.604, 1.095, -0.087],
    [14, 0.379, 1.425, -0.062],
    [15, 0.25, 1.473, -0.078],
    [16, 0.084, 1.531, -0.048],
    [17, 0.123, 1.627, -0.009],
    [19, 0.135, 1.73, -0.039],
    [20, 0.138, 1.754, 0.02],
    [21, 0.15, 1.707, 0.056],
    [22, 0.148, 1.737, 0.072],
    [23, 0.099, 1.757, 0.134],
  ],
  GB: [
    [1, 0.09, 1.716, 0.144],
    [2, 0.15, 1.67, 0.044],
    [3, 0.15, 1.705, 0.086],
    [4, 0.116, 1.773, 0.06],
    [7, 0.14, 1.738, 0.014],
    [9, 0.138, 1.76, -0.04],
    [12, 0.107, 1.661, -0.098],
    [13, 0.1, 1.798, 0.106],
    [14, 0.066, 1.777, 0.146],
    [15, 0.062, 1.813, 0.105],
    [19, 0.083, 1.739, -0.132],
    [20, 0.085, 1.566, -0.094],
    [21, 0.258, 1.482, -0.024],
    [22, 0.307, 1.332, 0],
    [23, 0.29, 1.302, 0.099],
    [24, 0.155, 1.251, 0.169],
    [25, 0.221, 1.132, -0.027],
    [26, 0.249, 1.055, 0.006],
    [27, 0.229, 0.942, 0.092],
    [28, 0.242, 0.915, 0.048],
    [29, 0.26, 0.905, -0.004],
    [30, 0.248, 0.857, -0.099],
    [31, 0.29, 0.664, 0.012],
    [33, 0.261, 0.5, 0.028],
    [34, 0.259, 0.431, 0.032],
    [39, 0.259, 0.195, 0.021],
    [40, 0.262, 0.095, 0.064],
    [41, 0.26, 0.058, 0.19],
    [44, 0.273, 0.034, 0.26],
  ],
  LR: [
    [1, 0.133, 0.041, 0.302],
    [2, 0.145, 0.048, 0.261],
    [3, 0.158, 0.057, 0.208],
    [4, 0.135, 0.11, 0.093],
    [5, 0.129, 0.251, 0.056],
    [6, 0.124, 0.291, 0.047],
    [7, 0.121, 0.421, 0.023],
    [8, 0.121, 0.475, 0.005],
    [9, 0.119, 0.597, 0.055],
    [10, 0.092, 0.775, 0.078],
    [11, 0.079, 0.819, 0.099],
    [12, 0.068, 0.87, 0.12],
    [13, 0.239, 1.185, 0.094],
    [14, 0.174, 1.271, 0.183],
  ],
  CV: [
    [1, 0, 0.843, 0],
    [2, 0, 0.876, 0.164],
    [8, 0, 1.04, 0.197],
    [14, 0, 1.237, 0.18],
    [17, 0, 1.337, 0.199],
    [22, 0, 1.493, 0.097],
    [23, 0, 1.547, 0.117],
    [24, 0, 1.62, 0.15],
  ],
  GV: [
    [1, 0, 0.853, -0.121],
    [2, 0, 0.918, -0.181],
    [4, 0, 1.106, -0.139],
    [10, 0, 1.37, -0.169],
    [14, 0, 1.49, -0.098],
    [15, 0, 1.569, -0.096],
    [16, 0, 1.62, -0.142],
    [19, 0, 1.798, -0.105],
    [20, 0, 1.849, 0],
    [24, 0, 1.797, 0.134],
    [25, 0, 1.691, 0.213],
    [26, 0, 1.65, 0.175],
    [27, 0, 1.636, 0.18],
    [28, 0, 1.633, 0.168],
  ],
};
const roleMap: Record<string, number[]> = {
  LU: [11, 10, 9, 8, 5, 9, 7],
  LI: [1, 2, 3, 5, 11, 4, 6],
  ST: [45, 44, 43, 41, 36, 42, 40],
  SP: [1, 2, 3, 5, 9, 3, 4],
  HT: [9, 8, 7, 4, 3, 7, 5],
  SI: [1, 2, 3, 5, 8, 4, 7],
  BL: [67, 66, 65, 60, 40, 64, 58],
  KI: [1, 2, 3, 7, 10, 3, 4],
  PC: [9, 8, 7, 5, 3, 7, 6],
  TE: [1, 2, 3, 6, 10, 4, 5],
  GB: [44, 43, 41, 38, 34, 40, 37],
  LR: [1, 2, 3, 4, 8, 3, 5],
};
export const roleNames = ['井', '荥', '输', '经', '合', '原', '络'];
export function interpolate(list: Anchor[], index: number): Vec3 {
  const b = list.findIndex((a) => a[0] >= index);
  if (b <= 0) return list[0].slice(1) as Vec3;
  const a = list[b - 1],
    z = list[b],
    t = (index - a[0]) / (z[0] - a[0]);
  return [1, 2, 3].map((k) => a[k] + (z[k] - a[k]) * t) as Vec3;
}
export const channels: Channel[] = seeds.map(
  ([id, name, short, polarity, color, hour, branch, pair, names]) => {
    const points = names.split(' ').map(
      (name, i): Point => ({
        id: `${id}${i + 1}`,
        name,
        channel: id,
        index: i + 1,
        position: interpolate(anchors[id], i + 1),
        roles: roleNames.filter((_, r) => roleMap[id]?.[r] === i + 1),
      }),
    );
    return {
      id,
      name,
      short,
      polarity,
      color,
      hour: hour < 0 ? undefined : hour,
      branch,
      pair,
      points,
      route: points.map((p) => p.position),
      note: '体表经穴顺序示意；未显示完整体内分支，三维位置待专业校准。',
    };
  },
);
// GB/T 12346-2021 inserts Yintang between GV24 and GV25 without
// renumbering the existing points. Keep its old URL codes as aliases below.
const governor = channels.find((c) => c.id === 'GV')!;
const yintang = extraCatalog.find((p) => p.id === 'EX-HN3')!;
const yintangStudy: IndicationStudy = {
  kind: 'secondary',
  summary:
    '痴呆、痫证、失眠、健忘、头痛、眩晕、鼻衄、鼻渊、小儿惊风等传统主治列举。',
  references: [
    {
      label: '中国医药信息查询平台 · 印堂穴（详细主治）',
      url: 'https://m.dayi.org.cn/acupuncture/1141758.html',
    },
  ],
  note: '核对现代术语网页，非古籍原版或疗效研究。网页附注说明原经外奇穴 EX-HN3 现归督脉；本应用按现行国标使用 GV24+，旧编号仅用于检索。摘要选录部分病候，未展开产科急症或操作方法。',
};
governor.points.splice(24, 0, {
  ...yintang,
  id: 'GV24+',
  indications: yintangStudy.summary,
  indicationStudy: yintangStudy,
  channel: 'GV',
  index: 25,
  roles: [],
  bilateral: false,
  aliases: 'EX-HN3；GV29（旧编号）；印堂',
});
governor.points.forEach((p, i) => {
  p.index = i + 1;
});
governor.route = governor.points.map((p) => p.position);

const extraSeeds: [string, string, string[], Vec3[], string][] = [
  [
    'CHONG',
    '冲脉',
    ['SP4'],
    [
      [0.055, 0.86, 0.14],
      [0.058, 1.05, 0.19],
      [0.075, 1.27, 0.185],
      [0.055, 1.49, 0.12],
    ],
    '起于胞中、与任督同源的传统循行概念；当前显示腹胸段示意。八脉交会穴：公孙。',
  ],
  [
    'DAI',
    '带脉',
    ['GB41'],
    Array.from(
      { length: 49 },
      (_, i) =>
        [
          0.255 * Math.cos((i / 48) * Math.PI * 2),
          1.055,
          0.15 * Math.sin((i / 48) * Math.PI * 2),
        ] as Vec3,
    ),
    '环腰一周的传统循行示意。八脉交会穴：足临泣；带脉、五枢、维道等为交会穴。',
  ],
  [
    'YINQIAO',
    '阴跷脉',
    ['KI6'],
    [
      [0.126, 0.076, 0.027],
      [0.115, 0.45, 0.018],
      [0.092, 0.78, 0.065],
      [0.11, 1.04, 0.166],
      [0.16, 1.31, 0.173],
      [0.08, 1.52, 0.11],
      [0.028, 1.715, 0.179],
    ],
    '从足内侧上行至目内眦的概念示意。八脉交会穴：照海。',
  ],
  [
    'YANGQIAO',
    '阳跷脉',
    ['BL62'],
    [
      [0.248, 0.071, 0.017],
      [0.267, 0.45, 0.028],
      [0.27, 0.84, -0.015],
      [0.31, 1.26, 0],
      [0.39, 1.43, 0.035],
      [0.116, 1.62, 0.08],
      [0.028, 1.715, 0.179],
    ],
    '从足外侧上行至头目的概念示意。八脉交会穴：申脉。',
  ],
  [
    'YINWEI',
    '阴维脉',
    ['PC6'],
    [
      [0.122, 0.27, -0.033],
      [0.11, 0.6, 0.04],
      [0.11, 0.86, 0.13],
      [0.2, 1.05, 0.16],
      [0.174, 1.271, 0.183],
      [0, 1.493, 0.097],
    ],
    '沿下肢内侧上行联络腹胸咽喉的概念示意。八脉交会穴：内关。',
  ],
  [
    'YANGWEI',
    '阳维脉',
    ['TE5'],
    [
      [0.254, 0.17, -0.015],
      [0.26, 0.46, 0],
      [0.26, 0.9, 0],
      [0.31, 1.3, -0.045],
      [0.25, 1.473, -0.078],
      [0.085, 1.566, -0.094],
      [0.083, 1.739, -0.132],
      [0.1, 1.798, 0.106],
    ],
    '沿下肢外侧与肩颈头部联络的概念示意。八脉交会穴：外关。',
  ],
];
channels.find((c) => c.id === 'BL')!.routes = [
  channels.find((c) => c.id === 'BL')!.route.slice(0, 40),
  [
    channels.find((c) => c.id === 'BL')!.route[9],
    ...channels.find((c) => c.id === 'BL')!.route.slice(40, 54),
    channels.find((c) => c.id === 'BL')!.route[39],
    ...channels.find((c) => c.id === 'BL')!.route.slice(54),
  ],
];
export const pointById: Record<string, Point> = Object.fromEntries(
  channels.flatMap((c) => c.points.map((p) => [p.id, p])),
);
for (const [id, name, confluent, route, note] of extraSeeds)
  channels.push({
    id,
    name,
    short: name,
    polarity: '奇经八脉',
    color: '#71d7c4',
    points: [
      ...new Set([
        ...(vesselStudies[id]?.members.map((p) => p.id) || []),
        ...confluent,
      ]),
    ].map((p) => pointById[p]),
    vesselStudy: vesselStudies[id],
    route,
    note,
  });
for (const c of channels) c.confluentPointIds = confluentPointIds[c.id];
export const primaryChannels = channels.filter((c) => c.hour !== undefined);
export function channelAtHour(hour: number) {
  if (!Number.isFinite(hour)) throw new Error('Hour must be finite');
  const h = ((hour % 24) + 24) % 24;
  return primaryChannels.find((c) => (h - c.hour! + 24) % 24 < 2)!;
}
export function timeLabel(hour: number) {
  if (!Number.isFinite(hour)) throw new Error('Hour must be finite');
  const minutes = Math.floor((((hour % 24) + 24) % 24) * 60 + 1e-7) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const diabetesHealthSource = {
  label: 'NCCIH · 糖尿病与补充健康方法',
  url: 'https://www.nccih.nih.gov/health/diabetes-and-dietary-supplements-what-you-need-to-know',
  scope: '未经证实的方法不能替代糖尿病规范治疗。',
};
export const sources = [
  {
    label: 'GB/T 40997-2021 · 经外奇穴名称与定位（51 条）',
    url: extraStandard.statusUrl,
    scope:
      '现行奇穴目录与中文基本定位。金津玉液合为一组；未设英文代码的 8 条不另造标准编号。旧资料和同位穴另作说明。',
  },
  {
    label: 'MakeHuman · CC0 人体网格',
    url: 'https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.ASSETS.md',
    scope:
      '提取基础人体网格并调整前臂学习体位；通用资产并非医学影像，也未还原特定人物。',
  },
  {
    label: 'GB/T 12346-2021 · 经穴名称与定位（362 经穴）',
    url: nationalStandard.statusUrl,
    scope:
      '默认目录采用现行国标：印堂 GV24+ 归督脉。362 穴基本定位要点已整理，详情链接到正文对应页；条文注释、文字校订与三维定位校准分别处理。',
  },
  {
    label: 'WHO · 标准针灸穴名（361 经穴）',
    url: 'https://www.who.int/publications/i/item/9290611057',
    scope: '穴名、标准编码参考；不意味着三维坐标经 WHO 验证。',
  },
  {
    label: 'TARA · 经穴本体与资料来源',
    url: 'https://github.com/SciCrunch/TARA-Ontology-Repository',
    scope: '穴名、传统主治与定位资料核对入口。',
  },
  {
    label: '十二时辰与经脉对应 · 连州市卫生健康局',
    url: 'https://www.lianzhou.gov.cn/qylzwsj/gkmlpt/content/1/1736/post_1736096.html',
    scope: '传统时辰配属参考，不代表血管循环或现代生理测量。',
  },
  diabetesHealthSource,
];
export function mnemonic(c: Channel) {
  return classicSongs[c.id]?.text || extraordinarySong.text;
}
export const extraPoints: Point[] = extraCatalog.filter(
  (p) => p.id !== 'EX-HN3',
);
const refs: Record<
  string,
  {
    indications: string;
    region: string;
    referencePage: number | null;
    reference: string;
    curation: string;
  }
> = reference;
for (const p of Object.values(pointById)) {
  const r = refs[p.id];
  if (!r) continue;
  p.indications = r.indications;
  p.location = `体表区域：${r.region}。现代标准的完整文字定位见 WHO《西太平洋地区标准针灸穴位定位》${r.referencePage ? '第 ' + r.referencePage + ' 页' : ''}。模型位置为近似示意。`;
  p.source = r.reference + '；' + r.curation;
}
for (const p of extraPoints) pointById[p.id] = p;

const nationalIndex: Record<
  string,
  { name: string; clause: string; pdfPage: number }
> = nationalStandard.points;
for (const [id, entry] of Object.entries(nationalIndex)) {
  const p = pointById[id];
  p.locationReference = {
    label: `GB/T 12346-2021 · ${entry.clause} · PDF 第 ${entry.pdfPage} 页`,
    url: `${nationalStandard.documentUrl}#page=${entry.pdfPage}`,
  };
}
pointById.ST35.aliases = '外膝眼；M-LE26（旧资料编号）';
pointById.TE11.aliases = '清冷渊（所核古籍版本用字，现代标准名称为清泠渊）';
applyPlacementRules(pointById);
// Standard text is authoritative; model-generation rules must not shorten or
// replace its anatomical landmarks. Preserve the separately authored LI digest.
for (const [id, location] of Object.entries(standardLocations)) {
  pointById[id].location = locationFacts[id]
    ? describeLocationFacts(locationFacts[id]) +
      (location.postureNote ? `体位提示：${location.postureNote}` : '')
    : describeStandardLocation(location);
}
for (const c of channels) {
  if (c.points.some((p) => p.modelPlacement) && c.id.length === 2)
    c.route = c.points.map((p) => p.position);
}
attachHumanMesh(pointById, channels);

const pointCodeAliases: Record<string, string> = {
  ...extraCodeAliases,
  'EX-HN3': 'GV24+',
  GV29: 'GV24+',
};
export function resolvePointId(value: string): string | null {
  const id = value.trim().toUpperCase();
  if (Object.hasOwn(pointById, id)) return id;
  return Object.hasOwn(pointCodeAliases, id) ? pointCodeAliases[id] : null;
}
export function parseComparisonPoints(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map(resolvePointId)
        .filter((id): id is string => id !== null),
    ),
  ].slice(0, 30);
}

export function canInspectPoint(
  selected: string | null,
  p: Point | null,
): boolean {
  return (
    !!p &&
    !!selected &&
    (getLuoStudy(selected)?.pointId === p.id ||
      p.channel === selected ||
      !!channels
        .find((c) => c.id === selected)
        ?.points.some((q) => q.id === p.id) ||
      !!confluentPointIds[selected]?.includes(p.id))
  );
}

// Collateral identities include the Ren/Du luo points and the great luo of
// the spleen. Keep 大络 distinct so the spleen's usual 络 category is 公孙.
for (const study of luoStudies) {
  const p = pointById[study.pointId];
  const role = study.id === 'LUO-SP-MAJOR' ? '大络' : '络';
  if (!p.roles.includes(role)) p.roles.push(role);
}

for (const [id, study] of Object.entries(primaryIndicationScan.points)) {
  const p = pointById[id];
  const document =
    primaryIndicationScan.documents[
      study.documentId as keyof typeof primaryIndicationScan.documents
    ];
  const scannedStudy: IndicationStudy = {
    kind: 'classical',
    summary: study.summary,
    excerpt: study.excerpt,
    references: [
      {
        label: `${document.title} · ${study.printedLeaf} · PDF 第 ${study.pdfPage} 页（扫描）`,
        url: `${document.url}#page=${study.pdfPage}`,
      },
    ],
    note: study.note,
  };
  if ('supplemental' in study && study.supplemental) {
    p.additionalIndicationStudies = [
      ...(p.additionalIndicationStudies ?? []),
      scannedStudy,
    ];
    continue;
  }
  p.indications = study.summary;
  p.indicationStudy = scannedStudy;
  p.source = '文献说明已按所附《针灸大成》扫描页核对；现代定位与三维校准另列。';
}

// Standard basic indications are separate from historical accounts and locations.
for (const [id, entry] of Object.entries(standardIndications.points)) {
  const p = pointById[id];
  if (
    'preserveExisting' in entry &&
    entry.preserveExisting &&
    p.indicationStudy
  ) {
    p.additionalIndicationStudies = [
      ...(p.additionalIndicationStudies || []),
      p.indicationStudy,
    ];
  }
  p.indications = entry.summary;
  p.indicationStudy = {
    kind: 'standard',
    summary: entry.summary,
    references: [
      {
        label: `${standardIndications.standard}《${standardIndications.title}》· ${entry.clause} · 正文第 ${entry.printedPage} 页（PDF 第 ${entry.pdfPage} 页）`,
        url: `${standardIndications.documentUrl}#page=${entry.pdfPage}`,
      },
    ],
    note:
      '按国家标准原页整理基础主治。标准以古今文献整理为依据，所列病证不等于逐病完成现代疗效验证；不包含特殊操作与个体治疗方案。定位仍按现行定位标准单独展示。' +
      (id === 'EX-B2'
        ? '夹脊为胸腰段穴组，主治须分段阅读，不能认为每个穴点均对应全部病症。'
        : '') +
      (id === 'EX-B3' ? '消渴为传统病证，不直接等同于现代糖尿病。' : ''),
  };
  p.source = '基础主治已按所附国家标准原页核对；三维位置校准另列。';
}
