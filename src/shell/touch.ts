import type { Intent } from "./intent";

const SWIPE_THRESHOLD_PX = 24;

export interface TouchPoint {
  x: number;
  y: number;
}

export function intentFromSwipe(start: TouchPoint, end: TouchPoint): Intent | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) {
    return null;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    return { type: "direction", direction: dx > 0 ? "right" : "left" };
  }
  return { type: "direction", direction: dy > 0 ? "down" : "up" };
}

export function isTap(start: TouchPoint, end: TouchPoint): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX;
}
