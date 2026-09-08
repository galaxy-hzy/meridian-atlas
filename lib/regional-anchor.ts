import type { Vec3 } from './atlas';

export function closestPolylinePoint(path: Vec3[], reference: Vec3): Vec3 {
  if (
    path.length < 2 ||
    [...path.flat(), ...reference].some((v) => !Number.isFinite(v))
  )
    throw new Error('A regional anchor needs a finite polyline');
  let best: Vec3 = [...path[0]];
  let distance = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    const delta = b.map((v, j) => v - a[j]);
    const lengthSquared = delta.reduce((sum, v) => sum + v * v, 0);
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              delta.reduce((sum, v, j) => sum + v * (reference[j] - a[j]), 0) /
                lengthSquared,
            ),
          );
    const candidate = a.map((v, j) => v + t * delta[j]) as Vec3;
    const squared = candidate.reduce(
      (sum, v, j) => sum + (v - reference[j]) ** 2,
      0,
    );
    if (squared < distance) {
      best = candidate;
      distance = squared;
    }
  }
  return best;
}

export function boundedPolyline(path: Vec3[], from: Vec3, to: Vec3): Vec3[] {
  const find = (point: Vec3) =>
    path.findIndex((p) => p.every((v, j) => Math.abs(v - point[j]) < 1e-8));
  const start = find(from),
    end = find(to);
  if (start < 0 || end < 0 || start === end)
    throw new Error(
      'Regional anchor bounds must be distinct registered route anchors',
    );
  return path.slice(Math.min(start, end), Math.max(start, end) + 1);
}
