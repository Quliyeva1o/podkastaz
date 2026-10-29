import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Tests edit shared database content, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100" },
  // Firefox / WebKit: see playwright.cross.config.ts (run in Docker).
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
