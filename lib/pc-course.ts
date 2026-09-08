import data from './pc-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type PcCoursePath = keyof typeof data.paths;
export const pcCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    PcCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function pcCourseTimelines(
  lengths: Record<PcCoursePath, number>,
): Record<PcCoursePath, FlowTimeline> {
  const parents: Record<PcCoursePath, PcCoursePath | null> = {
    stem: null,
    viscera: 'stem',
    emerge: 'stem',
    arm: 'emerge',
    middle: 'arm',
    ring: 'arm',
  };
  const starts = {} as Record<PcCoursePath, number>,
    ends = {} as Record<PcCoursePath, number>;
  for (const key of Object.keys(parents) as PcCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid PC course length');
    const parent = parents[key];
    starts[key] = parent === null ? 0 : ends[parent];
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<PcCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as PcCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
