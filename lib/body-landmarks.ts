import type { Vec3 } from './atlas';

// Authored generic mannequin dimensions, NOT measured human anatomy.
// The rendered torso and point placement share the same surface definition.
export const torsoRings: [number, number, number][] = [
  [0.84, 0.16, 0.12],
  [0.9, 0.24, 0.16],
  [0.98, 0.23, 0.16],
  [1.06, 0.212, 0.18],
  [1.16, 0.234, 0.17],
  [1.28, 0.286, 0.186],
  [1.38, 0.3, 0.17],
  [1.44, 0.275, 0.13],
  [1.485, 0.105, 0.075],
];
export const bodyLandmarks = {
  umbilicusY: 1.04,
  pubicUpperY: 0.88,
  xiphoidTipY: 1.24,
  sternalNotchY: 1.48,
  nippleHalfWidth: 0.16,
  // Rib spaces are authored landmarks requiring anatomical review.
  intercostalY: [0, 1.405, 1.377, 1.349, 1.321, 1.293, 1.265, 1.237],
};
export const proportionalUnits = {
  upperAbdomen: 8,
  lowerAbdomen: 5,
  chest: 9,
  nippleSeparation: 8,
  forearm: 12,
};
export const surfaceLift = 0.004;
export function torsoRadii(y: number): [number, number] {
  if (!Number.isFinite(y) || y < torsoRings[0][0] || y > torsoRings.at(-1)![0])
    throw new RangeError('Outside torso');
  const hi = torsoRings.findIndex((r) => r[0] >= y);
  if (hi === 0) return [torsoRings[0][1], torsoRings[0][2]];
  const a = torsoRings[hi - 1],
    b = torsoRings[hi],
    t = (y - a[0]) / (b[0] - a[0]);
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export function torsoSurface(
  x: number,
  y: number,
  side: 1 | -1 = 1,
  lift = surfaceLift,
): Vec3 {
  const [rx, rz] = torsoRadii(y);
  if (!Number.isFinite(x) || Math.abs(x) > rx)
    throw new RangeError('Outside torso cross-section');
  const z = rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  return [x, y, side * (z + lift)];
}
export function lateralCun(cun: number): number {
  return (
    cun *
    ((bodyLandmarks.nippleHalfWidth * 2) / proportionalUnits.nippleSeparation)
  );
}
export function abdominalY(cunFromNavel: number): number {
  const { umbilicusY, xiphoidTipY, pubicUpperY } = bodyLandmarks;
  const unit =
    cunFromNavel >= 0
      ? (xiphoidTipY - umbilicusY) / proportionalUnits.upperAbdomen
      : (umbilicusY - pubicUpperY) / proportionalUnits.lowerAbdomen;
  return umbilicusY + cunFromNavel * unit;
}
export function clavicularY(x: number): number {
  const mid =
    bodyLandmarks.sternalNotchY -
    (bodyLandmarks.sternalNotchY - bodyLandmarks.xiphoidTipY) /
      proportionalUnits.chest;
  // Shaped to this mannequin's clavicular contour, not a clinical formula.
  return mid - 0.022 * (x / lateralCun(6)) ** 2;
}
export const placementGuides: Vec3[][] = [];
for (const space of [1, 2, 3, 4, 5, 6]) {
  placementGuides.push(
    Array.from({ length: 49 }, (_, i) =>
      torsoSurface(
        (i - 24) * 0.01,
        bodyLandmarks.intercostalY[space],
        1,
        0.003,
      ),
    ),
  );
}
for (const cun of [0, 0.5, 2, 4]) {
  for (const side of cun ? [-1, 1] : [1])
    placementGuides.push(
      Array.from({ length: 53 }, (_, i) =>
        torsoSurface(side * lateralCun(cun), abdominalY(-5 + i / 4), 1, 0.003),
      ),
    );
}
for (const offset of [-5, -4, -3, -2, -1.5, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8]) {
  placementGuides.push(
    Array.from({ length: 33 }, (_, i) =>
      torsoSurface((i - 16) * 0.01, abdominalY(offset), 1, 0.003),
    ),
  );
}
