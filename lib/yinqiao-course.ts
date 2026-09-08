import data from './yinqiao-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type YinqiaoCoursePath = keyof typeof data.paths;
export const yinqiaoCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    YinqiaoCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function yinqiaoCourseTimelines(
  lengths: Record<YinqiaoCoursePath, number>,
): Record<YinqiaoCoursePath, FlowTimeline> {
  const parents: Record<YinqiaoCoursePath, YinqiaoCoursePath[]> = {
    leg: [],
    pelvis: ['leg'],
    chest: ['pelvis'],
    neck: ['chest'],
    cheek: ['neck'],
    eye: ['cheek'],
  };
  const starts = {} as Record<YinqiaoCoursePath, number>,
    ends = {} as Record<YinqiaoCoursePath, number>;
  for (const key of Object.keys(parents) as YinqiaoCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid YINQIAO course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<YinqiaoCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as YinqiaoCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
