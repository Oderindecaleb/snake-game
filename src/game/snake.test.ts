import { describe, expect, it } from "vitest";
import { nextHead, step } from "./snake";

describe("nextHead", () => {
  it("moves one cell in each direction", () => {
    const head = { x: 5, y: 5 };
    expect(nextHead(head, "up")).toEqual({ x: 5, y: 4 });
    expect(nextHead(head, "down")).toEqual({ x: 5, y: 6 });
    expect(nextHead(head, "left")).toEqual({ x: 4, y: 5 });
    expect(nextHead(head, "right")).toEqual({ x: 6, y: 5 });
  });
});

describe("step", () => {
  it("moves without growing: prepends new head, drops the tail", () => {
    const cells = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    const result = step(cells, "right", false);
    expect(result).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
  });

  it("moves while growing: prepends new head, keeps the tail", () => {
    const cells = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    const result = step(cells, "right", true);
    expect(result).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
  });
});
