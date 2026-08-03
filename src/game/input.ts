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
