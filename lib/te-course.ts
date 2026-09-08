import data from './te-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type TeCoursePath = keyof typeof data.paths;
export const teCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    TeCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function teCourseTimelines(
  lengths: Record<TeCoursePath, number>,
): Record<TeCoursePath, FlowTimeline> {
  const parents: Record<TeCoursePath, TeCoursePath | null> = {
    stem: null,
    chest: 'stem',
    viscera: 'chest',
    rise: 'chest',
    neck: 'rise',
    upper: 'neck',
    ear: 'neck',
    eye: 'ear',
  };
  const starts = {} as Record<TeCoursePath, number>,
    ends = {} as Record<TeCoursePath, number>;
  for (const key of Object.keys(parents) as TeCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid TE course length');
    const parent = parents[key];
    starts[key] = parent === null ? 0 : ends[parent];
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<TeCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as TeCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
