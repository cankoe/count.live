import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 30000,
  retries: 1,
  projects: [
    {
      name: 'local',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8787',
      },
    },
    {
      name: 'smoke',
      testDir: './tests/smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'https://count.live',
      },
    },
  ],
});
