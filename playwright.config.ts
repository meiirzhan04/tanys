import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5187'

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: baseURL,
  },
})
