import data from './si-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type SiCoursePath = keyof typeof data.paths;
export const siCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    SiCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function siCourseTimelines(
  lengths: Record<SiCoursePath, number>,
): Record<SiCoursePath, FlowTimeline> {
  const parents: Record<SiCoursePath, SiCoursePath | null> = {
    stem: null,
    internal: 'stem',
    neck: 'stem',
    outer: 'neck',
    ear: 'outer',
    earDepth: 'ear',
    inner: 'neck',
    cheek: 'inner',
  };
  const ends = {} as Record<SiCoursePath, number>;
  const starts = {} as Record<SiCoursePath, number>;
  for (const key of Object.keys(parents) as SiCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid SI course length');
    const parent = parents[key];
    starts[key] = parent === null ? 0 : ends[parent];
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<SiCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as SiCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
