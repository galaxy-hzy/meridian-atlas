import data from './sp-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type SpCoursePath = keyof typeof data.paths;
export const spCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    SpCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function spCourseTimelines(
  lengths: Record<SpCoursePath, number>,
): Record<SpCoursePath, FlowTimeline> {
  const parents: Record<SpCoursePath, SpCoursePath | null> = {
    stem: null,
    viscera: 'stem',
    throat: 'viscera',
    tongue: 'throat',
    heart: 'viscera',
  };
  const starts = {} as Record<SpCoursePath, number>,
    ends = {} as Record<SpCoursePath, number>;
  for (const key of Object.keys(parents) as SpCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid SP course length');
    const parent = parents[key];
    starts[key] = parent === null ? 0 : ends[parent];
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<SpCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as SpCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
