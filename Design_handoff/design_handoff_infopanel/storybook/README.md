# Using the InfoPanel in Storybook

The `.dc.html` prototype in the parent folder is a **design reference**, not a Storybook component — Storybook renders real framework components. This folder contains a ready-to-run **React + TypeScript** implementation you can drop into a Storybook 7/8 project.

## Files
- `InfoPanel.tsx` — the component. Props: `data`, `open`, `openMode` (`"explain"|"read"`), `showChoose`, `onClose`, `onChoose`, `theme`. Also exports `ExplainButton` — the Path 1 `?` affordance. All values bind to `--qa-*` tokens.
- `tokens.css` — the `--qa-*` token contract (all three themes) + keyframes + reduced-motion. Imported by `InfoPanel.tsx`.
- `InfoPanel.stories.tsx` — stories: **Condition**, **SpellWithChoose**, **Homebrew**, **DenseStatBlock**, plus the two entry paths (**Path1_ExplainNumber**, **Path2_ReadThenPick**) and **ExplainAffordance** (the `?` states).

## Install
1. Copy the three files into your Storybook project (e.g. `src/components/InfoPanel/`).
2. Load the three fonts once — in `.storybook/preview.ts` or your global CSS:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
   ```
3. Run `storybook dev`. The stories appear under **Questra → InfoPanel**.

## Notes
- The InfoPanel is `position:absolute`; the stories wrap it in a relative "battle-map" ground so the scrim and slide-over position correctly (as they do over the real HUD). Keep that pattern when embedding.
- `theme` is a Storybook control (ghost/slate/ivory), but the product ships **ghost** only.
- `openMode` + `showChoose` are controls too — flip them live to see the same panel switch between the derivation-forward (Path 1) and summary-forward (Path 2) entries. The panel is the same component; only the default-expanded layer and the footer differ.
- `onClose` / `onChoose` are wired to Storybook **actions** so you can watch them fire in the Actions panel.
- No Storybook-specific styling was added — it's the same component your app imports. If you use CSS Modules / styled-components / Tailwind, port the inline styles to your convention; the token names stay the same.
- Framework other than React? Use these as the spec — the prop shape, token bindings, and per-element measurements are identical to the README in the parent folder.
