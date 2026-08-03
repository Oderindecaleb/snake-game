const SWIPE_THRESHOLD_PX = 24;

export interface TouchPoint {
  x: number;
  y: number;
}

export function isTap(start: TouchPoint, end: TouchPoint): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX;
}
