import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { contractsSrcAlias } from './contracts-src-alias';
import { engineSrcAlias } from './engine-src-alias';

// Dev reads @questra/contracts and @questra/engine from src (can't hit a stale
// dist); the production `vite build` keeps the real dist so packaging errors
// surface. (Storybook's own alias lives in .storybook/main.ts.)
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwind()],
  resolve: {
    alias: command === 'serve' ? [contractsSrcAlias, engineSrcAlias] : [],
  },
  test: {
    environment: 'jsdom',
    // jsdom lacks matchMedia, which every shell screen calls — see test/setup.ts
    setupFiles: ['./test/setup.ts'],
    globals: false,
    alias: [contractsSrcAlias, engineSrcAlias],
  },
}));
