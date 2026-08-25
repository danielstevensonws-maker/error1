# Handoff: Questra InfoPanel

## Overview
The **InfoPanel** is Questra's reference primitive: one right-side slide-over that can display any game entity (a class, spell, monster, condition, feat, item, or homebrew) in three progressive layers. It appears on nearly every screen of the app — the HUD floats over a battle map, so this is a slide-over over a dark translucent "glass" ground, **not** a centered modal.

## About the Design Files
The files in this bundle are **design references created in HTML** — a live prototype showing the intended look and behavior. They are **not** production code to copy verbatim. The task is to **recreate this design in the target codebase's existing environment** (React/Vue/etc.) using its established patterns, then wire the literal token values into `@questra/theme` (per ADR-0014). Per that ADR: the prototype is the visual/interaction reference; **the tokens are the source of truth for values** — components must reference tokens by name, never hardcode.

If the codebase has no environment yet, implement in React with CSS custom properties for the token set.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, motion, and interactions. Recreate pixel-perfectly using the codebase's libraries, binding every value to the `--qa-*` tokens below.

## Data Contract
The panel renders this shape (cannot add fields freely):

```ts
interface InfoPanelData {
  name: string;            // title
  kind: string;            // category line, e.g. "Spell — Level 3 Evocation", "Creature — CR 1"
  summary: string;         // Layer 1
  derivation?: { label: string; value: string; parts?: string }[]; // Layer 2 rows (value & parts are mono)
  rulesText?: string;      // Layer 3 (verbatim, keeps newlines)
  homebrew?: boolean;      // shows the badge
  chooseLabel?: string;    // footer button label, e.g. "Prepare Fireball", "Attune"; defaults to "Choose"
}
```

How the panel opens is **not** on the data — it's on the open call (see "The two entry paths").

## The two entry paths (interaction spec)
The InfoPanel opens two ways depending on the screen, and **leads with a different layer** in each. It is the *same* panel both times — only two things differ: **which layer is expanded by default**, and **whether the Choose footer shows**. Nothing else changes.

### Path 1 — "Explain this number" (tap a `?` on a play surface)
- **Where**: the Player View. Every number/chip carries a small `?` — AC, a condition, an ability tile's to-hit.
- **Trigger**: the `?` button itself (small, quiet, sits on the number it explains).
- **Leads with**: the **L2 derivation** (expanded by default) — the user asked "why is this number what it is?" L1 summary sits above it; L3 available below, collapsed.
- **Choose footer**: **absent**. Pure reference — understanding, not picking.

### Path 2 — "Read, then pick" (tap the entity's own card/row)
- **Where**: Character Creation Wizard, Compendium, Session Planner, Level-up, Community library.
- **Trigger**: the whole card or row for the entity — not a tiny `?`.
- **Leads with**: the **L1 summary** (L2/L3 collapsed, opened on demand) — you're deciding whether to choose it.
- **Choose footer**: **present** in pick contexts (wizard, level-up); **absent** in pure browsing (compendium).

### The `?` affordance (Path 1 trigger)
A 16px round button sitting on the number it explains. Must read as "there's more here" without competing with the number.
- **Resting**: background `--qa-chip`, glyph `?` mono 10px color `--qa-ink-faint`, border `1px solid transparent`.
- **Hover**: color `--qa-ink`, border `--qa-accent-line`.
- **Focus**: color `--qa-ink`, border `--qa-accent-line`, plus `box-shadow: 0 0 0 2px var(--qa-accent-soft)`.
- **Pressed**: background `--qa-accent-soft`, color `--qa-accent`, border `--qa-accent-line`.

### Same-panel contract (the one rule)
Implement the open action as `open(entity, mode, showChoose)` where `mode` is `"explain" | "read"`:
- `l2ExpandedByDefault = (mode === "explain") && hasDerivation`
- `footerVisible = (mode === "read") && showChoose`

Do not introduce any other difference between the two paths.

## The three jobs (product logic — do not change)
- **Layer 1 — plain sentence.** One-sentence summary, always visible, large serif type. Beginners live here.
- **Layer 2 — "Where the numbers come from."** Collapsible. Derivation rows: prose label + mono value, plus an optional smaller mono breakdown line (`parts`, e.g. `8 + 4 INT mod + 3 prof`).
- **Layer 3 — "Full rules text."** Collapsible. Verbatim rules text; preserves line breaks (`white-space: pre-line`).
- **Choose** lives in a sticky footer inside the panel. Present for "pick this" contexts, absent for pure browsing.
- **Homebrew badge** — a quiet tint next to the kind eyebrow. A tint, never a warning. Custom content never looks second-class.

## Screen: InfoPanel slide-over

### Layout
- **Panel**: fixed to the right edge, full viewport height, **width 428px**, `display:flex; flex-direction:column`. Left border `1px solid var(--qa-glass-border)`. Background `var(--qa-glass)` with `backdrop-filter: blur(var(--qa-glass-blur))` (14px). Shadow `var(--qa-shadow-pop)`.
- **Scrim**: covers the whole ground, `z-index` below the panel. Background `var(--qa-scrim)` + `backdrop-filter: blur(2px)`. Click closes the panel.
- **Header** (flex:none): solid glass `var(--qa-glass-solid)`, bottom hairline, padding `24px 24px 16px` (`--qa-s5 --qa-s5 --qa-s4`).
- **Body** (flex:1, `overflow-y:auto`): padding `24px` (`--qa-s5`).
- **Footer** (flex:none, only when `choose`): solid glass, top hairline, padding `16px 24px` (`--qa-s4 --qa-s5`).

### Components

**Kind eyebrow** — top of header, left.
- Font `--qa-font-mono` (IBM Plex Mono), 10px (`--qa-text-whisper`), `letter-spacing: 0.16em` (`--qa-tracking-caps`), `text-transform: uppercase`, color `--qa-ink-dim`.

**Homebrew badge** — inline right of the eyebrow, only when `homebrew`.
- Pill: `border-radius: var(--qa-radius-round)`, padding `2px 8px`, background `var(--qa-accent-soft)`, border `1px solid var(--qa-accent-line)`.
- Text "Homebrew", mono 9px, `0.16em` tracking, uppercase, color `var(--qa-accent)`.

**Close button (✕)** — top-right of header, `30×30`, `margin:-4px -6px 0 0` to optically align. Transparent, no border. Glyph mono 16px, color `--qa-ink-faint` → `--qa-ink` on hover (transition `--qa-dur --qa-ease`). `aria-label="Close"`.

**Title** — below eyebrow row.
- Font `--qa-font-display` (IM Fell English), weight 400, 28px (`--qa-text-title`), line-height 1.08, color `--qa-ink`, margin-top `8px`.

**Layer 1 summary** — first element in body.
- Font `--qa-font-body` (EB Garamond), 20px (`--qa-text-lg`), line-height 1.5, color `--qa-ink`, `text-wrap: pretty`, margin 0.

**Collapsible section header** (used for Layer 2 and Layer 3) — full-width `<button>`, `aria-expanded`.
- Container has `border-top: 1px solid var(--qa-glass-border)`; L2 block `margin-top: 24px`, L3 block `margin-top: 16px`.
- Button: `display:flex; justify-content:space-between; align-items:center`, padding `16px 0 12px`, transparent, `text-align:left`, `opacity:0.82` on hover.
- Label: mono, 12px (`--qa-text-label`), `0.16em` tracking, uppercase, color `--qa-ink-dim`. Text: "Where the numbers come from" / "Full rules text".
- Disclosure affordance: a mono chevron on the right, color `--qa-ink-faint` — `▸` collapsed, `▾` expanded.

**Derivation row (Layer 2 expanded)** — one per `derivation[]` entry.
- Row: `display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding:12px 0`. Every row except the first gets `border-top: 1px solid var(--qa-glass-border)`.
- Label (left, flex:1): serif `--qa-font-body`, 16px (`--qa-text-body`), color `--qa-ink-dim`.
- Value (right): mono, 16px, color `--qa-ink`, line-height 1.2.
- Parts (under value, only if present): mono, 10px (`--qa-text-whisper`), color `--qa-ink-faint`, line-height 1.4, margin-top 3px. Right-aligned.

**Rules text (Layer 3 expanded)**.
- Serif `--qa-font-body`, 16px, line-height 1.6, color `--qa-ink-dim`, `white-space: pre-line`, `text-wrap: pretty`.

**Choose footer button** — only when `choose`.
- Full-width, height 48px, `display:grid; place-items:center`. Background `var(--qa-accent)`, text color `var(--qa-accent-ink)`, no border, `border-radius: var(--qa-radius)` (6px).
- Font `--qa-font-body`, 16px, weight 500, `letter-spacing: 0.01em`. Label from `chooseLabel`.
- Hover: `box-shadow: 0 8px 24px -8px var(--qa-accent-glow)`. Active: `transform: translateY(1px)`.

## Interactions & Behavior
- **Open**: panel slides in from the right — `translateX(28px) → 0` plus fade, duration `var(--qa-dur-slow)` (420ms), easing `var(--qa-ease-out)`. Scrim fades in over `var(--qa-dur)` (220ms).
- **Close**: click the ✕, click the scrim, or press **Escape**.
- **Focus**: on open, focus moves into the panel (the `<aside tabindex="-1">` is focused). Panel is `role="dialog"` + `aria-modal="true"` + `aria-label={name}`.
- **Collapse/expand**: Layer 2 and Layer 3 toggle independently; chevron swaps and `aria-expanded` updates. Recommended default: Layer 2 open when derivation exists, Layer 3 collapsed.
- **Reduced motion**: when `data-qa-rm="on"` (or `prefers-reduced-motion`), all animations/transitions are disabled — the panel appears in place with no slide/fade.
- Layer 2 renders only if `derivation` is non-empty; Layer 3 only if `rulesText` exists; footer only if `choose`.

## State Management
- `panelOpen: boolean` — mounts scrim + panel.
- `entity: InfoPanelData` — the currently displayed entity.
- `openMode: "explain" | "read"` — set by the trigger; drives the default-expanded layer.
- `showChoose: boolean` — set by the trigger; footer shows only when `openMode === "read" && showChoose`.
- `l2Open: boolean`, `l3Open: boolean` — independent collapse state; on open, `l2Open = (openMode === "explain") && hasDerivation`, `l3Open = false`.
- Escape key listener active while `panelOpen`. On open transition, move focus to the panel; on close, return focus to the trigger (recommended).

## Design Tokens (ghost theme — the only theme this panel uses)
Bind by name; values shown for reference.

**Ink**: `--qa-ink #E6DCC4` · `--qa-ink-dim rgba(230,220,196,.62)` · `--qa-ink-faint rgba(230,220,196,.34)`
**Glass**: `--qa-glass rgba(19,16,9,.55)` · `--qa-glass-solid rgba(28,24,15,.94)` · `--qa-glass-border rgba(230,220,196,.14)` · `--qa-glass-blur 14px` · `--qa-scrim rgba(10,8,4,.55)` · `--qa-chip rgba(230,220,196,.08)`
**Accent**: `--qa-accent #C05B41` · `--qa-accent-ink #FBEEE6` · `--qa-accent-soft rgba(192,91,65,.22)` · `--qa-accent-line rgba(192,91,65,.55)` · `--qa-accent-glow rgba(192,91,65,.45)`
**Spacing** (4pt): `--qa-s1 4` · `s2 8` · `s3 12` · `s4 16` · `s5 24` · `s6 32` · `s7 48` · `s8 64` · `--qa-hud-inset 24`
**Radii**: `--qa-radius-sm 3` · `--qa-radius 6` · `--qa-radius-lg 10` · `--qa-radius-round 999` · `--qa-hairline 1px`
**Type**: `--qa-font-display 'IM Fell English', Georgia, serif` · `--qa-font-body 'EB Garamond', Georgia, serif` · `--qa-font-mono 'IBM Plex Mono', ui-monospace, monospace` · `--qa-tracking-caps .16em`
Type scale: whisper 10 · label 12 · body 16 · lg 20 · title 28 · display 40
**Motion**: `--qa-dur-fast 120ms` · `--qa-dur 220ms` · `--qa-dur-slow 420ms` · `--qa-ease cubic-bezier(.2,.7,.2,1)` · `--qa-ease-out cubic-bezier(.16,1,.3,1)`
**Elevation**: `--qa-shadow 0 18px 48px -18px rgba(0,0,0,.72), 0 2px 8px rgba(0,0,0,.35)` · `--qa-shadow-pop 0 30px 70px -22px rgba(0,0,0,.8)`

The full token contract (all three themes) lives in `Questra Tokens.dc.html` in this bundle — copy the `[data-qa-theme]` / `[data-qa-theme="ghost"]` blocks into `theme/tokens.css`.

### New tokens required
**None.** The InfoPanel lives entirely inside the existing token set. The only non-token literal is the scrim's `blur(2px)` — if you want it tokenized, add `--qa-scrim-blur: 2px`.

## Fonts
Three Google Fonts, by role — **prose is serif, data is mono, always**:
- IM Fell English (display/titles — "the story")
- EB Garamond (body prose)
- IBM Plex Mono (all numbers/data)

## Reference entities (in the prototype)
Four examples span sparse → dense; use them as test fixtures:
1. **Prone** — Condition, Layers 1+3 only, no Choose (sparsest case).
2. **Fireball** — Spell — Level 3 Evocation, derivation + rules, Choose ("Prepare Fireball").
3. **Emberweave Cloak** — Wondrous Item — Rare, `homebrew: true` (badge), Choose ("Attune").
4. **Dire Wolf** — Creature — CR 1, 5-row derivation + rules (densest case, must survive a full stat block).

## Files
- `Questra InfoPanel.dc.html` — the InfoPanel prototype (open in a browser). Contains a small top-left "harness" for switching entities and toggling layers; **the harness is demo scaffolding, not part of the primitive** — do not port it.
- `Questra Tokens.dc.html` — the full `--qa-*` token contract for all three glass themes.

> These `.dc.html` files are self-contained design references. Implement the InfoPanel in your app's framework against the tokens; ignore the prototype's own runtime.
