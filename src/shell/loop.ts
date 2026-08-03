export const MAX_FRAME_DELTA_MS = 250;

export function clampDelta(deltaMs: number): number {
  return Math.min(deltaMs, MAX_FRAME_DELTA_MS);
}

export function advanceAccumulator(
  accumulator: number,
  deltaMs: number,
  tickMs: number,
): { accumulator: number; ticks: number } {
  let nextAccumulator = accumulator + clampDelta(deltaMs);
  let ticks = 0;
  while (nextAccumulator >= tickMs) {
    nextAccumulator -= tickMs;
    ticks += 1;
  }
  return { accumulator: nextAccumulator, ticks };
}

export interface LoopCallbacks {
  onTick: () => void;
  onFrame: (timeMs: number) => void;
}

export function createLoop(getTickMs: () => number, callbacks: LoopCallbacks) {
  let accumulator = 0;
  let lastTime: number | null = null;
  let running = false;
  let rafHandle = 0;

  function frame(timeMs: number): void {
    if (!running) {
      return;
    }

    if (lastTime === null) {
      lastTime = timeMs;
    }
    const delta = timeMs - lastTime;
    lastTime = timeMs;

    const result = advanceAccumulator(accumulator, delta, getTickMs());
    accumulator = result.accumulator;
    for (let i = 0; i < result.ticks; i++) {
      callbacks.onTick();
    }

    callbacks.onFrame(timeMs);
    rafHandle = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running) {
      return;
    }
    running = true;
    lastTime = null;
    accumulator = 0;
    rafHandle = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(rafHandle);
  }

  return { start, stop };
}
