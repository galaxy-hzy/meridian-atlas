// Anatomical facts curated from GB/T 12346-2021, clauses 5.2.1–5.2.20.
// This is an authored factual digest, not a transcription of the standard.
// Numeric cun values remain proportional measurements, never world coordinates.
export type LocationFacts = {
  region: string;
  landmarks: string[];
  relation: string;
};
export const locationFacts: Record<string, LocationFacts> = {
  LI1: {
    region: '食指桡侧末端',
    landmarks: ['指甲根角'],
    relation: '甲根角侧上方，距离 0.1 寸。',
  },
  LI2: {
    region: '食指根部桡侧',
    landmarks: ['第二掌指关节', '赤白肉际'],
    relation: '关节远端的皮肤移行处。',
  },
  LI3: {
    region: '手背桡侧',
    landmarks: ['第二掌指关节'],
    relation: '关节近端凹陷；与二间分居该关节近、远两侧。',
  },
  LI4: {
    region: '手背',
    landmarks: ['第一掌骨', '第二掌骨'],
    relation: '两骨之间，约与第二掌骨桡侧中点平齐。',
  },
  LI5: {
    region: '腕后外侧',
    landmarks: ['腕背侧远端横纹', '桡骨茎突', '解剖学鼻烟窝'],
    relation: '横纹桡侧、茎突远端的鼻烟窝凹陷。',
  },
  LI6: {
    region: '前臂后外侧',
    landmarks: ['阳溪 LI5', '曲池 LI11', '腕背侧远端横纹'],
    relation: '沿阳溪—曲池连线，自腕横纹向肘量 3 寸。',
  },
  LI7: {
    region: '前臂后外侧',
    landmarks: ['阳溪 LI5', '曲池 LI11', '腕背侧远端横纹'],
    relation: '沿阳溪—曲池连线，自腕横纹向肘量 5 寸。',
  },
  LI8: {
    region: '前臂后外侧',
    landmarks: ['阳溪 LI5', '曲池 LI11', '肘横纹'],
    relation: '沿阳溪—曲池连线，自肘横纹向腕量 4 寸。',
  },
  LI9: {
    region: '前臂后外侧',
    landmarks: ['阳溪 LI5', '曲池 LI11', '肘横纹'],
    relation: '沿阳溪—曲池连线，自肘横纹向腕量 3 寸。',
  },
  LI10: {
    region: '前臂后外侧',
    landmarks: ['阳溪 LI5', '曲池 LI11', '肘横纹'],
    relation: '沿阳溪—曲池连线，自肘横纹向腕量 2 寸。',
  },
  LI11: {
    region: '肘外侧',
    landmarks: ['尺泽 LU5', '肱骨外上髁'],
    relation: '两标志连线的中点。',
  },
  LI12: {
    region: '肘后外侧',
    landmarks: ['肱骨外上髁', '肱骨髁上嵴'],
    relation: '外上髁的上缘与髁上嵴的前缘处。',
  },
  LI13: {
    region: '上臂外侧',
    landmarks: ['曲池 LI11', '肩髃 LI15', '肘横纹'],
    relation: '曲池—肩髃连线上，自肘横纹向肩量 3 寸。',
  },
  LI14: {
    region: '上臂外侧',
    landmarks: ['曲池 LI11', '肩髃 LI15', '三角肌前缘'],
    relation: '经线与三角肌前缘相遇处；应优先辨认肌缘，不能只凭固定长度。',
  },
  LI15: {
    region: '肩带',
    landmarks: ['肩峰外侧缘前端', '肱骨大结节'],
    relation: '两个骨性标志之间的凹陷。',
  },
  LI16: {
    region: '肩带',
    landmarks: ['锁骨肩峰端', '肩胛冈'],
    relation: '两骨之间的凹陷。',
  },
  LI17: {
    region: '颈前部',
    landmarks: ['环状软骨', '胸锁乳突肌后缘'],
    relation: '肌肉后缘上，与环状软骨同高。',
  },
  LI18: {
    region: '颈前部',
    landmarks: ['甲状软骨上缘', '胸锁乳突肌'],
    relation: '与甲状软骨上缘同高，位于该肌前后缘之间。',
  },
  LI19: {
    region: '鼻下方',
    landmarks: ['鼻孔外缘', '人中沟'],
    relation: '鼻孔外缘垂直向下，与人中沟上三分之一分界处同高。',
  },
  LI20: {
    region: '鼻旁',
    landmarks: ['鼻翼外缘中点', '鼻唇沟'],
    relation: '鼻翼外缘中点旁的鼻唇沟内。',
  },
};
export function describeLocationFacts(facts: LocationFacts): string {
  return `区域：${facts.region}。标志：${facts.landmarks.join('、')}。关系：${facts.relation}（按国标整理的定位要点；寸为人体比例单位，三维坐标仍待校准。）`;
}
