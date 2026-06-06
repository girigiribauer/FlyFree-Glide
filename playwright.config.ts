import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  retries: 0,
  reporter: 'list',
  workers: 1,
  projects: [
    {
      name: 'chromium',
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'firefox',
      testMatch: '**/*.spec.ts',
    },
  ],
})
