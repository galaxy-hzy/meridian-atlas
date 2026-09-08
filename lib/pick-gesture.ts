type PointerSample = {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
  isPrimary: boolean;
};

// A gesture can select only if it stayed a single, primary, stationary pointer.
export function createPickGesture() {
  const pointers = new Set<number>();
  let candidate: PointerSample | null = null;
  let moved = false;
  return {
    get active() {
      return pointers.size > 0;
    },
    down(e: PointerSample) {
      if (e.button !== 0) return;
      pointers.add(e.pointerId);
      if (pointers.size !== 1 || !e.isPrimary) {
        moved = true;
        return;
      }
      candidate = {
        ...e,
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        isPrimary: e.isPrimary,
      };
      moved = false;
    },
    move(e: PointerSample) {
      if (
        candidate?.pointerId === e.pointerId &&
        Math.hypot(
          e.clientX - candidate.clientX,
          e.clientY - candidate.clientY,
        ) > 5
      )
        moved = true;
    },
    up(e: PointerSample) {
      const pick =
        pointers.size === 1 &&
        candidate?.pointerId === e.pointerId &&
        e.button === 0 &&
        !moved &&
        Math.hypot(
          e.clientX - candidate.clientX,
          e.clientY - candidate.clientY,
        ) <= 5;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        candidate = null;
        moved = false;
      }
      return pick;
    },
    cancel() {
      pointers.clear();
      candidate = null;
      moved = false;
    },
  };
}
