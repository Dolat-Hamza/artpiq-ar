import { defineConfig, devices } from '@playwright/test'

// Unit tests for shared modules: no dev server, also the Stryker mutation target.
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: 'line',
  timeout: 15_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
