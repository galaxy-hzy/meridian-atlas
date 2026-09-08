export function advanceLearningHour(hour: number, delta: number) {
  if (!Number.isFinite(hour) || !Number.isFinite(delta))
    throw new Error('Time must be finite');
  return (
    (Math.round(((((hour + delta) % 24) + 24) % 24) * 3600000) / 3600000) % 24
  );
}
export function periodProgress(hour: number, start: number) {
  const elapsed = advanceLearningHour(hour, -start);
  return elapsed < 2 ? elapsed / 2 : null;
}
export type FlowFrame = {
  channel: string | null;
  elapsed: number;
  at: number;
  running: boolean;
  started: boolean;
};
export function advanceFlowFrame(
  previous: FlowFrame,
  channel: string | null,
  running: boolean,
  at: number,
): FlowFrame {
  const same = previous.channel === channel;
  return {
    channel,
    at,
    running,
    started: !!channel && (running || (same && previous.started)),
    elapsed: same
      ? previous.elapsed +
        (running && previous.running ? Math.max(0, at - previous.at) : 0)
      : 0,
  };
}
export type FlowTimeline = readonly (readonly [phase: number, curve: number])[];
export function curveProgress(
  phase: number,
  timeline: FlowTimeline,
): number | null {
  if (phase < timeline[0][0] || phase > timeline[timeline.length - 1][0])
    return null;
  for (let i = 1; i < timeline.length; i++) {
    const [a, u] = timeline[i - 1],
      [b, v] = timeline[i];
    if (phase <= b) return b === a ? v : u + ((v - u) * (phase - a)) / (b - a);
  }
  return null;
}
// Two existing BL paths share a head, fork at BL10 and join at BL40. The
// shorter fork waits for the longer one; this is schematic animation timing.
export function forkTimelines(
  firstLength: number,
  splitFraction: number,
  secondLength: number,
  mergeFraction: number,
): FlowTimeline[] {
  const head = firstLength * splitFraction,
    tail = secondLength * (1 - mergeFraction);
  const branches = Math.max(firstLength - head, secondLength * mergeFraction);
  const total = head + branches + tail;
  const split = head / total,
    merge = (head + branches) / total;
  return [
    [
      [0, 0],
      [split, splitFraction],
      [merge, 1],
    ],
    [
      [split, 0],
      [merge, mergeFraction],
      [1, 1],
    ],
  ];
}

// Continuous segments of one route play consecutively, including a projected
// internal segment. This is a drawing timeline, not measured transit time.
export function sequentialTimelines(lengths: number[]): FlowTimeline[] {
  if (!lengths.length || lengths.some((n) => !Number.isFinite(n) || n <= 0))
    throw new Error('Route lengths must be positive and finite');
  const total = lengths.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  return lengths.map((length, i) => {
    const start = cumulative / total;
    cumulative += length;
    return [
      [start, 0],
      [i === lengths.length - 1 ? 1 : cumulative / total, 1],
    ];
  });
}
