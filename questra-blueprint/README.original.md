# Questra Design System

The design system for **Questra** — a browser-based app that lets five friends who have
never played a tabletop role-playing game finish a real session together, remotely, on the
night they decide to try. Not a toolbox — *a session, start to finish.* Desktop web, no install.

This system was extracted from the shipped V1 prototypes (the `*.dc.html` files at the project
root). It is the warm, candle-lit, parchment-and-ember world those screens live in, codified so
new surfaces stay in the same key.

> **Content is CC-licensed SRD 5.2 only.** Never use game-publisher trademarks or reserved IP in
> content, product, or marketing. The prototypes carry an attribution line; keep it.

---

## Sources

- **Prototypes (interactive source of truth)** — project root: `DM View v2.dc.html`,
  `Player View v2.dc.html`, `Hub.dc.html`, `Lobby.dc.html`, `Session Setup.dc.html`,
  `Session Builder.dc.html`, `Campaign Creator - Folio.dc.html`, `Creation C - Chronicle.dc.html`,
  `Level-Up.dc.html`, `The Chronicle.dc.html`, `Landing Page - Ember (original).dc.html`.
- **Product principles** — `CLAUDE.md` (the five laws; non-goals; definition of done).
- Referenced but not present in this project: a `docs/` spec folder (e.g. `docs/08` on colour,
  `docs/09-onboarding.md`). Read it if you have it; nothing here depends on it.

---

## Content fundamentals

The voice is a **warm, literary game-master** — plain-spoken about rules, lyrical about the
fiction. It never sounds like enterprise software and never like a rulebook.

- **Two registers, held apart by typeface.** Fiction and scene names are *evocative* and set in
  serif ("The Ruined Steading", *"Everyone watches the die land. No one speaks."*). Mechanics and
  labels are *terse* and set in mono (`PARTY · 4`, `ROUND 3`, `DC 13`, `AC 14`).
- **Second person, present tense, at the table.** "Wren — you're up." "The lookout's eyes are on
  you now." The app talks *to* the player as if it were the DM's own narration.
- **Explains by doing, in place.** Every control carries a one-line sub-explanation instead of a
  tooltip: "Undo & event log — *Every action is reversible*"; "I'm stuck" opens *"You could try…"*.
  No tutorials, no walls of text (Law 5).
- **Casing.** Titles & names: Title Case in serif. Labels, tags, eyebrows: UPPERCASE in mono with
  wide tracking. Body & fiction: sentence case, serif; flavour is italic.
- **Punctuation flavour.** Middot separators (`OUTSKIRTS · DUSK`, `Rogue · Lv 3`), em-dashes for
  asides, `›` chevrons for "go deeper" affordances.
- **Emoji: almost never.** The one sanctioned place is the table **reaction** burst (a fast,
  wordless 👏🔥😮 during someone's turn — Law 4). Everywhere else, use the mono/serif type and
  unicode glyphs. No emoji in labels, menus, or body copy.

Sample copy, verbatim from the prototypes:

> *"the granary burned behind you, and something in the cellar answered Torvald by name."*
> `THE CHRONICLER DRAFTS IT WITH YOU` · `NEW PLAYERS WELCOME` · "Return to the story"

---

## Visual foundations

**The feeling:** a dim table lit by one candle. A dark warm ground, a shared map at the centre,
and translucent glass panels floating over it that you can read the scene through. Nothing is pure
black or pure white; nothing is loud unless it *means* something.

- **Colour.** Structure is monochrome: warm near-blacks (`#0E0B06 → #221A0E`) and vellum ink
  (`#E6DCC4`). The single decorative-feeling hue, **ember** (`#C05B41`), is actually semantic — it
  marks the active turn, danger, and candlelight. All other hues are strictly meaningful: `danger`
  (bloodied), `heal` (rest/teal-green), `arcane` (spell/violet), `steel` (martial/slate), `gold`
  (rare/candle). Character classes get fixed identity colours. **Rule: no colour without meaning**
  — a monochrome screen with one ember accent is the target, not the exception.
- **Type.** Three roles, extreme scale contrast. **IM Fell English** (display serif) for titles,
  character & scene names. **EB Garamond** (body serif; *italic* for fiction/flavour) for prose and
  inputs. **IBM Plex Mono** for labels, stats and tabular numbers — always small, UPPERCASE, wide
  tracked (1.6–2.5px). The drama comes from a whisper-mono label sitting under a big serif name or
  a big tabular number.
- **Material — "glass."** Panels are translucent dark fills (`rgba(19,16,9,.55)` floating,
  `.82` raised) with a **1px vellum hairline** and a **backdrop-blur** (14/20/26px). The map shows
  through. Three opt-in glass themes exist: `ghost` (default warm), `slate` (cool), `ivory` (light).
- **Borders & shadows.** Hairlines, not shadows — `rgba(230,220,196,.15)`. Shadows appear only
  where glass genuinely lifts off (menus, the death-save takeover) and are deep and soft
  (`0 18px 46px rgba(0,0,0,.55)`). The ember CTA carries a warm glow, not a drop shadow.
- **Corners.** Small and restrained: chips 2–3px, panels/buttons 4–5px, modals/menus 6px. Never
  pill-round except circular tokens, avatars, and reaction buttons.
- **Spacing.** Generous negative space *is* the product; the HUD is sparse. Standard HUD gap 8px,
  panel padding 14px, screen-edge inset 16px.
- **Backgrounds & atmosphere.** Every in-session screen composes the same stack over the map:
  a parchment **grain** (faint horizontal repeating lines), a radial **vignette** into the corners,
  and slow drifting **ink motes / embers** rising up the screen. The Lobby adds a low warm hearth
  glow. Imagery is warm, dark, painterly — dropped into `image-slot` placeholders (battle maps,
  portraits, scene art), never generated.
- **Motion.** Precise and damped — *things arrive, they don't spring.* Ease
  `cubic-bezier(0.2,0,0,1)`, 160/200/240ms. Signature loops: `qa-pulse` (active-turn token),
  `qa-candle` (flame flicker), `qa-mote` (rising embers), `qa-in` (panel fade-up). The exception is
  **"the moments"** (a death save, a fall) — they slow down, darken the room, and break the rules
  for weight.
- **Hover / press.** Hover = a border warming to ember (`rgba(192,91,65,.6)`), a slight lift
  (`translateY(-3px)`) or a chip-fill brighten; never a colour flood. Press = a quick scale-dip on
  round controls. Illegal actions **dim to ~0.55 and explain why in italic** — they are shown, not
  hidden (Law 5).

See the **Design System tab** for live specimen cards (Colors, Type, Spacing, Brand, Components,
Screens), each linking the real `styles.css`.

---

## Iconography

Questra has **no icon library and no logo mark.** Wherever a wordmark would go, the product name
is set in IM Fell English serif — do not invent or draw a logo.

- Icons are **single unicode glyphs**, chosen for warmth and legibility on dark glass, treated as
  type (they inherit vellum/ember colour and sit in a fixed-width column so labels align):
  `☰` menu · `⚙` settings · `❧` journal · `↺` undo · `🔗` invite · `💾` save · `⏻` end ·
  `‹ ›` navigate · `↵` send · `⏸` pause · `❔` help · `☠` death · `▸ ❚❚` play/pause.
- A few functional emoji-glyphs appear as **DM/system controls** (`🔊 🔇 🛟`) and as the sanctioned
  **table reactions** (`👏 🔥 😂 😮 ✨ ❤️`). These are the only emoji in the product.
- No SVG icon sets, no icon fonts, no PNG icons were found in the prototypes — so none are shipped
  here. If a future surface needs a true icon set, add a thin stroke set that matches the hairline
  weight and flag the addition; do not mix in a heavy filled set.

There are **no raster assets** in this system (`assets/` is empty): the prototypes fill all imagery
via drag-and-drop `image-slot` placeholders rather than bundled art.

---

## Index / manifest

**Foundations**
- `styles.css` — the single entry point consumers link. `@import`s everything below.
- `tokens/fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `effects.css` — all
  `--qa-*` custom properties (base + semantic), the three glass themes, and the signature keyframes.
- `guidelines/*.html` — foundation specimen cards (Colors, Type, Spacing, Brand).

**Components** (`components/`, grouped)
- `core/` — `Button` (primary · hex · secondary · ghost), `Label`, `Panel`, `Chip`.
- `hud/` — `HPBar`, `StatBlock`, `Avatar`, `MapToken`, `AbilityCard`, `MenuItem`, `ReactionButton`.
- Each is `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`; per-group preview card `*.card.html`.

**UI kits** (`ui_kits/`)
- `questra-session/` — the in-session **Player HUD** recreation (`index.html`) + README pointing at
  the interactive `.dc.html` prototypes.

**Skill**
- `SKILL.md` — makes this downloadable as an Agent Skill.

### Intentional additions
The prototypes don't ship a formal component library, so the `core` + `hud` inventory above was
enumerated from primitives that recur across ≥3 screens (HP bars, stat cells, tokens, ability tiles,
menu rows, chips, reaction buttons). Nothing was invented beyond what the screens already draw.

---

*Not affiliated with any game publisher. Rules content under Creative Commons (SRD 5.2).*
