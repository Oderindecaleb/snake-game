import { spawnFood } from "./food";
import { pointsPerFood } from "./levels";
import { nextHead, step } from "./snake";
import type { Cell, Direction, GameState, Grid, TickEvent, TickResult } from "./types";

const DEFAULT_GRID: Grid = { width: 24, height: 16 };

export function isWithinBounds(cell: Cell, grid: Grid): boolean {
  return cell.x >= 0 && cell.x < grid.width && cell.y >= 0 && cell.y < grid.height;
}

export function collidesWithSelf(head: Cell, snake: Cell[], grow: boolean): boolean {
  const body = grow ? snake : snake.slice(0, -1);
  return body.some((segment) => segment.x === head.x && segment.y === head.y);
}

export function createTitleState(): GameState {
  return {
    phase: { kind: "title" },
    level: 1,
    grid: DEFAULT_GRID,
    snake: [],
    direction: "right",
    inputQueue: [],
    food: null,
    score: 0,
  };
}

export function createRound(level: number, grid: Grid, rng: () => number): GameState {
  const headX = Math.floor(grid.width / 2);
  const y = Math.floor(grid.height / 2);
  const snake: Cell[] = [
    { x: headX, y },
    { x: headX - 1, y },
    { x: headX - 2, y },
  ];

  return {
    phase: { kind: "playing" },
    level,
    grid,
    snake,
    direction: "right",
    inputQueue: [],
    food: spawnFood(grid, snake, rng),
    score: 0,
  };
}

function isSameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function tick(state: GameState, rng: () => number): TickResult {
  if (state.phase.kind !== "playing") {
    return { state, events: [] };
  }

  const events: TickEvent[] = [];

  const direction: Direction = state.inputQueue[0] ?? state.direction;
  const inputQueue = state.inputQueue.length > 0 ? state.inputQueue.slice(1) : state.inputQueue;

  const head = nextHead(state.snake[0], direction);
  const willEat = state.food !== null && isSameCell(head, state.food);

  if (!isWithinBounds(head, state.grid)) {
    events.push("died");
    return { state: { ...state, direction, inputQueue, phase: { kind: "gameOver", result: "died" } }, events };
  }

  if (collidesWithSelf(head, state.snake, willEat)) {
    events.push("died");
    return { state: { ...state, direction, inputQueue, phase: { kind: "gameOver", result: "died" } }, events };
  }

  const snake = step(state.snake, direction, willEat);

  if (!willEat) {
    return { state: { ...state, snake, direction, inputQueue }, events };
  }

  events.push("ate");
  const score = state.score + pointsPerFood(state.level);
  const food = spawnFood(state.grid, snake, rng);

  if (food === null) {
    events.push("won");
    return {
      state: { ...state, snake, direction, inputQueue, score, food, phase: { kind: "gameOver", result: "won" } },
      events,
    };
  }

  return { state: { ...state, snake, direction, inputQueue, score, food }, events };
}
