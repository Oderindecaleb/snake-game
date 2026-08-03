# On-Screen D-Pad for Touch Input — Design

**Amends:** `docs/superpowers/specs/2026-08-03-snake-game-design.md` §6.3 ("Touch: swipe with a ~24px threshold..."), and the `touch.ts` entry in §3's module table ("swipe → Intent").

## 1. Goal

Replace swipe-to-steer with an on-screen directional pad (D-pad) for touch input. Swiping over the canvas to change direction is removed entirely. Tap-on-canvas-to-confirm is kept as-is, and a dedicated on-screen START button is added alongside it.

## 2. Visibility

The D-pad and its associated controls are shown purely via CSS, gated on `@media (pointer: coarse) and (hover: none)` — no JavaScript feature-detection or visibility toggling. This matches touch-primary devices (phones, tablets) and stays hidden on desktop, including desktop browsers with a touchscreen but mouse/trackpad as the primary input.

## 3. Layout

Below the canvas, in a new `#touch-controls` container (hidden by default, shown by the media query above):

```
┌─────────────────────────────┐
│      [Sound: Off] [START]   │   ← one row, side by side
│                              │
│            [ ↑ ]             │
│      [ ← ] [ ] [ → ]         │   ← classic cross D-pad
│            [ ↓ ]             │
└─────────────────────────────┘
```

- Control row: the existing `#mute-toggle` button relocates here (unchanged element/behavior), plus a new `#dpad-start` button labeled `START`.
- D-pad: a 3×3 CSS grid — `↑` at top-center, `←`/`→` flanking an empty (invisible) center cell, `↓` at bottom-center. Same phosphor-terminal button styling as the existing mute button (monospace, thin green border, dark fill).

## 4. Input wiring

Every control calls `applyIntent(...)` directly from `src/main.ts`, using the exact same `Intent` values the keyboard already produces — no new `Intent` variants, no changes to `src/game/**` or `src/shell/**`'s core logic:

- Four arrow buttons (`#dpad-up`, `#dpad-down`, `#dpad-left`, `#dpad-right`): `click` → `applyIntent({ type: "direction", direction: "up" | "down" | "left" | "right" })`.
- `#dpad-start`: `click` → `applyIntent({ type: "confirm" })`.
- Mute button: unchanged (`click` → existing `toggleMute()`).

Every new button also calls `audio.primeContext()` before dispatching, matching the existing pattern on `keydown` and canvas `touchend` (a button tap is a real user gesture, and priming here keeps WebAudio unlocked on iOS Safari without needing the player to press a keyboard key first).

`click` is used (not `touchstart`/`touchend`) for all these buttons: the page's existing `viewport` meta tag already removes the historical ~300ms mobile tap delay in modern browsers, so `click` is simple, fires promptly, and avoids the double-dispatch risk of wiring both a touch and a click handler to the same button.

One press is one direction intent — matching the keyboard's one-keydown-per-press behavior. Holding a button does not repeat-fire; the snake continues in the last-set direction every tick regardless (as it already does), so repeat-fire would be a no-op even if implemented (`queueDirection` already discards a duplicate of the current direction).

## 5. Removing swipe

`src/shell/touch.ts`:
- `intentFromSwipe` is deleted, along with its tests in `touch.test.ts`.
- `isTap` and `TouchPoint` are kept unchanged — tap-to-confirm on the canvas is not being removed.

`src/main.ts`'s canvas `touchend` handler simplifies: on a tap (`isTap(...)` true), dispatch `{ type: "confirm" }` as before; otherwise (a drag or attempted swipe on the canvas), do nothing — no swipe fallback.

## 6. Testing

- `touch.test.ts`: remove the `intentFromSwipe` describe block; keep the `isTap` tests as-is.
- No new pure-logic module is introduced — the D-pad only calls the existing, already-tested `applyIntent`/`Intent` machinery, so no new unit tests are needed at the game/shell layer.
- The existing Playwright e2e test (`e2e/gameplay.spec.ts`) runs under a Desktop Chrome device profile with no coarse pointer, so `#touch-controls` stays hidden and the test is unaffected by this change.
- Verification is manual: resize the browser to a mobile viewport (or use a touch-emulated device profile), confirm the D-pad and START/mute row appear, tap each arrow and confirm the snake turns accordingly, tap START to confirm/advance phases, and confirm mute still toggles correctly from its new position in the row.

## 7. Files touched

- Modify: `index.html` — add `#touch-controls` markup (relocated mute button, new `#dpad-start`, new D-pad buttons).
- Modify: `src/style.css` — `#touch-controls` visibility media query, control-row layout, D-pad grid styling; remove the old standalone `#mute-toggle` positioning rule (superseded by the new row layout).
- Modify: `src/main.ts` — wire the new buttons; simplify the canvas `touchend` handler to drop the swipe branch.
- Modify: `src/shell/touch.ts` — remove `intentFromSwipe`.
- Modify: `src/shell/touch.test.ts` — remove the corresponding tests.
