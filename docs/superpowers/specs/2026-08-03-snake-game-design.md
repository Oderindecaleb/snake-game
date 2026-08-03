# Snake — Design Spec

**Date:** 2026-08-03
**Status:** Approved, ready for implementation planning
**Source of truth for behaviour:** the flowchart supplied by the user (start → init → loop → input → move → wall/self/food checks → render → wait), reproduced as the tick contract in §4.

---

## 1. Summary

A browser implementation of classic Nokia Snake, rendered as a monochrome phosphor terminal. Grid-based movement with hard cell-jumps, nine speed levels chosen before each round, walls kill, no mazes and no bonus items.

The build is Vite + TypeScript with no UI framework. All game rules are pure functions over an immutable state, unit-tested with Vitest; canvas, input, audio, and storage form a thin shell around that core.

### Non-goals

Explicitly out of scope for v1:

- Maze walls or obstacle levels (Snake II behaviour)
- Bonus/timed food items
- In-round acceleration as the snake grows — speed is constant within a round
- Multiplayer, online leaderboards, accounts
- Portrait-specific layout beyond what responsive canvas sizing gives for free

---

## 2. Look and feel

**Direction: phosphor terminal.** Black background, a single green ink, scanline overlay, faint bloom. Monospace typography throughout. Chosen over a faithful Nokia handset rendering and a modern neon treatment.

### 2.1 Palette — single ink

| Token | Value | Use |
|---|---|---|
| `bg` | `#05070a` | Page background |
| `field` | `#04160a` | Playfield interior |
| `ink` | `#38ff7a` | Snake, food, text, borders — **the only content colour** |
| `border` | `#1d6b38` | Playfield border, inactive UI chrome |
| `glow` | `rgba(56,255,122,0.8)` | `shadowBlur` bloom |
| `scanline` | `rgba(0,0,0,0.38)` | Overlay, 1px on / 2px off |

The single-ink rule is a hard constraint. Food is distinguished from the snake by **shape**, never by hue. No second colour is introduced anywhere in the playfield, including for the eaten-food flash or the game-over state.

### 2.2 Snake rendering — rounded body

The snake is drawn as a **smooth stroked polyline through the cell centres** of its occupied cells, with `lineCap: round` and `lineJoin: round`, at a stroke width of roughly 0.8 × cell size.

- **Head:** a filled circle at the head cell centre, radius slightly larger than the half stroke width, with **two eye holes** punched in `field` colour, positioned perpendicular to the direction of travel and offset forward. The head therefore always faces the direction the snake is about to move.
- **Tail:** a triangle tapering from the stroke width down to a point, oriented away from the second-to-last cell.
- **Food:** a square rotated 45° (diamond), inscribed in one cell at roughly 0.65 × cell size, with a slow sinusoidal scale/opacity pulse so it reads at speed 9 without a second colour.

Movement remains **hard cell-jumps** — the polyline is rebuilt from the cell list once per tick. There is no interpolation between cells. The rounded rendering is a drawing decision only; it must not leak into the movement model.

> **Known tension, accepted:** the rounded body is the one element not made of pixels, so it sits slightly apart from the scanlines and monospace type. This was chosen deliberately over a pixel-tile alternative.

---

## 3. Module structure

Pure core, imperative shell. Nothing in `game/` may import from `render/` or `shell/`, touch the DOM, read a clock, or call `Math.random`.

```
src/
  game/                    pure — no DOM, no ambient randomness, fully tested
    types.ts               Direction, Cell, Phase, GameState, TickEvent
    levels.ts              LEVELS[1..9] → { tickMs, pointsPerFood }
    snake.ts               step(cells, dir, grow) → cells
    food.ts                spawn(occupied, rng) → Cell | null
    rules.ts               tick(state) → { state, events }   ← the flowchart
    input.ts               queueDirection(state, dir) → state
  render/
    renderer.ts            draw(ctx, state, timeMs)
    theme.ts               palette, cell size, glow, scanline config
  shell/
    loop.ts                rAF + fixed-timestep accumulator
    keyboard.ts            keydown → Intent
    touch.ts               swipe → Intent
    audio.ts               WebAudio square-wave blips
    storage.ts             per-level bests in localStorage
  main.ts                  wiring
```

**Boundary contracts**

| Module | Does | Depends on |
|---|---|---|
| `game/rules.ts` | Advances state one tick, emits events | `snake`, `food`, `levels`, `types` |
| `render/renderer.ts` | Reads state, writes pixels. Never mutates | `theme`, `types` |
| `shell/loop.ts` | Decides *when* to tick. Knows no rules | `game/levels` for `tickMs` |
| `shell/storage.ts` | Persists/validates bests. Never throws | `types` |

**Data flow, one tick:** `loop` accumulates elapsed time → at `tickMs` calls `rules.tick(state)` → new state + events → `renderer.draw` paints → `events` drive `audio` and `storage`. One direction only.

**No React**, unlike the sibling projects in this workspace: a single canvas plus a 60fps loop gains nothing from a component tree.

---

## 4. Game rules (the pure core)

### 4.1 Grid

Fixed logical grid of **24 × 16 cells**. Walls are the grid bounds; there is no wrapping.

### 4.2 Initial state per round

- Snake: 3 cells, horizontal, centred, head to the right
- Direction: right; input queue empty
- Food: spawned via §4.5
- Score: 0
- Level: as selected, retained across replays

### 4.3 Tick contract

Executed in exactly this order, mirroring the flowchart:

1. Shift the head direction from the input queue, if non-empty.
2. Compute the new head cell from the current direction.
3. **Wall check** — new head outside grid bounds → `died`.
4. **Self check** — new head in the snake's own cells → `died`, subject to §4.4.
5. **Food check** — new head equals food cell → `ate`: score += `pointsPerFood(level)`, snake grows (tail is not removed), new food spawns via §4.5.
6. If not eating, remove the tail cell.

Wall and self checks both terminate the round; no further steps run in that tick.

### 4.4 The tail-vacating rule

Moving into the cell the tail occupies **this** tick is **legal** — that cell is empty by the time the head arrives. The self-collision check therefore excludes the final tail cell, *unless* the snake is growing this tick, in which case the tail stays put and the cell is occupied.

This is the single most commonly mis-implemented rule in Snake and must have a dedicated test.

### 4.5 Food spawning

Food is chosen **uniformly from a list of free cells**, not by retrying random cells until one is empty. Retry-until-empty degrades badly as the board fills and can hang the tab near the end of a long game.

If the free list is empty, the board is full: the round ends in a **win** (a distinct terminal state from death, but sharing the game-over screen with different copy).

RNG is injected as a `() => number` parameter so tests can seed it.

### 4.6 Input queue

A queue of **at most 2** pending directions.

- Each incoming direction is validated against the **last queued** direction — or the current direction if the queue is empty — never against the currently-rendered direction.
- A direction that is the exact reverse of that reference is **rejected and discarded**.
- Duplicates of the reference direction are discarded rather than queued.

Rationale: validating against the rendered direction — the literal reading of the flowchart's "Valid Direction? (Not opposite)" node — makes fast play feel like it drops inputs, and lets two presses inside one tick reverse the snake into its own neck.

### 4.7 Levels

Constant speed within a round. Points scale with level, so a single score is comparable across levels and there is a reason to choose a hard one.

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| `tickMs` | 180 | 156 | 136 | 118 | 102 | 89 | 77 | 67 | 58 |
| cells/sec | 5.6 | 6.4 | 7.4 | 8.5 | 9.8 | 11.2 | 13.0 | 14.9 | 17.2 |
| points/food | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |

---

## 5. Screens and transitions

Five phases in a discriminated union, so illegal combinations are unrepresentable.

```
title ──any key──► levelSelect ──enter──► playing ⇄ paused
                        ▲                    │
                        │                    ▼
                     menu ◄──── gameOver ──enter──► playing (same level)
```

| Screen | Content | Controls |
|---|---|---|
| **Title** | `SNAKE`, subtitle, blinking `PRESS ANY KEY` | any key / tap → level select |
| **Level select** | Digits 1–9 with the current one inverted, speed bar, best for the selected level | ←/→ or digits `1`–`9` to change; Enter/Space/tap to start |
| **Playing** | HUD (`SCORE 0000` left, `LVL n` right), playfield | Arrows/WASD to steer; P or Esc to pause |
| **Paused** | `PAUSED` overlay over a dimmed field | any key resumes; M → title |
| **Game over** | `GAME OVER` (or `BOARD CLEARED`), score, best for that level, `NEW BEST` when beaten | Enter → replay same level; M or Esc → title |

`gameOver → playing` retains the current level rather than returning to the picker — this is the flowchart's "Play Again? → Yes" edge back to Initialize.

---

## 6. Shell behaviour

### 6.1 Loop and timing

`requestAnimationFrame` with a fixed-timestep accumulator at the level's `tickMs`. **Rendering runs every frame regardless of ticks**, because the scanline shimmer and the food pulse animate on wall-clock time.

- **Accumulator clamp:** frame deltas above ~250ms collapse to a single tick. Without this, returning to a backgrounded tab runs every owed tick at once and kills the player instantly.
- **Auto-pause on `visibilitychange`:** tabbing away mid-round pauses rather than continuing unseen.

### 6.2 Canvas sizing

Fixed 24×16 logical grid scaled to the viewport by an integer factor, backing store sized for `devicePixelRatio`. Glow via `shadowBlur`. The scanline overlay is generated **once** into an offscreen pattern rather than stroking ~400 lines per frame.

### 6.3 Input

- **Keyboard:** Arrows and WASD steer; digits select level; Enter/Space confirm; P/Esc pause; M returns to title. Arrow keys call `preventDefault` during play so the page cannot scroll.
- **Touch:** swipe with a ~24px threshold on the dominant axis steers; a tap confirms on title, level select, and game over.

### 6.4 Audio

Short WebAudio square-wave blips on eat, turn, and death. No audio files.

- The `AudioContext` is created **lazily on the first user gesture**, never at load, or the browser's autoplay policy yields a permanently suspended context.
- **Muted by default**, with an on-screen toggle whose state persists.

### 6.5 Storage

Key `snake.bests.v1` → `Record<level, number>`, one best per level, surfaced on the level picker, the HUD, and game over.

- All access wrapped in `try`/`catch`: Safari private mode throws on write. On failure, fall back to in-memory bests; the game continues.
- Stored JSON is **validated on read** — shape and numeric range — and discarded if malformed rather than trusted into the HUD.

### 6.6 Accessibility and failure modes

- `prefers-reduced-motion` disables the scanline flicker and the food pulse; the game itself is unchanged.
- Missing 2D context renders a plain text message instead of a blank rectangle.

---

## 7. Test plan

### 7.1 Unit (Vitest, against `game/` only, seeded RNG)

- Death on each of the four walls
- Death on self-collision
- **The tail-vacating move is legal** (§4.4), and is *illegal* on a growing tick
- Eat → length +1, `score += pointsPerFood(level)`, food respawns off-snake
- Board full → win state, not a crash or an unbounded spawn loop
- Input queue: reverse rejected; two turns inside one tick both land on consecutive ticks; queue caps at 2
- `LEVELS` table maps each level to the correct `tickMs` and points

### 7.2 End-to-end (Playwright, matching the sibling projects' setup)

Load → select a level → play → die → assert the best score persisted across a reload.

Canvas pixels are impractical to assert against, so the build exposes a **read-only state hook** for e2e inspection rather than screenshot-diffing.

---

## 8. Decisions log

| Decision | Chosen | Rejected |
|---|---|---|
| Shell | Vite + TS, no framework | Single static HTML file; full Toolcraft template app |
| Visual direction | Phosphor terminal | Faithful Nokia handset; modern neon minimal |
| Food glyph | Diamond | Asterisk |
| Ink | Single green | Amber accent for food |
| Movement | Hard cell-jumps | Smooth interpolation |
| Body | Rounded stroked path with circular eyed head | Pixel tube tile set; segmented tiles |
| Scoring | Points = level per food | Flat 1/food; level multiplier + streak bonus |
| Speed within a round | Constant | Accelerating with length |
| Scope add-ons | Per-level bests, pause, touch, sound | — |
| Rules scope | Classic only | Mazes, bonus items |
