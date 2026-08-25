import { fileURLToPath } from 'node:url';

/**
 * Point `@questra/contracts` at its TypeScript source rather than its build
 * output.
 *
 * Dev and Storybook use this so a story can never render against a stale
 * `dist/` — the fixtures and schemas you see are the ones in the repo right
 * now. The production `vite build` deliberately does NOT use it, so a
 * packaging mistake surfaces there instead of hiding behind the alias.
 */
export const contractsSrcAlias = {
  find: /^@questra\/contracts$/,
  replacement: fileURLToPath(new URL('../contracts/src/index.ts', import.meta.url)),
};
