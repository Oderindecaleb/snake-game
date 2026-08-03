import { defineConfig, devices } from "@playwright/test";

const testPort = 5199;
const testBaseUrl = `http://localhost:${testPort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${testPort} --strictPort`,
    reuseExistingServer: false,
    timeout: 60_000,
    url: testBaseUrl,
  },
});
