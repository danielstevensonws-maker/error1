# Handoff: Questra AcceptTweakRejectCard

## Overview
The **AcceptTweakRejectCard** is Questra's universal **AI-output card**: whenever the assistant proposes something the player or DM must decide on — a narration beat, a rules ruling, a difficulty call — it arrives inside this one card. The card is **content-agnostic** (it renders either a block of prose or a structured ruling) and moves through a small set of **states** (Draft → optionally Tweak → Resolved, plus Streaming and Fallback). It floats as a glass card over the battle-map ground, centered — **not** a modal, no scrim.

The invariant it enforces: every AI suggestion is **provisional**. Nothing the assistant writes is applied until a human presses **Accept** (or edits it via **Tweak** and saves, or overrides it in **Fallback**). **Reject** always leaves the scene untouched.

## About the Design Files
The files in this bundle are **design references created in HTML** — a live prototype showing the intended look and behavior. They are **not** production code to copy verbatim. The task is to **recreate this design in the target codebase's existing environment** (React/Vue/etc.) using its established patterns, then wire the literal token values into `@questra/theme` (per ADR-0014). Per that ADR: the prototype is the visual/interaction reference; **the tokens are the source of truth for values** — components must reference tokens by name, never hardcode. If the codebase has no environment yet, implement in React with CSS custom properties for the token set.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, motion, and interactions. Recreate pixel-perfectly using the codebase's libraries, binding every value to the `--qa-*` tokens below.

## The state machine (product logic — do not change)
The card is one component driven by a `state` prop. Transitions are always human-initiated.

```
                 ┌──────────── Tweak ───────────┐
                 │                               ▼
   (async) ── Streaming ──▶ Draft ──Tweak──▶  Tweak mode ──Save──▶ Resolved(tweaked)
                             │  ▲                  │
              Accept ────────┘  └── Cancel ────────┘
              Reject ──────────────────────────────────────────▶ Resolved(rejected)
                             │
   (error) ── Fallback ──────┘   Use option ▶ Resolved(accepted) · Dismiss ▶ Resolved(rejected)
```

- **Streaming** — the suggestion is still arriving from the model. Body shows partial text with a blinking caret. **No footer** — you can't accept what isn't finished. `aria-busy="true"`.
- **Draft** — the finished suggestion, awaiting a decision. Footer: **Accept** · (optional **Tweak**) · spacer · **Reject**.
- **Tweak mode** — the player is editing the suggestion in a textarea. Footer: **Save changes** · **Cancel**. Only reachable from a **text** draft (you can't free-text-edit a structured ruling).
- **Fallback** — the model couldn't produce a ruling; the card degrades to a manual chooser (a difficulty ladder in the prototype). Footer: primary = the recommended option (e.g. **Use Medium (14)**) · spacer · **Dismiss**.
- **Resolved** — terminal. A one-line outcome with a colored status dot and an **Undo** affordance. **No footer.**

## Content is agnostic (the `kind`)
The body renders one of two shapes; the frame, states, and footer logic are identical either way.
- **`text`** — free prose (narration, flavor, a rules paraphrase). Editable, so the **Tweak** button appears on its draft.
- **`structured`** — a ruling as label/value rows (Check, DC, On a fail…). **Not** free-text editable, so **no Tweak button** on its draft — Accept or Reject only. (A future "edit structured fields" flow would be its own control, not the prose textarea.)

## Screen: the card

### Layout
- **Card**: `width: 560px` (max-width 100%), `display:flex; flex-direction:column` implicitly (header / body / footer stacked). Background `var(--qa-glass)`, border `1px solid var(--qa-glass-border)`, `border-radius: var(--qa-radius-lg)` (10px), `backdrop-filter: blur(var(--qa-glass-blur))` (14px ghost), `box-shadow: var(--qa-shadow-pop)`, `overflow:hidden`. Entrance animation `qa-card-in` — `translateY(8px)+opacity → 0`, `var(--qa-dur)` (220ms), `var(--qa-ease-out)`.
- **Ground**: the card centers over the dark battle-map ground (radial map gradient + faint grid). There is **no scrim** — this card sits *in* the scene, it doesn't seize it.
- **Header** (`padding: 24px 24px 12px` = `s5 s5 s3`): `flex; justify-content:space-between; align-items:center; gap:s3`.
- **Body** (`padding: 0 24px 24px` = `0 s5 s5`): the state-specific content.
- **Footer** (`padding: 16px 24px` = `s4 s5`, only in Draft/Tweak/Fallback): `flex; align-items:center; gap:s2`. Background `var(--qa-glass-solid)`, top hairline `1px solid var(--qa-glass-border)`.

### Components

**Origin dot** — header left, first item. `6×6`, `border-radius: var(--qa-radius-round)`, background `var(--qa-accent)`, `box-shadow: 0 0 8px var(--qa-accent-glow)`, `flex:none`. `title="An assistant wrote this"`. It is the standing mark that this content is machine-authored.

**Eyebrow** — header left, after the dot. Mono, 10px (`--qa-text-whisper`), `0.16em` tracking, uppercase, color `--qa-ink-dim`. Text: `"Suggestion"` normally, `"Fallback"` in the fallback state.

**Source tag** — header right. Mono, 10px, `0.16em`, uppercase, color `--qa-ink-faint`. Describes the *kind* of output, e.g. `"DM Narration"` (text) or `"DM Ruling"` (structured).

**Body — text draft / streaming.** `<p>` serif `--qa-font-body`, 16px (`--qa-text-body`), line-height 1.6, color `--qa-ink`, `white-space: pre-line`, `text-wrap: pretty`, `margin:0`.
- **Streaming caret**: an inline `<span>` after the text — `2px` wide, `1.05em` tall, `vertical-align:-2px`, `margin-left:2px`, background `--qa-accent`, animation `qa-blink 1s steps(1) infinite`.

**Body — structured rows.** Column of rows. Each row: `flex; gap:s4; padding:s3 0`; every row except the first has `border-top: 1px solid var(--qa-glass-border)`.
- **Label** (left): mono, 10px, `0.16em`, uppercase, color `--qa-ink-dim`, `width:96px; flex:none; padding-top:3px`.
- **Value** (right, fills): style varies by row — a plain value is serif 16px `--qa-ink`; a number (e.g. DC) is mono 20px (`--qa-text-lg`) `--qa-ink`; a consequence line ("On a fail…") is serif *italic* 16px `--qa-ink-dim`.

**Body — Tweak textarea.** `width:100%; min-height:148px; resize:vertical`. Background `var(--qa-glass-solid)`, border `1px solid var(--qa-accent-line)`, `border-radius: var(--qa-radius)`, padding `s3`, serif 16px line-height 1.55 `--qa-ink`, `outline:none`, and a focus ring baked in: `box-shadow: 0 0 0 3px var(--qa-accent-soft)`. On enter Tweak mode, **autofocus** and place the caret at the end of the text. `aria-label="Edit the suggestion"`.

**Body — Fallback.** A prompt `<p>` (serif 16px, line-height 1.55, `--qa-ink-dim`, `margin:0 0 s4`), then a row of option tiles: `flex; gap:s2`, each tile `flex:1; text-align:center; padding:s3; border-radius:var(--qa-radius)`. The **recommended** tile uses `background:var(--qa-accent-soft); border:1px solid var(--qa-accent-line)`; the others `background:var(--qa-chip); border:1px solid var(--qa-glass-border)`. Tile name serif 12px `--qa-ink-dim`; tile value mono 20px `--qa-ink`.

**Body — Resolved.** `flex; align-items:center; gap:s3`. A `8×8` round status dot (color per outcome: `--qa-success` for accepted/tweaked, `--qa-ink-faint` for rejected), a serif 16px `--qa-ink-dim` outcome line, and an **Undo** button pushed right (`margin-left:auto`): transparent, mono 10px `0.16em` uppercase `--qa-ink-faint` → `--qa-ink` on hover.

**Footer buttons** — all `height:40px`, `display:grid; place-items:center`, serif `--qa-font-body` 16px weight 500, `border-radius: var(--qa-radius)`, cursor pointer.
- **Primary** (Accept / Save changes / the recommended Fallback option): `padding:0 s5`, background `--qa-accent`, color `--qa-accent-ink`, no border. Hover `box-shadow: 0 8px 24px -8px var(--qa-accent-glow)`; active `transform: translateY(1px)`.
- **Tweak** (draft, text only): `padding:0 s4`, transparent, color `--qa-ink`, border `1px solid var(--qa-glass-border)`. Hover `border-color: var(--qa-ink-faint)`.
- **Spacer**: `flex:1; min-width:s6` between the left group and Reject.
- **Reject / Dismiss**: `padding:0 s4`, transparent, color `--qa-ink-dim`, border `1px solid transparent`. Hover `color: var(--qa-danger); background: var(--qa-danger-soft)`. Destructive-but-quiet — reject is always available and never shouty.
- **Cancel** (tweak mode): `padding:0 s4`, transparent, color `--qa-ink-dim`, border `1px solid var(--qa-glass-border)`. Hover `border-color: var(--qa-ink-faint)`.

## Interactions & Behavior
- **Accept** → `onAccept()`; card goes to Resolved with outcome `accepted`.
- **Tweak** → enter Tweak mode (textarea seeded with the current draft text, caret at end).
- **Save changes** → `onSaveTweak(text)`; Resolved with outcome `tweaked`.
- **Cancel** (tweak) → back to Draft, textarea edits discarded.
- **Reject / Dismiss** → `onReject()`; Resolved with outcome `rejected`. Scene untouched.
- **Fallback → Use \<option\>** → `onAccept(option)`; Resolved `accepted`. **Dismiss** → `onReject()`.
- **Undo** (resolved) → `onUndo()`; return to Draft.
- **Streaming**: no buttons; caret blinks (`qa-blink`, 1s steps). When the stream completes, host switches `state` to `draft`.
- **Entrance**: `qa-card-in` on mount (220ms, ease-out). **Reduced motion**: with `data-qa-rm="on"` (or `prefers-reduced-motion`) all animations/transitions off — including the streaming caret should stop blinking.
- Footer is present **only** in Draft, Tweak, and Fallback. Streaming and Resolved have none.
- The **Tweak** button appears **only** on a `text` draft — never on `structured`.

## State Management
- `state: "streaming" | "draft" | "tweak" | "fallback" | "resolved"` — the card's mode.
- `kind: "text" | "structured"` — which body shape a draft renders (also decides whether Tweak is offered).
- `text: string` — the prose body (draft/streaming/tweak seed).
- `rows: StructuredRow[]` — the structured ruling body.
- `tweakText: string` — the in-progress edit; committed on Save, discarded on Cancel.
- `outcome: "accepted" | "tweaked" | "rejected"` — set on entering Resolved; drives the dot color and outcome line.
- Callbacks: `onAccept`, `onTweak`, `onSaveTweak`, `onCancelTweak`, `onReject`, `onUndo`.
- No data fetching in the component itself — the host owns the model call and flips `streaming → draft` (or `→ fallback` on error).

## Design Tokens (ghost theme — the theme this card ships with)
Bind by name; values shown for reference.

**Ink**: `--qa-ink #E6DCC4` · `--qa-ink-dim rgba(230,220,196,.62)` · `--qa-ink-faint rgba(230,220,196,.34)`
**Glass**: `--qa-glass rgba(19,16,9,.55)` · `--qa-glass-solid rgba(28,24,15,.94)` · `--qa-glass-border rgba(230,220,196,.14)` · `--qa-glass-blur 14px` · `--qa-chip rgba(230,220,196,.08)`
**Accent (ember)**: `--qa-accent #C05B41` · `--qa-accent-ink #FBEEE6` · `--qa-accent-soft rgba(192,91,65,.22)` · `--qa-accent-line rgba(192,91,65,.55)` · `--qa-accent-glow rgba(192,91,65,.45)`
**Status**: `--qa-danger #C8453A` · `--qa-danger-soft rgba(200,69,58,.20)` · `--qa-success #6F9463` · `--qa-success-soft rgba(111,148,99,.20)`
**Spacing** (4pt): `--qa-s1 4` · `s2 8` · `s3 12` · `s4 16` · `s5 24` · `s6 32` · `s7 48` · `s8 64`
**Radii**: `--qa-radius-sm 3` · `--qa-radius 6` · `--qa-radius-lg 10` · `--qa-radius-round 999` · `--qa-hairline 1px`
**Type**: `--qa-font-display 'IM Fell English', Georgia, serif` · `--qa-font-body 'EB Garamond', Georgia, serif` · `--qa-font-mono 'IBM Plex Mono', ui-monospace, monospace` · `--qa-tracking-caps .16em`
Type scale: whisper 10 · label 12 · body 16 · lg 20 · title 28 · display 40
**Motion**: `--qa-dur-fast 120ms` · `--qa-dur 220ms` · `--qa-dur-slow 420ms` · `--qa-ease cubic-bezier(.2,.7,.2,1)` · `--qa-ease-out cubic-bezier(.16,1,.3,1)`
**Elevation**: `--qa-shadow-pop 0 30px 70px -22px rgba(0,0,0,.8)` (the card's shadow)

The full token contract (all three glass themes) lives in `Questra Tokens.dc.html` in this bundle — copy the `[data-qa-theme]` / `[data-qa-theme="ghost"]` blocks into `theme/tokens.css`.

### New tokens required
**None.** The card lives entirely inside the existing `--qa-*` token set — this is the same contract the InfoPanel and Player View use.

## Fonts
Three Google Fonts, by role — **prose is serif, data is mono, always**:
- IM Fell English (display/titles — not used in this card's body, kept for parity)
- EB Garamond (all prose: body text, buttons, outcome lines)
- IBM Plex Mono (eyebrow, source tag, labels, all numbers)

Load once:
```css
@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
```

## Reference content (in the prototype)
The prototype's top-left harness switches **state** (Draft / Tweak / Streaming / Fallback / Resolved) and **draft kind** (text / structured) — it is demo scaffolding, **not** part of the primitive; do not port it. The sample content is one scene:
- **Text draft**: a two-paragraph narration beat ("The rope bridge lurches…") ending in a call for a Dexterity (Acrobatics) check.
- **Structured ruling**: `Check = Dexterity (Acrobatics)` · `DC = 14` · `On a fail = You slip; you're knocked prone at the bridge's edge.`
- **Fallback ladder**: Easy 10 · **Medium 14** (recommended) · Hard 18.

## Files
- `Questra AcceptTweakRejectCard.dc.html` — the prototype (open in a browser). Includes the demo harness — do not port it.
- `Questra Tokens.dc.html` — the full `--qa-*` token contract for all three glass themes.
- `storybook/` — a ready-to-run React + TypeScript implementation (`AcceptTweakRejectCard.tsx`), stories for every state (`AcceptTweakRejectCard.stories.tsx`), and the token stylesheet (`tokens.css`). See `storybook/README.md`.

> These `.dc.html` files are self-contained design references. Implement the card in your app's framework against the tokens; ignore the prototype's own runtime.
