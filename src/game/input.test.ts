import { describe, expect, it } from "vitest";
import { isOpposite, queueDirection } from "./input";
import type { GameState } from "./types";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: { kind: "playing" },
    level: 1,
    grid: { width: 24, height: 16 },
    snake: [{ x: 5, y: 5 }],
    direction: "right",
    inputQueue: [],
    food: null,
    score: 0,
    ...overrides,
  };
}

describe("isOpposite", () => {
  it("identifies opposite direction pairs", () => {
    expect(isOpposite("up", "down")).toBe(true);
    expect(isOpposite("left", "right")).toBe(true);
    expect(isOpposite("up", "left")).toBe(false);
    expect(isOpposite("up", "up")).toBe(false);
  });
});

describe("queueDirection", () => {
  it("queues a valid turn", () => {
    const state = baseState();
    const result = queueDirection(state, "up");
    expect(result.inputQueue).toEqual(["up"]);
  });

  it("rejects the reverse of the current direction when the queue is empty", () => {
    const state = baseState({ direction: "right", inputQueue: [] });
    const result = queueDirection(state, "left");
    expect(result.inputQueue).toEqual([]);
  });

  it("rejects the reverse of the last queued direction, not the current direction", () => {
    const state = baseState({ direction: "right", inputQueue: ["up"] });
    // "down" is not opposite "right" (current), but IS opposite "up" (last queued) — must reject.
    const result = queueDirection(state, "down");
    expect(result.inputQueue).toEqual(["up"]);
  });

  it("allows two valid turns queued within one tick", () => {
    const state = baseState({ direction: "right", inputQueue: [] });
    const afterFirst = queueDirection(state, "up");
    const afterSecond = queueDirection(afterFirst, "left");
    expect(afterSecond.inputQueue).toEqual(["up", "left"]);
  });

  it("discards a duplicate of the reference direction", () => {
    const state = baseState({ direction: "right", inputQueue: [] });
    const result = queueDirection(state, "right");
    expect(result.inputQueue).toEqual([]);
  });

  it("caps the queue at 2 entries", () => {
    const state = baseState({ direction: "right", inputQueue: ["up", "right"] });
    const result = queueDirection(state, "up");
    expect(result.inputQueue).toEqual(["up", "right"]);
  });
});
