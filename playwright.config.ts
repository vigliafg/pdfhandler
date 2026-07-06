import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 10_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // For parallel `--project=X` execution across multiple terminals:
  // start the dev server manually first (`npx vite --port 5173 &`),
  // then comment out webServer below to avoid process conflicts.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'extract',          testMatch: 'extract.spec.ts' },
    { name: 'insert-replace',   testMatch: 'insert-replace.spec.ts' },
    { name: 'delete',           testMatch: 'delete.spec.ts' },
    { name: 'copy-move',        testMatch: 'copy-move.spec.ts' },
    { name: 'rotate',           testMatch: 'rotate.spec.ts' },
    { name: 'reverse',          testMatch: 'reverse.spec.ts' },
    { name: 'split',            testMatch: 'split.spec.ts' },
    { name: 'merge',            testMatch: 'merge.spec.ts' },
    { name: 'compose',          testMatch: 'compose.spec.ts' },
    { name: 'reorder',          testMatch: 'reorder.spec.ts' },
    { name: 'toc-preservation', testMatch: 'toc-preservation.spec.ts', timeout: 300_000 },
    { name: 'smoke',            testMatch: 'smoke.spec.ts' },
  ],
});
