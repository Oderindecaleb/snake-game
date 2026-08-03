import type { GameState } from "../game/types";
import { drawBorder, drawFood, drawScanlines, drawSnake } from "./playfield";
import { drawGameOverScreen, drawHud, drawLevelSelectScreen, drawPausedOverlay, drawTitleScreen } from "./screens";
import { GRID, HUD_HEIGHT_PX, THEME } from "./theme";

export interface RenderOptions {
  cellPx: number;
  best: number;
  reducedMotion: boolean;
}

export function createRenderer() {
  function draw(ctx: CanvasRenderingContext2D, state: GameState, timeMs: number, options: RenderOptions): void {
    const { cellPx, best, reducedMotion } = options;
    const fieldWidth = GRID.width * cellPx;
    const fieldHeight = GRID.height * cellPx;

    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, fieldWidth, fieldHeight + HUD_HEIGHT_PX);

    drawHud(ctx, state.score, state.level, fieldWidth, cellPx);

    ctx.save();
    ctx.translate(0, HUD_HEIGHT_PX);
    drawBorder(ctx, fieldWidth, fieldHeight);
    drawSnake(ctx, state.snake, cellPx);
    drawFood(ctx, state.food, cellPx, reducedMotion ? 0 : timeMs);
    if (!reducedMotion) {
      drawScanlines(ctx, fieldWidth, fieldHeight);
    }

    if (state.phase.kind === "title") {
      drawTitleScreen(ctx, fieldWidth, fieldHeight, timeMs);
    } else if (state.phase.kind === "levelSelect") {
      drawLevelSelectScreen(ctx, fieldWidth, fieldHeight, state.phase.level, best);
    } else if (state.phase.kind === "paused") {
      drawPausedOverlay(ctx, fieldWidth, fieldHeight);
    } else if (state.phase.kind === "gameOver") {
      const isNewBest = state.score > 0 && state.score >= best;
      drawGameOverScreen(ctx, fieldWidth, fieldHeight, state, best, isNewBest);
    }

    ctx.restore();
  }

  return { draw };
}
