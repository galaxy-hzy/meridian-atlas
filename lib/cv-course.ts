import data from './cv-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type CvCoursePath = keyof typeof data.paths;
export const cvCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    CvCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function cvCourseTimelines(
  lengths: Record<CvCoursePath, number>,
): Record<CvCoursePath, FlowTimeline> {
  const parents: Record<CvCoursePath, CvCoursePath[]> = {
    origin: [],
    emerge: ['origin'],
    abdomen: ['emerge'],
    chest: ['abdomen'],
    lipLeft: ['chest'],
    lipRight: ['chest'],
    gums: ['lipLeft', 'lipRight'],
    faceLeft: ['gums'],
    faceRight: ['gums'],
    collateralLeft: ['abdomen'],
    collateralRight: ['abdomen'],
  };
  const starts = {} as Record<CvCoursePath, number>,
    ends = {} as Record<CvCoursePath, number>;
  for (const key of Object.keys(parents) as CvCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid CV course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<CvCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as CvCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
