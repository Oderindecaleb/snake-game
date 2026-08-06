import type { Cell, GameState } from "../game/types";
import { CANDY, GRID } from "./theme";

export function cellCenter(cell: Cell, cellPx: number): { x: number; y: number } {
  return { x: cell.x * cellPx + cellPx / 2, y: cell.y * cellPx + cellPx / 2 };
}

export function headDirectionVector(snake: Cell[]): { dx: number; dy: number } {
  if (snake.length < 2) {
    return { dx: 1, dy: 0 };
  }
  const head = snake[0];
  const neck = snake[1];
  return { dx: Math.sign(head.x - neck.x), dy: Math.sign(head.y - neck.y) };
}

export function drawCheckerboard(ctx: CanvasRenderingContext2D, cellPx: number): void {
  const widthPx = GRID.width * cellPx;
  const heightPx = GRID.height * cellPx;
  ctx.fillStyle = CANDY.checkerA;
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.fillStyle = CANDY.checkerB;
  for (let y = 0; y < GRID.height; y++) {
    for (let x = 0; x < GRID.width; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      }
    }
  }
}

export function drawCandyFood(ctx: CanvasRenderingContext2D, food: Cell | null, cellPx: number, timeMs: number): void {
  if (!food) {
    return;
  }

  const pulse = 0.9 + 0.1 * Math.sin(timeMs / 220);
  const center = cellCenter(food, cellPx);
  const radius = cellPx * 0.38 * pulse;

  ctx.save();
  ctx.fillStyle = CANDY.foodShadow;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + radius * 0.9, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createRadialGradient(
    center.x - radius * 0.35,
    center.y - radius * 0.4,
    radius * 0.1,
    center.x,
    center.y,
    radius * 1.2,
  );
  gradient.addColorStop(0, CANDY.foodInner);
  gradient.addColorStop(1, CANDY.foodOuter);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(center.x - radius * 0.35, center.y - radius * 0.4, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CANDY.foodLeaf;
  ctx.beginPath();
  ctx.ellipse(center.x + radius * 0.5, center.y - radius * 1.1, radius * 0.4, radius * 0.21, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCandySnake(ctx: CanvasRenderingContext2D, snake: Cell[], cellPx: number): void {
  if (snake.length === 0) {
    return;
  }

  const { dx, dy } = headDirectionVector(snake);
  const points = snake.map((cell) => cellCenter(cell, cellPx));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
    for (let i = points.length - 2; i >= 0; i--) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = CANDY.snakeShade;
    ctx.lineWidth = cellPx * 0.92;
    ctx.stroke();
    ctx.strokeStyle = CANDY.snakeBody;
    ctx.lineWidth = cellPx * 0.72;
    ctx.stroke();
    ctx.strokeStyle = CANDY.snakeHighlight;
    ctx.lineWidth = cellPx * 0.2;
    ctx.stroke();
  }

  const head = points[0];
  ctx.fillStyle = CANDY.snakeShade;
  ctx.beginPath();
  ctx.arc(head.x, head.y, cellPx * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CANDY.snakeBody;
  ctx.beginPath();
  ctx.arc(head.x, head.y, cellPx * 0.4, 0, Math.PI * 2);
  ctx.fill();

  const eyeBaseX = head.x + dx * cellPx * 0.14;
  const eyeBaseY = head.y + dy * cellPx * 0.14;
  const perpX = -dy * cellPx * 0.18;
  const perpY = dx * cellPx * 0.18;
  for (const side of [1, -1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeBaseX + perpX * side, eyeBaseY + perpY * side, cellPx * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2118";
    ctx.beginPath();
    ctx.arc(
      eyeBaseX + perpX * side + dx * cellPx * 0.05,
      eyeBaseY + perpY * side + dy * cellPx * 0.05,
      cellPx * 0.075,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

export function drawBoard(ctx: CanvasRenderingContext2D, state: GameState, cellPx: number, timeMs: number): void {
  drawCheckerboard(ctx, cellPx);
  drawCandyFood(ctx, state.food, cellPx, timeMs);
  drawCandySnake(ctx, state.snake, cellPx);
}
