import type { GameState } from "../game/types";
import { GRID, THEME } from "./theme";

function setTextStyle(ctx: CanvasRenderingContext2D, sizePx: number): void {
  ctx.font = `${Math.floor(sizePx)}px "Courier New", monospace`;
  ctx.fillStyle = THEME.ink;
  ctx.textBaseline = "middle";
}

export function drawHud(ctx: CanvasRenderingContext2D, score: number, level: number, widthPx: number, cellPx: number): void {
  ctx.save();
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, widthPx, cellPx);
  setTextStyle(ctx, cellPx * 0.6);
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${String(score).padStart(4, "0")}`, cellPx * 0.4, cellPx * 0.55);
  ctx.textAlign = "right";
  ctx.fillText(`LVL ${level}`, widthPx - cellPx * 0.4, cellPx * 0.55);
  ctx.restore();
}

function drawOverlayBackdrop(ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number): void {
  ctx.fillStyle = "rgba(4,22,10,0.82)";
  ctx.fillRect(0, 0, widthPx, heightPx);
}

export function drawTitleScreen(ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number, timeMs: number): void {
  ctx.save();
  setTextStyle(ctx, heightPx * 0.12);
  ctx.textAlign = "center";
  ctx.fillText("SNAKE", widthPx / 2, heightPx * 0.42);
  setTextStyle(ctx, heightPx * 0.06);
  ctx.globalAlpha = 0.72;
  ctx.fillText("NOKIA CLASSIC", widthPx / 2, heightPx * 0.55);
  const blink = Math.floor(timeMs / 550) % 2 === 0;
  ctx.globalAlpha = blink ? 1 : 0;
  ctx.fillText("PRESS ANY KEY", widthPx / 2, heightPx * 0.68);
  ctx.restore();
}

export function drawLevelSelectScreen(
  ctx: CanvasRenderingContext2D,
  widthPx: number,
  heightPx: number,
  level: number,
  best: number,
): void {
  ctx.save();
  setTextStyle(ctx, heightPx * 0.07);
  ctx.textAlign = "center";
  ctx.fillText("SELECT LEVEL", widthPx / 2, heightPx * 0.32);
  ctx.fillText(String(level), widthPx / 2, heightPx * 0.48);
  setTextStyle(ctx, heightPx * 0.05);
  ctx.fillText(`BEST ${best}`, widthPx / 2, heightPx * 0.6);
  ctx.fillText("<- -> ADJUST  ·  ENTER START", widthPx / 2, heightPx * 0.72);
  ctx.restore();
}

export function drawPausedOverlay(ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number): void {
  drawOverlayBackdrop(ctx, widthPx, heightPx);
  ctx.save();
  setTextStyle(ctx, heightPx * 0.09);
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", widthPx / 2, heightPx / 2);
  ctx.restore();
}

export function drawGameOverScreen(
  ctx: CanvasRenderingContext2D,
  widthPx: number,
  heightPx: number,
  state: GameState,
  best: number,
  isNewBest: boolean,
): void {
  drawOverlayBackdrop(ctx, widthPx, heightPx);
  ctx.save();
  setTextStyle(ctx, heightPx * 0.08);
  ctx.textAlign = "center";
  const title = state.phase.kind === "gameOver" && state.phase.result === "won" ? "BOARD CLEARED" : "GAME OVER";
  ctx.fillText(title, widthPx / 2, heightPx * 0.34);
  setTextStyle(ctx, heightPx * 0.055);
  ctx.fillText(`SCORE ${state.score}`, widthPx / 2, heightPx * 0.48);
  ctx.fillText(`BEST ${best}`, widthPx / 2, heightPx * 0.56);
  if (isNewBest) {
    ctx.fillText("NEW BEST", widthPx / 2, heightPx * 0.64);
  }
  ctx.fillText("ENTER PLAY AGAIN  ·  M MENU", widthPx / 2, heightPx * 0.76);
  ctx.restore();
}
