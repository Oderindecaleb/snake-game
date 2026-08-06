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
  | { kind: "gameOver"; result: "died" | "won" }
  | { kind: "help" }
  | { kind: "scores" };

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
