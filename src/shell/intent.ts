import type { Direction } from "../game/types";

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
