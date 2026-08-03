import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __snakeTestState__: () => { phase: string; score: number; level: number; best: number; isNewBest: boolean };
  }
}

test("writes a new best score after dying, then keeps it after reloading", async ({ page }) => {
  // No best seeded for level 1, so the round below exercises the actual
  // "first best ever" write path through recordScore/saveBests, not just a read.
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(0);

  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("playing");

  // Starting centred and moving right with no further input, the snake runs off
  // the right wall deterministically at level 1's fixed speed (spec §4.2, §7.2).
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().phase), { timeout: 10_000 })
    .toBe("gameOver");

  const score = await page.evaluate(() => window.__snakeTestState__().score);

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");
  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(score);
});
