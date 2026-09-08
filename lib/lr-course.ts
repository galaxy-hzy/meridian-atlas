import data from './lr-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type LrCoursePath = keyof typeof data.paths;
export const lrCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    LrCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function lrCourseTimelines(
  lengths: Record<LrCoursePath, number>,
): Record<LrCoursePath, FlowTimeline> {
  const parents: Record<LrCoursePath, LrCoursePath | null> = {
    stem: null,
    liver: 'stem',
    gall: 'liver',
    eye: 'gall',
    forehead: 'eye',
    crown: 'forehead',
    cheek: 'eye',
    lips: 'cheek',
    lung: 'liver',
  };
  const starts = {} as Record<LrCoursePath, number>,
    ends = {} as Record<LrCoursePath, number>;
  for (const key of Object.keys(parents) as LrCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid LR course length');
    const parent = parents[key];
    starts[key] = parent === null ? 0 : ends[parent];
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<LrCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as LrCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
