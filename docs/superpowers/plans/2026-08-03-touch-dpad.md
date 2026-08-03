# On-Screen D-Pad Touch Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace swipe-to-steer with an always-correct, CSS-gated on-screen D-pad and START button for touch devices, wired directly into the existing `applyIntent` dispatcher.

**Architecture:** Two tasks, each leaving the app fully working. Task 1 adds the D-pad/START markup, styling, and `main.ts` wiring *alongside* the existing swipe handling (nothing removed yet, so the app never has a broken intermediate state). Task 2 then deletes swipe support from `touch.ts`/`touch.test.ts`/`main.ts` now that it's redundant. No changes to `src/game/**` or `src/render/**` — this is markup, CSS, and shell wiring only.

**Tech Stack:** Same as the base project — Vite + TypeScript (strict), Vitest, no UI framework, no new dependencies.

## Global Constraints

- No new dependencies. This feature is markup + CSS + wiring into the existing `Intent`/`applyIntent` machinery — nothing here needs a package.
- Single ink colour (`#38ff7a`) for all button text/borders, dark fill (`#04160a`), thin border (`#1d6b38`), monospace font (`"Courier New", monospace`) — matches every existing button in the game (see `src/style.css`'s current `#mute-toggle` rule).
- The D-pad grid is gated purely via CSS `@media (pointer: coarse) and (hover: none)` — no JavaScript feature-detection, no visibility toggling in `main.ts`.
- The mute + START row is **always visible on every device** — it must never be nested inside the touch-only gated container. Only the D-pad steering grid is touch-only.
- One button press = one direction intent, matching keyboard's one-keydown-per-press. No repeat-fire while held.
- `src/game/**` and `src/render/**` are not touched by this plan at all — every change is in `index.html`, `src/style.css`, `src/main.ts`, `src/shell/touch.ts`, `src/shell/touch.test.ts`.

---

### Task 1: Add on-screen D-pad and START button (additive — swipe stays functional)

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `applyIntent(intent: Intent): void` (existing, defined in `src/main.ts`'s `runGame`), `Direction` type from `./game/types` (already imported in `main.ts`), `audio.primeContext(): void` (existing, from `src/shell/audio.ts`).
- Produces: nothing new for later tasks to consume — this task is self-contained. Task 2 only removes code; it doesn't depend on new exports from this task.

- [ ] **Step 1: Update `index.html`**

Replace the current `<body>` contents (the `#mute-toggle` button moves into a new `.control-row`, and a new `.dpad` grid of four direction buttons is added):

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
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Note: `#mute-toggle`'s `id` and `aria-pressed`/text content behavior are unchanged — only its wrapping markup changed (it now sits inside `.control-row` instead of directly inside `#game-shell`). `main.ts`'s existing `document.querySelector<HTMLButtonElement>("#mute-toggle")` lookup and click wiring still work without any change.

- [ ] **Step 2: Update `src/style.css`**

Replace the entire file with:

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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

canvas {
  image-rendering: pixelated;
  touch-action: none;
  max-width: 100vw;
  max-height: 100vh;
  display: block;
}

.control-row {
  display: flex;
  gap: 8px;
}

.control-row button {
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

.dpad {
  display: none;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(3, 44px);
  gap: 6px;
}

@media (pointer: coarse) and (hover: none) {
  .dpad {
    display: grid;
  }
}

.dpad-btn {
  font-family: "Courier New", monospace;
  font-size: 18px;
  color: #38ff7a;
  background: #04160a;
  border: 1px solid #1d6b38;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dpad-up {
  grid-column: 2;
  grid-row: 1;
}

.dpad-left {
  grid-column: 1;
  grid-row: 2;
}

.dpad-right {
  grid-column: 3;
  grid-row: 2;
}

.dpad-down {
  grid-column: 2;
  grid-row: 3;
}
```

This removes the old standalone `#mute-toggle` rule (superseded by `.control-row button`, which styles both the mute button and the new START button identically) and adds the touch-gated `.dpad` grid. `44px` buttons meet the common touch-target minimum size.

- [ ] **Step 3: Update `src/main.ts` — add D-pad/START element lookups and wiring**

In `runGame`, right after the existing `const muteButton = document.querySelector<HTMLButtonElement>("#mute-toggle");` line, add:

```ts
  const dpadStartButton = document.querySelector<HTMLButtonElement>("#dpad-start");
  const dpadButtons: Record<Direction, HTMLButtonElement | null> = {
    up: document.querySelector<HTMLButtonElement>("#dpad-up"),
    down: document.querySelector<HTMLButtonElement>("#dpad-down"),
    left: document.querySelector<HTMLButtonElement>("#dpad-left"),
    right: document.querySelector<HTMLButtonElement>("#dpad-right"),
  };
```

Then, right after the existing `muteButton?.addEventListener("click", toggleMute);` line, add:

```ts
  dpadStartButton?.addEventListener("click", () => {
    audio.primeContext();
    applyIntent({ type: "confirm" });
  });

  for (const direction of ["up", "down", "left", "right"] as const) {
    dpadButtons[direction]?.addEventListener("click", () => {
      audio.primeContext();
      applyIntent({ type: "direction", direction });
    });
  }
```

Do not modify the existing `touchstart`/`touchend` canvas listeners or the `src/shell/touch.ts` import in this task — swipe stays fully functional until Task 2.

- [ ] **Step 4: Run typecheck and the full test suite**

Run: `npm run typecheck`
Expected: exits 0, no errors (confirms `Direction`, already imported, and the new `dpadButtons` record type-check correctly).

Run: `npm test`
Expected: PASS, 84/84 tests (unchanged — this task added no new pure logic and didn't touch any tested module).

Run: `npm run test:e2e`
Expected: PASS, 1/1 (the e2e test runs under Desktop Chrome emulation, so `.dpad` stays hidden there — unaffected by this change).

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, open the printed URL.

Desktop check: confirm the page looks the same as before — canvas, then `[Sound: Off] [START]` row, no visible D-pad (the coarse-pointer media query shouldn't match a mouse/trackpad browser).

Touch check: switch the browser to a mobile/touch-emulated viewport (e.g. resize to a phone-sized viewport with touch emulation enabled, or use your browser devtools' device toolbar). Confirm the D-pad grid (↑ / ← · → / ↓) appears below the control row. Tap each arrow and confirm the snake changes direction accordingly (start a round first via the START button or Enter). Tap START on the title/level-select/game-over screens and confirm it advances/replays exactly like pressing Enter does. Confirm swipe-to-steer on the canvas still works too (it hasn't been removed yet). Stop the dev server with Ctrl+C when done.

- [ ] **Step 6: Commit**

```bash
git add index.html src/style.css src/main.ts
git commit -m "Add on-screen D-pad and START button for touch devices"
```

---

### Task 2: Remove swipe-to-steer (now redundant)

**Files:**
- Modify: `src/shell/touch.ts`
- Modify: `src/shell/touch.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `src/shell/touch.ts` now only exports `TouchPoint` and `isTap` — `intentFromSwipe` no longer exists. Nothing later in this plan depends on it (this is the final task).

- [ ] **Step 1: Remove the swipe tests from `src/shell/touch.test.ts`**

Replace the entire file with:

```ts
import { describe, expect, it } from "vitest";
import { isTap } from "./touch";

describe("isTap", () => {
  it("is true when movement stays under the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 105, y: 102 })).toBe(true);
  });

  it("is false once movement crosses the swipe threshold", () => {
    expect(isTap({ x: 100, y: 100 }, { x: 160, y: 100 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the touch tests to confirm they still pass without the swipe tests**

Run: `npm test -- touch`
Expected: PASS, 2 tests (down from 4 — the two `intentFromSwipe` tests are gone, the two `isTap` tests remain).

- [ ] **Step 3: Remove `intentFromSwipe` from `src/shell/touch.ts`**

Replace the entire file with:

```ts
const SWIPE_THRESHOLD_PX = 24;

export interface TouchPoint {
  x: number;
  y: number;
}

export function isTap(start: TouchPoint, end: TouchPoint): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX;
}
```

- [ ] **Step 4: Update `src/main.ts` — drop the swipe import and simplify the canvas `touchend` handler**

Change the import line:

```ts
import { isTap, type TouchPoint } from "./shell/touch";
```

(This replaces the current `import { intentFromSwipe, isTap, type TouchPoint } from "./shell/touch";` — `intentFromSwipe` is no longer imported.)

Replace the `canvas.addEventListener("touchend", ...)` block with:

```ts
  canvas.addEventListener("touchend", (event) => {
    audio.primeContext();
    if (!touchStart) {
      return;
    }
    const touch = event.changedTouches[0];
    const end: TouchPoint = { x: touch.clientX, y: touch.clientY };
    if (isTap(touchStart, end)) {
      applyIntent({ type: "confirm" });
    }
    touchStart = null;
  });
```

(This drops the `else { const intent = intentFromSwipe(...); ... }` branch — a non-tap touch on the canvas, such as a drag, is now simply ignored.)

- [ ] **Step 5: Run typecheck and the full test suite**

Run: `npm run typecheck`
Expected: exits 0, no errors (confirms nothing else references the removed `intentFromSwipe`).

Run: `npm test`
Expected: PASS, 82/82 tests (84 minus the 2 removed swipe tests).

Run: `npm run test:e2e`
Expected: PASS, 1/1 (unaffected — the e2e test never used swipe).

- [ ] **Step 6: Manually verify in the browser**

Run: `npm run dev`, open the printed URL, switch to a touch-emulated mobile viewport.

Confirm the D-pad still steers correctly (from Task 1). Confirm swiping/dragging across the canvas no longer changes direction (it's now a no-op). Confirm tapping the canvas still confirms/advances phases exactly as before. Stop the dev server with Ctrl+C when done.

- [ ] **Step 7: Commit**

```bash
git add src/shell/touch.ts src/shell/touch.test.ts src/main.ts
git commit -m "Remove swipe-to-steer now that the on-screen D-pad replaces it"
```

---

## Post-plan check

After Task 2, run the full verification sweep once:

```bash
npm run typecheck && npm test && npm run test:e2e
```

Expected: all three pass, 82 unit tests, 1 e2e test. At that point the touch-dpad design spec (`docs/superpowers/specs/2026-08-03-touch-dpad-design.md`) is fully implemented: D-pad replaces swipe, tap-to-confirm and the mute button are unchanged, and the D-pad is touch-only while the mute/START row remains visible on every device.
