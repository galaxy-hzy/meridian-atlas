import data from './ki-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type KiCoursePath = keyof typeof data.paths;
export const kiCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    KiCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function kiCourseTimelines(
  lengths: Record<KiCoursePath, number>,
): Record<KiCoursePath, FlowTimeline> {
  const parents: Record<KiCoursePath, KiCoursePath | null> = {
    sole: null,
    leg: 'sole',
    thigh: 'leg',
    kidney: 'thigh',
    bladder: 'kidney',
    lung: 'kidney',
    tongue: 'lung',
    heart: 'lung',
  };
  const starts = {} as Record<KiCoursePath, number>,
    ends = {} as Record<KiCoursePath, number>;
  for (const key of Object.keys(parents) as KiCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid KI course length');
    const parent = parents[key];
    starts[key] = parent === null ? 0 : ends[parent];
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<KiCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as KiCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
