import data from './gv-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type GvCoursePath = keyof typeof data.paths;
export const gvCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    GvCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function gvCourseTimelines(
  lengths: Record<GvCoursePath, number>,
): Record<GvCoursePath, FlowTimeline> {
  const parents: Record<GvCoursePath, GvCoursePath[]> = {
    origin: [],
    entryLeft: ['origin'],
    entryRight: ['origin'],
    spine: ['entryLeft', 'entryRight'],
    tongue: ['spine'],
    brain: ['spine'],
    head: ['brain'],
    frontCollateral: ['entryLeft', 'entryRight'],
    faceLeft: ['frontCollateral'],
    faceRight: ['frontCollateral'],
    collateralBrain: ['faceLeft', 'faceRight'],
    returnLeft: ['collateralBrain'],
    returnRight: ['collateralBrain'],
  };
  const starts = {} as Record<GvCoursePath, number>,
    ends = {} as Record<GvCoursePath, number>;
  for (const key of Object.keys(parents) as GvCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid GV course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<GvCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as GvCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
