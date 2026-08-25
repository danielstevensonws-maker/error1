import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/index.css';
import { App } from './shell/App.js';

// The theme must be selected for @questra/theme's tokens to apply at all
// (tokens.css scopes every value under [data-qa-theme]) — v1 builds ghost
// only (packages/theme/src/tokens.css's own doc), so this is the one place
// that selects it for the real app, the same way Storybook's preview does
// for stories.
document.documentElement.setAttribute('data-qa-theme', 'ghost');

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
