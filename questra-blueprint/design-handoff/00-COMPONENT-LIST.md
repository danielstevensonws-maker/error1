# Questra — Design Hand-off: Component & Screen List

**Purpose.** This is the complete inventory of every UI piece the blueprint calls for, so
you (or Claude Design) can design each one **from scratch**. It is not code and points at no
built components — it's a design brief. For each item: what it is, where it lives, what it's
for, the concrete design details the corpus specifies, its source-of-truth doc, and the
milestone it lands in.

Sourced entirely from the design corpus (`specs/`, `briefs/`, `design-handoff/detail-docs/storybook/`,
`design-handoff/detail-docs/design-requests/`, `MASTER-PLAN.md`). Every entry cites its source.

---

## How to read this

Three categories, in build order:

- **A — Primitives.** Reusable components (Playbook §3). Build these *before* the screens
  that compose them — they repeat by design.
- **B — Screens.** Whole surfaces a user navigates to.
- **C — Screen sub-components.** The pieces inside a screen that aren't reusable primitives.

**Detail status** tells you how much guidance already exists:
- **`SPECCED`** — a detailed per-component doc exists (in `design-handoff/detail-docs/storybook/` or a design
  request). Rich starting material; design *to* it.
- **`Named`** — the corpus names it and gives its intent + some detail, but there's no
  dedicated doc. Design from the brief/spec cited.

**Two rules that bind every play surface** (design them in from the start, don't bolt on):
1. **Greying** — any unavailable action stays *visible* at ~50% opacity and explains its
   refusal in plain English on hover. Never hide, never silently disable.
2. **Every number is tappable** — any number or condition carries a `?` that opens an info
   sheet showing where the value comes from.

**Plain-language ban list** (checked in CI): it's a **scene**, never a "beat"; a **member /
portrait**, never a "node". Prose is set in a serif; data/numbers in mono.

**Milestone legend** (from `MASTER-PLAN.md`): M2 slice · M3 play screens + primitives ·
M4 prep (wizard/planner/campaign) · M5 homebrew/community · M6 voice/audio · M7 onboarding.

---

# A · Primitives (Playbook §3 — build first)

The Playbook §3 table names ~11 canonical reusable primitives. Most now have a detailed
storybook doc; two are pattern-only. **Design these first** — the screens are compositions
of them.

### A1 · Sequence + pool + review shell
- **Where:** Campaign Wrapper, Session Planner, scene internals — the "one pattern, three
  floors" shape as one generic component.
- **For:** The abstract container the whole app is built on: a *sequence* + a shared *pool*
  + a *review* layer. Campaign level = sessions-in-sequence + campaign pool + "story so far";
  session level = scenes-in-sequence + session kit + recap.
- **Detail:** This is realized *through* its constituent primitives — the ordering piece is
  A6 (CardSequencer), the pool picker is A5 (PullFromCampaignPicker), the review surfaces are
  auto-drafted (story-so-far, recap). Design the *container rhythm* that makes all three
  floors feel like the same tool.
- **Source:** `plan/questra-build-playbook.md` §3; `specs/campaign-wrapper-design-spec.md`
  §1/§11; `specs/session-planner-design-spec.md` §1 · **Detail:** Named (pattern) · **M3–M4**

### A2 · InfoPanel — the 3-layer "?" ⭐ *the reference primitive*
- **Where:** Global / every screen — Wizard, Compendium, Planner, Level-up, Homebrew builder,
  Community library, and the target of every tap-`?` on the Player View.
- **For:** One slide-over that renders *any* entity (class/species/feat/spell/stat/condition/
  homebrew) in three layers, with **Choose** inside — so reading, understanding, and deciding
  are one motion.
- **Detail:** Right-side slide-over, ~`max-w-md`, `role="dialog"` + `aria-modal`. **Three
  layers:** (1) plain sentence, always visible, large type; (2) collapsible *"Where the
  numbers come from"* — derivation as label + mono value, with optional `parts` breakdowns
  (`10 hit die (max) + 2 CON mod`); (3) collapsible *"Full rules text"*, `pre-wrap`.
  Beginners live on L1, veterans open L3. **Choose** in a sticky footer; omit it for
  pure-reference contexts (compendium). Homebrew renders **identically** + a quiet tinted
  "Homebrew" badge — a tint, never a warning ("custom content never looks second-class").
  Escape/scrim close; `q-slide-in` animation, off under reduced-motion.
- **Source:** `design-handoff/detail-docs/storybook/InfoPanel.md`; `specs/character-creation-wizard-spec.md` §4 ·
  **Detail:** SPECCED · **M3** (compendium), consumers M3–M5

### A3 · AcceptTweakRejectCard — the universal AI-output card
- **Where:** Global / **every AI touchpoint** — DM rulings/NPC lines/read-aloud, premise &
  bond drafts, scene sequences & recaps, backstory & portrait prompts, level-up nudges.
- **For:** The one grammar for all AI output. "Suggests, never commits" — enforced
  structurally, not by policy.
- **Detail:** Footer `[Accept] [Tweak] ····· [Reject]` — Reject shoved to the far right by a
  flex spacer so the destructive action is never adjacent to the primary one. `draft` is
  content-agnostic (plain text → prewrap body; rich → a schema view like a ruling's check/DC
  grid or a bond's two portraits). **Tweak** swaps the body for a seeded textarea, footer →
  Save/Cancel (omit Tweak for non-editable drafts). **Streaming:** blinking caret +
  `aria-busy`, footer *suppressed* (can't accept a still-arriving draft), eyebrow
  "Suggestion". **Non-AI fallback:** eyebrow "Fallback", Tweak hidden, Accept/Reject
  relabelled (e.g. "Use Medium (14)" / "Dismiss"), body offers the difficulty ladder
  (Easy 10 · Medium 14 · Hard 18). A quiet 6px accent provenance dot — never a warning icon.
  Every terminal action emits telemetry (accepted/tweaked/rejected) — **accept rate *is* the
  prompt-quality metric.**
- **Source:** `design-handoff/detail-docs/storybook/AcceptTweakRejectCard.md`; `specs/questra-ai-orchestration-spec.md`
  §4 · **Detail:** SPECCED · **M2** (one path) → pervasive M3–M5

### A4 · PublicSecretField — the public/secret split input
- **Where:** DM authoring only — Session Planner (scene notes, cast, secrets, locations),
  Campaign Wrapper (bonds, cast, locations). **Never on the Player View.**
- **For:** Make the public/secret split a *single* field so the DM writes both halves in one
  motion and their relationship stays visible.
- **Detail:** Two bordered blocks, 3px left accent — faint ink (public) / secret tint
  (secret) — with badges "Public" / "Secret · DM only" + lock mark, and placeholders that
  state the audience ("Everyone at the table sees this" / "Only you (the DM) see this").
  `multiline` toggles both halves input↔textarea. **This is authoring UI, not the security
  filter** — secrets are filtered server-side; the tint is a reminder to the DM, never a
  protection.
- **Source:** `design-handoff/detail-docs/storybook/PublicSecretField.md` · **Detail:** SPECCED · **M4**

### A5 · PullFromCampaignPicker — the reference picker
- **Where:** Session Planner (cast→scene, locations, rewards, recurring maps), Campaign
  Wrapper (campaign refs into a session).
- **For:** *Reference, don't duplicate.* Point at something that already exists so there's
  one source of truth — edit the NPC once, every scene that references it updates.
- **Detail:** Items are a thin `{id, name, kind, hint?}` view-model via a caller-side
  adapter. **Single vs multi** select. Local search over name/kind/hint. **Two distinct
  empty states:** "No matches" (a query returned nothing) vs a caller-supplied label for a
  *fresh campaign* ("No rewards defined yet"). `role="listbox"`; selected rows get an 8%
  accent wash.
- **Source:** `design-handoff/detail-docs/storybook/PullFromCampaignPicker.md`;
  `specs/session-planner-design-spec.md` · **Detail:** SPECCED · **M4**

### A6 · CardSequencer — the reorderable card list
- **Where:** Session Planner (scenes in a session), Campaign Wrapper (sessions in a campaign).
- **For:** Owns *order and nothing else* — frames, numbers, and reports the new order; the
  caller owns what a card looks like.
- **Detail:** **Keyboard-first** — every item has explicit Move-up / Move-down buttons as the
  *primary* mechanism (first item's Up / last item's Down disabled); native drag layered on
  top for mice (dragged card → 50% opacity), never the only way. Plain-language
  `aria-live` announcements ("Moved scene to position 3 of 4") with the noun singularised.
  Optional Remove (✕ in danger colour). Enforces plain language — "scenes"/"sessions", never
  "beats"/"nodes". Row = drag handle (⠿ + 1-based number) → caller content → controls.
- **Source:** `design-handoff/detail-docs/storybook/CardSequencer.md` · **Detail:** SPECCED · **M4**

### A7 · MapCanvas — the edit/play/table renderer ⭐ *widest reach*
- **Where:** Map Editor (`edit`), DM Play View (`play`), Table View (`table`); also the
  ground beneath the Player-View HUD glass.
- **For:** One renderer, three screens — draws a `Room` (grid, cell tags, fog, assets,
  tokens) for any audience with no second implementation. The `mode` prop selects the screen.
- **Detail — layer order:** (1) terrain tint [real terrain image is a later slice]; (2) grid
  + cell states, precedence *fogged → in-AoE → difficult terrain → transparent*; (3) assets
  (dashed rects sized by footprint, ▪ blocking / ▫ not); (4) tokens (circles, two-letter
  initials; staged = 55% opacity + faint border); (5) a "Table view" badge in `table` only.
  Range-ring numbers render from a `measureFrom` cell (chrome, gated **off** in table mode);
  AoE `{shape, anchor}` produces a highlight set. **Fog is a server guarantee, not a render
  trick** — the caller passes an already-filtered room, so unrevealed cells and hidden tokens
  never reach the client. `edit` sees the whole room; `play`/`table` dim unrevealed cells.
  Default cell 40px (backdrop uses 96px).
- **Edit-mode tooling to design** (see C-Map): asset palette, inspector, staged-token tray,
  fog brush, cell-tag painting. **Play-mode:** spotlight, fog-reveal quick-tools, template
  placement.
- **Source:** `design-handoff/detail-docs/storybook/MapCanvas.md`; `briefs/brief-06-map-canvas.md` §3/§4/§5 ·
  **Detail:** SPECCED · **M2** (slice); edit mode reused M4

### A8 · PromptHolderCard — the interrupt card ⭐ *one card, six ways*
- **Where:** Overlay on both play screens — Player View (a PC's reaction, that player only),
  DM View (monster/boss/lair, or the DM answering for anyone).
- **For:** One interrupt surface for six mechanics — opportunity attacks, reaction features,
  readied actions, legendary actions, legendary resistance, lair actions — plus two DM
  decision kinds (`ruling`, `rest`).
- **Detail:** One modal-priority prompt per viewer. **The server owns the lifecycle** — the
  ~60s countdown here is a *mirror* (ticks from a captured baseline, throttle-safe), not the
  authority; on zero it declines once. **Urgency** at ≤10s left: border, countdown bar, and
  readout all switch to danger colour; the bar is a width% div with a smooth transition.
  With `options`: each is a Take-styled button with a detail suffix ("Reaction", "2 actions",
  "DC 13 or restrained"), a spacer, then Decline. Without: a bare Take / Decline pair.
  `asDm` adds an italic *"Answering for {holder}."* note. `role="alertdialog"`.
- **Source:** `design-handoff/detail-docs/storybook/PromptHolderCard.md`; `briefs/brief-08-boss-prompts.md` §1–§2;
  In-Play §2.3 · **Detail:** SPECCED · **M3**

### A9 · PresetsAboveFreeForm — chips over a free-text field
- **Where:** Wizard steps, Campaign premise, Session Planner (scene creation, tags),
  Onboarding Floor 1.
- **For:** *Presets teach the beginner without caging the veteran.* Tap a chip to learn what
  a good answer looks like, or ignore them and type your own. Presets are a starting point,
  never a fence.
- **Detail:** Two behaviours on one component. **`pick` (single):** choosing a preset
  *replaces* the free-form text; re-tapping the active chip clears it; editing the text after
  picking naturally deselects all chips (you've gone your own way). **`tags` (multi):**
  presets are toggles; free-form entries become removable ✕ chips (Enter/blur adds; dupes
  rejected). Placeholders state the escape hatch ("Or write your own…" / "Add your own —
  press Enter"). Chips carry `aria-pressed`.
- **Source:** `design-handoff/detail-docs/storybook/PresetsAboveFreeForm.md`;
  `specs/character-creation-wizard-spec.md` §2; `specs/questra-onboarding-spec.md` Floor 1 ·
  **Detail:** SPECCED · **M4** (wizard), M7 (onboarding)

### A10 · Chip/token prompt assembler — the four-layer image prompt
- **Where:** Character portraits (Wizard Step 4), NPC art (Planner cast), map assets.
- **For:** Assemble an AI-image prompt from four ordered layers so users get on-model results
  without steering off-style.
- **Detail — four layers, in order:** (1) a **locked base block** (never changes); (2)
  **preset tokens** — each wizard chip maps to one pre-approved token phrase (a controlled
  vocabulary); (3) **free-form** — the user's own words; (4) a **locked frame/style block**
  (never changes). Locked layers keep everything on-model; presets are the controlled
  vocabulary; free-form adds personality without touching the scaffold. One or two owned seed
  images attach to every generation; a uniform post-process colour grade + card frame goes
  over every output.
- **Source:** `specs/character-portrait-style-prompt-system.md`; Playbook §3;
  `specs/character-creation-wizard-spec.md` §8 · **Detail:** Named · **M2** min → **M4** full

### A11 · DiceTray — the 3D dice + tray ⭐ *the most-watched object*
- **Where:** Player View (roll surface) and the shared Table Display — "the whole table
  watches."
- **For:** The signature moment. 3D dice tumble and land on a **server-decided** result — a
  reveal, not a lottery (ADR-0008).
- **Detail:** **Seven dice** — d4, d6, d8, d10, d100 (percentile pair), d12, d20 (the d20
  carries the most weight; one visual family). Bounded, predictable settle (~840ms
  placeholder); mid-tumble faces must **not** telegraph the outcome; the die lands
  deliberately on the specified face; defined recovery for a cocked/off-tray die. **Material
  in candlelight** — bone/horn/ivory/stone/smoked-glass/metal; a natural 20 and a natural 1
  look *materially* different (glow/ember vs cold cast). **Tray** ~260×132, dashed hairline
  border, sits on the map without hiding it. **Moments to design:** idle · throwing ·
  settled (the mattering die highlighted) · advantage/disadvantage (two d20s, the dropped one
  reads as dropped without clutter) · critical (nat 20) · fumble (nat 1) · many dice (2d6+3,
  8d6 fireball) · someone else's roll · a secret DM roll (the table sees *that* a roll
  happened, not the result). **Reduce-motion** must still convey the outcome equivalently.
- **Source:** `design-handoff/detail-docs/design-requests/dice-tray-3d.md`; ADR-0008 · **Detail:** SPECCED (full
  design request; per-component catalogue doc still pending) · **M3**

### A12 · TableBackdrop — *story infrastructure, NOT a product component*
- **Where:** Nowhere in the app. It's a Storybook stage decorator.
- **For:** Reproduces the Player View's real candlelit ground so translucent glass panels are
  judged over the map, never on a flat canvas (which makes glass read as washed-out — a
  false negative).
- **Note for the designer:** *Do not design this as product UI.* It exists only so the HUD
  can be reviewed in its real lighting. Listed here so it isn't mistaken for a shippable
  surface.
- **Source:** `design-handoff/detail-docs/storybook/TableBackdrop.md` · **Detail:** SPECCED (infra only)

---

# B · Screens

## App shell (Brief 14)

| # | Screen | Intent & key detail | Source | Detail | M |
|---|---|---|---|---|---|
| B1 | **Landing** (public) | The pitch + sign-in / create-account. Marketing copy owner-supplied; ships with placeholder. Attribution/legal linked in footer. | brief-14 §3 | Named | M3 min |
| B2 | **Home** (signed in) | "Your campaigns" (DM'd + playing-in), "Your characters", a resume-last-session card, onboarding entry. For `floor0` accounts, **Home *is* onboarding Floor 0** — a near-empty "Let's make your first scene"; the full home appears as floors clear or via veteran skip. | brief-14 §3; onboarding Floor 0 | Named | M3 min → M4 full |
| B3 | **Join flow** (`/join/:code`) | ⭐ The player's **entire front door** — polish priority. Shows campaign name + premise (*public half only*), a sign-in/signup interstitial if logged out, then seat-or-create → Character Wizard. | brief-14 §2–3, §6 | Named | M3 |
| B4 | **Nav shell + campaign switcher** | Persistent top-level nav (home / current campaign / character hub / settings) + a campaign-scoped subnav (campaign / sessions / party / cast). Plain-language, ban-list-checked. | brief-14 §3 | Named | M3 min → M4 full |
| B5 | **Settings** | Account (email / password / deletion) + per-campaign toggles (physical-dice mode, proactive co-pilot, XP mode, reduce-motion) + **Export / download this campaign** — a one-tap download of the campaign export file (JSON + media manifest; brief-11 §6), delivering architecture §6's "it's my campaign, I can keep it." DM-scoped; owner-consented character data only. | brief-14 §3; brief-11 §6; architecture §6 | Named | M4 |
| B6 | **Attribution / legal** | CC-BY / SRD attribution, AI-art policy, UGC terms, privacy. Linked from settings + landing footer. **Ships with the first shell**, not at launch. | brief-14 §3/§6; ADR-0010 | Named | M3/M4 |
| B7 | **Notifications** (bell + list) | In-app only (v1). Kinds: invite accepted, homebrew approval requested/granted, level-up offered, moderation outcome. | brief-14 §5 | Named | M4 |
| B8 | **Shell empty / loading / error states** | Empty everywhere (no campaigns → ramp or create/join; no characters → wizard CTA); loading skeletons; a plain-language error boundary. | brief-14 §4 | Named | M3/M4 |

## Play screens

| # | Screen | Intent & key detail | Source | Detail | M |
|---|---|---|---|---|---|
| B9 | **Player View** ⭐ | The single most-looked-at surface. **Fixed 1728×1080 stage**, letterboxed, uniform-scaled. The **map is the full-bleed ground**; everything else is translucent blurred glass floating over it. Regions: scene header (top-center), identity (left, ~88px), vitals (left, below identity), action bar (bottom-center), party rail (collapsible), log+chat (right, ~344×516), controls (top-right 36px glass squares), reactions (emoji burst). **Three HUD themes:** ghost (warm dark, default) · slate (cool dark) · ivory (light) — each sets fill/border/ink/blur/chip; one accent (#C05B41). **Type:** IM Fell English (narration/names), EB Garamond (body/UI), IBM Plex Mono (all numbers) — "prose is a serif, data is mono." **States to design:** your turn / waiting / bloodied / conditions / **dying (the flip)** / compose / dice result / info sheet / character folio / menu / first contact. Both binding rules visible: greying + tappable numbers. | `design-handoff/detail-docs/design-requests/player-view-screen.md`; `design-handoff/detail-docs/storybook/PlayerHub.md`; brief-10 §2; In-Play Part 1 | SPECCED | M3 |
| B10 | **DM Play View** | The power-user surface: battle map + tools to run and narrate. Tree: MapCanvas(`play`) · TurnHeader · CombatantList · AssistantPanel · WhatOnlyYouKnow · ImmersionConsole · PromptDock. First-contact: console + WhatOnlyYouKnow collapsed; the Assistant leads with a single RulingCard. | brief-10 §3; In-Play Part 2 | Named | M3 |
| B11 | **Table Display** (shared/spectator) | The whole-table shared screen. Receives an already-filtered room + a "Table view" badge; spectator scope (no measurement chrome). Renders the dice + screen effects. | `design-handoff/detail-docs/storybook/MapCanvas.md`; brief-10 §4 | Named | M3 |

## Prep screens

| # | Screen | Intent & key detail | Source | Detail | M |
|---|---|---|---|---|---|
| B12 | **Character Creation Wizard** ⭐ | The anchor feature. **Split screen: left = the flow, right = a live character panel** (silhouette + stat/gear slots). The silhouette is a *cheap* preset/vector swap that updates on every choice; the single *expensive* AI portrait fires **once**, at the reveal. Four pillars: presets / free-form / the "?" info layer / living silhouette → AI reveal. Desktop-first. | `specs/character-creation-wizard-spec.md` §1–§5 | Named | M4 |
| B13 | **Session Planner** | The tool to prep + run one night. Top altitude is a scene sequencer (reorderable scene cards + an "add a scene" type palette); the session header totals time estimates. | `specs/session-planner-design-spec.md` | Named | M4 |
| B14 | **Room / Map Editor** | MapCanvas in `edit` mode + asset palette, inspector, staged-token tray, fog brush, cell-tag painting. Three-layer room (terrain / assets / triggers — v1 triggers manual). Live encounter-difficulty readout. | planner §6/§11; brief-06 §5 | Named | M4 (reuses M2 canvas) |
| B15 | **Campaign Wrapper** | The top floor — premise + party + recurring cast + overarching secrets + ordered sessions + "story so far". Auto-populated at onboarding Floor 4. | `specs/campaign-wrapper-design-spec.md` | Named | M4 |
| B16 | **Compendium browser** | Pure-reference browsing of rules data via InfoPanel (no Choose). | planner §13; `design-handoff/detail-docs/storybook/InfoPanel.md` | Named | M3 |

## Homebrew & community (M5)

| # | Screen | Intent & key detail | Source | Detail | M |
|---|---|---|---|---|---|
| B17 | **Homebrew class builder** | A "+ Create your own class" card inside Wizard Step 1 expands into a guided builder (template, not blank page): (1) concept; (2) chassis auto-scaffolded to 5e math; (3) the 20-level table (empty levels flagged); (4) features; (5) subclasses; (6) balance check; (7) publish. Collapses down for species. | `specs/character-creation-wizard-spec.md` §6 | Named | M5 |
| B18 | **Balance check** | Before saving, compares vs the 12 SRD classes on damage output at tier breakpoints (levels 1/5/11/17/20). A warning + one-tap "tone it down", **not** a hard block. Badge {verified / flagged / unchecked} + an honest-caveat line. | wizard §6.6; brief-12 §4 | Named | M5 |
| B19 | **Community library** | Gallery of published classes/species, filterable (power source, complexity, role, balance status), sortable. Each opens in the same InfoPanel. One-tap import (respects the DM-approval gate); "Fork" into the builder with lineage/attribution; trust signals (badge, ratings, "table-tested"). | wizard §7; brief-12 | Named | M5 |
| B20 | **Moderation queue** | Human review of flagged publishes (with reasons); a report button re-enters review; strikes per policy. Single moderation entry point. Pipeline: private → submitted → in_review → published / rejected (+ takedown). | brief-12 §1/§5 | Named | M5 |

## Onboarding floors (M7)

| # | Screen | Intent & key detail | Source | Detail | M |
|---|---|---|---|---|---|
| B21 | **Floor 0 — Entry** | Near-empty: "Let's make your first scene." A quiet corner escape "I've run games before → take me to the campaign." No quiz. (Is the Home screen for `floor0` accounts.) | onboarding Floor 0; brief-13 §5 | Named | M7 |
| B22 | **Floor 1 — First room** ⭐ *the magic beat* | "Describe a place." Three preset chips over a free-form field (A9). Pick/type → the map generates in house style (the payoff) → "Now put something in it" (one guided token drag). A pyramid progress motif lights up per floor. | onboarding Floor 1; brief-13 §5 | Named | M7 |
| B23 | **Floor 2 — First night** | The Session Planner UI appears for the first time — "string a few scenes into a night." | onboarding Floor 2 | Named | M7 |
| B24 | **Floor 3 — First play** | Run the night on the DM screen with a **pre-made demo party**. First-contact state; the engine auto-narrates the first attack; the first improvised action surfaces a Ruling Suggestion. | onboarding Floor 3; brief-13 §4 | Named | M7 |
| B25 | **Floor 4 — Campaign reveal** ⭐ *the reward* | The Campaign Wrapper surfaces, already populated with everything made across Floors 1–3 (a *situation*, never a plot). "Invite your real players" is its own beat; the invite link is handed over. | onboarding Floor 4; brief-13 §3 | Named | M7 |

---

# C · Screen sub-components

## C-Player · Player View (brief-10 §2 · storybook PlayerHub · PV design request)

| Component | Intent & detail | Source | Detail | M |
|---|---|---|---|---|
| **PlayerHub** | The §2 tree fully composed — holds the flip + first-contact dimming. Zero component-local game state. | storybook/PlayerHub.md | SPECCED | M3 |
| **IdentityHeader** | Portrait (AI, from the wizard) + name + class·level. ~88px tall. | brief-10 §2 | Named | M3 |
| **VitalsBar** | HP bar (+ "+N temporary" line), AC, condition chips. AC and each condition are `?` buttons → open the info sheet. A "Bloodied" chip when hp ≤ half. Dimmed to 45% when dying. | storybook/PlayerHub.md | SPECCED | M3 |
| **ActionBar** | Three fixed rows — Action / Bonus / Reaction — each rendered only if it has tiles. Each tile: name, +N to hit, damage chip, resource chip ("2 of 2"). Greying = the tooltip is the *server's* reject string + `aria-disabled` + 50% opacity. | storybook/PlayerHub.md; In-Play 1.2 | SPECCED | M3 |
| **AttackCard** | An attack tile with **rider chips** — e.g. Sneak Attack "+2d6" attaches *to* the attack, not as its own slot — plus resource tags + greying. | brief-10 §2; In-Play 1.2 | Named | M3 |
| **ComposeRollSheet** | The tap-to-roll surface. **Compose** (advantage/straight/disadvantage radiogroup + situational ± stepper + live formula preview that *never shows a total*) then **Settling** (die tumbles ~840ms, lands on the *server's* number). **It never rolls** — driven entirely by the result. The advantage picker is a *request*; the server re-derives. Verdict in plain English ("Hit — against Armor Class 15"), tone colour, a big total, chips ("Advantage", "Entered by hand"), derivation rows that sum to the total. | storybook/ComposeRollSheet.md; ADR-0008 | SPECCED | M3 |
| **ManualDiceEntryPad** | Physical-dice mode (ADR-0008; architecture §7): a per-campaign toggle where tap-to-roll opens a numeric **entry pad** instead of rolling on-screen — the player rolls real dice and types the raw die face(s); the Engine still applies every modifier and emits the *same* roll event, flagged `manual_entry`. Replaces ComposeRollSheet's **Settling** stage (Compose stays); the result surfaces through the same verdict + derivation UI, carrying the existing "Entered by hand" chip. Keypad sized for a phone (in-person tables); rejects impossible faces (e.g. >20 on a d20, 0 on any die). | ADR-0008; architecture §7; storybook/ComposeRollSheet.md | Named | M3 |
| **DeathSaveCard** | The flip. Three success pips ✓, three failure pips ☠, one big button. Disabled unless `phase==='dying'`. Headlines: Making death saves / Stable / Dead / Back on your feet. Reports the roll; the server decides. | storybook/PlayerHub.md; brief-04 | SPECCED | M3 |
| **DiceLog** | An ordered list, newest last. Tones: roll (soft ink) / narration (full ink) / system. A roll entry can carry a mono breakdown line + a right-aligned mono total. Reads like table talk. | storybook/PlayerHub.md | SPECCED | M3 |
| **SpellsAbilitiesTab** | Folio tab: slot pips per level, an upcast picker on cast, per-spell save DC / attack bonus, a single-active concentration badge. (Exercised by a caster variant.) | brief-10 §2; In-Play 1.3 | Named | M3 |
| **ConcentrationBadge** | Single-active indicator (only one at a time, enforced); a second concentration spell surfaces a confirm-drop; damage auto-prompts the CON save. | brief-10 §2/§5 | Named | M3 |
| **InventoryGrid** | Folio tab: equipped vs backpack, drag-to-equip, attunement/weight tags. RPG-hub feel over spreadsheet. | brief-10 §2; In-Play 1.4 | Named | M3 |
| **Character-sheet folio (drawer)** | A drawer with tabs — Abilities & Spells · Stats · Inventory · Equipment. Houses the two above. | PV request §4 | Named | M3 |
| **Party rail** | Left, collapsible. One card per member: portrait, name, class·level, HP bar. | PV request §1 | Named | M3 |
| **Log + chat / composer** | Right (~344×516): the **unified play log** — narration, roll results, rulings, roleplay, typed input — plus a **multipurpose composer** (declare an action / roleplay / ask the assistant). Not a separate social chat; the log *is* the chat. Messaging model (events, persistence, visibility filtering) pinned in brief-10 §4.1. | PV request §1; brief-10 §4.1 | Named | M3 |
| **Controls (glass buttons)** | Top-right, 36px glass squares: settings, menu, journal, mute. | PV request §1 | Named | M3 |
| **Reactions (emoji burst)** | 👏 🔥 😂 😮 ✨ ❤️ — float and fade near the chat. | PV request §1 | Named | M3 |
| **Menu** | Settings, safety tools, take a breather, journal, how do I play, back to lobby, leave the table. Each item's behaviour is specified in PV request §4a (safety tools = X-card / lines-&-veils, any-player-invokable). | PV request §4/§4a | Named | M3 |
| **Info sheet** | Tapping any number/condition opens: kicker, title, itemized rows, plain rule text, flavour line. (The Player-View instance of the "?" affordance / InfoPanel.) | PV request §4/§5 | Named | M3 |
| **First-contact state** | Only 2–3 action tiles seeded; tabs/inventory dimmed-until-earned; must feel like room to grow, not locked. | brief-10 §2; In-Play Part 4 | Named | M3 (props), M7 (wired) |

## C-DM · DM View (brief-10 §3 · In-Play Part 2)

| Component | Intent & detail | Source | Detail | M |
|---|---|---|---|---|
| **DmScreen** | The composed DM tree. | brief-10 §3 | Named | M3 |
| **TurnHeader** | Round / whose-turn / session timer. **Shared** with the Player View (top-center there). | brief-10 §3; PV request §1 | Named | M3 |
| **CombatantList** | Party + enemies; tap-to-spotlight. Each shows HP / AC / conditions / bloodied / concentration / passive Perception. | brief-10 §3; In-Play 2.1 | Named | M3 |
| **AssistantPanel** | Titled **Assistant · Journal** — one unified stream: the scene's DM notes on top, then the engine log in plain English (auto-narrated resolutions + roll results, no math), a RulingCard, and the multipurpose composer ("Prompt, roleplay, or ask the assistant"). Journal + assistant + rolls are one area, not three (per the DM Play View reference). | brief-10 §3/§4.1; In-Play 2.2 | Named | M3 |
| **RulingCard** | When a player declares a novel action: suggested check + DC + fail consequence, with Ask for the roll / Change it / No roll. The human keeps the call. Renders through the AcceptTweakReject grammar. | brief-10 §3; In-Play 2.2 | Named | M3 (M2 min: one path) |
| **WhatOnlyYouKnow** | Override editor (set any value by hand, silently), Undo (reverse last event), secret-roll toggle, whisper composer (send to one player). First-contact: collapsed. | brief-10 §3; In-Play 2.3 | Named | M3 |
| **ImmersionConsole** | Tabbed strip: Sound (one-shots) / Music (beds) / NPCs (cast cards with **Become** + TTS) / Map (swap active map) / Effects. First-contact: collapsed. | brief-10 §3; In-Play 2.4 | Named | M3 (audio M6) |
| **PromptDock** | Where DM-held PromptHolderCards queue. | brief-10 §3 | Named | M3 |
| **Screen effects** | Effects tab triggers: screen shake, torch flicker, rain, thunder flash, blood vignette, fade to black. Ephemeral broadcasts. Reduce-motion suppresses all. | brief-10 §4; In-Play 2.4 | Named | M3 (visual), M6 (audio) |

## C-Map · Canvas sub-components & edit tooling (brief-06)

| Component | Intent & detail | Source | Detail | M |
|---|---|---|---|---|
| **MapToken / PlacedToken** | Circle with two-letter initials; staged = 55% opacity + faint border; hidden tokens never serialize to player payloads; a boss starts off-map (staged). | brief-06 §3 | Named | M2 |
| **PlacedAsset (sprite)** | A stateful sprite (rock, tomb, brazier, loot), dashed rect by footprint, blocking/interactive flags, a pinned prep note; some carry open/closed state. | brief-06 §3; planner §6.1 | Named | M2/M4 |
| **Asset palette** | The palette of assets to drag onto the grid (edit mode). | brief-06 §5; planner §6.4 | Named | M4 |
| **Inspector** | Per-asset/token inspector (can grow "when opened → …" trigger rules). | brief-06 §5; planner §6.1 | Named | M4 |
| **Staged-token tray** | Holds off-map tokens ready to drag in when triggered. | brief-06 §5 | Named | M4 |
| **Fog brush / reveal quick-tools** | DM-painted fog brush (edit); fog-reveal quick-tools (play). | brief-06 §5 | Named | M2/M4 |
| **AoE template / range rings** | Template placement; range-ring numbers from `measureFrom` (off in table mode). | brief-06 §4 | Named | M2 |
| **Encounter-difficulty readout** | A live difficulty badge as monsters are added/removed. A co-pilot mirror, not a rule. | planner §11 | Named | M4 |

## C-Planner · Session Planner sub-components

| Component | Intent & detail | Source | Detail | M |
|---|---|---|---|---|
| **Scene sequencer** | Reorderable scene cards + an "add a scene" type palette (uses A6). | planner §5 | Named | M4 |
| **Scene card** | Per scene: read-aloud narration (draftable, TTS-speakable) · DM notes (secret) · "Leads to" (multiple outcomes) · time estimate · "Open room editor" (combat/exploration). Uses A4. | planner §5.2 | Named | M4 |
| **Scene-type palette** | Social / Combat / Exploration / Puzzle-challenge / Narration / Downtime / Blank. Type is a default, not a requirement. | planner §5.1 | Named | M4 |
| **Session kit** | Shared-resource panels above scenes, droppable into any: Recap · Your Players · Strong start · Secrets & clues (live checkboxes) · Cast · Rewards. | planner §8 | Named | M4 |
| **"Your Players" panel** | Surfaces each character's hooks (from their sheets); the co-pilot suggests a personal tie-in that drops into DM notes. | planner §9.1 | Named | M4 |
| **NPC definition card (social)** | Portrait + Voice + Wants (motive) + an **Attitude meter** (friendly↔wary, moves in play) + Knows (facts revealed as they come up). | planner §7.1 | Named | M4 |
| **Roleplay co-pilot line** | An in-character line with Speak (TTS) / Another / Tweak. Renders through A3. | planner §7.2 | Named | M4 |
| **Skill-check hook chip** | "Insight or Persuasion, DC 13" threading into the dice roller. | planner §7.3 | Named | M4 |
| **Recap panel** | Auto-drafted from last session's log, editable, read aloud to open; also the catch-up text a joining player reads. | planner §8 | Named | M4 |
| **Pacing / time-estimate header** | Per-scene estimates + a session total ("~3.5 hrs — about right"). | planner §10 | Named | M4 |
| **Run-mode helpers** | Oracle ("what happens?" yes/no-and-a-twist) + Quick rulings — sit next to the table log. | planner §12 | Named | M4/M3 |

## C-Campaign · Campaign Wrapper sub-components

| Component | Intent & detail | Source | Detail | M |
|---|---|---|---|---|
| **Premise builder** | Presets (Setting / Tone / Hook) + free-form → the co-pilot drafts a premise *paragraph* (accept/tweak/reject). Assembles a *situation*, not a plot. Uses A9. | campaign §3.3 | Named | M4 |
| **Party roster** | Auto-filled as players join; portraits + name + class·level + HP. | campaign §5.4 | Named | M4 |
| **Bonds web** ⭐ | The one genuinely-new UI. Roster portraits with lines between them; tap a line to read/edit, drag between two portraits to make one. A bond = line + short label + public/secret half. Three member types: PC / cast NPC / **open thread** (a ghost member, dashed outline, "?" placeholder). Co-pilot proposes connections. | campaign §5.5–§5.6; brief-11 §4 | Named | M4 |
| **Party composition + tier readout** | A quiet panel: size, average level, roles covered. Mirror, not a rule. | campaign §5.4 | Named | M4 |
| **Cast gallery** | Recurring NPCs — portrait + name + one-line motive per card. Sort/filter. A per-card web indicator + a secret marker (that they *have* a secret, never what). | campaign §6.3 | Named | M4 |
| **Cast member card (full)** | Name, portrait, one-line motive, public/secret split, own bonds, light history. Uses A4. | campaign §6.2 | Named | M4 |
| **NPC create card (promotion)** | A lightweight guided create (name, portrait, one-line motive) fired on a thread→NPC promotion. | campaign §6.5; brief-11 §3 | Named | M4 |
| **Overarching secrets — progress** | "The duke's betrayal — 2 of 5 clues revealed" via live checkboxes. | campaign §7.2 | Named | M4 |
| **Locations library** | An address book of recurring places; public/secret split; each with a saved map. Pull into any scene. | campaign §8 | Named | M4 |
| **Rewards library** | Named loot/boons across the arc; flow down into inventory via the shop path. | campaign §8; brief-07 §4 | Named | M4 |
| **Session sequence** | Ordered reorderable sessions (A6, `itemNoun:"sessions"`); the "leads to next" note is the chain link. | campaign §9 | Named | M4 |
| **Story so far** | A running narrative auto-drafted from each session's recap; also the mid-campaign catch-up text. | campaign §10 | Named | M4 |
| **Dangling-hooks list** | Every open thread in one place — the source the co-pilot reads for its nudges. "The single most valuable screen in the wrapper." | campaign §10 | Named | M4 |
| **Campaign dashboard** | A quiet at-a-glance: party tier, session count, cast size, secrets progress. Mirror, not a control. | campaign §10 | Named | M4 |

## C-Wizard · Character Wizard steps (wizard §5)

| Component | Intent & detail | Source | Detail | M |
|---|---|---|---|---|
| **Live character panel (silhouette)** | Right side: silhouette + stat/gear slots; a cheap preset/vector swap updating on every choice (species→body, class→pose+weapon, gear→slots). **Not** AI. | wizard §1 | Named | M4 |
| **Step 0 — Entry fork** | Quick Start (pick a pre-built L1 and play) vs Build My Own; a "describe your character" box pre-selects suggestions across every step. | wizard §5 | Named | M4 |
| **Step 1 — Class picker** | 12 class cards, each with a Low/Average/High complexity badge; beginners see low-complexity first + "show all"; tap → InfoPanel → Choose; a "+ Create your own class" card at the end. | wizard §5 | Named | M4 |
| **Step 2 — Origin** | Background / Species / Languages & equipment in 2024-rules order; background-boost highlighting; a "+ Create your own species" option; a default equipment package + a "buy with coins" advanced toggle. | wizard §5 | Named | M4 |
| **Step 3 — Ability scores** | Three SRD methods (Standard Array = recommended default; Point Buy under "customize"; 4d6-drop under "roll"); guided assignment auto-applies background bonuses + modifiers; stat slots populate. | wizard §5 | Named | M4 |
| **Step 4 — Identity & Appearance** | Personality (traits/ideals/bonds/flaws), light alignment, appearance descriptors (chips first, free-form always — A9 + A10 quietly building the image prompt). Co-pilot drafts personality + appearance. | wizard §5 | Named | M4 |
| **Step 5 — Voice** | Audition + pick from a curated designed library (no cloning); a waveform/play control on the character card; the co-pilot recommends 2–3; framed partly as accessibility. | wizard §5; brief-15 §2 | Named | M4 / M6 (audio) |
| **Final reveal** | Silhouette → finished AI portrait dramatic reveal (regenerate/tweak; reference stored); the mechanical sheet auto-populates; hands off to "walk me through my first turn". | wizard §5 | Named | M4 |

## D · Cross-cutting sub-components (named in several places)

| Component | Where | Intent & detail | Source | M |
|---|---|---|---|---|
| **Rest review card** | DM/play | "Will regain: …" per creature → commit. Short rest = an interactive Hit-Dice compose-and-roll card per die (continue or stop). A PromptHolderCard `rest` consumer. | brief-07 §1 | M3 |
| **Level-up flow** | Level-up | Wizard re-entered for one level: HP (roll-or-average) → Features (each in InfoPanel; accept or choose) → Spells (picker) → a **diff-reveal card** (before/after "+9 HP, Extra Attack"). Confirm → recompute. | brief-07 §3 | M3/M4 |
| **Shop card** | Downtime | A DM-curated list of item ids + SRD prices; buy/sell as an atomic transaction; sell defaults to half price, DM-overridable per line. | brief-07 §4 | M4 |
| **Voice picker** | Wizard Step 5 + NPC assignment | Audition → select → store voiceId; co-pilot 2–3 recommendations. | brief-15 §2 | M6 |
| **NPC "Become" control** | ImmersionConsole | Selecting a cast NPC routes an NPC line through their TTS voice + a free-text "say as" box. | brief-15 §3 | M6 |
| **Narrator "Speak" button** | Read-aloud (planner + play) | Narrator voice → plays at the DM + optionally the Table Display. | brief-15 §3 | M6 |
| **STT dictation (push-to-talk)** | DM free-form bar + player notes | Push-to-talk transcription; transcripts are treated as delimited data. | brief-15 §3 | M6 |

---

## Where the deep detail already lives

For the **SPECCED** items, a full per-component doc exists in the corpus — read it before
designing:

- `design-handoff/detail-docs/storybook/` — InfoPanel, AcceptTweakRejectCard, PublicSecretField,
  PullFromCampaignPicker, CardSequencer, MapCanvas, PromptHolderCard, PresetsAboveFreeForm,
  PlayerHub (+ VitalsBar, ActionBar, DeathSaveCard, DiceLog), ComposeRollSheet, TableBackdrop.
- `design-handoff/detail-docs/design-requests/player-view-screen.md` — the whole Player View, region by region.
- `design-handoff/detail-docs/design-requests/dice-tray-3d.md` — the 3D dice tray, every state.

Everything marked **Named** designs from the brief/spec cited in its row — that's your
starting material.

*Reminder (ADR-0014): the design authors the look; it's implemented against the contracts and
these primitives, and design prototype code is never merged. Where a mockup and a brief's
structure disagree, structure wins — flag it.*
