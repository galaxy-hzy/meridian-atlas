import data from './yangwei-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type YangweiCoursePath = keyof typeof data.paths;
export const yangweiCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    YangweiCoursePath,
    { label: string; kind: 'surface' | 'internal' | 'region'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function yangweiCourseTimelines(
  lengths: Record<YangweiCoursePath, number>,
): Record<YangweiCoursePath, FlowTimeline> {
  const parents: Record<YangweiCoursePath, YangweiCoursePath[]> = {
    body: [],
    ear: ['body'],
    return: ['ear'],
  };
  const starts = {} as Record<YangweiCoursePath, number>,
    ends = {} as Record<YangweiCoursePath, number>;
  for (const key of Object.keys(parents) as YangweiCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid YANGWEI course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<YangweiCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as YangweiCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
