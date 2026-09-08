import data from './li-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';

export type LiCoursePath = 'stem' | 'internal' | 'neck' | 'oral' | 'face';
export const liCourse = data as unknown as Omit<
  typeof data,
  'paths' | 'nodes'
> & {
  paths: Record<
    LiCoursePath,
    { label: string; kind: 'surface' | 'internal'; points: Vec3[] }
  >;
  nodes: { label: string; position: Vec3 }[];
};

// One common stem, then two branches. The head branch is a serial chain;
// the visceral branch starts at the same supraclavicular junction phase.
export function liCourseTimelines(
  lengths: Record<LiCoursePath, number>,
): Record<LiCoursePath, FlowTimeline> {
  if (Object.values(lengths).some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error('LI course lengths must be finite and positive');
  const { stem, internal, neck, oral, face } = lengths;
  const total = stem + Math.max(internal, neck + oral + face);
  const segment = (start: number, length: number): FlowTimeline => [
    [start / total, 0],
    [(start + length) / total, 1],
  ];
  return {
    stem: segment(0, stem),
    internal: segment(stem, internal),
    neck: segment(stem, neck),
    oral: segment(stem + neck, oral),
    face: segment(stem + neck + oral, face),
  };
}
