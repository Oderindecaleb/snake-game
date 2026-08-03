import { describe, expect, it } from "vitest";
import { collidesWithSelf, createRound, createTitleState, isWithinBounds, tick } from "./rules";
import type { GameState } from "./types";

const grid = { width: 24, height: 16 };
const noRng = () => 0;

function stateWithSnake(overrides: Partial<GameState>): GameState {
  return {
    phase: { kind: "playing" },
    level: 1,
    grid,
    snake: [{ x: 5, y: 5 }],
    direction: "right",
    inputQueue: [],
    food: null,
    score: 0,
    ...overrides,
  };
}

describe("createTitleState", () => {
  it("starts on the title phase", () => {
    expect(createTitleState().phase).toEqual({ kind: "title" });
  });
});

describe("createRound", () => {
  it("places a centred 3-cell snake facing right and spawns food", () => {
    const state = createRound(3, grid, () => 0);
    expect(state.phase).toEqual({ kind: "playing" });
    expect(state.level).toBe(3);
    expect(state.score).toBe(0);
    expect(state.direction).toBe("right");
    expect(state.snake).toEqual([
      { x: 12, y: 8 },
      { x: 11, y: 8 },
      { x: 10, y: 8 },
    ]);
    expect(state.food).not.toBeNull();
    expect(state.snake).not.toContainEqual(state.food);
  });
});

describe("isWithinBounds", () => {
  it("is false outside the grid on every side", () => {
    expect(isWithinBounds({ x: -1, y: 0 }, grid)).toBe(false);
    expect(isWithinBounds({ x: 24, y: 0 }, grid)).toBe(false);
    expect(isWithinBounds({ x: 0, y: -1 }, grid)).toBe(false);
    expect(isWithinBounds({ x: 0, y: 16 }, grid)).toBe(false);
    expect(isWithinBounds({ x: 0, y: 0 }, grid)).toBe(true);
    expect(isWithinBounds({ x: 23, y: 15 }, grid)).toBe(true);
  });
});

describe("collidesWithSelf", () => {
  const snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
  ];

  it("is true when the head lands on a body segment", () => {
    expect(collidesWithSelf({ x: 4, y: 5 }, snake, false)) .toBe(true);
  });

  it("is false when the head lands on the tail cell and the snake is not growing", () => {
    expect(collidesWithSelf({ x: 3, y: 5 }, snake, false)).toBe(false);
  });

  it("is true when the head lands on the tail cell and the snake IS growing", () => {
    expect(collidesWithSelf({ x: 3, y: 5 }, snake, true)).toBe(true);
  });
});

describe("tick", () => {
  it("dies on the right wall", () => {
    const state = stateWithSnake({ snake: [{ x: 23, y: 5 }], direction: "right" });
    const result = tick(state, noRng);
    expect(result.events).toEqual(["died"]);
    expect(result.state.phase).toEqual({ kind: "gameOver", result: "died" });
  });

  it("dies on the top wall", () => {
    const state = stateWithSnake({ snake: [{ x: 5, y: 0 }], direction: "up" });
    const result = tick(state, noRng);
    expect(result.events).toEqual(["died"]);
  });

  it("dies on self-collision", () => {
    const state = stateWithSnake({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 4, y: 6 },
        { x: 4, y: 5 },
      ],
      direction: "down",
    });
    const result = tick(state, noRng);
    expect(result.events).toEqual(["died"]);
  });

  it("allows moving into the cell the tail is vacating this tick", () => {
    // A 4-cell loop about to close on itself where the head's target cell is the tail.
    const state = stateWithSnake({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 4 },
        { x: 4, y: 4 },
        { x: 4, y: 5 },
      ],
      direction: "right",
      food: null,
    });
    const result = tick(state, noRng);
    expect(result.events).toEqual([]);
    expect(result.state.phase).toEqual({ kind: "playing" });
  });

  it("eats food: grows, scores by level, and spawns new food", () => {
    const state = stateWithSnake({
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ],
      direction: "right",
      food: { x: 6, y: 5 },
      level: 4,
      score: 10,
    });
    const result = tick(state, () => 0);
    expect(result.events).toEqual(["ate"]);
    expect(result.state.score).toBe(14);
    expect(result.state.snake).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(result.state.food).not.toBeNull();
    expect(result.state.food).not.toEqual({ x: 6, y: 5 });
  });

  it("wins when eating fills the board", () => {
    // 1x1 grid: the only free cell is the food; eating it means no free cells remain.
    const tinyGrid = { width: 2, height: 1 };
    const state = stateWithSnake({
      grid: tinyGrid,
      snake: [{ x: 0, y: 0 }],
      direction: "right",
      food: { x: 1, y: 0 },
    });
    const result = tick(state, () => 0);
    expect(result.events).toEqual(["ate", "won"]);
    expect(result.state.phase).toEqual({ kind: "gameOver", result: "won" });
    expect(result.state.food).toBeNull();
  });

  it("consumes the queued direction before moving", () => {
    const state = stateWithSnake({ direction: "right", inputQueue: ["up"] });
    const result = tick(state, noRng);
    expect(result.state.direction).toBe("up");
    expect(result.state.inputQueue).toEqual([]);
    expect(result.state.snake[0]).toEqual({ x: 5, y: 4 });
  });

  it("is a no-op outside the playing phase", () => {
    const state = stateWithSnake({ phase: { kind: "paused" } });
    const result = tick(state, noRng);
    expect(result).toEqual({ state, events: [] });
  });
});
