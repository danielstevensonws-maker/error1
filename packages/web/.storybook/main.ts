import type { StorybookConfig } from '@storybook/react-vite';
import { contractsSrcAlias } from '../contracts-src-alias';
import { engineSrcAlias } from '../engine-src-alias';

const config: StorybookConfig = {
  // Primitives/* (judged in isolation), Play/* (staged over a real map — the
  // one whole screen there is Player View v2), and Shell/* (the account/
  // campaign screens — Landing, Home, Join — the second whole-screen exception,
  // staged over the same map material rather than a play session's state).
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Storybook dev AND its static build read @questra/contracts and @questra/engine
  // from src, so stories never render against a stale dist.
  viteFinal: async (cfg) => {
    cfg.resolve ??= {};
    cfg.resolve.alias = [
      ...(Array.isArray(cfg.resolve.alias) ? cfg.resolve.alias : []),
      contractsSrcAlias,
      engineSrcAlias,
    ];
    return cfg;
  },
};
export default config;
