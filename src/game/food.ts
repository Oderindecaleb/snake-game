import type { Cell, Grid } from "./types";

export function freeCells(grid: Grid, occupied: Cell[]): Cell[] {
  const occupiedKeys = new Set(occupied.map((cell) => `${cell.x},${cell.y}`));
  const free: Cell[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!occupiedKeys.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  return free;
}

export function spawnFood(grid: Grid, occupied: Cell[], rng: () => number): Cell | null {
  const free = freeCells(grid, occupied);
  if (free.length === 0) {
    return null;
  }
  const index = Math.min(free.length - 1, Math.floor(rng() * free.length));
  return free[index];
}
