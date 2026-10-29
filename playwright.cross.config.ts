import { defineConfig, devices } from "@playwright/test";

/**
 * Cross-browser smoke run of the public site (@site tests only, read-only, no DB setup).
 * Runs inside the official Playwright Docker image against the server on the host:
 *   docker run --rm -v "<repo>:/app" -w /app mcr.microsoft.com/playwright:v1.64.1-noble \
 *     npx playwright test -c playwright.cross.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "site.spec.ts",
  grep: /@site/,
  workers: 2,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://host.docker.internal:3100" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
