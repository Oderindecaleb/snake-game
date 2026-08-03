import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __snakeTestState__: () => { phase: string; score: number; level: number; best: number; isNewBest: boolean };
  }
}

test("writes a new best score after dying, then keeps it after reloading", async ({ page }) => {
  // No best seeded for level 1, so the round below exercises the actual
  // "first best ever" write path through recordScore/saveBests, not just a read.
  //
  // Math.random is stubbed to a fixed constant so food spawns deterministically.
  // Level 1's grid is 24x16 (src/render/theme.ts GRID); createRound (src/game/rules.ts)
  // starts the snake centred at head (12,8) with body at (11,8) and (10,8), facing
  // right. freeCells (src/game/food.ts) walks the grid row-major (y outer, x inner),
  // so with those 3 cells occupied there are 381 free cells, and cell (13,8) -
  // directly one step in front of the head - is at index 202 of that free list.
  // spawnFood picks index = floor(rng() * free.length), so any constant in
  // [202/381, 203/381) lands on (13,8); we use the interval midpoint (202.5/381)
  // to stay clear of floating-point rounding at either edge. Since Math.random is
  // stubbed to a constant (not a real sequence), every call - initial spawn and
  // every respawn thereafter - resolves the same way, so the snake eats the very
  // first food on tick 1 and then runs off the right wall a few ticks later with
  // no further input, exactly as before, just now guaranteed to have scored first.
  const FOOD_AT_HEAD_PLUS_ONE_RNG = 202.5 / 381;
  await page.addInitScript((rngValue) => {
    window.Math.random = () => rngValue;
  }, FOOD_AT_HEAD_PLUS_ONE_RNG);

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  // #dpad-start is unconditionally visible (not touch-gated), so clicking it should
  // produce the same "confirm" intent as pressing Enter - this exercises that wiring.
  await page.click("#dpad-start");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("levelSelect");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(0);

  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("playing");

  // The food spawned directly in front of the head, so the snake eats on the very
  // first tick. Poll for the score to register rather than assuming a tick count.
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().score), { timeout: 5_000 })
    .toBeGreaterThan(0);
  const scoreAfterEating = await page.evaluate(() => window.__snakeTestState__().score);
  expect(scoreAfterEating).toBe(1); // level 1 awards 1 point per food (src/game/levels.ts)

  // With no further input, the snake keeps moving right and runs off the wall
  // deterministically at level 1's fixed speed (spec §4.2, §7.2).
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().phase), { timeout: 10_000 })
    .toBe("gameOver");

  const score = await page.evaluate(() => window.__snakeTestState__().score);
  expect(score).toBe(scoreAfterEating);
  expect(score).toBeGreaterThan(0);

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");
  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(score);
});
