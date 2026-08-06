import { describe, expect, it } from "vitest";
import { intentFromKey, shouldPreventDefault } from "./keyboard";

describe("intentFromKey", () => {
  it("maps arrow keys and WASD to direction intents", () => {
    expect(intentFromKey("ArrowUp")).toEqual({ type: "direction", direction: "up" });
    expect(intentFromKey("ArrowDown")).toEqual({ type: "direction", direction: "down" });
    expect(intentFromKey("ArrowLeft")).toEqual({ type: "direction", direction: "left" });
    expect(intentFromKey("ArrowRight")).toEqual({ type: "direction", direction: "right" });
    expect(intentFromKey("w")).toEqual({ type: "direction", direction: "up" });
    expect(intentFromKey("D")).toEqual({ type: "direction", direction: "right" });
  });

  it("maps confirm, pause, cancel, title, and mute keys", () => {
    expect(intentFromKey("Enter")).toEqual({ type: "confirm" });
    expect(intentFromKey(" ")).toEqual({ type: "pause" });
    expect(intentFromKey("p")).toEqual({ type: "pause" });
    expect(intentFromKey("Escape")).toEqual({ type: "cancel" });
    expect(intentFromKey("m")).toEqual({ type: "toTitle" });
    expect(intentFromKey("n")).toEqual({ type: "toggleMute" });
  });

  it("maps digits 1-9 to selectLevel", () => {
    expect(intentFromKey("1")).toEqual({ type: "selectLevel", level: 1 });
    expect(intentFromKey("9")).toEqual({ type: "selectLevel", level: 9 });
  });

  it("returns null for keys with no meaning", () => {
    expect(intentFromKey("0")).toBeNull();
    expect(intentFromKey("Tab")).toBeNull();
    expect(intentFromKey("z")).toBeNull();
  });
});

describe("shouldPreventDefault", () => {
  it("is true for arrow keys and space, false otherwise", () => {
    expect(shouldPreventDefault("ArrowUp")).toBe(true);
    expect(shouldPreventDefault(" ")).toBe(true);
    expect(shouldPreventDefault("Enter")).toBe(false);
    expect(shouldPreventDefault("w")).toBe(false);
  });
});
