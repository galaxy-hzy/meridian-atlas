import type { Point } from './atlas';

const normalize = (text: string) => text.toLowerCase().replace(/\s/g, '');

export function searchPoints(points: readonly Point[], query: string): Point[] {
  const needle = normalize(query);
  if (!needle) return [];
  return points.filter((point) =>
    [point.name, point.id, point.aliases || ''].some((value) =>
      normalize(value).includes(needle),
    ),
  );
}
