import { describe, expect, it } from "vitest";
import { MAX_FRAME_DELTA_MS, advanceAccumulator, clampDelta } from "./loop";

describe("clampDelta", () => {
  it("passes small deltas through unchanged", () => {
    expect(clampDelta(16)).toBe(16);
  });

  it("clamps a huge delta (e.g. a backgrounded tab) to the max", () => {
    expect(clampDelta(50_000)).toBe(MAX_FRAME_DELTA_MS);
  });
});

describe("advanceAccumulator", () => {
  it("produces zero ticks when the delta is under one tick", () => {
    const result = advanceAccumulator(0, 50, 100);
    expect(result).toEqual({ accumulator: 50, ticks: 0 });
  });

  it("produces exactly one tick and keeps the remainder", () => {
    const result = advanceAccumulator(0, 120, 100);
    expect(result).toEqual({ accumulator: 20, ticks: 1 });
  });

  it("produces multiple ticks for a large delta within the clamp", () => {
    const result = advanceAccumulator(0, 250, 100);
    expect(result).toEqual({ accumulator: 50, ticks: 2 });
  });

  it("never produces more ticks than the clamp allows, even for a huge delta", () => {
    const result = advanceAccumulator(0, 50_000, 100);
    // MAX_FRAME_DELTA_MS is 250, so at most floor(250/100) = 2 ticks, never ~500.
    expect(result.ticks).toBe(2);
  });

  it("carries a prior accumulator forward", () => {
    const result = advanceAccumulator(80, 40, 100);
    expect(result).toEqual({ accumulator: 20, ticks: 1 });
  });
});
