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
