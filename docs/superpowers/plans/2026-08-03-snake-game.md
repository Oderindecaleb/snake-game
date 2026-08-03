# Snake Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser Snake game (classic Nokia rules, phosphor-terminal look) as a pure-core/imperative-shell Vite + TypeScript app, per `docs/superpowers/specs/2026-08-03-snake-game-design.md`.

**Architecture:** All game rules live as pure functions over an immutable `GameState` in `src/game/`, unit-tested with Vitest and no DOM dependency. A thin shell in `src/render/` and `src/shell/` handles canvas drawing, keyboard/touch input, audio, storage, and the timing loop. `src/main.ts` wires the two together. One Playwright test exercises the real browser end to end.

**Tech Stack:** Vite 8, TypeScript 6 (strict), Vitest 3 (node environment, no jsdom), Playwright 1.61, no UI framework.

## Global Constraints

- Grid is fixed at 24×16 cells (spec §4.1). Never hardcode a different size — always reference `GRID` from `src/render/theme.ts`.
- Single ink colour (`THEME.ink`, `#38ff7a`) for all game content. Food is distinguished by shape (diamond), never by a second hue (spec §2.1).
- Movement is hard cell-jumps — no interpolation between cells (spec §2.2).
- `src/game/**` must never import from `src/render/**` or `src/shell/**`, touch the DOM, call `Date.now()`/timers, or call `Math.random()` directly. Randomness is always an injected `rng: () => number` parameter (spec §3, §4.5).
- Levels 1–9 map to the exact `tickMs` / `pointsPerFood` table in spec §4.7.
- The tail-vacating rule (spec §4.4) and the 2-slot input queue with reverse-rejection (spec §4.6) are load-bearing — each has a dedicated test.
- No `jsdom`/`happy-dom` dependency. Modules that touch a browser global (`localStorage`, `AudioContext`) are tested by stubbing that global with `vi.stubGlobal`, not by adding a DOM test environment.
- Package versions are pinned to what's already resolvable in this environment: `vite@^8.1.3`, `typescript@^6.0.3`, `vitest@^3.2.7`, `@playwright/test@^1.61.1`, `@types/node@^26.1.2`.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/style.css`
- Create: `src/main.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a running `npm run dev` (empty page), `npm test` (0 tests, passes), `npm run typecheck` (passes). Later tasks add real modules under `src/game`, `src/render`, `src/shell` and replace `src/main.ts`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "snake-game",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@types/node": "^26.1.2",
    "typescript": "^6.0.3",
    "vite": "^8.1.3",
    "vitest": "^3.2.7"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts", "playwright.config.ts", "e2e"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({});
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Snake</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="game-shell">
      <canvas id="game-canvas"></canvas>
      <button id="mute-toggle" type="button" aria-pressed="true">Sound: Off</button>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/style.css`**

```css
:root {
  color-scheme: dark;
}

html,
body {
  margin: 0;
  height: 100%;
  background: #05070a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

#game-shell {
  position: relative;
}

canvas {
  image-rendering: pixelated;
  touch-action: none;
  max-width: 100vw;
  max-height: 100vh;
  display: block;
}

#mute-toggle {
  position: absolute;
  top: 6px;
  right: 6px;
  font-family: "Courier New", monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #38ff7a;
  background: #04160a;
  border: 1px solid #1d6b38;
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
}
```

- [ ] **Step 7: Write a placeholder `src/main.ts`**

```ts
const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (canvas) {
  canvas.width = 480;
  canvas.height = 348;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
```

- [ ] **Step 8: Add to `.gitignore`**

```
node_modules/
dist/
.superpowers/
test-results/
playwright-report/
```

- [ ] **Step 9: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json`.

- [ ] **Step 10: Verify typecheck, test, and dev all work**

Run: `npm run typecheck`
Expected: exits 0, no errors.

Run: `npm test`
Expected: `No test files found` message or `0 passed` — exits 0 either way (vitest run with no matching files exits non-zero by default; if it does, add `--passWithNoTests` to the `test` script now).

Run: `npm run dev` (then stop it with Ctrl+C once it prints a local URL)
Expected: prints a `Local:` URL with no build errors.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/style.css src/main.ts .gitignore
git commit -m "Scaffold Vite + TypeScript project for Snake"
```

---

### Task 2: Core types and level table

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/levels.ts`
- Test: `src/game/levels.test.ts`

**Interfaces:**
- Produces: `Direction`, `Cell`, `Phase`, `LevelConfig`, `GameState`, `TickEvent`, `TickResult` types; `LEVELS: LevelConfig[]`, `getLevel(level: number): LevelConfig`, `tickMsForLevel(level: number): number`, `pointsPerFood(level: number): number`.

- [ ] **Step 1: Write `src/game/types.ts`**

```ts
export type Direction = "up" | "down" | "left" | "right";

export interface Cell {
  x: number;
  y: number;
}

export interface Grid {
  width: number;
  height: number;
}

export type Phase =
  | { kind: "title" }
  | { kind: "levelSelect"; level: number }
  | { kind: "playing" }
  | { kind: "paused" }
  | { kind: "gameOver"; result: "died" | "won" };

export interface LevelConfig {
  level: number;
  tickMs: number;
  pointsPerFood: number;
}

export interface GameState {
  phase: Phase;
  level: number;
  grid: Grid;
  snake: Cell[];
  direction: Direction;
  inputQueue: Direction[];
  food: Cell | null;
  score: number;
}

export type TickEvent = "ate" | "died" | "won";

export interface TickResult {
  state: GameState;
  events: TickEvent[];
}
```

- [ ] **Step 2: Write the failing test for the level table**

```ts
// src/game/levels.test.ts
import { describe, expect, it } from "vitest";
import { LEVELS, getLevel, pointsPerFood, tickMsForLevel } from "./levels";

describe("levels", () => {
  it("has exactly nine levels, numbered 1 through 9", () => {
    expect(LEVELS).toHaveLength(9);
    expect(LEVELS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("maps level to the spec's tickMs table", () => {
    expect(tickMsForLevel(1)).toBe(180);
    expect(tickMsForLevel(5)).toBe(102);
    expect(tickMsForLevel(9)).toBe(58);
  });

  it("awards points equal to the level", () => {
    expect(pointsPerFood(1)).toBe(1);
    expect(pointsPerFood(9)).toBe(9);
  });

  it("getLevel returns the full config for a level", () => {
    expect(getLevel(4)).toEqual({ level: 4, tickMs: 118, pointsPerFood: 4 });
  });

  it("throws for a level outside 1-9", () => {
    expect(() => getLevel(0)).toThrow();
    expect(() => getLevel(10)).toThrow();
  });
});
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npm test -- levels`
Expected: FAIL — `Cannot find module './levels'`.

- [ ] **Step 4: Write `src/game/levels.ts`**

```ts
import type { LevelConfig } from "./types";

const TICK_MS_BY_LEVEL: readonly number[] = [180, 156, 136, 118, 102, 89, 77, 67, 58];

export const LEVELS: readonly LevelConfig[] = TICK_MS_BY_LEVEL.map((tickMs, index) => ({
  level: index + 1,
  tickMs,
  pointsPerFood: index + 1,
}));

export function getLevel(level: number): LevelConfig {
  const config = LEVELS.find((entry) => entry.level === level);
  if (!config) {
    throw new Error(`Invalid level: ${level}. Must be between 1 and 9.`);
  }
  return config;
}

export function tickMsForLevel(level: number): number {
  return getLevel(level).tickMs;
}

export function pointsPerFood(level: number): number {
  return getLevel(level).pointsPerFood;
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npm test -- levels`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/levels.ts src/game/levels.test.ts
git commit -m "Add core types and the level 1-9 speed/scoring table"
```

---

### Task 3: Snake movement

**Files:**
- Create: `src/game/snake.ts`
- Test: `src/game/snake.test.ts`

**Interfaces:**
- Consumes: `Cell`, `Direction` from `./types`.
- Produces: `nextHead(head: Cell, direction: Direction): Cell`, `step(cells: Cell[], direction: Direction, grow: boolean): Cell[]`. Head is always `cells[0]`; tail is `cells[cells.length - 1]`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/snake.test.ts
import { describe, expect, it } from "vitest";
import { nextHead, step } from "./snake";

describe("nextHead", () => {
  it("moves one cell in each direction", () => {
    const head = { x: 5, y: 5 };
    expect(nextHead(head, "up")).toEqual({ x: 5, y: 4 });
    expect(nextHead(head, "down")).toEqual({ x: 5, y: 6 });
    expect(nextHead(head, "left")).toEqual({ x: 4, y: 5 });
    expect(nextHead(head, "right")).toEqual({ x: 6, y: 5 });
  });
});

describe("step", () => {
  it("moves without growing: prepends new head, drops the tail", () => {
    const cells = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    const result = step(cells, "right", false);
    expect(result).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
  });

  it("moves while growing: prepends new head, keeps the tail", () => {
    const cells = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    const result = step(cells, "right", true);
    expect(result).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- snake`
Expected: FAIL — `Cannot find module './snake'`.

- [ ] **Step 3: Write `src/game/snake.ts`**

```ts
import type { Cell, Direction } from "./types";

export function nextHead(head: Cell, direction: Direction): Cell {
  switch (direction) {
    case "up":
      return { x: head.x, y: head.y - 1 };
    case "down":
      return { x: head.x, y: head.y + 1 };
    case "left":
      return { x: head.x - 1, y: head.y };
    case "right":
      return { x: head.x + 1, y: head.y };
  }
}

export function step(cells: Cell[], direction: Direction, grow: boolean): Cell[] {
  const newHead = nextHead(cells[0], direction);
  const body = grow ? cells : cells.slice(0, -1);
  return [newHead, ...body];
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- snake`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/snake.ts src/game/snake.test.ts
git commit -m "Add snake movement: nextHead and step"
```

---

### Task 4: Food spawning

**Files:**
- Create: `src/game/food.ts`
- Test: `src/game/food.test.ts`

**Interfaces:**
- Consumes: `Cell`, `Grid` from `./types`.
- Produces: `freeCells(grid: Grid, occupied: Cell[]): Cell[]`, `spawnFood(grid: Grid, occupied: Cell[], rng: () => number): Cell | null`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/food.test.ts
import { describe, expect, it } from "vitest";
import { freeCells, spawnFood } from "./food";

const grid = { width: 3, height: 1 };

describe("freeCells", () => {
  it("lists every cell not occupied", () => {
    expect(freeCells(grid, [{ x: 0, y: 0 }])).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("returns an empty list when the board is full", () => {
    expect(
      freeCells(grid, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toEqual([]);
  });
});

describe("spawnFood", () => {
  it("picks uniformly from the free-cell list using the injected rng", () => {
    // rng() = 0.999... picks the last free cell deterministically.
    const result = spawnFood(grid, [{ x: 0, y: 0 }], () => 0.999);
    expect(result).toEqual({ x: 2, y: 0 });
  });

  it("picks the first free cell when rng() = 0", () => {
    const result = spawnFood(grid, [{ x: 0, y: 0 }], () => 0);
    expect(result).toEqual({ x: 1, y: 0 });
  });

  it("returns null when the board is full", () => {
    const result = spawnFood(
      grid,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
      () => 0,
    );
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- food`
Expected: FAIL — `Cannot find module './food'`.

- [ ] **Step 3: Write `src/game/food.ts`**

```ts
import type { Cell, Grid } from "./types";

export function freeCells(grid: Grid, occupied: Cell[]): Cell[] {
  const occupiedKeys = new Set(occupied.map((cell) => `${cell.x},${cell.y}`));
  const free: Cell[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!occupiedKeys.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  return free;
}

export function spawnFood(grid: Grid, occupied: Cell[], rng: () => number): Cell | null {
  const free = freeCells(grid, occupied);
  if (free.length === 0) {
    return null;
  }
  const index = Math.min(free.length - 1, Math.floor(rng() * free.length));
  return free[index];
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- food`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/food.ts src/game/food.test.ts
git commit -m "Add food spawning from a free-cell list"
```

---

### Task 5: Input queue

**Files:**
- Create: `src/game/input.ts`
- Test: `src/game/input.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Direction` from `./types`.
- Produces: `queueDirection(state: GameState, direction: Direction): GameState`, `isOpposite(a: Direction, b: Direction): boolean`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/input.test.ts
import { describe, expect, it } from "vitest";
import { isOpposite, queueDirection } from "./input";
import type { GameState } from "./types";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: { kind: "playing" },
    level: 1,
    grid: { width: 24, height: 16 },
    snake: [{ x: 5, y: 5 }],
    direction: "right",
    inputQueue: [],
    food: null,
    score: 0,
    ...overrides,
  };
}

describe("isOpposite", () => {
  it("identifies opposite direction pairs", () => {
    expect(isOpposite("up", "down")).toBe(true);
    expect(isOpposite("left", "right")).toBe(true);
    expect(isOpposite("up", "left")).toBe(false);
    expect(isOpposite("up", "up")).toBe(false);
  });
});

describe("queueDirection", () => {
  it("queues a valid turn", () => {
    const state = baseState();
    const result = queueDirection(state, "up");
    expect(result.inputQueue).toEqual(["up"]);
  });

  it("rejects the reverse of the current direction when the queue is empty", () => {
    const state = baseState({ direction: "right", inputQueue: [] });
    const result = queueDirection(state, "left");
    expect(result.inputQueue).toEqual([]);
  });

  it("rejects the reverse of the last queued direction, not the current direction", () => {
    const state = baseState({ direction: "right", inputQueue: ["up"] });
    // "down" is not opposite "right" (current), but IS opposite "up" (last queued) — must reject.
    const result = queueDirection(state, "down");
    expect(result.inputQueue).toEqual(["up"]);
  });

  it("allows two valid turns queued within one tick", () => {
    const state = baseState({ direction: "right", inputQueue: [] });
    const afterFirst = queueDirection(state, "up");
    const afterSecond = queueDirection(afterFirst, "left");
    expect(afterSecond.inputQueue).toEqual(["up", "left"]);
  });

  it("discards a duplicate of the reference direction", () => {
    const state = baseState({ direction: "right", inputQueue: [] });
    const result = queueDirection(state, "right");
    expect(result.inputQueue).toEqual([]);
  });

  it("caps the queue at 2 entries", () => {
    const state = baseState({ direction: "right", inputQueue: ["up", "right"] });
    const result = queueDirection(state, "up");
    expect(result.inputQueue).toEqual(["up", "right"]);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- input`
Expected: FAIL — `Cannot find module './input'`.

- [ ] **Step 3: Write `src/game/input.ts`**

```ts
import type { Direction, GameState } from "./types";

const OPPOSITES: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const MAX_QUEUE_LENGTH = 2;

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITES[a] === b;
}

export function queueDirection(state: GameState, direction: Direction): GameState {
  if (state.inputQueue.length >= MAX_QUEUE_LENGTH) {
    return state;
  }

  const reference = state.inputQueue[state.inputQueue.length - 1] ?? state.direction;

  if (direction === reference || isOpposite(direction, reference)) {
    return state;
  }

  return { ...state, inputQueue: [...state.inputQueue, direction] };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- input`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/input.ts src/game/input.test.ts
git commit -m "Add 2-slot input queue with reverse rejection"
```

---

### Task 6: Core tick — the flowchart

This is the centerpiece: the exact sequence from the user's flowchart (shift input → move → wall check → self check → food check → render/score) as one pure function, plus the two state constructors.

**Files:**
- Create: `src/game/rules.ts`
- Test: `src/game/rules.test.ts`

**Interfaces:**
- Consumes: everything from `./types`, `./snake` (`nextHead`, `step`), `./food` (`spawnFood`), `./levels` (`pointsPerFood`).
- Produces: `isWithinBounds(cell: Cell, grid: Grid): boolean`, `collidesWithSelf(head: Cell, snake: Cell[], grow: boolean): boolean`, `createTitleState(): GameState`, `createRound(level: number, grid: Grid, rng: () => number): GameState`, `tick(state: GameState, rng: () => number): TickResult`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/rules.test.ts
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
        { x: 5, y: 4 },
        { x: 4, y: 4 },
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- rules`
Expected: FAIL — `Cannot find module './rules'`.

- [ ] **Step 3: Write `src/game/rules.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- rules`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/rules.ts src/game/rules.test.ts
git commit -m "Add the core tick: the flowchart as a pure function"
```

---

### Task 7: Theme and playfield rendering

**Files:**
- Create: `src/render/theme.ts`
- Create: `src/render/playfield.ts`
- Test: `src/render/playfield.test.ts`

**Interfaces:**
- Consumes: `Cell`, `GameState` types from `../game/types`.
- Produces: `GRID`, `THEME`, `HUD_HEIGHT_PX`, `cellPixelSize(canvasWidthPx: number): number` from `theme.ts`; `cellCenter(cell: Cell, cellPx: number): { x: number; y: number }`, `headDirectionVector(snake: Cell[]): { dx: number; dy: number }`, `drawBorder`, `drawSnake`, `drawFood`, `drawScanlines` from `playfield.ts`.
- A minimal stub context type `StubCtx2D` is defined in the test file to smoke-test the draw functions without a real DOM.

- [ ] **Step 1: Write `src/render/theme.ts`**

```ts
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

export function cellPixelSize(canvasWidthPx: number): number {
  return Math.max(1, Math.floor(canvasWidthPx / GRID.width));
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/render/playfield.test.ts
import { describe, expect, it, vi } from "vitest";
import { cellCenter, drawBorder, drawFood, drawScanlines, drawSnake, headDirectionVector } from "./playfield";

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
    translate: vi.fn(),
    rotate: vi.fn(),
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
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test -- playfield`
Expected: FAIL — `Cannot find module './playfield'`.

- [ ] **Step 4: Write `src/render/playfield.ts`**

```ts
import type { Cell } from "../game/types";
import { GRID, THEME } from "./theme";

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

export function drawBorder(ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number): void {
  ctx.strokeStyle = THEME.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, widthPx - 2, heightPx - 2);
}

export function drawSnake(ctx: CanvasRenderingContext2D, snake: Cell[], cellPx: number): void {
  if (snake.length === 0) {
    return;
  }

  const { dx, dy } = headDirectionVector(snake);

  ctx.save();
  ctx.strokeStyle = THEME.ink;
  ctx.fillStyle = THEME.ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = cellPx * 0.8;
  ctx.shadowColor = THEME.glow;
  ctx.shadowBlur = 6;

  if (snake.length > 1) {
    ctx.beginPath();
    const tail = cellCenter(snake[snake.length - 1], cellPx);
    ctx.moveTo(tail.x, tail.y);
    for (let i = snake.length - 2; i >= 0; i--) {
      const point = cellCenter(snake[i], cellPx);
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  const head = cellCenter(snake[0], cellPx);
  ctx.beginPath();
  ctx.arc(head.x, head.y, cellPx * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = THEME.field;
  const forward = cellPx * 0.14;
  const perpX = -dy * cellPx * 0.16;
  const perpY = dx * cellPx * 0.16;
  const eyeBaseX = head.x + dx * forward;
  const eyeBaseY = head.y + dy * forward;
  const eyeRadius = cellPx * 0.08;
  ctx.beginPath();
  ctx.arc(eyeBaseX + perpX, eyeBaseY + perpY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(eyeBaseX - perpX, eyeBaseY - perpY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawFood(ctx: CanvasRenderingContext2D, food: Cell | null, cellPx: number, timeMs: number): void {
  if (!food) {
    return;
  }

  const pulse = 0.85 + 0.15 * Math.sin(timeMs / 220);
  const center = cellCenter(food, cellPx);
  const size = cellPx * 0.65 * pulse;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = THEME.ink;
  ctx.shadowColor = THEME.glow;
  ctx.shadowBlur = 8;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

let cachedScanlineOffsets: number[] = [];
let cachedScanlineHeight = -1;

function scanlineOffsets(heightPx: number): number[] {
  if (cachedScanlineHeight !== heightPx) {
    const offsets: number[] = [];
    for (let y = 0; y < heightPx; y += 3) {
      offsets.push(y);
    }
    cachedScanlineOffsets = offsets;
    cachedScanlineHeight = heightPx;
  }
  return cachedScanlineOffsets;
}

export function drawScanlines(ctx: CanvasRenderingContext2D, widthPx: number, heightPx: number): void {
  ctx.fillStyle = THEME.scanline;
  for (const y of scanlineOffsets(heightPx)) {
    ctx.fillRect(0, y, widthPx, 1);
  }
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test -- playfield`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/render/theme.ts src/render/playfield.ts src/render/playfield.test.ts
git commit -m "Add theme constants and playfield rendering (border, snake, food, scanlines)"
```

---

### Task 8: HUD, phase overlays, and the renderer

**Files:**
- Create: `src/render/screens.ts`
- Create: `src/render/renderer.ts`
- Test: `src/render/renderer.test.ts`

**Interfaces:**
- Consumes: `GameState` from `../game/types`; `GRID`, `THEME`, `HUD_HEIGHT_PX`, `cellPixelSize` from `./theme`; `drawBorder`, `drawSnake`, `drawFood`, `drawScanlines` from `./playfield`.
- Produces: `drawHud`, `drawTitleScreen`, `drawLevelSelectScreen`, `drawPausedOverlay`, `drawGameOverScreen` from `screens.ts`; `createRenderer(): { draw(ctx, state, timeMs, options): void }` from `renderer.ts`, where `options = { cellPx: number; best: number; reducedMotion: boolean }`.

- [ ] **Step 1: Write `src/render/screens.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test for `renderer.ts`**

```ts
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
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npm test -- renderer`
Expected: FAIL — `Cannot find module './renderer'`.

- [ ] **Step 4: Write `src/render/renderer.ts`**

```ts
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
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npm test -- renderer`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/render/screens.ts src/render/renderer.ts src/render/renderer.test.ts
git commit -m "Add HUD, phase overlay screens, and the composed renderer"
```

---

### Task 9: Storage — per-level bests

**Files:**
- Create: `src/shell/storage.ts`
- Test: `src/shell/storage.test.ts`

**Interfaces:**
- Produces: `type Bests = Record<number, number>`, `loadBests(): Bests`, `saveBests(bests: Bests): void`, `recordScore(bests: Bests, level: number, score: number): { bests: Bests; isNewBest: boolean }`, `loadMuted(): boolean`, `saveMuted(muted: boolean): void`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/shell/storage.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadBests, loadMuted, recordScore, saveBests, saveMuted } from "./storage";

function stubLocalStorage(overrides: Partial<Storage> = {}) {
  const store = new Map<string, string>();
  const stub: Storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
    ...overrides,
  };
  vi.stubGlobal("localStorage", stub);
  return stub;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadBests", () => {
  it("returns an empty object when nothing is stored", () => {
    stubLocalStorage();
    expect(loadBests()).toEqual({});
  });

  it("returns the stored bests when valid", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.bests.v1", JSON.stringify({ 1: 40, 4: 120 }));
    expect(loadBests()).toEqual({ 1: 40, 4: 120 });
  });

  it("discards corrupt JSON", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.bests.v1", "{not json");
    expect(loadBests()).toEqual({});
  });

  it("discards structurally invalid data", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.bests.v1", JSON.stringify({ 1: "not a number", 99: 5 }));
    expect(loadBests()).toEqual({});
  });

  it("falls back to empty when localStorage throws", () => {
    stubLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadBests()).toEqual({});
  });
});

describe("saveBests", () => {
  it("does not throw when localStorage.setItem throws", () => {
    stubLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => saveBests({ 1: 10 })).not.toThrow();
  });
});

describe("recordScore", () => {
  it("reports a new best and updates it when the score is higher", () => {
    stubLocalStorage();
    const result = recordScore({ 2: 10 }, 2, 15);
    expect(result.isNewBest).toBe(true);
    expect(result.bests).toEqual({ 2: 15 });
  });

  it("does not update or flag a new best when the score is lower or equal", () => {
    stubLocalStorage();
    const result = recordScore({ 2: 10 }, 2, 10);
    expect(result.isNewBest).toBe(false);
    expect(result.bests).toEqual({ 2: 10 });
  });

  it("treats a missing level as a best of 0", () => {
    stubLocalStorage();
    const result = recordScore({}, 5, 1);
    expect(result.isNewBest).toBe(true);
    expect(result.bests).toEqual({ 5: 1 });
  });
});

describe("loadMuted", () => {
  it("defaults to muted when nothing is stored", () => {
    stubLocalStorage();
    expect(loadMuted()).toBe(true);
  });

  it("reads a stored unmuted preference", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.muted.v1", "false");
    expect(loadMuted()).toBe(false);
  });

  it("falls back to muted when localStorage throws", () => {
    stubLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadMuted()).toBe(true);
  });
});

describe("saveMuted", () => {
  it("does not throw when localStorage.setItem throws", () => {
    stubLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => saveMuted(false)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- storage`
Expected: FAIL — `Cannot find module './storage'`.

- [ ] **Step 3: Write `src/shell/storage.ts`**

```ts
const STORAGE_KEY = "snake.bests.v1";

export type Bests = Record<number, number>;

function isValidBests(value: unknown): value is Bests {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(([levelKey, score]) => {
    const level = Number(levelKey);
    return (
      Number.isInteger(level) &&
      level >= 1 &&
      level <= 9 &&
      typeof score === "number" &&
      Number.isFinite(score) &&
      score >= 0
    );
  });
}

export function loadBests(): Bests {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return isValidBests(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBests(bests: Bests): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bests));
  } catch {
    // localStorage unavailable (e.g. Safari private mode) — keep playing with in-memory bests only.
  }
}

export function recordScore(bests: Bests, level: number, score: number): { bests: Bests; isNewBest: boolean } {
  const currentBest = bests[level] ?? 0;
  if (score <= currentBest) {
    return { bests, isNewBest: false };
  }
  const nextBests = { ...bests, [level]: score };
  saveBests(nextBests);
  return { bests: nextBests, isNewBest: true };
}

const MUTED_STORAGE_KEY = "snake.muted.v1";

export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(MUTED_STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
  } catch {
    // localStorage unavailable — the mute preference just won't survive reload.
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- storage`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shell/storage.ts src/shell/storage.test.ts
git commit -m "Add per-level best-score and mute-preference storage with validation and safe fallback"
```

---

### Task 10: Intent type and audio

**Files:**
- Create: `src/shell/intent.ts`
- Create: `src/shell/audio.ts`
- Test: `src/shell/audio.test.ts`

**Interfaces:**
- Produces: `Intent` union from `intent.ts`; `createAudio(initiallyMuted: boolean): { play(kind: "eat" | "turn" | "death"): void; isMuted(): boolean; setMuted(value: boolean): void; toggleMuted(): boolean }` from `audio.ts`.

- [ ] **Step 1: Write `src/shell/intent.ts`**

```ts
import type { Direction } from "../game/types";

export type Intent =
  | { type: "direction"; direction: Direction }
  | { type: "confirm" }
  | { type: "pause" }
  | { type: "cancel" }
  | { type: "toTitle" }
  | { type: "selectLevel"; level: number }
  | { type: "toggleMute" };
```

- [ ] **Step 2: Write the failing tests for audio**

```ts
// src/shell/audio.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudio } from "./audio";

class StubOscillator {
  type = "";
  frequency = { value: 0 };
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
}

class StubGain {
  gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn().mockReturnThis();
}

function stubAudioContext() {
  const instances: StubAudioContextInstance[] = [];

  class StubAudioContextInstance {
    currentTime = 0;
    createOscillator = vi.fn(() => new StubOscillator());
    createGain = vi.fn(() => new StubGain());
    destination = {};
    constructor() {
      instances.push(this);
    }
  }

  vi.stubGlobal("AudioContext", StubAudioContextInstance);
  return instances;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAudio", () => {
  it("starts muted or unmuted per the constructor argument", () => {
    expect(createAudio(true).isMuted()).toBe(true);
    expect(createAudio(false).isMuted()).toBe(false);
  });

  it("toggleMuted flips and returns the new state", () => {
    const audio = createAudio(false);
    expect(audio.toggleMuted()).toBe(true);
    expect(audio.isMuted()).toBe(true);
    expect(audio.toggleMuted()).toBe(false);
  });

  it("never constructs an AudioContext while muted", () => {
    const instances = stubAudioContext();
    const audio = createAudio(true);
    audio.play("eat");
    expect(instances).toHaveLength(0);
  });

  it("constructs the AudioContext lazily, on first play, when unmuted", () => {
    const instances = stubAudioContext();
    const audio = createAudio(false);
    expect(instances).toHaveLength(0);
    audio.play("eat");
    expect(instances).toHaveLength(1);
    audio.play("death");
    expect(instances).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test -- audio`
Expected: FAIL — `Cannot find module './audio'`.

- [ ] **Step 4: Write `src/shell/audio.ts`**

```ts
type BlipKind = "eat" | "turn" | "death";

const BLIP_FREQUENCY: Record<BlipKind, number> = {
  eat: 880,
  turn: 220,
  death: 110,
};

export function createAudio(initiallyMuted: boolean) {
  let context: AudioContext | null = null;
  let muted = initiallyMuted;

  function ensureContext(): AudioContext {
    if (!context) {
      context = new AudioContext();
    }
    return context;
  }

  function play(kind: BlipKind): void {
    if (muted) {
      return;
    }
    const ctx = ensureContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = BLIP_FREQUENCY[kind];
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  }

  function isMuted(): boolean {
    return muted;
  }

  function setMuted(value: boolean): void {
    muted = value;
  }

  function toggleMuted(): boolean {
    muted = !muted;
    return muted;
  }

  return { play, isMuted, setMuted, toggleMuted };
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test -- audio`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/shell/intent.ts src/shell/audio.ts src/shell/audio.test.ts
git commit -m "Add Intent type and lazily-initialized WebAudio blips"
```

---

### Task 11: Keyboard and touch input

**Files:**
- Create: `src/shell/keyboard.ts`
- Create: `src/shell/touch.ts`
- Test: `src/shell/keyboard.test.ts`
- Test: `src/shell/touch.test.ts`

**Interfaces:**
- Consumes: `Intent` from `./intent`.
- Produces: `intentFromKey(key: string): Intent | null`, `shouldPreventDefault(key: string): boolean` from `keyboard.ts`; `TouchPoint`, `intentFromSwipe(start: TouchPoint, end: TouchPoint): Intent | null`, `isTap(start: TouchPoint, end: TouchPoint): boolean` from `touch.ts`.

- [ ] **Step 1: Write the failing tests for keyboard**

```ts
// src/shell/keyboard.test.ts
import { describe, expect, it } from "vitest";
import { intentFromKey, shouldPreventDefault } from "./keyboard";

describe("intentFromKey", () => {
  it("maps arrow keys and WASD to direction intents", () => {
    expect(intentFromKey("ArrowUp")).toEqual({ type: "direction", direction: "up" });
    expect(intentFromKey("ArrowDown")).toEqual({ type: "direction", direction: "down" });
    expect(intentFromKey("ArrowLeft")).toEqual({ type: "direction", direction: "left" });
    expect(intentFromKey("ArrowRight")).toEqual({ type: "direction", direction: "right" });
    expect(intentFromKey("w")).toEqual({ type: "direction", direction: "up" });
    expect(intentFromKey("D")).toEqual({ type: "direction", direction: "right" });
  });

  it("maps confirm, pause, cancel, title, and mute keys", () => {
    expect(intentFromKey("Enter")).toEqual({ type: "confirm" });
    expect(intentFromKey(" ")).toEqual({ type: "confirm" });
    expect(intentFromKey("p")).toEqual({ type: "pause" });
    expect(intentFromKey("Escape")).toEqual({ type: "cancel" });
    expect(intentFromKey("m")).toEqual({ type: "toTitle" });
    expect(intentFromKey("n")).toEqual({ type: "toggleMute" });
  });

  it("maps digits 1-9 to selectLevel", () => {
    expect(intentFromKey("1")).toEqual({ type: "selectLevel", level: 1 });
    expect(intentFromKey("9")).toEqual({ type: "selectLevel", level: 9 });
  });

  it("returns null for keys with no meaning", () => {
    expect(intentFromKey("0")).toBeNull();
    expect(intentFromKey("Tab")).toBeNull();
    expect(intentFromKey("z")).toBeNull();
  });
});

describe("shouldPreventDefault", () => {
  it("is true for arrow keys and space, false otherwise", () => {
    expect(shouldPreventDefault("ArrowUp")).toBe(true);
    expect(shouldPreventDefault(" ")).toBe(true);
    expect(shouldPreventDefault("Enter")).toBe(false);
    expect(shouldPreventDefault("w")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the keyboard test to see it fail**

Run: `npm test -- keyboard`
Expected: FAIL — `Cannot find module './keyboard'`.

- [ ] **Step 3: Write `src/shell/keyboard.ts`**

```ts
import type { Intent } from "./intent";

const KEY_TO_INTENT: Record<string, Intent> = {
  ArrowUp: { type: "direction", direction: "up" },
  ArrowDown: { type: "direction", direction: "down" },
  ArrowLeft: { type: "direction", direction: "left" },
  ArrowRight: { type: "direction", direction: "right" },
  w: { type: "direction", direction: "up" },
  W: { type: "direction", direction: "up" },
  s: { type: "direction", direction: "down" },
  S: { type: "direction", direction: "down" },
  a: { type: "direction", direction: "left" },
  A: { type: "direction", direction: "left" },
  d: { type: "direction", direction: "right" },
  D: { type: "direction", direction: "right" },
  Enter: { type: "confirm" },
  " ": { type: "confirm" },
  p: { type: "pause" },
  P: { type: "pause" },
  Escape: { type: "cancel" },
  m: { type: "toTitle" },
  M: { type: "toTitle" },
  n: { type: "toggleMute" },
  N: { type: "toggleMute" },
};

export function intentFromKey(key: string): Intent | null {
  if (/^[1-9]$/.test(key)) {
    return { type: "selectLevel", level: Number(key) };
  }
  return KEY_TO_INTENT[key] ?? null;
}

export function shouldPreventDefault(key: string): boolean {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" || key === " ";
}
```

- [ ] **Step 4: Run the keyboard test to see it pass**

Run: `npm test -- keyboard`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing tests for touch**

```ts
// src/shell/touch.test.ts
import { describe, expect, it } from "vitest";
import { intentFromSwipe, isTap } from "./touch";

describe("intentFromSwipe", () => {
  it("returns null for a movement under the threshold (a tap)", () => {
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 105, y: 102 })).toBeNull();
  });

  it("picks the dominant horizontal direction", () => {
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 160, y: 105 })).toEqual({
      type: "direction",
      direction: "right",
    });
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 40, y: 105 })).toEqual({
      type: "direction",
      direction: "left",
    });
  });

  it("picks the dominant vertical direction", () => {
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 105, y: 160 })).toEqual({
      type: "direction",
      direction: "down",
    });
    expect(intentFromSwipe({ x: 100, y: 100 }, { x: 105, y: 40 })).toEqual({
      type: "direction",
      direction: "up",
    });
  });
});

describe("isTap", () => {
  it("is true when movement stays under the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 105, y: 102 })).toBe(true);
  });

  it("is false once movement crosses the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 160, y: 100 })).toBe(false);
  });
});
```

- [ ] **Step 6: Run the touch test to see it fail**

Run: `npm test -- touch`
Expected: FAIL — `Cannot find module './touch'`.

- [ ] **Step 7: Write `src/shell/touch.ts`**

```ts
import type { Intent } from "./intent";

const SWIPE_THRESHOLD_PX = 24;

export interface TouchPoint {
  x: number;
  y: number;
}

export function intentFromSwipe(start: TouchPoint, end: TouchPoint): Intent | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) {
    return null;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    return { type: "direction", direction: dx > 0 ? "right" : "left" };
  }
  return { type: "direction", direction: dy > 0 ? "down" : "up" };
}

export function isTap(start: TouchPoint, end: TouchPoint): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX;
}
```

- [ ] **Step 8: Run the touch test to see it pass**

Run: `npm test -- touch`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
git add src/shell/keyboard.ts src/shell/keyboard.test.ts src/shell/touch.ts src/shell/touch.test.ts
git commit -m "Add keyboard and swipe input mapped to Intent"
```

---

### Task 12: Fixed-timestep loop

**Files:**
- Create: `src/shell/loop.ts`
- Test: `src/shell/loop.test.ts`

**Interfaces:**
- Produces: `MAX_FRAME_DELTA_MS`, `clampDelta(deltaMs: number): number`, `advanceAccumulator(accumulator: number, deltaMs: number, tickMs: number): { accumulator: number; ticks: number }`, `createLoop(getTickMs: () => number, callbacks: { onTick: () => void; onFrame: (timeMs: number) => void }): { start(): void; stop(): void }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/shell/loop.test.ts
import { describe, expect, it } from "vitest";
import { MAX_FRAME_DELTA_MS, advanceAccumulator, clampDelta } from "./loop";

describe("clampDelta", () => {
  it("passes small deltas through unchanged", () => {
    expect(clampDelta(16)).toBe(16);
  });

  it("clamps a huge delta (e.g. a backgrounded tab) to the max", () => {
    expect(clampDelta(50_000)).toBe(MAX_FRAME_DELTA_MS);
  });
});

describe("advanceAccumulator", () => {
  it("produces zero ticks when the delta is under one tick", () => {
    const result = advanceAccumulator(0, 50, 100);
    expect(result).toEqual({ accumulator: 50, ticks: 0 });
  });

  it("produces exactly one tick and keeps the remainder", () => {
    const result = advanceAccumulator(0, 120, 100);
    expect(result).toEqual({ accumulator: 20, ticks: 1 });
  });

  it("produces multiple ticks for a large delta within the clamp", () => {
    const result = advanceAccumulator(0, 250, 100);
    expect(result).toEqual({ accumulator: 50, ticks: 2 });
  });

  it("never produces more ticks than the clamp allows, even for a huge delta", () => {
    const result = advanceAccumulator(0, 50_000, 100);
    // MAX_FRAME_DELTA_MS is 250, so at most floor(250/100) = 2 ticks, never ~500.
    expect(result.ticks).toBe(2);
  });

  it("carries a prior accumulator forward", () => {
    const result = advanceAccumulator(80, 40, 100);
    expect(result).toEqual({ accumulator: 20, ticks: 1 });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- loop`
Expected: FAIL — `Cannot find module './loop'`.

- [ ] **Step 3: Write `src/shell/loop.ts`**

```ts
export const MAX_FRAME_DELTA_MS = 250;

export function clampDelta(deltaMs: number): number {
  return Math.min(deltaMs, MAX_FRAME_DELTA_MS);
}

export function advanceAccumulator(
  accumulator: number,
  deltaMs: number,
  tickMs: number,
): { accumulator: number; ticks: number } {
  let nextAccumulator = accumulator + clampDelta(deltaMs);
  let ticks = 0;
  while (nextAccumulator >= tickMs) {
    nextAccumulator -= tickMs;
    ticks += 1;
  }
  return { accumulator: nextAccumulator, ticks };
}

export interface LoopCallbacks {
  onTick: () => void;
  onFrame: (timeMs: number) => void;
}

export function createLoop(getTickMs: () => number, callbacks: LoopCallbacks) {
  let accumulator = 0;
  let lastTime: number | null = null;
  let running = false;
  let rafHandle = 0;

  function frame(timeMs: number): void {
    if (!running) {
      return;
    }

    if (lastTime === null) {
      lastTime = timeMs;
    }
    const delta = timeMs - lastTime;
    lastTime = timeMs;

    const result = advanceAccumulator(accumulator, delta, getTickMs());
    accumulator = result.accumulator;
    for (let i = 0; i < result.ticks; i++) {
      callbacks.onTick();
    }

    callbacks.onFrame(timeMs);
    rafHandle = requestAnimationFrame(frame);
  }

  function start(): void {
    if (running) {
      return;
    }
    running = true;
    lastTime = null;
    accumulator = 0;
    rafHandle = requestAnimationFrame(frame);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(rafHandle);
  }

  return { start, stop };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- loop`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/shell/loop.ts src/shell/loop.test.ts
git commit -m "Add fixed-timestep loop with a clamped accumulator"
```

---

### Task 13: Wire it together in `main.ts`

This replaces the Task 1 placeholder with the real app: canvas sizing, the phase state machine, keyboard/touch/audio/storage/loop wiring, and the `window.__snakeTestState__` hook the e2e test reads.

**Files:**
- Modify: `src/main.ts` (full rewrite)

**Interfaces:**
- Consumes: everything produced by Tasks 2–12.
- Produces: the running app; `window.__snakeTestState__(): { phase: string; score: number; level: number; best: number }` for Task 14's Playwright test.

- [ ] **Step 1: Rewrite `src/main.ts`**

```ts
import { createRound, createTitleState, tick } from "./game/rules";
import type { Direction, GameState } from "./game/types";
import { queueDirection } from "./game/input";
import { GRID, HUD_HEIGHT_PX, cellPixelSize } from "./render/theme";
import { createRenderer } from "./render/renderer";
import { createAudio } from "./shell/audio";
import type { Intent } from "./shell/intent";
import { intentFromKey, shouldPreventDefault } from "./shell/keyboard";
import { createLoop } from "./shell/loop";
import { loadBests, loadMuted, recordScore, saveMuted, type Bests } from "./shell/storage";
import { intentFromSwipe, isTap, type TouchPoint } from "./shell/touch";
import { tickMsForLevel } from "./game/levels";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const ctx = canvas?.getContext("2d") ?? null;

if (!canvas || !ctx) {
  document.body.textContent = "Canvas 2D is not supported in this browser.";
} else {
  runGame(canvas, ctx);
}

function runGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const rng = Math.random;
  const renderer = createRenderer();
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let state: GameState = createTitleState();
  let bests: Bests = loadBests();
  let isNewBest = false;
  let currentCellPx = 1;
  const audio = createAudio(loadMuted());
  const muteButton = document.querySelector<HTMLButtonElement>("#mute-toggle");

  function currentLevel(): number {
    return state.phase.kind === "levelSelect" ? state.phase.level : state.level;
  }

  function bestForCurrentLevel(): number {
    return bests[currentLevel()] ?? 0;
  }

  function updateMuteButton(): void {
    if (!muteButton) {
      return;
    }
    const muted = audio.isMuted();
    muteButton.textContent = muted ? "Sound: Off" : "Sound: On";
    muteButton.setAttribute("aria-pressed", String(muted));
  }

  function toggleMute(): void {
    audio.toggleMuted();
    saveMuted(audio.isMuted());
    updateMuteButton();
  }

  // Backing store is sized for devicePixelRatio so the phosphor glow and scanlines
  // stay crisp on high-DPI screens; a canvas transform keeps all draw calls in CSS-pixel
  // logical units so renderer/playfield/screens code never needs to know about DPR (spec §6.2).
  function resize(): void {
    const maxWidth = Math.min(window.innerWidth - 16, 480);
    currentCellPx = cellPixelSize(maxWidth);
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = GRID.width * currentCellPx;
    const cssHeight = GRID.height * currentCellPx + HUD_HEIGHT_PX;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function applyIntent(intent: Intent): void {
    if (intent.type === "toggleMute") {
      toggleMute();
      return;
    }

    if (state.phase.kind === "title") {
      state = { ...state, phase: { kind: "levelSelect", level: state.level } };
      return;
    }

    if (state.phase.kind === "levelSelect") {
      const level = state.phase.level;
      if (intent.type === "direction" && intent.direction === "left") {
        state = { ...state, phase: { kind: "levelSelect", level: Math.max(1, level - 1) } };
      } else if (intent.type === "direction" && intent.direction === "right") {
        state = { ...state, phase: { kind: "levelSelect", level: Math.min(9, level + 1) } };
      } else if (intent.type === "selectLevel") {
        state = { ...state, phase: { kind: "levelSelect", level: intent.level } };
      } else if (intent.type === "confirm") {
        state = createRound(level, GRID, rng);
      }
      return;
    }

    if (state.phase.kind === "playing") {
      if (intent.type === "direction") {
        state = queueDirection(state, intent.direction);
        audio.play("turn");
      } else if (intent.type === "pause" || intent.type === "cancel") {
        state = { ...state, phase: { kind: "paused" } };
      }
      return;
    }

    if (state.phase.kind === "paused") {
      if (intent.type === "toTitle" || intent.type === "cancel") {
        state = createTitleState();
      } else {
        state = { ...state, phase: { kind: "playing" } };
      }
      return;
    }

    if (state.phase.kind === "gameOver") {
      if (intent.type === "confirm") {
        state = createRound(state.level, GRID, rng);
      } else if (intent.type === "toTitle" || intent.type === "cancel") {
        state = createTitleState();
      }
    }
  }

  function handleTick(): void {
    if (state.phase.kind !== "playing") {
      return;
    }
    const result = tick(state, rng);
    state = result.state;

    for (const event of result.events) {
      if (event === "ate") {
        audio.play("eat");
      } else if (event === "died") {
        audio.play("death");
        const record = recordScore(bests, state.level, state.score);
        bests = record.bests;
        isNewBest = record.isNewBest;
      } else if (event === "won") {
        const record = recordScore(bests, state.level, state.score);
        bests = record.bests;
        isNewBest = record.isNewBest;
      }
    }
  }

  function handleFrame(timeMs: number): void {
    renderer.draw(ctx, state, timeMs, {
      cellPx: currentCellPx,
      best: bestForCurrentLevel(),
      reducedMotion: reducedMotionQuery.matches,
    });
  }

  const loop = createLoop(() => tickMsForLevel(state.level), { onTick: handleTick, onFrame: handleFrame });

  window.addEventListener("keydown", (event) => {
    if (shouldPreventDefault(event.key)) {
      event.preventDefault();
    }
    const intent = intentFromKey(event.key);
    if (intent) {
      applyIntent(intent);
    }
  });

  let touchStart: TouchPoint | null = null;
  canvas.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  });
  canvas.addEventListener("touchend", (event) => {
    if (!touchStart) {
      return;
    }
    const touch = event.changedTouches[0];
    const end: TouchPoint = { x: touch.clientX, y: touch.clientY };
    if (isTap(touchStart, end)) {
      applyIntent({ type: "confirm" });
    } else {
      const intent = intentFromSwipe(touchStart, end);
      if (intent) {
        applyIntent(intent);
      }
    }
    touchStart = null;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase.kind === "playing") {
      state = { ...state, phase: { kind: "paused" } };
    }
  });

  muteButton?.addEventListener("click", toggleMute);
  updateMuteButton();

  window.addEventListener("resize", resize);
  resize();
  loop.start();

  Object.assign(window, {
    __snakeTestState__: () => ({
      phase: state.phase.kind,
      score: state.score,
      level: currentLevel(),
      best: bestForCurrentLevel(),
      isNewBest,
    }),
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Run the full unit test suite**

Run: `npm test`
Expected: PASS, all tests from Tasks 2–12 still green.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev`, open the printed URL.
Expected: title screen shows `SNAKE` / `NOKIA CLASSIC` with a blinking `PRESS ANY KEY`. Press any key → level select with digit `1`–`9`, arrow keys to adjust, Enter to start. Confirm the snake moves, eats food (score updates, snake grows), and dies on hitting a wall or itself, showing `GAME OVER` with score and best. Press Enter to replay the same level. Click the `Sound: Off` button top-right, confirm it flips to `Sound: On` and you hear the eat/turn/death blips, then reload the page and confirm it's still `Sound: On`. Stop the dev server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts
git commit -m "Wire game, render, and shell modules together in main.ts"
```

---

### Task 14: End-to-end test

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/gameplay.spec.ts`

**Interfaces:**
- Consumes: the running app from Task 13, specifically `window.__snakeTestState__()`.

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

const testPort = 5199;
const testBaseUrl = `http://localhost:${testPort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${testPort} --strictPort`,
    reuseExistingServer: false,
    timeout: 60_000,
    url: testBaseUrl,
  },
});
```

- [ ] **Step 2: Write `e2e/gameplay.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __snakeTestState__: () => { phase: string; score: number; level: number; best: number; isNewBest: boolean };
  }
}

test("shows a stored best score, then keeps it after dying and reloading", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("snake.bests.v1", JSON.stringify({ 1: 42 }));
  });

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(42);

  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("playing");

  // Starting centred and moving right with no further input, the snake runs off
  // the right wall deterministically at level 1's fixed speed (spec §4.2, §7.2).
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().phase), { timeout: 10_000 })
    .toBe("gameOver");

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");
  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(42);
});
```

- [ ] **Step 3: Install the Playwright browser binary**

Run: `npx playwright install chromium`
Expected: downloads Chromium without errors.

- [ ] **Step 4: Run the e2e test**

Run: `npm run test:e2e`
Expected: PASS, 1 test. (The dev server on port 5199 starts and stops automatically.)

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/gameplay.spec.ts
git commit -m "Add end-to-end test: level select, death, and best-score persistence"
```

---

## Post-plan check

After Task 14, run the full verification sweep once:

```bash
npm run typecheck && npm test && npm run test:e2e
```

Expected: all three pass. At that point every section of the design spec (§2 look and feel, §4 rules, §5 screens, §6 shell behaviour, §7 test plan) has a corresponding implemented and tested module.
