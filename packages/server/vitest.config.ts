import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /* Loads .env.local before anything runs, so the Postgres suites see the same
       DATABASE_URL the server does. See test/setup.ts for why that was not
       already true. */
    setupFiles: ['./test/setup.ts'],
  },
});
