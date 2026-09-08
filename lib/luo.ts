import { channels, pointById, type Channel, type Vec3 } from './atlas';
import { luoStudies } from './luo-data';
import { boundedPolyline, closestPolylinePoint } from './regional-anchor';
import heelRoute from './luo-heel.json';
import surfaceData from './luo-surface.json';

type Region = {
  label: string;
  position: Vec3;
  binding?: { channel: string; from: string; to: string; reference: string };
};
type Landmark = string | Region;
type Segment = { label: string; nodes: Landmark[]; fittedPath?: Vec3[] };
const region = (label: string, position: Vec3): Region => ({ label, position });
function channelRegion(
  label: string,
  channelId: string,
  from: string,
  to: string,
  reference: string,
): Region {
  const channel = channels.find((c) => c.id === channelId)!;
  const path = boundedPolyline(
    channel.route,
    pointById[from].position,
    pointById[to].position,
  );
  return {
    label,
    position: closestPolylinePoint(path, pointById[reference].position),
    binding: { channel: channelId, from, to, reference },
  };
}
// Existing surface anchors constrain the drawing, but are not a claim that a
// collateral passes through every named acupoint. Interior nodes are regions.
const heart = region('心系区域', [0, 1.375, 0.025]);
const pericardium = region('心包区域', [0.018, 1.355, 0.035]);
const stomach = region('胃区域', [0, 1.225, 0.035]);
const bowel = region('肠区域', [0, 1.04, 0.015]);
const tongue = region('舌本区域', [0.008, 1.646, 0.09]);
const eye = region('目系区域', [0.0392, 1.7252, 0.1135]);
const neck = region('喉咽区域', [0.025, 1.535, 0.035]);
const lowerTeeth = region('下齿区域', [0.018, 1.617, 0.105]);
const lumbar = region('腰脊区域', [0.035, 1.12, -0.02]);
const genital = region('阴部区域', [0.02, 0.91, 0.055]);
export const luoSegments: Record<string, Segment[]> = {
  'LUO-LU': [
    { label: '列缺 → 掌中 → 鱼际区域', nodes: ['LU7', 'LU9', 'PC8', 'LU10'] },
    {
      label: '别走手阳明的联系示意',
      nodes: ['LU7', channelRegion('前臂阳明区域', 'LI', 'LI5', 'LI7', 'LU7')],
    },
  ],
  'LUO-LI': [
    {
      label: '偏历 → 臂肩 → 颊齿区域',
      nodes: ['LI6', 'LI10', 'LI11', 'LI14', 'LI15', 'LI17', 'ST5', lowerTeeth],
    },
    {
      label: '颊部 → 耳中区域',
      nodes: ['ST5', 'SI19', region('耳中', [0.075, 1.698, 0.065])],
    },
    {
      label: '别入手太阴的联系示意',
      nodes: ['LI6', channelRegion('前臂太阴区域', 'LU', 'LU7', 'LU6', 'LI6')],
    },
  ],
  'LUO-ST': [
    {
      label: '丰隆 → 胫外侧 → 头项 → 喉咽区域',
      nodes: [
        'ST40',
        'ST36',
        'ST32',
        'ST31',
        'ST30',
        'ST25',
        'ST19',
        'ST12',
        'ST9',
        'ST8',
        'GB20',
        neck,
      ],
    },
    {
      label: '别走足太阴的联系示意',
      nodes: [
        'ST40',
        channelRegion('小腿太阴区域', 'SP', 'SP6', 'SP9', 'ST40'),
      ],
    },
  ],
  'LUO-SP': [
    {
      label: '公孙 → 肠胃区域',
      nodes: ['SP4', 'SP5', 'SP6', 'SP9', 'SP10', 'SP12', bowel, stomach],
    },
    {
      label: '别走足阳明的联系示意',
      nodes: [
        'SP4',
        channelRegion('足背阳明区域', 'ST', 'ST42', 'ST43', 'SP4'),
      ],
    },
  ],
  'LUO-HT': [
    {
      label: '通里 → 心中 → 舌本 → 目系区域',
      nodes: ['HT5', 'HT3', 'HT2', 'HT1', heart, neck, tongue, eye],
    },
    {
      label: '别走手太阳的联系示意',
      nodes: ['HT5', channelRegion('前臂太阳区域', 'SI', 'SI5', 'SI7', 'HT5')],
    },
  ],
  'LUO-SI': [
    { label: '支正 → 肘 → 肩髃区域', nodes: ['SI7', 'SI8', 'SI9', 'LI15'] },
    {
      label: '内注手少阴的联系示意',
      nodes: ['SI7', channelRegion('前臂少阴区域', 'HT', 'HT5', 'HT3', 'SI7')],
    },
  ],
  'LUO-BL': [
    {
      label: '飞扬 → 足少阴区域（经间联系）',
      nodes: [
        'BL58',
        channelRegion('小腿少阴区域', 'KI', 'KI9', 'KI10', 'BL58'),
      ],
    },
  ],
  'LUO-KI': [
    {
      label: '大钟 → 绕跟 → 足太阳区域',
      nodes: [
        'KI4',
        region('跟中', heelRoute.heelBinding.position as Vec3),
        'BL60',
      ],
      fittedPath: heelRoute.points as Vec3[],
    },
    {
      label: '大钟 → 随经上行 → 心包 → 腰脊区域',
      nodes: ['KI4', 'KI7', 'KI9', 'KI10', 'KI11', 'KI16', pericardium, lumbar],
    },
  ],
  'LUO-PC': [
    {
      label: '内关 → 心包络、心系区域',
      nodes: ['PC6', 'PC3', 'PC2', 'PC1', pericardium, heart],
    },
  ],
  'LUO-TE': [
    {
      label: '外关 → 绕臂 → 胸中、心主区域',
      nodes: ['TE5', 'TE9', 'TE10', 'TE13', 'TE14', 'ST12', pericardium],
    },
  ],
  'LUO-GB': [
    {
      label: '光明 → 足背散布区域',
      nodes: ['GB37', 'GB40', 'GB41', region('足背', [0.24, 0.035, 0.17])],
    },
    {
      label: '别走足厥阴的联系示意',
      nodes: [
        'GB37',
        channelRegion('小腿厥阴区域', 'LR', 'LR4', 'LR6', 'GB37'),
      ],
    },
  ],
  'LUO-LR': [
    {
      label: '蠡沟 → 小腿上行 → 阴部区域',
      nodes: ['LR5', 'LR7', 'LR8', 'LR10', 'LR12', genital],
    },
    {
      label: '别走足少阳的联系示意',
      nodes: [
        'LR5',
        channelRegion('小腿少阳区域', 'GB', 'GB39', 'GB37', 'LR5'),
      ],
    },
  ],
  'LUO-CV': [
    { label: '鸠尾 → 上腹散布区域', nodes: ['CV15', 'ST19', 'SP16', 'ST25'] },
    { label: '鸠尾 → 下腹散布区域', nodes: ['CV15', 'KI19', 'KI16', 'ST28'] },
  ],
  'LUO-GV': [
    {
      label: '长强 → 挟脊 → 项部 → 头部散布',
      nodes: [
        'GV1',
        'BL28',
        'BL25',
        'BL23',
        'BL20',
        'BL17',
        'BL13',
        'BL10',
        'BL7',
        'GB15',
      ],
    },
    {
      label: '头项 → 肩胛 → 足太阳、脊旁区域',
      nodes: [
        'BL7',
        'BL10',
        'SI14',
        'BL43',
        region('脊旁深部', [0.035, 1.33, -0.025]),
      ],
    },
  ],
  'LUO-SP-MAJOR': [
    { label: '大包 → 胸部散布区域', nodes: ['SP21', 'SP19', 'ST16', 'KI24'] },
    { label: '大包 → 胁部散布区域', nodes: ['SP21', 'GB24', 'LR13'] },
  ],
};

export const luoChannels: Channel[] = luoStudies.map((study) => {
  const segments = luoSegments[study.id];
  const fitted = surfaceData.paths as Record<string, { points: number[][] }[]>;
  const routes = fitted[study.id].map((path) => path.points as Vec3[]);
  return {
    id: study.id,
    name: study.name,
    short: pointById[study.pointId].name,
    polarity: '十五络脉',
    color: channels.find((channel) => channel.id === study.parent)!.color,
    points: [pointById[study.pointId]],
    route: routes[0],
    routes,
    note: study.summary,
    routePresentation: {
      note: '虚线表示古文所述的联系区域。体表参照间的连线已贴合当前人体，体内及不确定区域仍为示意，尚未逐段解剖校准。只有发光穴点是本络的络穴，其余转折不代表新增穴位或必经穴；经间联系不等于原络配穴连线。',
      sequential: false,
      paths: segments.map((segment) => ({
        label: segment.label,
        kind: 'region',
        animate: false,
        anchorIds: segment.nodes.filter(
          (node): node is string => typeof node === 'string',
        ),
      })),
    },
  };
});
export const studyChannels = [...channels, ...luoChannels];
