import { defineConfig, devices } from '@playwright/test'

// Smoke-suite config. Targets a Vercel preview / production URL by default;
// set BASE_URL in CI to test a specific deploy. Locally we point at the dev
// server. Login-gated flows need ARTPIQ_TEST_EMAIL + ARTPIQ_TEST_PASSWORD —
// see tests/e2e/README.md.
const baseURL = process.env.BASE_URL || 'http://localhost:3005'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Only Chromium for the smoke pass — keeps CI fast. Add firefox / webkit
  // here if a real cross-browser bug appears.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Don't auto-start the dev server in CI (we point at a deployed URL).
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
