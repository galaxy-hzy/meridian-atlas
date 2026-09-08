export function closestOnScreenSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax,
    dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared),
        );
  return { t, distance: Math.hypot(x - ax - t * dx, y - ay - t * dy) };
}

export type ScreenPick = {
  distance: number;
  pixels: number;
  radius: number;
  pointCore?: number;
};

// A point's visible center wins. Outside that center, a nearby line wins over
// the point's enlarged touch target so dense point chains leave selectable lines.
export function screenPickOrder(hits: readonly ScreenPick[]): number[] {
  const tier = (h: ScreenPick) =>
    h.pointCore === undefined ? 1 : h.pixels <= h.pointCore ? 0 : 2;
  return hits
    .map((_, i) => i)
    .filter((i) => hits[i].pixels <= hits[i].radius && hits[i].distance > 0)
    .sort(
      (a, b) =>
        tier(hits[a]) - tier(hits[b]) ||
        hits[a].pixels - hits[b].pixels ||
        hits[a].distance - hits[b].distance,
    );
}

export type IdentifiedScreenPick = ScreenPick & { key: string };
// Resolve ambiguity only among the winning interaction tier. Exact point
// centers keep their existing priority over lines; repeated samples, branches
// and mirrored copies of one target must never become duplicate choices.
export function screenPickChoices(
  hits: readonly IdentifiedScreenPick[],
): number[] {
  const order = screenPickOrder(hits);
  if (!order.length) return [];
  const tier = (h: ScreenPick) =>
    h.pointCore === undefined ? 1 : h.pixels <= h.pointCore ? 0 : 2;
  const bestTier = tier(hits[order[0]]);
  const seen = new Set<string>();
  return order.filter((index) => {
    const hit = hits[index];
    if (tier(hit) !== bestTier || seen.has(hit.key)) return false;
    seen.add(hit.key);
    return true;
  });
}
