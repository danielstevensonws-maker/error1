import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Most suites here are source-text scans (node), but the render tests need a DOM.
    environment: 'jsdom',
    globals: false,
  },
});
