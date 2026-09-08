import data from './st-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type StCoursePath = keyof typeof data.paths;
export const stCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    StCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function stCourseTimelines(
  lengths: Record<StCoursePath, number>,
): Record<StCoursePath, FlowTimeline> {
  const parents: Record<StCoursePath, StCoursePath[]> = {
    nose: [],
    teeth: ['nose'],
    lips: ['teeth'],
    jaw: ['lips'],
    head: ['jaw'],
    neck: ['jaw'],
    stomach: ['neck'],
    spleen: ['stomach'],
    abdomen: ['stomach'],
    trunk: ['neck'],
    leg: ['abdomen', 'trunk'],
    calf: ['leg'],
    second: ['calf'],
    third: ['leg'],
    great: ['calf'],
  };
  const starts = {} as Record<StCoursePath, number>,
    ends = {} as Record<StCoursePath, number>;
  for (const key of Object.keys(parents) as StCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid ST course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<StCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as StCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
