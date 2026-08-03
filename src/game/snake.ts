import type { Cell, Direction } from "./types";

export function nextHead(head: Cell, direction: Direction): Cell {
  switch (direction) {
    case "up":
      return { x: head.x, y: head.y - 1 };
    case "down":
      return { x: head.x, y: head.y + 1 };
    case "left":
      return { x: head.x - 1, y: head.y };
    case "right":
      return { x: head.x + 1, y: head.y };
  }
}

export function step(cells: Cell[], direction: Direction, grow: boolean): Cell[] {
  const newHead = nextHead(cells[0], direction);
  const body = grow ? cells : cells.slice(0, -1);
  return [newHead, ...body];
}
