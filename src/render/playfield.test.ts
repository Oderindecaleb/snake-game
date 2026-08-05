import { describe, expect, it, vi } from "vitest";
import type { GameState } from "../game/types";
import { cellCenter, drawBorder, drawFood, drawScanlines, drawSnake, headDirectionVector, drawBoard, drawCandyFood, drawCandySnake, drawCheckerboard } from "./playfield";

describe("cellCenter", () => {
  it("centers a cell within its pixel square", () => {
    expect(cellCenter({ x: 2, y: 1 }, 10)).toEqual({ x: 25, y: 15 });
  });
});

describe("headDirectionVector", () => {
  it("defaults to facing right for a single-cell snake", () => {
    expect(headDirectionVector([{ x: 0, y: 0 }])).toEqual({ dx: 1, dy: 0 });
  });

  it("points from the neck toward the head", () => {
    const snake = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
    ];
    expect(headDirectionVector(snake)).toEqual({ dx: 0, dy: -1 });
  });
});

function createStubCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "butt",
    lineJoin: "miter",
    shadowColor: "",
    shadowBlur: 0,
  };
}

describe("drawBorder", () => {
  it("draws without throwing", () => {
    const ctx = createStubCtx();
    expect(() => drawBorder(ctx as unknown as CanvasRenderingContext2D, 240, 160)).not.toThrow();
    expect(ctx.strokeRect).toHaveBeenCalledOnce();
  });
});

describe("drawSnake", () => {
  it("does nothing for an empty snake", () => {
    const ctx = createStubCtx();
    drawSnake(ctx as unknown as CanvasRenderingContext2D, [], 10);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws a head circle for a single-cell snake without a body stroke", () => {
    const ctx = createStubCtx();
    drawSnake(ctx as unknown as CanvasRenderingContext2D, [{ x: 1, y: 1 }], 10);
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("draws a body stroke and a head for a multi-cell snake", () => {
    const ctx = createStubCtx();
    const snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];
    drawSnake(ctx as unknown as CanvasRenderingContext2D, snake, 10);
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.arc).toHaveBeenCalled();
  });
});

describe("drawFood", () => {
  it("does nothing when there is no food", () => {
    const ctx = createStubCtx();
    drawFood(ctx as unknown as CanvasRenderingContext2D, null, 10, 0);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("draws a rotated square for food", () => {
    const ctx = createStubCtx();
    drawFood(ctx as unknown as CanvasRenderingContext2D, { x: 3, y: 3 }, 10, 0);
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 4);
    expect(ctx.fillRect).toHaveBeenCalledOnce();
  });
});

describe("drawScanlines", () => {
  it("draws one line per memoized offset and caches offsets by height", () => {
    const ctx = createStubCtx();
    drawScanlines(ctx as unknown as CanvasRenderingContext2D, 240, 160);
    const firstCallCount = ctx.fillRect.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    drawScanlines(ctx as unknown as CanvasRenderingContext2D, 240, 160);
    expect(ctx.fillRect.mock.calls.length).toBe(firstCallCount * 2);
  });
});

describe("drawCheckerboard", () => {
  it("fills the checkerboard without throwing", () => {
    const ctx = createStubCtx();
    expect(() => drawCheckerboard(ctx as unknown as CanvasRenderingContext2D, 16)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe("drawCandyFood", () => {
  it("does nothing when there is no food", () => {
    const ctx = createStubCtx();
    drawCandyFood(ctx as unknown as CanvasRenderingContext2D, null, 16, 0);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws a gradient circle for food", () => {
    const ctx = createStubCtx();
    drawCandyFood(ctx as unknown as CanvasRenderingContext2D, { x: 3, y: 3 }, 16, 0);
    expect(ctx.createRadialGradient).toHaveBeenCalledOnce();
    expect(ctx.arc).toHaveBeenCalled();
  });
});

describe("drawCandySnake", () => {
  it("does nothing for an empty snake", () => {
    const ctx = createStubCtx();
    drawCandySnake(ctx as unknown as CanvasRenderingContext2D, [], 16);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("draws a head and a body stroke for a multi-cell snake", () => {
    const ctx = createStubCtx();
    const snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];
    drawCandySnake(ctx as unknown as CanvasRenderingContext2D, snake, 16);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
  });
});

describe("drawBoard", () => {
  it("draws checkerboard, food, and snake together without throwing", () => {
    const ctx = createStubCtx();
    const state: GameState = {
      phase: { kind: "playing" },
      level: 1,
      grid: { width: 24, height: 16 },
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ],
      direction: "right",
      inputQueue: [],
      food: { x: 8, y: 5 },
      score: 0,
    };
    expect(() => drawBoard(ctx as unknown as CanvasRenderingContext2D, state, 16, 0)).not.toThrow();
  });
});
