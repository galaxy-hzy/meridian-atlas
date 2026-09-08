import data from './lung-course.json';
import type { Vec3 } from './atlas';
import type { FlowTimeline } from './flow';

export const lungCourse = data as unknown as Omit<
  typeof data,
  'internal' | 'branch' | 'nodes'
> & {
  internal: Vec3[];
  branch: Vec3[];
  nodes: { label: string; position: Vec3 }[];
};

// The internal prelude precedes the surface path. At the wrist the thumb
// and index-finger routes run concurrently, sharing the exact fork phase.
// Arc lengths set drawing speed only, never a physiological transit time.
export function lungCourseTimelines(
  internalLength: number,
  surfaceLength: number,
  wristFraction: number,
  branchLength: number,
): { internal: FlowTimeline; surface: FlowTimeline; branch: FlowTimeline } {
  if (
    [internalLength, surfaceLength, branchLength].some(
      (n) => !Number.isFinite(n) || n <= 0,
    ) ||
    !Number.isFinite(wristFraction) ||
    wristFraction <= 0 ||
    wristFraction >= 1
  )
    throw new Error('Invalid lung course lengths or fork');
  const forkDistance = surfaceLength * wristFraction;
  const total =
    internalLength + Math.max(surfaceLength, forkDistance + branchLength);
  const emerge = internalLength / total;
  const fork = (internalLength + forkDistance) / total;
  return {
    internal: [
      [0, 0],
      [emerge, 1],
    ],
    surface: [
      [emerge, 0],
      [fork, wristFraction],
      [(internalLength + surfaceLength) / total, 1],
    ],
    branch: [
      [fork, 0],
      [(internalLength + forkDistance + branchLength) / total, 1],
    ],
  };
}
