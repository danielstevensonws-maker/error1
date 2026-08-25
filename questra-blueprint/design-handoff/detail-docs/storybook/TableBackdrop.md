# TableBackdrop — story infrastructure

**Component:** `packages/web/src/primitives/TableBackdrop.tsx`
**Story file:** none — and that is correct.

---

## Screen

**None.** This is **not a product component.** It never ships in the app. It is a
Storybook stage, used as a decorator by other story files.

It is the only component in `src/primitives/` with no story of its own, and it
should stay that way — there is nothing to review about it in isolation.

## Who uses it

| Story file | How |
|---|---|
| `PlayerHub.stories.tsx` | Meta-level decorator with a real 10×7 room — every hub story sits over the map. |
| `ComposeRollSheet.stories.tsx` | Meta-level decorator, `height={520} center` — no room, the painted candlelit wash. |

---

## Why it exists

The design's panels are translucent glass, meant to float over the map
(`--qa-glass*` in the theme's `tokens/colors.css`).

Judged on Storybook's default flat canvas, glass reads as **washed out and
thin** — but that is a *lighting artefact*, not a design fault. Reviewing the
HUD on a white background would produce false negatives: you'd redesign panels
that are actually correct, because you were looking at them in the wrong room.

`TableBackdrop` reproduces the Player View's actual ground so that what you see
in a story is what the player sees at the table. Judge the glass here, never in
isolation.

## How it functions

Four stacked layers:

1. **The ground** — either a real `MapCanvas` in `table` mode at `cellPx={96}`
   (when a `room` is passed, at 90% opacity), or a painted fallback: a radial
   gradient reading as a warm pool of candlelight falling off into the dark
   (`#2A2115` → `#1B1610` → `#12100A`).

   Composing the *real* `MapCanvas` matters — the glass then sits over genuine
   map pixels rather than a painted approximation of them.

2. **Grid** — only drawn for the painted ground, since `MapCanvas` draws its own.
   96 px cells at 5% ink.

3. **Atmosphere** — the design's own overlays from `effects.css`: `--qa-grain`
   then `--qa-vignette`, both `pointer-events: none`.

4. **The HUD under judgement** — `children`, inset by `--qa-hud-inset`, optionally
   centred.

## Props

| Prop | Purpose |
|---|---|
| `children` | The HUD being reviewed. |
| `room` | Optional contracts `Room`. Present → real `MapCanvas` ground; absent → the painted lit-room wash. |
| `height` | Stage height (default 720). The Player View's own stage is 1080 tall. |
| `center` | Centre the children instead of filling — for single-panel stories. |

## Note for reviewers

If a panel looks wrong in a story wrapped in this backdrop, that is a real
finding. If it looks wrong on a bare Storybook canvas, check whether the story
was missing its decorator before concluding anything.
