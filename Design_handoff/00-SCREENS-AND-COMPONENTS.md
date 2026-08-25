# Questra — Screens & Components Handover (page-first workflow)

**Purpose.** You're mocking full screens now, not one primitive at a time — seeing how
components sit next to each other before locking any of them. This file is organized
**by screen**, the opposite axis of `questra-blueprint/design-handoff/00-COMPONENT-LIST.md`
(which is organized by component). Use this one to know *what to mock next and what it
needs*; use that one when you want the full design detail on any single component.

**The loop:** mock a screen → see how its components read together → revise → hand me the
finalized screen + its component specs (same format as `design_handoff_infopanel/` and
`design_handoff_accepttweakreject/` — a `.dc.html` + `README.md` + `storybook/` reference
React) → I rebuild each component against `@questra/theme` tokens + `@questra/contracts`
fixtures, one PR per component, Storybook stories against real data.

---

## Status legend

| Status | Meaning |
|---|---|
| ✅ **Built** | Rebuilt in `packages/web/src/primitives/`, tested, in Storybook now. Treat as **locked reference** — compose it into new mocks as-is; don't re-mock it from scratch. |
| 📦 **Handed off** | Design bundle sitting in `Design_handoff/`, not yet rebuilt into the codebase. |
| ⬜ **Not started** | No mock, no handoff yet. |

**Currently:**
- ✅ **InfoPanel** — built, tested, in Storybook (`Primitives/InfoPanel`). This is your fixed
  reference point — drop its real look into every screen mock that uses it rather than
  re-designing it.
- 📦 **AcceptTweakRejectCard** — handed off (`Design_handoff/design_handoff_accepttweakreject/`),
  not yet rebuilt. I haven't started this one — happy to hold it until it shows up in a
  screen mock, or rebuild it standalone now. Your call.
- ⬜ Everything else below.

---

## Priority order (build screens in this order — it's the dependency order, not a preference)

1. **Player View** — the highest-traffic screen; exercises InfoPanel (built) + the most
   primitives at once (dice, vitals, action bar, prompts). Best screen to validate
   composition rules on.
2. **DM Play View** — pairs with Player View (same session, two screens); shares
   AcceptTweakRejectCard, PromptHolderCard.
3. **Character Creation Wizard** — exercises InfoPanel + PresetsAboveFreeForm + the reveal
   moment; self-contained, good second target.
4. **Session Planner** + **Room/Map Editor** — the densest prep screen; needs the most
   not-yet-designed primitives (CardSequencer, PublicSecretField, PullFromCampaignPicker).
5. **Campaign Wrapper** — reuses Session Planner's primitives (CardSequencer,
   PublicSecretField, PullFromCampaignPicker) in a new arrangement — the "one pattern,
   three floors" claim gets tested here.
6. **App shell** (Landing / Home / Join / Settings) — lower component density, can trail.
7. Compendium, Homebrew/Community, Onboarding — later milestones (M5–M7); mock last.

---

# Screens

## 1. Player View ⭐ *(mock this first)*

**What it is:** the player's whole in-play surface. Fixed 1728×1080 stage, letterboxed. The
map is the full-bleed ground; everything else is translucent glass floating over it.

**Full detail:** `questra-blueprint/design-handoff/detail-docs/design-requests/player-view-screen.md`
(region-by-region spec — read this before mocking, it has exact positions/sizes already).

**Components this screen needs:**

| Component | Status | Role on this screen |
|---|---|---|
| InfoPanel | ✅ Built | Opens on tap-`?` from Vitals/ActionBar (Path 1 — "explain") |
| AcceptTweakRejectCard | 📦 Handed off | Not primary here, but ImmersionConsole/chat may surface AI lines |
| DiceTray | ⬜ | The roll surface — see `questra-blueprint/design-handoff/detail-docs/design-requests/dice-tray-3d.md`, full spec exists |
| ComposeRollSheet | ⬜ | Compose → roll → settle, opens from an ActionBar tile |
| VitalsBar | ⬜ | HP/AC/condition chips, each with a `?` → InfoPanel |
| ActionBar | ⬜ | Action/Bonus/Reaction rows, greyed-out illegal tiles |
| DeathSaveCard | ⬜ | Replaces ActionBar when dying (the "flip") |
| DiceLog | ⬜ | Right-side scrolling log |
| PromptHolderCard | ⬜ | Overlay — OA/reaction prompts, one at a time |
| PartyRail, Controls, Reactions, Menu | ⬜ | Smaller sub-components, see component-list C-Player |

**Cross-cutting things to get right ONLY visible at page level:**
- Three HUD themes exist in tokens (ghost/slate/ivory) but **v1 ships ghost only** — mock in ghost.
- Glass panels must be judged **over the real map ground**, never on a flat background (see
  `TableBackdrop` in the component catalogue — it exists exactly to prevent this mistake).
- Every panel's glass/blur/border must read as *one system* — if InfoPanel's glass and
  VitalsBar's glass look like different materials, that's the bug page-mocking is for catching.
- The dying flip (VitalsBar dims, ActionBar → DeathSaveCard) is a state transition — mock
  both states of the SAME layout, not two unrelated screens.

---

## 2. DM Play View

**Full detail:** `questra-blueprint/design-handoff/00-COMPONENT-LIST.md` → B10; In-Play spec
Part 2.

**Components:**

| Component | Status | Role |
|---|---|---|
| AcceptTweakRejectCard | 📦 Handed off | Frames the RulingCard — this is the primary place it's seen |
| InfoPanel | ✅ Built | Compendium lookups mid-session |
| PromptHolderCard | ⬜ | DM-held prompts (legendary actions, lair actions) |
| MapCanvas (`play` mode) | ⬜ | Full spec: `questra-blueprint/design-handoff/detail-docs/storybook/MapCanvas.md` |
| TurnHeader, CombatantList, AssistantPanel, WhatOnlyYouKnow, ImmersionConsole, PromptDock | ⬜ | See component-list C-DM |

**Cross-cutting:** this screen and Player View share TurnHeader — mock it once, reuse the
same visual in both screens' mocks so they don't drift into two different headers.

---

## 3. Character Creation Wizard

**Full detail:** `questra-blueprint/specs/character-creation-wizard-spec.md` §1–§5.

**Components:**

| Component | Status | Role |
|---|---|---|
| InfoPanel | ✅ Built | Path 2 ("read, then pick") — tap a class/species card, panel opens with Choose |
| PresetsAboveFreeForm | ⬜ | Chips-over-freeform, used on nearly every step |
| AcceptTweakRejectCard | 📦 Handed off | Co-pilot backstory/appearance drafts |
| Live character panel (silhouette) | ⬜ | Right-side, updates on every choice; NOT AI — cheap preset swap |
| Class picker cards, Step components | ⬜ | See component-list C-Wizard |

**Cross-cutting:** this is the first screen where **InfoPanel's Path 2 (Choose footer)**
gets exercised in context — confirm the Choose button's accent color agrees with
PresetsAboveFreeForm's selected-chip color; they're both "the accent," and if they're
mocked independently they can drift into two different accent treatments.

---

## 4. Session Planner + Room/Map Editor

**Full detail:** `questra-blueprint/specs/session-planner-design-spec.md` (whole spec — this is the densest screen).

**Components:**

| Component | Status | Role |
|---|---|---|
| CardSequencer | ⬜ | Scene ordering — reusable, also used by Campaign Wrapper (§5) |
| PublicSecretField | ⬜ | ⚠️ **Needs a `--qa-secret` tint token that doesn't exist yet** — see below |
| PullFromCampaignPicker | ⬜ | Cast/location/reward reference picker |
| PresetsAboveFreeForm | ⬜ | Scene creation, tags |
| AcceptTweakRejectCard | 📦 Handed off | Recap drafts, NPC roleplay lines |
| MapCanvas (`edit` mode) | ⬜ | Room editor — asset palette, fog brush, staged-token tray |
| InfoPanel | ✅ Built | Inspecting a monster/spell while authoring |

**⚠️ Known token gap — read before mocking PublicSecretField:**
The theme has no `--qa-secret` token yet (confirmed absent, deliberately not fabricated —
see `packages/theme/test/tokens.test.ts`, the "tokens Claude Design has NOT supplied yet"
suite). **If you mock PublicSecretField, please include the secret-tint color as part of
that component's handoff** so it can be added to the token set properly instead of guessed.
Same applies to `--qa-grain` / `--qa-vignette` if TableBackdrop-style atmosphere shows up
in the map editor mock.

---

## 5. Campaign Wrapper

**Full detail:** `questra-blueprint/specs/campaign-wrapper-design-spec.md` (whole spec).

**Components:**

| Component | Status | Role |
|---|---|---|
| CardSequencer | ⬜ | Sessions-in-campaign — **same component as Session Planner's scene list**, different noun |
| PublicSecretField | ⬜ | Bonds, cast, locations — same token gap as above |
| PullFromCampaignPicker | ⬜ | Campaign-level references |
| PresetsAboveFreeForm | ⬜ | Premise chips |
| AcceptTweakRejectCard | 📦 Handed off | Premise drafts, bond proposals |
| InfoPanel | ✅ Built | Browsing cast/locations |
| Bonds web | ⬜ | The one genuinely-new UI here — no primitive covers it, see component-list C-Campaign |

**Cross-cutting — this is the important one:** the Playbook's core claim is "one pattern,
three floors" — Campaign/Session/Scene all reuse the same sequence+pool+review shape. If
you mock this screen with a CardSequencer that looks or behaves differently from Session
Planner's, that claim breaks. **Mock these two screens together, or at minimum compare them
side by side before finalizing either.**

---

## 6. App shell — Landing / Home / Join / Settings / Notifications

**Full detail:** `questra-blueprint/design-handoff/00-COMPONENT-LIST.md` → B1–B8.

**Components:** mostly screen-specific layout, low reuse of the primitives above. The Join
flow is the highest-priority piece of this group (per the corpus: "the player's entire front
door") — if you only mock one shell screen first, make it Join.

---

## 7. Later milestones — mock last

Compendium (uses InfoPanel only, cheap to mock once InfoPanel's in place), Homebrew Builder,
Community Library, Moderation, Onboarding floors. These land M5–M7; no need to design them
before the M3/M4 screens above are solid.

---

## Cross-cutting rules that only bite at page level

These are in the individual component docs too, but they're worth restating here because
**they're the entire reason for mocking full pages instead of isolated components:**

1. **Greying** — any unavailable action stays visible at ~50% opacity and explains itself on
   hover. This has to be checked NEXT TO its enabled sibling tiles on a real ActionBar, not
   in isolation — that's the only way to judge if 50% actually reads as "off" without
   vanishing.
2. **Every number is tappable** — the `?` affordance (built, see InfoPanel's ExplainButton)
   has to sit correctly against real numbers of different sizes/weights across screens
   (a big HP number vs. a small stat-block value) — check it doesn't compete or get lost.
3. **One glass system** — every panel's blur/border/fill across every screen should read as
   the same material. This is impossible to verify one component at a time.
4. **One accent** — `--qa-accent` (#C05B41) is the only accent color. Every "primary action"
   across every screen (Choose, Accept, Prepare Fireball, a selected chip) should be visibly
   the same color. Page mocks are where a second accidental accent gets caught.
5. **Plain language ban list** — no "beat", no "node" — checked in CI on the real copy, but
   worth eyeballing in mocks so the words don't need changing later.

---

## The two token gaps to flag if you mock into them

Confirmed absent from `@questra/theme` right now (see the guard test in
`packages/theme/test/tokens.test.ts`) — **don't invent values for these, include them in
whatever component's handoff needs them:**

- **`--qa-secret`** — PublicSecretField's DM-only tint (Session Planner, Campaign Wrapper).
- **`--qa-grain` / `--qa-vignette`** — atmosphere overlays (TableBackdrop-style ground
  texture, if it shows up under any HUD mock).

---

## What "finalized" means for the handover back to me

Match the format of `Design_handoff/design_handoff_infopanel/` and
`design_handoff_accepttweakreject/` — per component, not per screen:

- `Questra <Component>.dc.html` — the design reference (screenshot-able, all states)
- `README.md` — layout numbers, type spec, token bindings, interaction spec, states enumerated
- `storybook/<Component>.tsx` + `.stories.tsx` + `tokens.css` — reference React

The **screen mock itself** (the full-page composition) is your tool for judging the
components together — it doesn't need to come back to me as its own deliverable. What comes
back is each **component's** finalized spec, informed by how it looked on the page. I rebuild
components, not screens — screens are compositions I assemble from the rebuilt primitives
against real contracts fixtures, same as every screen in `MASTER-PLAN.md` is scoped.

---

*This file indexes `questra-blueprint/design-handoff/00-COMPONENT-LIST.md` (full component
detail) and `questra-blueprint/design-handoff/detail-docs/` (design-request-level specs for
Player View + DiceTray) by screen instead of by component. Keep both — this one for "what do
I mock next," that one for "what exactly does this component do."*
