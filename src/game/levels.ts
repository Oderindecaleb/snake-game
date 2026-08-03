import type { LevelConfig } from "./types";

const TICK_MS_BY_LEVEL: readonly number[] = [180, 156, 136, 118, 102, 89, 77, 67, 58];

export const LEVELS: readonly LevelConfig[] = TICK_MS_BY_LEVEL.map((tickMs, index) => ({
  level: index + 1,
  tickMs,
  pointsPerFood: index + 1,
}));

export function getLevel(level: number): LevelConfig {
  const config = LEVELS.find((entry) => entry.level === level);
  if (!config) {
    throw new Error(`Invalid level: ${level}. Must be between 1 and 9.`);
  }
  return config;
}

export function tickMsForLevel(level: number): number {
  return getLevel(level).tickMs;
}

export function pointsPerFood(level: number): number {
  return getLevel(level).pointsPerFood;
}
