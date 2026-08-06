import type { Grid } from "../game/types";

export const GRID: Grid = { width: 24, height: 16 };

export const CANDY = {
  checkerA: "#a5dd76",
  checkerB: "#9bd76c",
  snakeBody: "#2f8fe8",
  snakeShade: "#1b6fae",
  snakeHighlight: "rgba(255,255,255,0.28)",
  foodInner: "#ff8f86",
  foodOuter: "#d93b4e",
  foodLeaf: "#5aa832",
  foodShadow: "rgba(30,70,20,0.18)",
} as const;

export function cellPixelSize(canvasWidthPx: number): number {
  return Math.max(1, Math.floor(canvasWidthPx / GRID.width));
}
