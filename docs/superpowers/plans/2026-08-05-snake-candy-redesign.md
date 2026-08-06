# Snake Candy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the phosphor-terminal theme with the candy-themed redesign the user authored in claude.ai/design, reusing the existing game engine unchanged.

**Architecture:** New candy-themed code is added *additively* alongside the current phosphor code through Task 6 — nothing old is deleted or renamed yet, so `npm run typecheck`/`npm test`/`npm run test:e2e` stay green and the live game keeps working after every task. Task 7 is the one atomic cutover: `main.ts`, `index.html`, and `src/style.css` are rewritten to use the new candy code exclusively. Task 8 deletes what's now provably dead. This mirrors how the original game and the D-pad feature were built in this repo — build new modules first, wire everything in one deliberate step, then clean up.

**Tech Stack:** Same as the base project — Vite + TypeScript (strict), Vitest, Playwright, no UI framework, no new npm dependencies. One new external resource: Google Fonts (Baloo 2), loaded via `<link>` tags exactly as the reference design does.

## Global Constraints

- No new npm dependencies.
- `src/game/**` is not touched anywhere in this plan — the engine (grid, tick rules, tail-vacating, input queue, level 1-9 timing) is unchanged.
- Source of truth for all exact visual/behavioral values (colors, sizes, radii, copy text, timing): `docs/superpowers/specs/reference/snake-candy-source.dc.html`. Where this plan's code doesn't spell out an exact CSS value, consult that file rather than guessing.
- Mascot asset: `docs/superpowers/specs/reference/snake-mascot.png`, copied into the repo at `public/snake-mascot.png` (Task 6).
- Through Task 6, every task must leave `npm run typecheck`, `npm test`, and `npm run test:e2e` green with the game fully playable exactly as it is today (phosphor theme, D-pad, etc.) — new code is added but not yet wired to anything live.
- Task 7 is the only task that changes what the live game looks like.
- The on-screen D-pad's touch-only CSS gating (`@media (pointer: coarse) and (hover: none)`) is removed in this redesign — the D-pad is unconditionally visible on every device from Task 7 onward, matching the reference exactly (confirmed with the user; see spec §4).
- `Phase`'s and `Intent`'s existing variant names (`title`, `levelSelect`, `playing`, `paused`, `gameOver`; `confirm`, `pause`, `cancel`, `toTitle`, `selectLevel`, `toggleMute`, `direction`) are unchanged — only new variants are added. `src/game/rules.ts` and its 14 tests are never touched.
- Storage keys stay as they are: `snake.bests.v1`, `snake.muted.v1` — not switched to the reference's `snake-candy-bests`/`snake-candy-sound` (spec §5).

---

### Task 1: Extend `Phase` and `Intent` types

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/shell/intent.ts`

**Interfaces:**
- Produces: `Phase` gains `{ kind: "help" }` and `{ kind: "scores" }`. `Intent` gains `{ type: "goToLevels" }`, `{ type: "goToHelp" }`, `{ type: "goToScores" }`. Later tasks (7 onward) consume these.

- [ ] **Step 1: Add the two new `Phase` variants**

In `src/game/types.ts`, change:

```ts
export type Phase =
  | { kind: "title" }
  | { kind: "levelSelect"; level: number }
  | { kind: "playing" }
  | { kind: "paused" }
  | { kind: "gameOver"; result: "died" | "won" };
```

to:

```ts
export type Phase =
  | { kind: "title" }
  | { kind: "levelSelect"; level: number }
  | { kind: "playing" }
  | { kind: "paused" }
  | { kind: "gameOver"; result: "died" | "won" }
  | { kind: "help" }
  | { kind: "scores" };
```

- [ ] **Step 2: Add the three new `Intent` variants**

In `src/shell/intent.ts`, change:

```ts
export type Intent =
  | { type: "direction"; direction: Direction }
  | { type: "confirm" }
  | { type: "pause" }
  | { type: "cancel" }
  | { type: "toTitle" }
  | { type: "selectLevel"; level: number }
  | { type: "toggleMute" };
```

to:

```ts
export type Intent =
  | { type: "direction"; direction: Direction }
  | { type: "confirm" }
  | { type: "pause" }
  | { type: "cancel" }
  | { type: "toTitle" }
  | { type: "selectLevel"; level: number }
  | { type: "toggleMute" }
  | { type: "goToLevels" }
  | { type: "goToHelp" }
  | { type: "goToScores" };
```

- [ ] **Step 3: Verify nothing broke**

Run: `npm run typecheck`
Expected: exits 0, no errors (both types are pure additions; nothing exhaustively switches over every variant today, so no other file needs updating).

Run: `npm test`
Expected: PASS, 81/81 tests (unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/game/types.ts src/shell/intent.ts
git commit -m "Add help/scores phases and goToLevels/goToHelp/goToScores intents"
```

---

### Task 2: Storage — default sound to unmuted

**Files:**
- Modify: `src/shell/storage.ts`
- Modify: `src/shell/storage.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `loadMuted(): boolean` now defaults to `false` (was `true`) when nothing is stored or on error. `saveMuted`/`recordScore`/`loadBests`/`saveBests` are unchanged.

- [ ] **Step 1: Update the failing tests first**

In `src/shell/storage.test.ts`, replace the `describe("loadMuted", ...)` block:

```ts
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
```

with:

```ts
describe("loadMuted", () => {
  it("defaults to unmuted when nothing is stored", () => {
    stubLocalStorage();
    expect(loadMuted()).toBe(false);
  });

  it("reads a stored muted preference", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.muted.v1", "true");
    expect(loadMuted()).toBe(true);
  });

  it("reads a stored unmuted preference", () => {
    const stub = stubLocalStorage();
    stub.setItem("snake.muted.v1", "false");
    expect(loadMuted()).toBe(false);
  });

  it("falls back to unmuted when localStorage throws", () => {
    stubLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadMuted()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to see the new/changed ones fail**

Run: `npm test -- storage`
Expected: FAIL — `loadMuted` tests expecting `false` by default currently get `true`.

- [ ] **Step 3: Flip the default in `loadMuted`**

In `src/shell/storage.ts`, change:

```ts
export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(MUTED_STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}
```

to:

```ts
export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(MUTED_STORAGE_KEY);
    return raw === null ? false : raw === "true";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- storage`
Expected: PASS, 14 tests (13 before + 1 new "reads a stored muted preference" test).

Run: `npm test`
Expected: PASS, 82/82 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/shell/storage.ts src/shell/storage.test.ts
git commit -m "Default sound to unmuted, matching the candy redesign"
```

---

### Task 3: Audio — add the candy sound configuration

**Files:**
- Modify: `src/shell/audio.ts`
- Modify: `src/shell/audio.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `BlipKind` gains `"die"` (existing `"eat" | "turn" | "death"` untouched, still callable exactly as before — old callers in the not-yet-rewritten `main.ts` keep working). `play(kind: BlipKind): void` now looks up a per-kind `{ type: OscillatorType; frequency: number; rampSeconds: number }` config instead of a hardcoded square wave, so `"die"` genuinely plays as a distinct sawtooth tone.

- [ ] **Step 1: Write the failing test**

Add this test to `src/shell/audio.test.ts`, inside the existing `describe("createAudio", ...)` block (after the last existing `it`, before the closing `});`):

```ts
  it("plays 'die' as a sawtooth tone at 130Hz", () => {
    const instances = stubAudioContext();
    const audio = createAudio(false);
    audio.play("die");
    const oscillator = instances[0].createOscillator.mock.results[0]?.value as StubOscillator;
    expect(oscillator.type).toBe("sawtooth");
    expect(oscillator.frequency.value).toBe(130);
  });

  it("still plays the existing 'eat' kind as a square wave at 880Hz", () => {
    const instances = stubAudioContext();
    const audio = createAudio(false);
    audio.play("eat");
    const oscillator = instances[0].createOscillator.mock.results[0]?.value as StubOscillator;
    expect(oscillator.type).toBe("square");
    expect(oscillator.frequency.value).toBe(880);
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- audio`
Expected: FAIL — `"die"` is not assignable to `BlipKind` (a TypeScript error surfaces via `npm run typecheck` too), and `BLIP_FREQUENCY["die"]` is `undefined`.

- [ ] **Step 3: Add the per-kind config**

In `src/shell/audio.ts`, replace:

```ts
type BlipKind = "eat" | "turn" | "death";

const BLIP_FREQUENCY: Record<BlipKind, number> = {
  eat: 880,
  turn: 220,
  death: 110,
};
```

with:

```ts
type BlipKind = "eat" | "turn" | "death" | "die";

interface BlipConfig {
  type: OscillatorType;
  frequency: number;
  rampSeconds: number;
}

const BLIP_CONFIG: Record<BlipKind, BlipConfig> = {
  eat: { type: "square", frequency: 880, rampSeconds: 0.12 },
  turn: { type: "square", frequency: 220, rampSeconds: 0.12 },
  death: { type: "square", frequency: 110, rampSeconds: 0.12 },
  die: { type: "sawtooth", frequency: 130, rampSeconds: 0.35 },
};
```

Then, in the same file, replace the body of `play`:

```ts
  function play(kind: BlipKind): void {
    if (muted) {
      return;
    }
    try {
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
    } catch {
      // AudioContext construction/playback can throw or be unavailable (e.g. old iOS
      // Safari, Web Audio disabled). Audio failing should degrade to "no sound",
      // never break the game loop that calls play() (see src/main.ts handleTick /
      // src/shell/loop.ts frame()).
    }
  }
```

with:

```ts
  function play(kind: BlipKind): void {
    if (muted) {
      return;
    }
    try {
      const ctx = ensureContext();
      const config = BLIP_CONFIG[kind];
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config.rampSeconds);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + config.rampSeconds);
    } catch {
      // AudioContext construction/playback can throw or be unavailable (e.g. old iOS
      // Safari, Web Audio disabled). Audio failing should degrade to "no sound",
      // never break the game loop that calls play() (see src/main.ts handleTick /
      // src/shell/loop.ts frame()).
    }
  }
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm test -- audio`
Expected: PASS, 10 tests (8 before + 2 new).

Run: `npm run typecheck && npm test`
Expected: typecheck exits 0; PASS, 84/84 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/shell/audio.ts src/shell/audio.test.ts
git commit -m "Add candy 'die' sound kind and per-kind waveform/frequency config"
```

---

### Task 4: Theme — add the candy palette

**Files:**
- Modify: `src/render/theme.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: new export `CANDY` (candy color palette). `GRID`, `THEME`, `HUD_HEIGHT_PX`, `cellPixelSize` are all unchanged — `THEME`/`HUD_HEIGHT_PX` still back the not-yet-rewritten `src/render/screens.ts`/`renderer.ts`.

- [ ] **Step 1: Add the `CANDY` palette export**

In `src/render/theme.ts`, add this export after the existing `THEME` constant (leave `GRID`, `THEME`, `HUD_HEIGHT_PX`, `cellPixelSize` exactly as they are):

```ts
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
```

- [ ] **Step 2: Verify nothing broke**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm test`
Expected: PASS, 84/84 tests (unchanged — this is a pure data addition with no dedicated test, matching how `THEME` itself has no dedicated test file).

- [ ] **Step 3: Commit**

```bash
git add src/render/theme.ts
git commit -m "Add candy color palette constants"
```

---

### Task 5: Playfield — add candy board drawing

**Files:**
- Modify: `src/render/playfield.ts`
- Modify: `src/render/playfield.test.ts`

**Interfaces:**
- Consumes: `CANDY`, `GRID` from `./theme` (Task 4). `Cell`, `GameState` from `../game/types`.
- Produces: three new exported functions — `drawCheckerboard(ctx: CanvasRenderingContext2D, cellPx: number): void`, `drawCandyFood(ctx: CanvasRenderingContext2D, food: Cell | null, cellPx: number, timeMs: number): void`, `drawCandySnake(ctx: CanvasRenderingContext2D, snake: Cell[], cellPx: number): void` — and a composing function `drawBoard(ctx: CanvasRenderingContext2D, state: GameState, cellPx: number, timeMs: number): void` that calls all three in the right order. `cellCenter`, `headDirectionVector`, and the existing phosphor-only `drawBorder`, `drawSnake`, `drawFood`, `drawScanlines` are unchanged — `drawBoard` is a new, separate composing function, not a replacement for the old `renderer.ts`'s composition.

- [ ] **Step 1: Update imports**

In `src/render/playfield.ts`, change:

```ts
import type { Cell } from "../game/types";
import { GRID, THEME } from "./theme";
```

to:

```ts
import type { Cell, GameState } from "../game/types";
import { CANDY, GRID, THEME } from "./theme";
```

- [ ] **Step 2: Write the failing tests**

Add these to `src/render/playfield.test.ts`. First, replace the `createStubCtx` helper (used by every `describe` block in the file) with an extended version that also stubs the two new canvas methods the candy food drawing needs:

```ts
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
```

Then add these new `describe` blocks at the end of the file, and add `drawBoard, drawCandyFood, drawCandySnake, drawCheckerboard` to the existing `import { ... } from "./playfield";` line at the top:

```ts
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
```

Also add `import type { GameState } from "../game/types";` near the top of `playfield.test.ts` (it doesn't import this yet).

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test -- playfield`
Expected: FAIL — `drawCheckerboard`, `drawCandyFood`, `drawCandySnake`, `drawBoard` are not exported from `./playfield` yet.

- [ ] **Step 4: Implement the candy board drawing functions**

In `src/render/playfield.ts`, add these functions at the end of the file (after the existing `drawScanlines`):

```ts
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
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test -- playfield`
Expected: PASS, 16 tests (10 before + 6 new: 1 checkerboard + 2 food + 2 snake + 1 board; the existing `drawBorder`/`drawSnake`/`drawFood`/`drawScanlines` tests still pass against the extended stub).

Run: `npm run typecheck && npm test`
Expected: typecheck exits 0; PASS, 90/90 tests total.

- [ ] **Step 6: Commit**

```bash
git add src/render/playfield.ts src/render/playfield.test.ts
git commit -m "Add candy checkerboard/food/snake board drawing"
```

---

### Task 6: Markup — add the candy screens (hidden, not yet wired)

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Create: `public/snake-mascot.png`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure markup/CSS/asset).
- Produces: a complete, hidden (`class="candy-hidden"` on `#candy-shell`) candy-themed DOM tree that Task 7's `main.ts` rewrite will reference by ID. Exact IDs later tasks depend on: `#candy-shell`, `#candy-back`, `#candy-hud-best`, `#candy-sound`, `#screen-menu`, `#screen-levels`, `#screen-board`, `#screen-help`, `#screen-scores`, `#menu-levels`, `#menu-play`, `#menu-scores`, `#menu-sound`, `#menu-help`, `.candy-level-tile[data-level]` (9 of them, each with a nested `.candy-level-best[data-level-best]`), `#levels-back`, `#board-score`, `#board-level`, `#candy-canvas`, `#overlay-paused`, `#paused-resume`, `#paused-menu`, `#overlay-over`, `#over-title`, `#over-score`, `#over-best`, `#over-again`, `#over-menu`, `#candy-dpad-up/left/pause/right/down`, `#help-back`, `.candy-score-value[data-score-level]` (9 of them), `#scores-back`. CSS classes used to toggle visibility later: `.candy-visible` (add to a `.candy-screen` or `.candy-overlay` to show it), `.candy-level-current` (marks the keyboard-highlighted level tile).

- [ ] **Step 1: Copy the mascot asset**

```bash
mkdir -p public
cp "docs/superpowers/specs/reference/snake-mascot.png" "public/snake-mascot.png"
```

- [ ] **Step 2: Add the candy markup to `index.html`**

In `index.html`, insert this block as a new sibling of `<div id="game-shell">`, right before the closing `</body>` tag's preceding `<script type="module" src="/src/main.ts"></script>` line (i.e. after `#game-shell`'s closing `</div>`, still inside `<body>`, before the `<script>` tag):

```html
    <div class="candy-clouds" aria-hidden="true">
      <span class="candy-cloud candy-cloud-1"></span>
      <span class="candy-cloud candy-cloud-2"></span>
      <span class="candy-cloud candy-cloud-3"></span>
      <span class="candy-cloud candy-cloud-4"></span>
      <span class="candy-cloud candy-cloud-5"></span>
    </div>
    <div id="candy-shell" class="candy-hidden">
      <header class="candy-header">
        <button id="candy-back" class="candy-icon-btn" type="button" aria-label="Back to menu">&#8592;</button>
        <div class="candy-best-badge">
          <span id="candy-hud-best">0</span>
          <span class="candy-berry" aria-hidden="true"></span>
        </div>
        <button id="candy-sound" class="candy-icon-btn" type="button" aria-label="Toggle sound">&#9834;</button>
      </header>

      <section id="screen-menu" class="candy-screen candy-visible">
        <h1 class="candy-title">SNAKE</h1>
        <div class="candy-subtitle">SWEET EDITION</div>
        <div class="candy-mascot-frame">
          <div class="candy-mascot-shadow"></div>
          <div class="candy-mascot-box">
            <img src="/snake-mascot.png" alt="Snake mascot in sunglasses" class="candy-mascot" />
          </div>
        </div>
        <div class="candy-menu-grid">
          <button id="menu-levels" class="candy-btn candy-btn-green candy-menu-levels" type="button">LEVEL</button>
          <button id="menu-play" class="candy-btn candy-btn-play candy-menu-play" type="button" aria-label="Play">
            <span class="candy-play-triangle" aria-hidden="true"></span>
          </button>
          <button id="menu-scores" class="candy-btn candy-btn-gold candy-menu-scores" type="button">BEST</button>
          <button id="menu-sound" class="candy-btn candy-btn-purple candy-menu-sound" type="button">SOUND</button>
          <button id="menu-help" class="candy-btn candy-btn-pink candy-menu-help" type="button">HOW TO</button>
        </div>
      </section>

      <section id="screen-levels" class="candy-screen">
        <h1 class="candy-title candy-title-md">LEVELS</h1>
        <div class="candy-subtitle">FASTER SNAKE, BIGGER POINTS</div>
        <div class="candy-levels-grid">
          <button class="candy-level-tile" type="button" data-level="1"><span class="candy-level-num">1</span><span class="candy-level-best" data-level-best="1">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="2"><span class="candy-level-num">2</span><span class="candy-level-best" data-level-best="2">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="3"><span class="candy-level-num">3</span><span class="candy-level-best" data-level-best="3">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="4"><span class="candy-level-num">4</span><span class="candy-level-best" data-level-best="4">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="5"><span class="candy-level-num">5</span><span class="candy-level-best" data-level-best="5">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="6"><span class="candy-level-num">6</span><span class="candy-level-best" data-level-best="6">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="7"><span class="candy-level-num">7</span><span class="candy-level-best" data-level-best="7">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="8"><span class="candy-level-num">8</span><span class="candy-level-best" data-level-best="8">BEST 0</span></button>
          <button class="candy-level-tile" type="button" data-level="9"><span class="candy-level-num">9</span><span class="candy-level-best" data-level-best="9">BEST 0</span></button>
        </div>
        <button id="levels-back" class="candy-btn candy-btn-green candy-btn-wide" type="button">BACK</button>
      </section>

      <section id="screen-board" class="candy-screen">
        <div class="candy-board-hud">
          <div class="candy-chip"><span class="candy-chip-label">SCORE</span><span id="board-score" class="candy-chip-value candy-chip-red">000</span></div>
          <div class="candy-chip"><span class="candy-chip-label">LVL</span><span id="board-level" class="candy-chip-value candy-chip-blue">1</span></div>
        </div>
        <div class="candy-canvas-frame">
          <canvas id="candy-canvas"></canvas>
          <div id="overlay-paused" class="candy-overlay">
            <div class="candy-overlay-title">PAUSED</div>
            <div class="candy-overlay-actions">
              <button id="paused-resume" class="candy-btn candy-btn-green" type="button">RESUME</button>
              <button id="paused-menu" class="candy-btn candy-btn-white" type="button">MENU</button>
            </div>
          </div>
          <div id="overlay-over" class="candy-overlay">
            <div id="over-title" class="candy-overlay-title">GAME OVER</div>
            <div class="candy-overlay-stats">
              <div id="over-score" class="candy-pill candy-pill-red">SCORE 0</div>
              <div id="over-best" class="candy-pill candy-pill-blue">BEST 0</div>
            </div>
            <div class="candy-overlay-actions">
              <button id="over-again" class="candy-btn candy-btn-red" type="button">AGAIN</button>
              <button id="over-menu" class="candy-btn candy-btn-white" type="button">MENU</button>
            </div>
          </div>
        </div>
        <div class="candy-dpad">
          <button id="candy-dpad-up" class="candy-dpad-btn candy-dpad-up" type="button" aria-label="Up">&#8593;</button>
          <button id="candy-dpad-left" class="candy-dpad-btn candy-dpad-left" type="button" aria-label="Left">&#8592;</button>
          <button id="candy-dpad-pause" class="candy-dpad-btn candy-dpad-pause candy-dpad-center" type="button">PAUSE</button>
          <button id="candy-dpad-right" class="candy-dpad-btn candy-dpad-right" type="button" aria-label="Right">&#8594;</button>
          <button id="candy-dpad-down" class="candy-dpad-btn candy-dpad-down" type="button" aria-label="Down">&#8595;</button>
        </div>
        <div class="candy-hint">ARROW KEYS &middot; SPACE TO PAUSE</div>
      </section>

      <section id="screen-help" class="candy-screen">
        <h1 class="candy-title candy-title-md">HOW TO</h1>
        <div class="candy-help-list">
          <div class="candy-help-row"><span class="candy-help-num candy-help-num-1">1</span><span>Steer with the arrows or the D-pad. No U-turns.</span></div>
          <div class="candy-help-row"><span class="candy-help-num candy-help-num-2">2</span><span>Eat the berries. Each one is worth the level number.</span></div>
          <div class="candy-help-row"><span class="candy-help-num candy-help-num-3">3</span><span>Walls and your own tail end the run. Fill the field to win.</span></div>
        </div>
        <button id="help-back" class="candy-btn candy-btn-green candy-btn-wide" type="button">BACK</button>
      </section>

      <section id="screen-scores" class="candy-screen">
        <h1 class="candy-title candy-title-md">BEST</h1>
        <div class="candy-scores-list">
          <div class="candy-score-row"><span>LEVEL 1</span><span class="candy-score-value" data-score-level="1">0</span></div>
          <div class="candy-score-row"><span>LEVEL 2</span><span class="candy-score-value" data-score-level="2">0</span></div>
          <div class="candy-score-row"><span>LEVEL 3</span><span class="candy-score-value" data-score-level="3">0</span></div>
          <div class="candy-score-row"><span>LEVEL 4</span><span class="candy-score-value" data-score-level="4">0</span></div>
          <div class="candy-score-row"><span>LEVEL 5</span><span class="candy-score-value" data-score-level="5">0</span></div>
          <div class="candy-score-row"><span>LEVEL 6</span><span class="candy-score-value" data-score-level="6">0</span></div>
          <div class="candy-score-row"><span>LEVEL 7</span><span class="candy-score-value" data-score-level="7">0</span></div>
          <div class="candy-score-row"><span>LEVEL 8</span><span class="candy-score-value" data-score-level="8">0</span></div>
          <div class="candy-score-row"><span>LEVEL 9</span><span class="candy-score-value" data-score-level="9">0</span></div>
        </div>
        <button id="scores-back" class="candy-btn candy-btn-green candy-btn-wide" type="button">BACK</button>
      </section>
    </div>
```

- [ ] **Step 3: Add the candy CSS to `src/style.css`**

Append this entire block to the end of `src/style.css` (nothing existing is modified):

```css

/* ---------- Snake Candy redesign (additive; wired live in Task 7) ---------- */

@import url("https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap");

@keyframes candy-drift {
  from { transform: translateX(-8%); }
  to { transform: translateX(8%); }
}
@keyframes candy-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes candy-pop {
  from { transform: scale(0.86); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.candy-hidden {
  display: none;
}

.candy-clouds {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.candy-cloud {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  filter: blur(13px);
}
.candy-cloud-1 { top: 62%; left: -20%; width: 68%; height: 15%; background: rgba(255, 255, 255, 0.34); animation: candy-drift 26s ease-in-out infinite alternate; }
.candy-cloud-2 { top: 67%; left: 9%; width: 39%; height: 11%; }
.candy-cloud-3 { top: 79%; right: -20%; width: 64%; height: 14%; animation: candy-drift 34s ease-in-out infinite alternate-reverse; }
.candy-cloud-4 { bottom: 7%; right: 4%; width: 41%; height: 11%; background: rgba(255, 255, 255, 0.26); }
.candy-cloud-5 { bottom: 2%; left: -16%; width: 55%; height: 12%; background: rgba(255, 255, 255, 0.24); }

#candy-shell {
  position: relative;
  width: min(94vw, 440px);
  max-height: 96vh;
  overflow: hidden;
  margin: 0 auto;
  padding: 18px 20px 26px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #4cbdf0 0%, #7fd6f3 32%, #bfeacb 68%, #f7eec2 100%);
  font-family: "Baloo 2", "Trebuchet MS", sans-serif;
  user-select: none;
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(10, 40, 70, 0.35);
}

.candy-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
  z-index: 2;
}

.candy-icon-btn {
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border: none;
  border-radius: 18px;
  background: #ffffff;
  border-bottom: 5px solid #d7e3ea;
  color: #2c3e4a;
  font-family: inherit;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(24, 60, 90, 0.18);
}
.candy-icon-btn:active {
  transform: translateY(3px);
  border-bottom-width: 2px;
}

.candy-best-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 20px;
  border-radius: 26px;
  background: #1f8fe0;
  border: 3px solid #ffffff;
  border-bottom: 6px solid #1569ab;
  box-shadow: 0 4px 10px rgba(24, 60, 90, 0.2);
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
}

.candy-berry {
  width: 20px;
  height: 24px;
  border-radius: 50% 50% 55% 55% / 40% 40% 70% 70%;
  background: radial-gradient(circle at 34% 28%, #ff9ad0, #e0349a 70%);
  box-shadow: inset 0 -3px 4px rgba(120, 10, 70, 0.4);
}

.candy-screen {
  display: none;
  position: relative;
  z-index: 2;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.candy-screen.candy-visible {
  display: flex;
  animation: candy-pop 0.24s ease-out;
}

.candy-title {
  margin: 34px 0 10px;
  font-size: 86px;
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: 0.02em;
  color: #ffffff;
  -webkit-text-stroke: 11px #1f7fc4;
  paint-order: stroke fill;
  text-shadow: 0 11px 0 #14568a;
  transform: rotate(-2.5deg);
}
.candy-title-md {
  margin: 38px 0 6px;
  font-size: 46px;
  -webkit-text-stroke-width: 8px;
  text-shadow: 0 7px 0 #14568a;
  transform: none;
}

.candy-subtitle {
  margin: -4px 0 22px;
  padding: 5px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
  color: #17607f;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.candy-mascot-frame {
  position: relative;
  width: 230px;
  height: 230px;
  border-radius: 38px;
  background: linear-gradient(180deg, #2f9fe8, #1c7fce);
  border-bottom: 9px solid #14669f;
  box-shadow: 0 12px 24px rgba(20, 60, 100, 0.25), inset 0 6px 0 rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.candy-mascot-shadow {
  position: absolute;
  bottom: 22px;
  width: 150px;
  height: 22px;
  border-radius: 50%;
  background: rgba(10, 50, 90, 0.28);
}
.candy-mascot-box {
  position: relative;
  width: 196px;
  height: 196px;
  border-radius: 30px;
  background: #faf6ec;
  box-shadow: inset 0 -6px 12px rgba(120, 110, 80, 0.14);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}
.candy-mascot {
  width: 192px;
  height: 192px;
  object-fit: contain;
  animation: candy-bob 3.2s ease-in-out infinite;
}

.candy-btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 800;
  color: #ffffff;
  box-shadow: inset 0 5px 0 rgba(255, 255, 255, 0.3);
}
.candy-btn:active {
  transform: translateY(4px);
}

.candy-menu-grid {
  display: grid;
  grid-template-columns: 96px 1fr 96px;
  grid-template-rows: auto auto;
  gap: 14px;
  width: 100%;
  margin-top: 26px;
}
.candy-menu-levels { grid-column: 1; grid-row: 1; }
.candy-menu-scores { grid-column: 3; grid-row: 1; }
.candy-menu-sound { grid-column: 1; grid-row: 2; }
.candy-menu-help { grid-column: 3; grid-row: 2; }
.candy-menu-levels, .candy-menu-scores, .candy-menu-sound, .candy-menu-help {
  height: 96px;
  border-radius: 24px;
  font-size: 19px;
  letter-spacing: 0.04em;
}
.candy-menu-levels:active, .candy-menu-scores:active, .candy-menu-sound:active, .candy-menu-help:active {
  border-bottom-width: 4px;
}

.candy-menu-play {
  grid-column: 2;
  grid-row: 1 / span 2;
  border-radius: 30px;
  background: #e8574f;
  border-bottom: 10px solid #bb413c;
  box-shadow: inset 0 6px 0 rgba(255, 255, 255, 0.28), 0 10px 18px rgba(120, 30, 30, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.candy-menu-play:active {
  border-bottom-width: 5px;
}
.candy-play-triangle {
  display: block;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 44px 0 44px 66px;
  border-color: transparent transparent transparent #ffffff;
  filter: drop-shadow(0 6px 0 rgba(190, 80, 72, 0.55));
  margin-left: 12px;
}

.candy-btn-green { background: #8dc551; border-bottom: 8px solid #6ba135; }
.candy-btn-gold { background: #f2b23c; border-bottom: 8px solid #cd8d20; }
.candy-btn-purple { background: #8b8cd8; border-bottom: 8px solid #6a6bbb; }
.candy-btn-pink { background: #c07fdc; border-bottom: 8px solid #9a5abb; }
.candy-btn-red { background: #e8574f; border-bottom: 7px solid #bb413c; }
.candy-btn-white { background: #ffffff; color: #2c3e4a; border-bottom: 7px solid #d7e3ea; }

.candy-btn-wide {
  margin-top: 30px;
  padding: 14px 40px;
  border-radius: 24px;
  font-size: 22px;
  letter-spacing: 0.06em;
}
.candy-btn-wide:active {
  border-bottom-width: 4px;
}

.candy-levels-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
}

.candy-level-tile {
  height: 110px;
  border: none;
  border-radius: 26px;
  background: #37a7ea;
  border-bottom: 8px solid #1f7fc4;
  box-shadow: inset 0 5px 0 rgba(255, 255, 255, 0.28);
  cursor: pointer;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.candy-level-tile:active {
  transform: translateY(4px);
  border-bottom-width: 4px;
}
.candy-level-tile.candy-level-current {
  outline: 4px solid #ffffff;
  outline-offset: -4px;
}
.candy-level-num {
  color: #ffffff;
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 3px 0 rgba(20, 86, 138, 0.5);
}
.candy-level-best {
  color: rgba(255, 255, 255, 0.88);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.candy-board-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 14px;
  gap: 10px;
}
.candy-chip {
  display: flex;
  align-items: baseline;
  gap: 8px;
  height: 48px;
  padding: 0 18px;
  border-radius: 24px;
  background: #ffffff;
  border-bottom: 5px solid #d7e3ea;
  box-shadow: 0 4px 10px rgba(24, 60, 90, 0.15);
}
.candy-chip-label {
  color: #8fa4b1;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.1em;
}
.candy-chip-value {
  font-size: 26px;
  font-weight: 800;
}
.candy-chip-red { color: #e8574f; }
.candy-chip-blue { color: #1f8fe0; }

.candy-canvas-frame {
  position: relative;
  padding: 9px;
  border-radius: 30px;
  background: linear-gradient(180deg, #ffffff, #e6f1f6);
  border-bottom: 8px solid #cddde5;
  box-shadow: 0 12px 24px rgba(20, 60, 100, 0.22);
}

#candy-canvas {
  display: block;
  border-radius: 22px;
  touch-action: none;
}

.candy-overlay {
  display: none;
  position: absolute;
  inset: 9px;
  border-radius: 22px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.candy-overlay.candy-visible {
  display: flex;
  animation: candy-pop 0.2s ease-out;
}
#overlay-paused { background: rgba(16, 70, 110, 0.62); }
#overlay-over { background: rgba(16, 70, 110, 0.68); gap: 10px; }

.candy-overlay-title {
  font-size: 44px;
  font-weight: 800;
  color: #ffffff;
  -webkit-text-stroke: 7px #1f7fc4;
  paint-order: stroke fill;
  text-shadow: 0 6px 0 #14568a;
}
#overlay-over .candy-overlay-title {
  font-size: 38px;
}

.candy-overlay-actions {
  display: flex;
  gap: 12px;
}
.candy-overlay-actions .candy-btn {
  padding: 12px 28px;
  border-radius: 20px;
  font-size: 19px;
  letter-spacing: 0.05em;
  box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.3);
}
.candy-overlay-actions .candy-btn:active {
  border-bottom-width: 4px;
}

.candy-overlay-stats {
  display: flex;
  gap: 10px;
}
.candy-pill {
  padding: 6px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 18px;
  font-weight: 800;
}
.candy-pill-red { color: #e8574f; }
.candy-pill-blue { color: #1f8fe0; }

.candy-dpad {
  display: grid;
  grid-template-columns: repeat(3, 72px);
  grid-template-rows: repeat(3, 72px);
  gap: 10px;
  margin-top: 22px;
}
.candy-dpad-btn {
  border: none;
  border-radius: 22px;
  background: #37a7ea;
  border-bottom: 7px solid #1f7fc4;
  box-shadow: inset 0 4px 0 rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-family: inherit;
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
}
.candy-dpad-btn:active {
  transform: translateY(3px);
  border-bottom-width: 4px;
}
.candy-dpad-up { grid-column: 2; grid-row: 1; }
.candy-dpad-left { grid-column: 1; grid-row: 2; }
.candy-dpad-pause {
  grid-column: 2;
  grid-row: 2;
  background: #f2b23c;
  border-bottom-color: #cd8d20;
  font-size: 17px;
  letter-spacing: 0.04em;
}
.candy-dpad-right { grid-column: 3; grid-row: 2; }
.candy-dpad-down { grid-column: 2; grid-row: 3; }

.candy-hint {
  margin-top: 14px;
  color: #3d7c93;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.candy-help-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.candy-help-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 6px solid #cddde5;
  color: #2c3e4a;
  font-size: 19px;
  font-weight: 600;
}
.candy-help-num {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.candy-help-num-1 { background: #8dc551; }
.candy-help-num-2 { background: #e8574f; }
.candy-help-num-3 { background: #f2b23c; }

.candy-scores-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}
.candy-score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 5px solid #cddde5;
  color: #2c3e4a;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.candy-score-value {
  color: #e8574f;
  font-size: 22px;
}
```

- [ ] **Step 4: Verify nothing broke**

Run: `npm run typecheck && npm test`
Expected: typecheck exits 0; PASS, 90/90 tests (unchanged — pure markup/CSS/asset addition, no TypeScript touched).

Run: `npm run test:e2e`
Expected: PASS, 1/1 (unaffected — the current game's element IDs are all still present and unchanged; `#candy-shell` is `display:none` so it doesn't interfere).

- [ ] **Step 5: Manually verify the candy markup renders correctly (still hidden by default)**

Run: `npm run dev`, open the printed URL. The page should look exactly like the current phosphor game — the candy markup is invisible.

To preview the hidden candy screens without affecting the committed code: open the browser's devtools console and run `document.querySelector('#candy-shell').classList.remove('candy-hidden')`, then also run `document.querySelector('#game-shell').style.display = 'none'` to hide the phosphor game underneath. Confirm the menu screen matches the reference (`docs/superpowers/specs/reference/snake-candy-source.dc.html`) — gradient background, "SNAKE" title with blue outline, bobbing mascot, 5-button menu grid. Spot check the other four screens by running `document.querySelector('#screen-menu').classList.remove('candy-visible')` and adding `candy-visible` to each of `#screen-levels`/`#screen-board`/`#screen-help`/`#screen-scores` in turn (and `candy-visible` on `#overlay-paused`/`#overlay-over` to check those two). Reload the page when done — none of this devtools poking is persisted.

- [ ] **Step 6: Commit**

```bash
git add index.html src/style.css public/snake-mascot.png
git commit -m "Add candy-themed screens and mascot asset (hidden, not yet wired)"
```

---

### Task 7: Cutover — rewrite `main.ts` to drive the candy UI

This is the one task that changes what the live game looks like. It rewrites `src/main.ts` entirely, removes the old phosphor markup from `index.html`, and rewrites `e2e/gameplay.spec.ts` for the new flow.

**Files:**
- Modify: `src/main.ts` (full rewrite)
- Modify: `index.html` (remove the old `#game-shell` block; unhide `#candy-shell`)
- Modify: `e2e/gameplay.spec.ts` (full rewrite)

**Interfaces:**
- Consumes: `Phase`/`Intent` new variants (Task 1); `loadMuted` default (Task 2); `audio.play("die")` (Task 3); `CANDY` (Task 4); `drawBoard` (Task 5); all the candy element IDs (Task 6).
- Produces: the live candy game. `window.__snakeTestState__()` keeps its existing shape — `{ phase: string; score: number; level: number; best: number; isNewBest: boolean }` — so the e2e test's inspection technique carries over unchanged.

- [ ] **Step 1: Rewrite `src/main.ts`**

Replace the entire contents of `src/main.ts` with:

```ts
import { createRound, createTitleState, tick } from "./game/rules";
import type { GameState } from "./game/types";
import { queueDirection } from "./game/input";
import { GRID, cellPixelSize } from "./render/theme";
import { drawBoard } from "./render/playfield";
import { createAudio } from "./shell/audio";
import type { Intent } from "./shell/intent";
import { intentFromKey, shouldPreventDefault } from "./shell/keyboard";
import { createLoop } from "./shell/loop";
import { loadBests, loadMuted, recordScore, saveMuted, type Bests } from "./shell/storage";
import { tickMsForLevel } from "./game/levels";

const canvas = document.querySelector<HTMLCanvasElement>("#candy-canvas");
const ctx = canvas?.getContext("2d") ?? null;

if (!canvas || !ctx) {
  document.body.textContent = "Canvas 2D is not supported in this browser.";
} else {
  runGame(canvas, ctx);
}

function runGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const rng = Math.random;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let state: GameState = createTitleState();
  let bests: Bests = loadBests();
  let isNewBest = false;
  let currentCellPx = 1;
  const audio = createAudio(loadMuted());

  const el = {
    back: document.querySelector<HTMLButtonElement>("#candy-back"),
    hudBest: document.querySelector<HTMLElement>("#candy-hud-best"),
    sound: document.querySelector<HTMLButtonElement>("#candy-sound"),
    screens: {
      menu: document.querySelector<HTMLElement>("#screen-menu"),
      levels: document.querySelector<HTMLElement>("#screen-levels"),
      board: document.querySelector<HTMLElement>("#screen-board"),
      help: document.querySelector<HTMLElement>("#screen-help"),
      scores: document.querySelector<HTMLElement>("#screen-scores"),
    },
    menuSound: document.querySelector<HTMLButtonElement>("#menu-sound"),
    boardScore: document.querySelector<HTMLElement>("#board-score"),
    boardLevel: document.querySelector<HTMLElement>("#board-level"),
    overlayPaused: document.querySelector<HTMLElement>("#overlay-paused"),
    overlayOver: document.querySelector<HTMLElement>("#overlay-over"),
    overTitle: document.querySelector<HTMLElement>("#over-title"),
    overScore: document.querySelector<HTMLElement>("#over-score"),
    overBest: document.querySelector<HTMLElement>("#over-best"),
    dpadPause: document.querySelector<HTMLButtonElement>("#candy-dpad-pause"),
  };

  // Per-level elements are looked up once here rather than on every render(), which
  // runs on every game tick (up to ~17/sec at level 9).
  const levelEls = Array.from({ length: 9 }, (_, index) => {
    const level = index + 1;
    return {
      level,
      tile: document.querySelector<HTMLElement>(`.candy-level-tile[data-level="${level}"]`),
      best: document.querySelector<HTMLElement>(`[data-level-best="${level}"]`),
      score: document.querySelector<HTMLElement>(`[data-score-level="${level}"]`),
    };
  });

  function currentLevel(): number {
    return state.phase.kind === "levelSelect" ? state.phase.level : state.level;
  }

  function bestForCurrentLevel(): number {
    return bests[currentLevel()] ?? 0;
  }

  function allTimeBest(): number {
    return Object.values(bests).reduce((max, score) => Math.max(max, score), 0);
  }

  // Which candy screen section is visible for a given phase. playing/paused/gameOver
  // all share the board screen; paused/gameOver additionally show an overlay on top
  // of the still-rendering canvas.
  function screenForPhase(kind: GameState["phase"]["kind"]): HTMLElement | null {
    switch (kind) {
      case "title":
        return el.screens.menu;
      case "levelSelect":
        return el.screens.levels;
      case "playing":
      case "paused":
      case "gameOver":
        return el.screens.board;
      case "help":
        return el.screens.help;
      case "scores":
        return el.screens.scores;
    }
  }

  function render(): void {
    const phase = state.phase;
    const activeScreen = screenForPhase(phase.kind);
    for (const screen of Object.values(el.screens)) {
      screen?.classList.toggle("candy-visible", screen === activeScreen);
    }

    el.overlayPaused?.classList.toggle("candy-visible", phase.kind === "paused");
    el.overlayOver?.classList.toggle("candy-visible", phase.kind === "gameOver");

    if (el.hudBest) {
      el.hudBest.textContent = String(allTimeBest());
    }
    if (el.boardScore) {
      el.boardScore.textContent = String(state.score).padStart(3, "0");
    }
    if (el.boardLevel) {
      el.boardLevel.textContent = String(state.level);
    }
    if (el.dpadPause) {
      el.dpadPause.textContent = phase.kind === "paused" ? "PLAY" : "PAUSE";
    }

    const muted = audio.isMuted();
    if (el.sound) {
      el.sound.textContent = muted ? "✕" : "♪";
      el.sound.setAttribute("aria-pressed", String(!muted));
    }
    if (el.menuSound) {
      el.menuSound.textContent = muted ? "MUTED" : "SOUND";
    }

    for (const entry of levelEls) {
      const best = bests[entry.level] ?? 0;
      if (entry.best) {
        entry.best.textContent = `BEST ${best}`;
      }
      if (entry.score) {
        entry.score.textContent = String(best);
      }
      entry.tile?.classList.toggle(
        "candy-level-current",
        phase.kind === "levelSelect" && phase.level === entry.level,
      );
    }

    if (phase.kind === "gameOver") {
      if (el.overTitle) {
        el.overTitle.textContent = phase.result === "won" ? "CLEARED!" : isNewBest ? "NEW BEST!" : "GAME OVER";
      }
      if (el.overScore) {
        el.overScore.textContent = `SCORE ${state.score}`;
      }
      if (el.overBest) {
        el.overBest.textContent = `BEST ${bestForCurrentLevel()}`;
      }
    }
  }

  // The candy shell is a flex column: header, then the active screen. The board
  // screen's canvas has to fit whatever vertical space is left after the HUD chips,
  // D-pad, hint text, and the shell's own padding. Measuring the board screen's
  // non-canvas children keeps this correct without hardcoding their heights.
  function boardChromeHeightPx(): number {
    const header = document.querySelector<HTMLElement>(".candy-header");
    const hud = document.querySelector<HTMLElement>(".candy-board-hud");
    const dpad = document.querySelector<HTMLElement>(".candy-dpad");
    const hint = document.querySelector<HTMLElement>(".candy-hint");
    const shellPaddingPx = 44; // #candy-shell padding: 18px top + 26px bottom
    const framePaddingPx = 18; // .candy-canvas-frame padding: 9px each side
    const gapsPx = 60; // margins between HUD/canvas/D-pad/hint, from src/style.css
    return (
      (header?.offsetHeight ?? 0) +
      (hud?.offsetHeight ?? 0) +
      (dpad?.offsetHeight ?? 0) +
      (hint?.offsetHeight ?? 0) +
      shellPaddingPx +
      framePaddingPx +
      gapsPx
    );
  }

  // Backing store is sized for devicePixelRatio so the board stays crisp on high-DPI
  // screens; a canvas transform keeps all draw calls in CSS-pixel logical units so
  // playfield code never needs to know about DPR.
  function resize(): void {
    const maxWidth = Math.min(window.innerWidth - 56, 384);
    const widthCellPx = cellPixelSize(maxWidth);

    const maxHeight = window.innerHeight - boardChromeHeightPx();
    const heightCellPx = Math.max(1, Math.floor(maxHeight / GRID.height));

    currentCellPx = Math.max(4, Math.min(widthCellPx, heightCellPx));
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = GRID.width * currentCellPx;
    const cssHeight = GRID.height * currentCellPx;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startRound(level: number): void {
    state = createRound(level, GRID, rng);
    isNewBest = false;
  }

  function goToTitle(): void {
    state = createTitleState();
    isNewBest = false;
  }

  function toggleMute(): void {
    audio.primeContext();
    audio.toggleMuted();
    saveMuted(audio.isMuted());
  }

  function applyIntent(intent: Intent): void {
    if (intent.type === "toggleMute") {
      toggleMute();
      render();
      return;
    }

    const phase = state.phase;

    if (intent.type === "goToLevels") {
      state = { ...state, phase: { kind: "levelSelect", level: state.level } };
    } else if (intent.type === "goToHelp") {
      state = { ...state, phase: { kind: "help" } };
    } else if (intent.type === "goToScores") {
      state = { ...state, phase: { kind: "scores" } };
    } else if (phase.kind === "title") {
      // PLAY / Enter starts the last-played level directly (candy spec §3) rather
      // than routing through level select; the LEVEL button (goToLevels) does that.
      if (intent.type === "confirm") {
        startRound(state.level);
      }
    } else if (phase.kind === "levelSelect") {
      if (intent.type === "direction" && intent.direction === "left") {
        state = { ...state, phase: { kind: "levelSelect", level: Math.max(1, phase.level - 1) } };
      } else if (intent.type === "direction" && intent.direction === "right") {
        state = { ...state, phase: { kind: "levelSelect", level: Math.min(9, phase.level + 1) } };
      } else if (intent.type === "selectLevel") {
        state = { ...state, phase: { kind: "levelSelect", level: intent.level } };
      } else if (intent.type === "confirm") {
        startRound(phase.level);
      } else if (intent.type === "cancel" || intent.type === "toTitle") {
        goToTitle();
      }
    } else if (phase.kind === "playing") {
      if (intent.type === "direction") {
        state = queueDirection(state, intent.direction);
      } else if (intent.type === "pause" || intent.type === "cancel") {
        state = { ...state, phase: { kind: "paused" } };
      } else if (intent.type === "toTitle") {
        goToTitle();
      }
    } else if (phase.kind === "paused") {
      if (intent.type === "toTitle") {
        goToTitle();
      } else {
        state = { ...state, phase: { kind: "playing" } };
      }
    } else if (phase.kind === "gameOver") {
      if (intent.type === "confirm") {
        startRound(state.level);
      } else if (intent.type === "toTitle" || intent.type === "cancel") {
        goToTitle();
      }
    } else if (phase.kind === "help" || phase.kind === "scores") {
      if (intent.type === "cancel" || intent.type === "toTitle" || intent.type === "confirm") {
        goToTitle();
      }
    }

    render();
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
        audio.play("die");
        const record = recordScore(bests, state.level, state.score);
        bests = record.bests;
        isNewBest = record.isNewBest;
      } else if (event === "won") {
        const record = recordScore(bests, state.level, state.score);
        bests = record.bests;
        isNewBest = record.isNewBest;
      }
    }

    render();
  }

  function handleFrame(timeMs: number): void {
    drawBoard(ctx, state, currentCellPx, reducedMotionQuery.matches ? 0 : timeMs);
  }

  const loop = createLoop(() => tickMsForLevel(state.level), { onTick: handleTick, onFrame: handleFrame });

  window.addEventListener("keydown", (event) => {
    // If a <button> is focused and the player presses Enter/Space, the browser's
    // native button-activation behavior ALSO fires that button's own click handler
    // from this same keypress. Without this guard both intents fire from one press.
    // Let native button activation be the single source of truth in that case;
    // every button's own click handler calls audio.primeContext() itself.
    const target = event.target as HTMLElement | null;
    if ((event.key === "Enter" || event.key === " ") && target?.closest("button")) {
      return;
    }
    audio.primeContext();
    if (shouldPreventDefault(event.key)) {
      event.preventDefault();
    }
    const intent = intentFromKey(event.key);
    if (intent) {
      applyIntent(intent);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase.kind === "playing") {
      state = { ...state, phase: { kind: "paused" } };
      render();
    }
  });

  function onClick(selector: string, intent: Intent): void {
    document.querySelector<HTMLButtonElement>(selector)?.addEventListener("click", () => {
      audio.primeContext();
      applyIntent(intent);
    });
  }

  onClick("#candy-back", { type: "toTitle" });
  onClick("#candy-sound", { type: "toggleMute" });
  onClick("#menu-play", { type: "confirm" });
  onClick("#menu-levels", { type: "goToLevels" });
  onClick("#menu-scores", { type: "goToScores" });
  onClick("#menu-help", { type: "goToHelp" });
  onClick("#menu-sound", { type: "toggleMute" });
  onClick("#levels-back", { type: "toTitle" });
  onClick("#help-back", { type: "toTitle" });
  onClick("#scores-back", { type: "toTitle" });
  onClick("#paused-resume", { type: "pause" });
  onClick("#paused-menu", { type: "toTitle" });
  onClick("#over-again", { type: "confirm" });
  onClick("#over-menu", { type: "toTitle" });
  onClick("#candy-dpad-pause", { type: "pause" });

  for (const direction of ["up", "down", "left", "right"] as const) {
    onClick(`#candy-dpad-${direction}`, { type: "direction", direction });
  }

  // Level tiles start that level directly, matching the reference's tile.onSelect.
  for (const entry of levelEls) {
    entry.tile?.addEventListener("click", () => {
      audio.primeContext();
      startRound(entry.level);
      render();
    });
  }

  window.addEventListener("resize", resize);
  resize();
  render();
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

Note: the old `main.ts` imported `Direction`, `HUD_HEIGHT_PX`, `createRenderer`, and `isTap`/`TouchPoint`; none of them appear in the rewrite. `Direction` is genuinely no longer needed (the direction loop's `as const` infers the literal union itself, and `intent.direction` is typed through `Intent`), and `tsconfig.json` sets no `noUnusedLocals`, so a stale import would NOT be caught by typecheck — the import list above is already correct, so just use it verbatim rather than editing the old one in place.

- [ ] **Step 2: Remove the old phosphor markup and unhide the candy shell**

In `index.html`, delete this entire block:

```html
    <div id="game-shell">
      <canvas id="game-canvas"></canvas>
      <div class="control-row">
        <button id="mute-toggle" type="button" aria-pressed="true">Sound: Off</button>
        <button id="dpad-start" type="button">START</button>
      </div>
      <div class="dpad">
        <button id="dpad-up" class="dpad-btn dpad-up" type="button" aria-label="Up">&uarr;</button>
        <button id="dpad-left" class="dpad-btn dpad-left" type="button" aria-label="Left">&larr;</button>
        <button id="dpad-right" class="dpad-btn dpad-right" type="button" aria-label="Right">&rarr;</button>
        <button id="dpad-down" class="dpad-btn dpad-down" type="button" aria-label="Down">&darr;</button>
      </div>
    </div>
```

and change:

```html
    <div id="candy-shell" class="candy-hidden">
```

to:

```html
    <div id="candy-shell">
```

- [ ] **Step 3: Rewrite the e2e test**

Replace the entire contents of `e2e/gameplay.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __snakeTestState__: () => { phase: string; score: number; level: number; best: number; isNewBest: boolean };
  }
}

test("writes a new best score after dying, then keeps it after reloading", async ({ page }) => {
  // No best seeded for level 1, so the round below exercises the actual
  // "first best ever" write path through recordScore/saveBests, not just a read.
  //
  // Math.random is stubbed to a fixed constant so food spawns deterministically.
  // The grid is 24x16 (src/render/theme.ts GRID); createRound (src/game/rules.ts)
  // starts the snake centred at head (12,8) with body at (11,8) and (10,8), facing
  // right. freeCells (src/game/food.ts) walks the grid row-major (y outer, x inner),
  // so with those 3 cells occupied there are 381 free cells, and cell (13,8) -
  // directly one step in front of the head - is at index 202 of that free list.
  // spawnFood picks index = floor(rng() * free.length), so any constant in
  // [202/381, 203/381) lands on (13,8); we use the interval midpoint (202.5/381)
  // to stay clear of floating-point rounding at either edge.
  const FOOD_AT_HEAD_PLUS_ONE_RNG = 202.5 / 381;
  await page.addInitScript((rngValue) => {
    window.Math.random = () => rngValue;
  }, FOOD_AT_HEAD_PLUS_ONE_RNG);

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  // The LEVEL button opens the levels grid; clicking a tile starts that level
  // directly. This exercises both the goToLevels intent and the tile wiring.
  await page.click("#menu-levels");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("levelSelect");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(0);

  await page.click('.candy-level-tile[data-level="1"]');
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("playing");
  expect(await page.evaluate(() => window.__snakeTestState__().level)).toBe(1);

  // The food spawned directly in front of the head, so the snake eats on the very
  // first tick. Poll for the score to register rather than assuming a tick count.
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().score), { timeout: 5_000 })
    .toBeGreaterThan(0);
  const scoreAfterEating = await page.evaluate(() => window.__snakeTestState__().score);
  expect(scoreAfterEating).toBe(1); // level 1 awards 1 point per food (src/game/levels.ts)

  // With no further input, the snake keeps moving right and runs off the wall
  // deterministically at level 1's fixed speed.
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().phase), { timeout: 10_000 })
    .toBe("gameOver");

  const score = await page.evaluate(() => window.__snakeTestState__().score);
  expect(score).toBe(scoreAfterEating);
  expect(score).toBeGreaterThan(0);

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");
  await page.click("#menu-levels");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(score);
});

test("navigates to the help and scores screens and back", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  await page.click("#menu-help");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("help");
  await expect(page.locator("#screen-help")).toBeVisible();
  await page.click("#help-back");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  await page.click("#menu-scores");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("scores");
  await expect(page.locator("#screen-scores")).toBeVisible();
  await page.click("#scores-back");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");
});
```

- [ ] **Step 4: Run typecheck and the full unit suite**

Run: `npm run typecheck`
Expected: exits 0, no errors.

Run: `npm test`
Expected: PASS, 90/90 tests (unchanged — no unit-tested module changed in this task).

- [ ] **Step 5: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS, 2/2 tests.

- [ ] **Step 6: Manually verify the live candy game**

Run: `npm run dev`, open the printed URL.

Verify each of these:
- The menu shows the gradient background, outlined "SNAKE" title, "SWEET EDITION" subtitle, bobbing mascot, and the 5-button grid (LEVEL / big red PLAY triangle / BEST / SOUND / HOW TO), plus the header's back arrow, best badge, and sound icon.
- PLAY starts a round immediately at level 1 (it does NOT open level select). The board shows the green checkerboard, the blue snake with eyes, and a red berry with a leaf and highlight.
- Steering works with both arrow keys and the on-screen D-pad (which is now visible on desktop too). The D-pad's center PAUSE button pauses; its label flips to PLAY while paused, and pressing it again resumes.
- Pausing shows the PAUSED overlay over the still-visible frozen board; RESUME resumes, MENU returns to the menu.
- Dying shows the game-over overlay with the right title (GAME OVER, or NEW BEST! when you beat that level's record), the score and best pills, and working AGAIN / MENU buttons.
- LEVEL opens the 3×3 grid with each level's best shown; clicking a tile starts that level directly; arrow keys/digits still move the highlighted tile; BACK returns to the menu.
- BEST shows all 9 levels' bests; HOW TO shows the 3 numbered instruction rows; both have working BACK buttons.
- The header back arrow returns to the menu from every screen, including mid-round while playing.
- Sound is on by default (a fresh profile with no `snake.muted.v1` key): eating plays a short high blip, dying plays a lower, longer one. Both the header sound icon and the menu's SOUND button toggle it, and the state survives a reload.
- Resize the window narrow and short (e.g. a landscape phone viewport in devtools): the board scales down and the whole shell stays on screen without the D-pad being cut off.

Stop the dev server with Ctrl+C when done.

- [ ] **Step 7: Commit**

```bash
git add src/main.ts index.html e2e/gameplay.spec.ts
git commit -m "Cut over to the candy UI: rewrite main.ts, drop phosphor markup"
```

---

### Task 8: Delete the dead phosphor code

**Files:**
- Delete: `src/render/screens.ts`
- Delete: `src/render/renderer.ts`
- Delete: `src/render/renderer.test.ts`
- Delete: `src/shell/touch.ts`
- Delete: `src/shell/touch.test.ts`
- Modify: `src/render/theme.ts`
- Modify: `src/render/playfield.ts`
- Modify: `src/render/playfield.test.ts`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: nothing.
- Produces: a codebase with no phosphor-era code left. `src/render/theme.ts` keeps `GRID`, `CANDY`, `cellPixelSize` and loses `THEME`/`HUD_HEIGHT_PX`. `src/render/playfield.ts` keeps `cellCenter`, `headDirectionVector`, `drawCheckerboard`, `drawCandyFood`, `drawCandySnake`, `drawBoard` and loses `drawBorder`, `drawSnake`, `drawFood`, `drawScanlines`.

- [ ] **Step 1: Confirm nothing still imports what's about to be deleted**

Run: `grep -rn "render/screens\|render/renderer\|shell/touch\|THEME\|HUD_HEIGHT_PX\|drawBorder\|drawScanlines" src/ e2e/ index.html`

Expected: the only hits are inside the files being deleted or modified in this task (`src/render/screens.ts`, `src/render/renderer.ts`, `src/render/renderer.test.ts`, `src/render/playfield.ts`, `src/render/playfield.test.ts`, `src/render/theme.ts`, `src/shell/touch.ts`, `src/shell/touch.test.ts`). If `src/main.ts` appears in the output, Task 7 was not completed correctly — stop and report that, don't delete anything.

- [ ] **Step 2: Delete the fully-dead files**

```bash
git rm src/render/screens.ts src/render/renderer.ts src/render/renderer.test.ts src/shell/touch.ts src/shell/touch.test.ts
```

- [ ] **Step 3: Trim `src/render/theme.ts`**

Replace the entire contents of `src/render/theme.ts` with:

```ts
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
```

- [ ] **Step 4: Trim `src/render/playfield.ts`**

In `src/render/playfield.ts`:

1. Change the imports at the top from:

```ts
import type { Cell, GameState } from "../game/types";
import { CANDY, GRID, THEME } from "./theme";
```

to:

```ts
import type { Cell, GameState } from "../game/types";
import { CANDY, GRID } from "./theme";
```

2. Delete these four exported functions entirely, along with the module-level `cachedScanlineOffsets`/`cachedScanlineHeight` variables and the private `scanlineOffsets` helper that only `drawScanlines` used: `drawBorder`, `drawSnake`, `drawFood`, `drawScanlines`.

Keep `cellCenter`, `headDirectionVector`, `drawCheckerboard`, `drawCandyFood`, `drawCandySnake`, and `drawBoard` exactly as they are.

- [ ] **Step 5: Trim `src/render/playfield.test.ts`**

In `src/render/playfield.test.ts`:

1. Change the import at the top to only pull in what still exists:

```ts
import { cellCenter, drawBoard, drawCandyFood, drawCandySnake, drawCheckerboard, headDirectionVector } from "./playfield";
```

2. Delete these four `describe` blocks entirely: `describe("drawBorder", ...)`, `describe("drawSnake", ...)`, `describe("drawFood", ...)`, `describe("drawScanlines", ...)`.

Keep the `createStubCtx` helper and the `cellCenter`, `headDirectionVector`, `drawCheckerboard`, `drawCandyFood`, `drawCandySnake`, and `drawBoard` describe blocks.

- [ ] **Step 6: Remove the dead phosphor CSS**

In `src/style.css`, delete everything from the top of the file down to (but not including) the `/* ---------- Snake Candy redesign ... ---------- */` comment banner — that is, delete the `:root`, `html, body`, `#game-shell`, `canvas`, `.control-row`, `.control-row button`, `.dpad`, the `@media (pointer: coarse) and (hover: none)` block, `.dpad-btn`, `.dpad-up`, `.dpad-left`, `.dpad-right`, and `.dpad-down` rules.

Then add this replacement page-level styling at the very top of the file, above the candy banner comment (the candy shell needs a centered, full-height page to sit on, which the deleted `html, body` rule used to provide):

```css
:root {
  color-scheme: light;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: #59c6ef;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: "Baloo 2", "Trebuchet MS", sans-serif;
}

```

- [ ] **Step 7: Verify everything still passes**

Run: `npm run typecheck`
Expected: exits 0, no errors (proves nothing referenced the deleted exports).

Run: `npm test`
Expected: PASS, 79/79 tests. Derivation: 90 after Task 5, minus `renderer.test.ts` (2 tests), minus `touch.test.ts` (2 tests), minus the 7 phosphor tests removed from `playfield.test.ts` (`drawBorder` 1 + `drawSnake` 3 + `drawFood` 2 + `drawScanlines` 1) = 90 − 11 = 79. `playfield.test.ts` itself goes from 16 tests to 9.

Run: `npm run test:e2e`
Expected: PASS, 2/2 tests.

- [ ] **Step 8: Manually verify the game still looks and plays right**

Run: `npm run dev`, open the printed URL. Confirm the candy game looks and behaves exactly as it did at the end of Task 7 — the deletions were meant to be invisible. Pay particular attention to the page background and centering, since Step 6 replaced the page-level CSS. Stop the dev server when done.

- [ ] **Step 9: Commit**

```bash
git add -A src/render src/shell src/style.css
git commit -m "Delete phosphor-era rendering, touch, and CSS now that candy has replaced it"
```

---

## Post-plan check

After Task 8, run the full verification sweep once:

```bash
npm run typecheck && npm test && npm run test:e2e
```

Expected: all three pass. At that point every section of the design spec (`docs/superpowers/specs/2026-08-05-snake-candy-redesign-design.md`) is implemented: the candy theme fully replaces phosphor, all three new screens (levels grid, scores, help) work, the D-pad is unconditionally visible with a working pause button, sound defaults on with the reference's two-tone audio, storage keys are preserved, and the game engine in `src/game/**` is untouched.

