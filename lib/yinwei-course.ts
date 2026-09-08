import data from './yinwei-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type YinweiCoursePath = keyof typeof data.paths;
export const yinweiCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    YinweiCoursePath,
    { label: string; kind: 'surface' | 'internal' | 'region'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function yinweiCourseTimelines(
  lengths: Record<YinweiCoursePath, number>,
): Record<YinweiCoursePath, FlowTimeline> {
  const parents: Record<YinweiCoursePath, YinweiCoursePath[]> = {
    lower: [],
    chest: ['lower'],
    throat: ['chest'],
    crown: ['throat'],
  };
  const starts = {} as Record<YinweiCoursePath, number>,
    ends = {} as Record<YinweiCoursePath, number>;
  for (const key of Object.keys(parents) as YinweiCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid YINWEI course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<YinweiCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as YinweiCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
