import data from './bl-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';
export type BlCoursePath = keyof typeof data.paths;
export const blCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    BlCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};
export function blCourseTimelines(
  lengths: Record<BlCoursePath, number>,
): Record<BlCoursePath, FlowTimeline> {
  const parents: Record<BlCoursePath, BlCoursePath[]> = {
    head: [],
    ear: ['head'],
    brain: ['head'],
    nape: ['brain'],
    back: ['nape'],
    viscera: ['back'],
    innerLower: ['back'],
    outer: ['nape'],
    tail: ['innerLower', 'outer'],
  };
  const starts = {} as Record<BlCoursePath, number>,
    ends = {} as Record<BlCoursePath, number>;
  for (const key of Object.keys(parents) as BlCoursePath[]) {
    if (!Number.isFinite(lengths[key]) || lengths[key] <= 0)
      throw new Error('Invalid BL course length');
    starts[key] = Math.max(0, ...parents[key].map((parent) => ends[parent]));
    ends[key] = starts[key] + lengths[key];
  }
  const total = Math.max(...Object.values(ends));
  const result = {} as Record<BlCoursePath, FlowTimeline>;
  for (const key of Object.keys(parents) as BlCoursePath[])
    result[key] = [
      [starts[key] / total, 0],
      [ends[key] / total, 1],
    ];
  return result;
}
