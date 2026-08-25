import type { Preview } from '@storybook/react-vite';
import '../src/theme/index.css';

/**
 * The theme is selected on the story root via [data-qa-theme], exactly as the
 * app selects it on <html>. v1 ships GHOST ONLY — when slate/ivory land in
 * @questra/theme they appear in this list and every story re-themes with no
 * component edits. That is the ADR-0014 contract, made visible here.
 */
const THEMES = ['ghost'] as const;

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  globalTypes: {
    qaTheme: {
      description: 'Questra glass theme',
      defaultValue: 'ghost',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: THEMES.map((t) => ({ value: t, title: t })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      // Stamp the theme on the document so tokens resolve for portals/overlays
      // too — InfoPanel renders a fixed overlay, not just inline content.
      document.documentElement.setAttribute('data-qa-theme', context.globals['qaTheme'] ?? 'ghost');
      return Story();
    },
  ],
};
export default preview;
