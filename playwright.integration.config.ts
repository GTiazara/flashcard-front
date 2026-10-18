import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: 'test-results/integration',
  globalTeardown: './tests/integration/teardown.ts',
  use: {
    baseURL: 'http://localhost:5174',
    // No trace/HAR containing registration credentials or session cookies.
    trace: 'off', screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [{ name: 'integration-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // npm exec keeps the frontend cwd; --prefix resolves backend-owned tsx.
      command: 'npm --prefix ../flashcard-back exec -- tsx ../flashcard-back/tests/e2e-server.ts',
      url: 'http://127.0.0.1:3001/__qa/ready',
      reuseExistingServer: false,
      timeout: 600_000, // First run may download the MongoDB binary.
      gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
    },
    {
      command: 'npm run dev -- --mode integration --host localhost --port 5174 --strictPort',
      url: 'http://localhost:5174',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3001', VITE_API_BASE_URL: '/api' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})