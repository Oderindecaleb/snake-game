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
  const dpadStartButton = document.querySelector<HTMLButtonElement>("#dpad-start");
  const dpadButtons: Record<Direction, HTMLButtonElement | null> = {
    up: document.querySelector<HTMLButtonElement>("#dpad-up"),
    down: document.querySelector<HTMLButtonElement>("#dpad-down"),
    left: document.querySelector<HTMLButtonElement>("#dpad-left"),
    right: document.querySelector<HTMLButtonElement>("#dpad-right"),
  };

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
        isNewBest = false;
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
        isNewBest = false;
      } else {
        state = { ...state, phase: { kind: "playing" } };
      }
      return;
    }

    if (state.phase.kind === "gameOver") {
      if (intent.type === "confirm") {
        state = createRound(state.level, GRID, rng);
        isNewBest = false;
      } else if (intent.type === "toTitle" || intent.type === "cancel") {
        state = createTitleState();
        isNewBest = false;
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
      isNewBest,
    });
  }

  const loop = createLoop(() => tickMsForLevel(state.level), { onTick: handleTick, onFrame: handleFrame });

  window.addEventListener("keydown", (event) => {
    audio.primeContext();
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
    audio.primeContext();
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
