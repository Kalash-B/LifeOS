import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: { NODE_ENV: 'test', JOBS_ENABLED: 'false', CRON_SECRET: 'e2e-cron-secret-0123456789' },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
