import { describe, expect, it } from "vitest";
import { intentFromSwipe, isTap } from "./touch";

describe("intentFromSwipe", () => {
  it("returns null for a movement under the threshold (a tap)", () => {
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 105, y: 102 })).toBeNull();
  });

  it("picks the dominant horizontal direction", () => {
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 160, y: 105 })).toEqual({
      type: "direction",
      direction: "right",
    });
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 40, y: 105 })).toEqual({
      type: "direction",
      direction: "left",
    });
  });

  it("picks the dominant vertical direction", () => {
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 105, y: 160 })).toEqual({
      type: "direction",
      direction: "down",
    });
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 105, y: 40 })).toEqual({
      type: "direction",
      direction: "up",
    });
  });
});

describe("isTap", () => {
  it("is true when movement stays under the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 105, y: 102 })).toBe(true);
  });

  it("is false once movement crosses the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 160, y: 100 })).toBe(false);
  });
});
