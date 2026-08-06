# Snake Candy Redesign — Design

**Supersedes:** `docs/superpowers/specs/2026-08-03-snake-game-design.md` and `docs/superpowers/specs/2026-08-03-touch-dpad-design.md` for everything visual/screen-related. The pure game engine those specs describe (grid, tick rules, tail-vacating, input queue, level 1–9 timing) is **unchanged** — this is a full visual and screen-flow reskin on top of the same engine.

**Source of truth:** the user's own design, authored in claude.ai/design, imported via the `DesignSync` MCP tool. Saved locally for exact reference during implementation:
- `docs/superpowers/specs/reference/snake-candy-source.dc.html` — full design markup/CSS/JS as authored
- `docs/superpowers/specs/reference/snake-mascot.png` — the mascot image (686×654 PNG)

## 1. Scope

Full replace of the current phosphor-terminal theme. Includes three screens the current game doesn't have: a 3×3 Levels grid, a Best-Scores list (all 9 levels at once), and a How-To/Help screen.

## 2. Architecture

The reference design renders its menu, levels grid, help, scores, HUD badges, and paused/game-over cards as real DOM elements with CSS gradients, `border-radius`, `box-shadow`, and a Google Font (Baloo 2) — not canvas-drawn. That's the right call for this visual style (rounded 3D buttons and soft shadows are trivial in CSS, painful to hand-draw on `<canvas>`), so the implementation follows suit:

- **Canvas** draws *only* the live playfield: checkerboard background, snake, food. It stays visible (frozen) underneath the Paused/Game-Over cards, matching the reference — those cards are DOM overlays positioned above the canvas, not canvas-drawn.
- **Everything else is DOM/CSS**: menu, levels grid, help, scores, HUD badges, paused/game-over cards, sound toggle, D-pad. Static markup in `index.html`, shown/hidden by `main.ts` per phase, styled in `src/style.css`.

**Reused untouched:** all of `src/game/**` (types, levels, snake, food, input, rules — the engine doesn't know or care what the screens look like) and `src/shell/{loop,intent,keyboard}.ts`. **Rewritten:** `src/render/**` (shrinks to just the playfield), `src/main.ts`, `index.html`, `src/style.css`. **Adapted:** `src/shell/audio.ts` (new sound set), `src/shell/storage.ts` (default flip, see §5).

**Sizing stays responsive.** The reference specifies a fixed 440×840 card at 16px cells. This implementation keeps the existing scale-to-viewport approach (cell size computed from available width/height, capped, as today) rather than pinning to a fixed size — same visual design, adapts to any screen, preserves the landscape-safety fix already built for the D-pad.

## 3. Phase and Intent changes

`Phase` (`src/game/types.ts`) gains two variants; existing ones keep their current internal `kind` names (no changes needed in `src/game/rules.ts` or its 14 tests):

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

`Intent` (`src/shell/intent.ts`) gains three variants for the menu's distinct buttons:

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

**Behavior change from the current game, taken directly from the reference:** `confirm` on the `title` phase now starts a round *immediately* at `state.level` (the last level played), matching the reference's `onPlay`/Enter-on-menu. It no longer routes through level-select first — `goToLevels` (the LEVEL button) does that explicitly. This changes the existing e2e test's flow, which is being rewritten anyway (§6).

## 4. Screens

A header (back arrow, all-time-best badge, sound toggle) is present on every screen — **including live `playing`**, matching the reference's `onBack`, which is phase-independent. Tapping back while actively playing immediately abandons the round and returns to `title`, with no confirmation dialog and no intermediate pause. This is a real behavior difference from today (currently the only way back to the title from `playing` is pause → menu); it's intentional, taken directly from the reference. All-time-best is a new derived value: `Math.max(0, ...Object.values(bests))`.

- **Menu** (`title` phase): PLAY → `confirm` (direct start), LEVEL → `goToLevels`, BEST → `goToScores`, SOUND → `toggleMute`, HOW TO → `goToHelp`. Mascot image bobs via CSS animation (`@keyframes bob`, matching the reference).
- **Levels** (`levelSelect` phase): 3×3 grid, all 9 levels with their bests. Clicking a tile starts that level directly (`selectLevel` + `confirm` in one action). Keyboard stays fully functional on top: arrow-adjust and digit-select (already implemented) still work, with the currently-highlighted tile visually marked. Back/Escape/M → `title`.
- **Playing/Paused/Game Over** (`playing`/`paused`/`gameOver` phases): same 3-phase structure as today. The on-screen D-pad's previously-empty center cell becomes a working PAUSE button (`{type:"pause"}`/toggle). Game-over title is 3-way: `CLEARED!` (won) / `NEW BEST!` (died with a new record) / `GAME OVER` (died, no record) — replacing the current separate title+"NEW BEST" line. **The D-pad's touch-only CSS gating is removed** — the reference shows it unconditionally on every device (keyboard still works in parallel), and it now carries a real 5th button (pause) with no other mouse-accessible equivalent. This reverses the touch-only decision from the D-pad feature; confirmed with the user during this redesign's brainstorm.
- **Help** (`help` phase): 3 static instruction rows + back. No game-state binding.
- **Scores** (`scores` phase): all 9 levels' bests listed + back.

## 5. Audio and storage

**Audio** (`src/shell/audio.ts`) matches the reference exactly: two sounds only — `eat` (triangle wave, 660Hz) and `die` (sawtooth, 130Hz), gain 0.07, exponential ramp to 0.001 over 0.12s (eat) / 0.35s (die). The current `turn` blip is dropped — the reference never plays one. `primeContext`/lazy-construction logic is unchanged.

**Sound now defaults to on** (the reference's default), a flip from the current muted-by-default. `loadMuted()`'s default return value changes from `true` to `false`.

**Storage keys stay as-is**: `snake.bests.v1`, `snake.muted.v1` — not switched to the reference's `snake-candy-bests`/`snake-candy-sound`. This is invisible during play and means anyone with existing saved bests keeps them through the reskin.

## 6. Testing

- `src/game/**` tests: untouched, all 40 apply unchanged.
- `src/render/playfield.test.ts` (renamed/trimmed from today's): kept, reduced to match the smaller drawing surface — no more HUD/overlay/scanline tests, since those functions are deleted.
- `src/render/screens.ts`, `src/render/renderer.ts`: deleted (DOM replaces canvas-drawn chrome). No tests to carry over for them.
- `src/shell/audio.test.ts`: updated for the new sound kinds/frequencies; lazy-construction and mute-guard tests carry over unchanged in spirit.
- `e2e/gameplay.spec.ts`: rewritten for the new flow (Enter/PLAY → direct play, not through level-select), still asserting via `window.__snakeTestState__()`, still using the deterministic-food-placement technique already established for a real best-score write.
- Manual verification: menu's 5 buttons each route correctly; levels grid click-to-start and keyboard-adjust both work; help/scores are static and correct; paused/game-over cards render over a still-visible canvas; D-pad's new pause button works; sound defaults on and toggles; mascot image loads and bobs; responsive behavior holds on both a desktop window and a landscape phone viewport (reusing the height-budgeting fix from the D-pad work).

## 7. Files touched

- Modify: `src/game/types.ts` — add `help`/`scores` to `Phase`.
- Modify: `src/shell/intent.ts` — add `goToLevels`/`goToHelp`/`goToScores` to `Intent`.
- Modify: `src/shell/keyboard.ts` — no new key mappings required (reference has no keyboard shortcuts for Levels/Help/Scores navigation); verify existing mappings still make sense against the new phase set.
- Modify: `src/shell/audio.ts`, `src/shell/audio.test.ts` — new sound kinds/frequencies.
- Modify: `src/shell/storage.ts`, `src/shell/storage.test.ts` — `loadMuted()` default flips to `false`.
- Rewrite: `src/render/theme.ts` — candy palette constants, `GRID` unchanged (24×16).
- Rewrite: `src/render/playfield.ts` — checkerboard + snake + food only, candy colors/gradients.
- Delete: `src/render/screens.ts`, `src/render/renderer.ts` — replaced by DOM.
- Rewrite: `index.html` — header, menu, levels grid, board (canvas + paused/game-over overlays), help, scores, D-pad with center pause button, Google Font links, mascot `<img>`.
- Add: `public/snake-mascot.png` — copied from `docs/superpowers/specs/reference/snake-mascot.png`.
- Rewrite: `src/style.css` — candy palette, Baloo 2, gradients/shadows/rounded buttons, grid layouts for levels/scores, responsive sizing retained.
- Rewrite: `src/main.ts` — DOM refs and wiring for every screen/button, phase→visible-section mapping, all-time-best helper, updated `applyIntent`.
- Rewrite: `e2e/gameplay.spec.ts` — new flow.
