import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = process.env.TANYS_BASE_URL
const baseURL = externalBaseURL || 'http://127.0.0.1:5187'

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  use: { baseURL, locale: 'ru-RU' },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
      }),
})
