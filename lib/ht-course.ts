import data from './ht-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type HtCoursePath = 'stem' | 'viscera' | 'eye' | 'emerge' | 'arm';
export const htCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    HtCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function htCourseTimelines(
  lengths: Record<HtCoursePath, number>,
): Record<HtCoursePath, FlowTimeline> {
  if (Object.values(lengths).some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error('Invalid HT course lengths');
  const { stem, viscera, eye, emerge, arm } = lengths;
  const total = stem + Math.max(viscera, eye, emerge + arm);
  const segment = (start: number, length: number): FlowTimeline => [
    [start / total, 0],
    [(start + length) / total, 1],
  ];
  return {
    stem: segment(0, stem),
    viscera: segment(stem, viscera),
    eye: segment(stem, eye),
    emerge: segment(stem, emerge),
    arm: segment(stem + emerge, arm),
  };
}
