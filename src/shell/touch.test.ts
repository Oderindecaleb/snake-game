import { describe, expect, it } from "vitest";
import { isTap } from "./touch";

describe("isTap", () => {
  it("is true when movement stays under the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 105, y: 102 })).toBe(true);
  });

  it("is false once movement crosses the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 160, y: 100 })).toBe(false);
  });
});
