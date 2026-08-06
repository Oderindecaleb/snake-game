const STORAGE_KEY = "snake.bests.v1";

export type Bests = Record<number, number>;

function isValidBests(value: unknown): value is Bests {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(([levelKey, score]) => {
    const level = Number(levelKey);
    return (
      Number.isInteger(level) &&
      level >= 1 &&
      level <= 9 &&
      typeof score === "number" &&
      Number.isFinite(score) &&
      score >= 0
    );
  });
}

export function loadBests(): Bests {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return isValidBests(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBests(bests: Bests): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bests));
  } catch {
    // localStorage unavailable (e.g. Safari private mode) — keep playing with in-memory bests only.
  }
}

export function recordScore(bests: Bests, level: number, score: number): { bests: Bests; isNewBest: boolean } {
  const currentBest = bests[level] ?? 0;
  if (score <= currentBest) {
    return { bests, isNewBest: false };
  }
  const nextBests = { ...bests, [level]: score };
  saveBests(nextBests);
  return { bests: nextBests, isNewBest: true };
}

const MUTED_STORAGE_KEY = "snake.muted.v1";

export function loadMuted(): boolean {
  try {
    const raw = localStorage.getItem(MUTED_STORAGE_KEY);
    return raw === null ? false : raw === "true";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
  } catch {
    // localStorage unavailable — the mute preference just won't survive reload.
  }
}
