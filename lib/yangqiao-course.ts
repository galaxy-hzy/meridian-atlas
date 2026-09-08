import data from './yangqiao-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type YangqiaoCoursePath = keyof typeof data.paths;
export const yangqiaoCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    YangqiaoCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function yangqiaoCourseTimelines(
  lengths: Record<YangqiaoCoursePath, number>,
): Record<YangqiaoCoursePath, FlowTimeline> {
  const parents: Record<YangqiaoCoursePath, YangqiaoCoursePath[]> = {
    heel: [],
    body: ['heel'],
    head: ['body'],
  };
  const starts = {} as Record<YangqiaoCoursePath, number>,
    ends = {} as Record<YangqiaoCoursePath, number>;
  for (const key of Object.keys(parents) as YangqiaoCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid YANGQIAO course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<YangqiaoCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as YangqiaoCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
