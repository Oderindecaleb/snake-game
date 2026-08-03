import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __snakeTestState__: () => { phase: string; score: number; level: number; best: number; isNewBest: boolean };
  }
}

test("shows a stored best score, then keeps it after dying and reloading", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("snake.bests.v1", JSON.stringify({ 1: 42 }));
  });

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");

  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(42);

  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("playing");

  // Starting centred and moving right with no further input, the snake runs off
  // the right wall deterministically at level 1's fixed speed (spec §4.2, §7.2).
  await expect
    .poll(() => page.evaluate(() => window.__snakeTestState__().phase), { timeout: 10_000 })
    .toBe("gameOver");

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().phase)).toBe("title");
  await page.keyboard.press("Enter");
  await page.keyboard.press("1");
  await expect.poll(() => page.evaluate(() => window.__snakeTestState__().best)).toBe(42);
});
