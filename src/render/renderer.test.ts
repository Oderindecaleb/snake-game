// src/render/renderer.test.ts
import { describe, expect, it, vi } from "vitest";
import { createRenderer } from "./renderer";
import type { GameState } from "../game/types";

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
    fillText: vi.fn(),
    arc: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "butt",
    lineJoin: "miter",
    shadowColor: "",
    shadowBlur: 0,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
  };
}

function stateWithPhase(phase: GameState["phase"]): GameState {
  return {
    phase,
    level: 3,
    grid: { width: 24, height: 16 },
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ],
    direction: "right",
    inputQueue: [],
    food: { x: 8, y: 5 },
    score: 12,
  };
}

describe("createRenderer", () => {
  it("draws each phase without throwing", () => {
    const renderer = createRenderer();
    const ctx = createStubCtx() as unknown as CanvasRenderingContext2D;
    const options = { cellPx: 10, best: 20, reducedMotion: false };

    for (const phase of [
      { kind: "title" } as const,
      { kind: "levelSelect", level: 3 } as const,
      { kind: "playing" } as const,
      { kind: "paused" } as const,
      { kind: "gameOver", result: "died" } as const,
    ]) {
      expect(() => renderer.draw(ctx, stateWithPhase(phase), 1000, options)).not.toThrow();
    }
  });

  it("skips the scanline pass when reducedMotion is true", () => {
    const renderer = createRenderer();
    const stub = createStubCtx();
    const ctx = stub as unknown as CanvasRenderingContext2D;

    renderer.draw(ctx, stateWithPhase({ kind: "playing" }), 1000, { cellPx: 10, best: 0, reducedMotion: true });
    const callsWithoutMotion = stub.fillRect.mock.calls.length;

    const stub2 = createStubCtx();
    const ctx2 = stub2 as unknown as CanvasRenderingContext2D;
    renderer.draw(ctx2, stateWithPhase({ kind: "playing" }), 1000, { cellPx: 10, best: 0, reducedMotion: false });

    expect(stub2.fillRect.mock.calls.length).toBeGreaterThan(callsWithoutMotion);
  });
});
