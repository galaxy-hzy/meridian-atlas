import {
  yangweiCourse,
  yangweiCourseTimelines,
  type YangweiCoursePath,
} from './yangwei-course';
import {
  yinweiCourse,
  yinweiCourseTimelines,
  type YinweiCoursePath,
} from './yinwei-course';
import {
  yangqiaoCourse,
  yangqiaoCourseTimelines,
  type YangqiaoCoursePath,
} from './yangqiao-course';
import {
  yinqiaoCourse,
  yinqiaoCourseTimelines,
  type YinqiaoCoursePath,
} from './yinqiao-course';
import {
  chongCourse,
  chongCourseTimelines,
  type ChongCoursePath,
} from './chong-course';
import { gvCourse, gvCourseTimelines, type GvCoursePath } from './gv-course';
import { cvCourse, cvCourseTimelines, type CvCoursePath } from './cv-course';
import { stCourse, stCourseTimelines, type StCoursePath } from './st-course';
import { gbCourse, gbCourseTimelines, type GbCoursePath } from './gb-course';
import { blCourse, blCourseTimelines, type BlCoursePath } from './bl-course';
import { lrCourse, lrCourseTimelines, type LrCoursePath } from './lr-course';
import { kiCourse, kiCourseTimelines, type KiCoursePath } from './ki-course';
import { spCourse, spCourseTimelines, type SpCoursePath } from './sp-course';
import { teCourse, teCourseTimelines, type TeCoursePath } from './te-course';
import { pcCourse, pcCourseTimelines, type PcCoursePath } from './pc-course';
import { siCourse, siCourseTimelines, type SiCoursePath } from './si-course';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
import { liCourse, liCourseTimelines, type LiCoursePath } from './li-course';
import { htCourse, htCourseTimelines, type HtCoursePath } from './ht-course';

type CourseStudy = {
  channel: string;
  assetSha256: string;
  registrationSha256: string;
  source: {
    title: string;
    revision: string;
    url: string;
    sourceSha256: string;
  };
  passage: string;
  note: string;
  paths: Record<
    string,
    { label: string; kind: 'surface' | 'internal' | 'region'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
  toggleLabel: string;
  summary: string;
  focusLabel: string;
  focusPoint?: string;
  focusView?: 'sole' | 'dorsum' | 'lateral';
  timelines: (lengths: Record<string, number>) => Record<string, FlowTimeline>;
};

export const courseCatalog: Record<string, CourseStudy> = {
  YANGWEI: {
    ...yangweiCourse,
    toggleLabel: '肩头循行与入耳区域',
    focusLabel: '查看头耳回行',
    summary:
      '金门、阳交 → 股外侧、居髎 → 胁肩、耳后 → 风池与头部所列穴 → 阳白 → 入耳区域 → 本神。',
    timelines: (lengths) =>
      yangweiCourseTimelines(lengths as Record<YangweiCoursePath, number>),
  },
  YINWEI: {
    ...yinweiCourse,
    toggleLabel: '胸膈挟咽与顶前示意',
    focusLabel: '查看咽部与顶前',
    summary:
      '筑宾 → 股内侧、腹胁 → 期门 → 胸膈、挟咽 → 天突、廉泉 → 本书所述顶前区域。',
    timelines: (lengths) =>
      yinweiCourseTimelines(lengths as Record<YinweiCoursePath, number>),
  },
  YANGQIAO: {
    ...yangqiaoCourse,
    toggleLabel: '跟中起始与肩面回行',
    focusLabel: '查看跟中起始',
    focusPoint: 'BL62',
    focusView: 'lateral',
    summary:
      '跟中 → 申脉、仆参、跗阳 → 股外侧、胁后、肩部 → 口吻、内眼角 → 发际、耳后 → 风池。',
    timelines: (lengths) =>
      yangqiaoCourseTimelines(lengths as Record<YangqiaoCoursePath, number>),
  },
  YINQIAO: {
    ...yinqiaoCourse,
    toggleLabel: '胸里咽目循行',
    focusLabel: '查看咽目连接',
    summary:
      '跟中 → 照海、交信 → 股内侧 → 入阴、胸里 → 缺盆、人迎之前 → 喉咙、頄内廉 → 睛明。',
    timelines: (lengths) =>
      yinqiaoCourseTimelines(lengths as Record<YinqiaoCoursePath, number>),
  },
  CHONG: {
    ...chongCourse,
    toggleLabel: '背里咽口与下行支路',
    focusLabel: '查看足部两支',
    focusPoint: 'LR3',
    focusView: 'dorsum',
    summary:
      '胞中起始，分向背里及气冲腹部，上达胸中、咽喉与唇口；下行支自肾下出气街，经腿内侧、内踝后，分入足底及足背大趾间。',
    timelines: (lengths) =>
      chongCourseTimelines(lengths as Record<ChongCoursePath, number>),
  },
  GV: {
    ...gvCourse,
    toggleLabel: '脊里入脑与别络',
    focusLabel: '查看入脑与面部',
    summary:
      '按《奇经八脉考》：少腹会阴至长强，脊里上行、系舌入脑，循巅额鼻至龈交；另示该书所述走任、面部入脑、下项络肾别络。',
    timelines: (lengths) =>
      gvCourseTimelines(lengths as Record<GvCoursePath, number>),
  },
  CV: {
    ...cvCourse,
    toggleLabel: '腹内经过与面部支路',
    focusLabel: '查看环唇与目下',
    summary:
      '按《奇经八脉考》：少腹内出会阴，循腹胸上喉颐；环唇后分行两侧面部至目下。另示该书所述尾翳别络散腹。',
    timelines: (lengths) =>
      cvCourseTimelines(lengths as Record<CvCoursePath, number>),
  },
  ST: {
    ...stCourse,
    toggleLabel: '体内经过与口足分支',
    focusLabel: '查看足趾分支',
    focusPoint: 'ST42',
    focusView: 'dorsum',
    summary:
      '鼻外入上齿、环唇，经下颌分向额部与缺盆；属胃络脾、腹内与体表在气街会合，下行后分向足趾与大趾。趾名异文保留在依据说明。',
    timelines: (lengths) =>
      stCourseTimelines(lengths as Record<StCoursePath, number>),
  },
  GB: {
    ...gbCourse,
    toggleLabel: '体内经过与耳足分支',
    focusLabel: '查看足背分支',
    focusPoint: 'GB41',
    focusView: 'dorsum',
    summary:
      '外眼角经头、耳后和颈肩至缺盆；面颊支路下胸联系肝胆，与胸胁路线在髀部会合；下行到足背后分向第四趾及大趾。',
    timelines: (lengths) =>
      gbCourseTimelines(lengths as Record<GbCoursePath, number>),
  },
  BL: {
    ...blCourse,
    toggleLabel: '体内经过与头腰分支',
    focusLabel: '查看头顶与入脑',
    summary:
      '目内眦 → 额顶，分向耳上角和脑；出项后沿背部两路下行，腰中另络肾属膀胱；两路在腘窝会合，继续到小趾外侧。',
    timelines: (lengths) =>
      blCourseTimelines(lengths as Record<BlCoursePath, number>),
  },
  LR: {
    ...lrCourse,
    toggleLabel: '体内经过与目唇支路',
    focusLabel: '查看目系与环唇',
    summary:
      '大趾 → 腿内侧 → 小腹 → 挟胃属肝、络胆 → 贯膈胁肋、喉后、目系 → 额与头顶；目系分向颊里、唇内，肝另分支上注肺。',
    timelines: (lengths) =>
      lrCourseTimelines(lengths as Record<LrCoursePath, number>),
  },
  KI: {
    ...kiCourse,
    toggleLabel: '体内经过与足底支路',
    focusLabel: '查看足底起始',
    focusPoint: 'KI1',
    focusView: 'sole',
    summary:
      '小趾下 → 足心 → 内踝、足跟 → 腿内后侧 → 贯脊属肾、络膀胱；肾上贯肝膈入肺，再分向喉咙舌本与心胸。',
    timelines: (lengths) =>
      kiCourseTimelines(lengths as Record<KiCoursePath, number>),
  },
  SP: {
    ...spCourse,
    toggleLabel: '体内经过与咽舌支路',
    focusLabel: '查看咽舌支路',
    summary:
      '大趾 → 腿内侧 → 入腹属脾、络胃 → 上膈、挟咽、连舌本、散舌下；胃另分一支上膈，注心中。',
    timelines: (lengths) =>
      spCourseTimelines(lengths as Record<SpCoursePath, number>),
  },
  TE: {
    ...teCourse,
    toggleLabel: '体内经过与耳目分支',
    focusLabel: '查看耳目分支',
    summary:
      '无名指 → 手臂 → 肩背 → 缺盆 → 膻中，散络心包、下膈联系三焦；胸中支路上出缺盆至耳后，分向耳上角、颊部，以及耳中、耳前到外眼角。',
    timelines: (lengths) =>
      teCourseTimelines(lengths as Record<TeCoursePath, number>),
  },
  PC: {
    ...pcCourse,
    toggleLabel: '体内经过与掌中分支',
    focusLabel: '查看掌中分支',
    focusPoint: 'PC8',
    summary:
      '胸中 → 心包络，向下膈联系三焦；另一支出胁、抵腋下，沿臂入掌中，分向中指与无名指端。',
    timelines: (lengths) =>
      pcCourseTimelines(lengths as Record<PcCoursePath, number>),
  },
  SI: {
    ...siCourse,
    toggleLabel: '体内经过与面耳分支',
    focusLabel: '查看面耳分支',
    summary:
      '小指 → 手臂 → 肩胛 → 缺盆；一支络心、循咽下膈、抵胃属小肠；面部一支至外眼角入耳，另一支经鼻旁到内眼角、斜络颧部。',
    timelines: (lengths) =>
      siCourseTimelines(lengths as Record<SiCoursePath, number>),
  },
  LI: {
    ...liCourse,
    toggleLabel: '体内经过与头面分支',
    focusLabel: '查看头面交叉',
    summary:
      '食指 → 手臂 → 肩背 → 缺盆；一支络肺、下膈、属大肠，另一支循颈上颊、入下齿、交人中至对侧鼻旁。',
    timelines: (lengths) =>
      liCourseTimelines(lengths as Record<LiCoursePath, number>),
  },
  HT: {
    ...htCourse,
    toggleLabel: '体内经过与咽目分支',
    focusLabel: '查看咽目支路',
    summary:
      '心中 → 心系；分向下膈络小肠、上挟咽联系目系，以及经肺出腋下，再沿上肢内后侧至小指端。',
    timelines: (lengths) =>
      htCourseTimelines(lengths as Record<HtCoursePath, number>),
  },
};
export function hasRegionalCourse(id: string | null) {
  return id === 'LU' || !!(id && courseCatalog[id]);
}

export function courseHasInternalSegments(id: string | null) {
  return (
    id === 'LU' ||
    !!(
      id &&
      courseCatalog[id] &&
      Object.values(courseCatalog[id].paths).some(
        (path) => path.kind === 'internal',
      )
    )
  );
}
