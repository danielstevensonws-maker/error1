# Using the AcceptTweakRejectCard in Storybook

The `.dc.html` prototype in the parent folder is a **design reference**, not a Storybook component — Storybook renders real framework components. This folder contains a ready-to-run **React + TypeScript** implementation you can drop into a Storybook 7/8 project.

## Files
- `AcceptTweakRejectCard.tsx` — the component. Key props: `state` (`"streaming"|"draft"|"tweak"|"fallback"|"resolved"`), `kind` (`"text"|"structured"`), `text`, `rows`, `fallbackOptions`, `acceptLabel`, `rejectLabel`, `outcome`, `theme`, `reduceMotion`, and the callbacks `onAccept`/`onReject`/`onTweak`/`onSaveTweak`/`onCancelTweak`/`onUndo`. All values bind to `--qa-*` tokens.
- `tokens.css` — the `--qa-*` token contract (all three themes) + the `qa-card-in` / `qa-blink` keyframes + reduced-motion. Imported by the component.
- `AcceptTweakRejectCard.stories.tsx` — one story per state (**DraftText**, **DraftStructured**, **Streaming**, **TweakMode**, **Fallback**, **ResolvedAccepted**, **ResolvedRejected**) plus **InteractiveLoop**, which drives the whole state machine end to end.

## Install
1. Copy the three files into your Storybook project (e.g. `src/components/AcceptTweakRejectCard/`).
2. Load the three fonts once — in `.storybook/preview.ts` or your global CSS:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
   ```
3. Run `storybook dev`. The stories appear under **Questra → AcceptTweakRejectCard**.

## Notes
- The card floats **centered over the battle-map ground with no scrim** — it sits *in* the scene rather than seizing it. The stories wrap it in that relative ground; keep that pattern when embedding.
- **`state` is the single source of truth.** The component is controlled — it renders whatever `state` you pass and reports intent through callbacks; the *host* owns the transitions (including flipping `streaming → draft` when the model finishes, or `→ fallback` on error). `InteractiveLoop` shows the full wiring.
- **Tweak is text-only.** The Tweak button appears only on a `text` draft — a `structured` ruling gets Accept/Reject only. The textarea autofocuses with the caret at the end on entering tweak mode; Cancel discards the edit, Save commits it via `onSaveTweak(text)`.
- **No footer** in `streaming` or `resolved` — you can't accept an unfinished suggestion, and a resolved card is terminal (Undo lives in the body).
- `outcome` drives the resolved dot color + line: `accepted`/`tweaked` → `--qa-success`, `rejected` → `--qa-ink-faint`.
- `theme` is a control (ghost/slate/ivory), but the product ships **ghost** only. `reduceMotion` (or `prefers-reduced-motion`) disables the entrance animation and the streaming caret blink.
- Callbacks are wired to Storybook **actions** so you can watch them fire in the Actions panel.
- No Storybook-specific styling was added — it's the same component your app imports. If you use CSS Modules / styled-components / Tailwind, port the inline styles to your convention; the token names stay the same.
- Framework other than React? Use these as the spec — the prop shape, token bindings, and per-element measurements are identical to the README in the parent folder.
