import { defineConfig, devices } from "@playwright/test";

// CLAUDE.md: "Playwright for one happy-path end-to-end test." Per
// DECISIONS.md, the original flow-5 (completion & payment) target was
// dropped along with escrow — this now covers hiring + document review
// instead, the two substantial flows that remain in scope.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // the test suite shares one seeded SQLite database
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
