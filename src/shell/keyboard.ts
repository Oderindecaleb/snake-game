import type { Intent } from "./intent";

const KEY_TO_INTENT: Record<string, Intent> = {
  ArrowUp: { type: "direction", direction: "up" },
  ArrowDown: { type: "direction", direction: "down" },
  ArrowLeft: { type: "direction", direction: "left" },
  ArrowRight: { type: "direction", direction: "right" },
  w: { type: "direction", direction: "up" },
  W: { type: "direction", direction: "up" },
  s: { type: "direction", direction: "down" },
  S: { type: "direction", direction: "down" },
  a: { type: "direction", direction: "left" },
  A: { type: "direction", direction: "left" },
  d: { type: "direction", direction: "right" },
  D: { type: "direction", direction: "right" },
  Enter: { type: "confirm" },
  " ": { type: "pause" },
  p: { type: "pause" },
  P: { type: "pause" },
  Escape: { type: "cancel" },
  m: { type: "toTitle" },
  M: { type: "toTitle" },
  n: { type: "toggleMute" },
  N: { type: "toggleMute" },
};

export function intentFromKey(key: string): Intent | null {
  if (/^[1-9]$/.test(key)) {
    return { type: "selectLevel", level: Number(key) };
  }
  return KEY_TO_INTENT[key] ?? null;
}

export function shouldPreventDefault(key: string): boolean {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" || key === " ";
}
