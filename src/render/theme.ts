import type { Grid } from "../game/types";

export const GRID: Grid = { width: 24, height: 16 };

export const HUD_HEIGHT_PX = 28;

export const THEME = {
  bg: "#05070a",
  field: "#04160a",
  ink: "#38ff7a",
  border: "#1d6b38",
  glow: "rgba(56,255,122,0.8)",
  scanline: "rgba(0,0,0,0.38)",
} as const;

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
