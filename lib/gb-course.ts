import data from './gb-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type GbCoursePath = keyof typeof data.paths;
export const gbCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    GbCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function gbCourseTimelines(
  lengths: Record<GbCoursePath, number>,
): Record<GbCoursePath, FlowTimeline> {
  const parents: Record<GbCoursePath, GbCoursePath[]> = {
    head: [],
    ear: ['head'],
    neck: ['head'],
    face: [],
    viscera: ['face'],
    pelvis: ['viscera'],
    trunk: ['neck'],
    leg: ['pelvis', 'trunk'],
    fourth: ['leg'],
    great: ['leg'],
  };
  const starts = {} as Record<GbCoursePath, number>,
    ends = {} as Record<GbCoursePath, number>;
  for (const key of Object.keys(parents) as GbCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid GB course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<GbCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as GbCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
