import { describe, expect, it } from "vitest";
import { freeCells, spawnFood } from "./food";

const grid = { width: 3, height: 1 };

describe("freeCells", () => {
  it("lists every cell not occupied", () => {
    expect(freeCells(grid, [{ x: 0, y: 0 }])).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("returns an empty list when the board is full", () => {
    expect(
      freeCells(grid, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toEqual([]);
  });
});

describe("spawnFood", () => {
  it("picks uniformly from the free-cell list using the injected rng", () => {
    // rng() = 0.999... picks the last free cell deterministically.
    const result = spawnFood(grid, [{ x: 0, y: 0 }], () => 0.999);
    expect(result).toEqual({ x: 2, y: 0 });
  });

  it("picks the first free cell when rng() = 0", () => {
    const result = spawnFood(grid, [{ x: 0, y: 0 }], () => 0);
    expect(result).toEqual({ x: 1, y: 0 });
  });

  it("returns null when the board is full", () => {
    const result = spawnFood(
      grid,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      () => 0,
    );
    expect(result).toBeNull();
  });
});
