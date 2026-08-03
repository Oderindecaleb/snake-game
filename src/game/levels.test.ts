// src/game/levels.test.ts
import { describe, expect, it } from "vitest";
import { LEVELS, getLevel, pointsPerFood, tickMsForLevel } from "./levels";

describe("levels", () => {
  it("has exactly nine levels, numbered 1 through 9", () => {
    expect(LEVELS).toHaveLength(9);
    expect(LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("maps level to the spec's tickMs table", () => {
    expect(tickMsForLevel(1)).toBe(180);
    expect(tickMsForLevel(5)).toBe(102);
    expect(tickMsForLevel(9)).toBe(58);
  });

  it("awards points equal to the level", () => {
    expect(pointsPerFood(1)).toBe(1);
    expect(pointsPerFood(9)).toBe(9);
  });

  it("getLevel returns the full config for a level", () => {
    expect(getLevel(4)).toEqual({ level: 4, tickMs: 118, pointsPerFood: 4 });
  });

  it("throws for a level outside 1-9", () => {
    expect(() => getLevel(0)).toThrow();
    expect(() => getLevel(10)).toThrow();
  });
});
