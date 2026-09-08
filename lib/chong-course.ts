import data from './chong-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type ChongCoursePath = keyof typeof data.paths;
export const chongCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    ChongCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function chongCourseTimelines(
  lengths: Record<ChongCoursePath, number>,
): Record<ChongCoursePath, FlowTimeline> {
  const parents: Record<ChongCoursePath, ChongCoursePath[]> = {
    origin: [],
    emerge: ['origin'],
    abdomen: ['emerge'],
    upper: ['abdomen'],
    nasal: ['upper'],
    mouth: ['upper'],
    lips: ['mouth'],
    back: ['origin'],
    lowerOrigin: ['origin'],
    thigh: ['lowerOrigin'],
    calf: ['thigh'],
    sole: ['calf'],
    dorsum: ['calf'],
  };
  const starts = {} as Record<ChongCoursePath, number>,
    ends = {} as Record<ChongCoursePath, number>;
  for (const key of Object.keys(parents) as ChongCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid CHONG course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<ChongCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as ChongCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
