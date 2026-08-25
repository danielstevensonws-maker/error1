# Design Request — Player View (the full screen)

**For:** Claude Design · **From:** Questra build · **Status:** ready to build

## What this is

Questra is a D&D 5e companion/VTT. This is the **player's screen during play** — what
someone sees for the entire session while their DM runs the game. It is the single
most-looked-at surface in the product.

A prototype of this screen already exists (`Questra - Player View.html`, the Wren
build). **This request is to rebuild that screen as a proper, composed design** —
not to invent it from scratch. Where this document and the prototype disagree, the
prototype's *look* wins and this document's *structure* wins; flag the conflict.

## Why we're asking

We built the pieces of this screen as separate components (identity, vitals, action
bar, dice log) and they're individually correct, but they were never composed into a
screen. Viewed in isolation they read as a stack of panels — the prototype reads as a
place you sit for three hours. **The missing thing is the frame**: the map as ground,
the HUD floating over it, and everything arranged around the table rather than listed
down a column.

---

## 1. The frame

A fixed **1728×1080 stage**, uniformly scaled to fit the viewport (letterboxed, scale
= `min(vw/1728, vh/1080)`, origin top-left). Everything below is positioned on that
stage. The prototype does exactly this and it should stay — it keeps the composition
exact at any window size.

**The map is the ground.** Not a panel — the full-bleed background of the screen. Every
other surface floats above it as translucent, blurred glass. The room, its tokens, and
its lighting are what the player is looking at; the HUD is what they're looking
*through*.

Region layout (from the prototype — keep this arrangement):

| Region | Position | Contents |
|---|---|---|
| **Map** | full bleed | room, grid, tokens, movement, effects |
| **Scene header** | top center | scene title, round, whose turn, session timer. The `TurnHeader` (brief-10) — shared with the DM screen, not DM-only. |
| **Identity** | left, lower | portrait, name, class + level. 88px tall |
| **Vitals** | left, below identity | HP bar (+ temp overlay), AC, condition chips |
| **Action bar** | bottom center | Action / Bonus / Reaction rows, target chips, turn badge, movement left |
| **Party rail** | left or upper-left, collapsible | one card per party member: portrait, name, class·level, HP bar |
| **Log + chat** | right, `344 × 516`, bottom-right anchored | narration, table talk, roll results, message composer |
| **Controls** | top right | settings, menu, journal, mute — 36px square glass buttons |
| **Reactions** | near chat | emoji burst row (👏 🔥 😂 😮 ✨ ❤️), floats and fades |

Nothing is a hard-edged card sitting on a page. Everything is glass over the map.

## 2. Three HUD themes

The prototype ships three, switchable as a prop. Please design all three:

- **ghost** — warm dark, the default. `rgba(19,16,9,.55)`, 14px blur, ink `#E6DCC4`
- **slate** — cool dark. `rgba(17,21,29,.68)`, 20px blur, ink `#E9EDF4`
- **ivory** — light. `rgba(243,240,233,.60)`, 16px blur, ink `#201D18`

Each defines: base fill, solid fill (for popovers), border, ink, dim ink, blur radius,
chip fill. A single accent colour (`#C05B41` default) is themed separately and used for
*your* token ring, the active target, the turn badge, and primary actions — **one accent,
used sparingly**, never decoratively.

## 3. Typography

The prototype's pairing works and should carry through:

- **IM Fell English** (serif) — DM narration, portrait names. The storytelling voice.
- **EB Garamond** (serif) — body, labels, most UI text.
- **IBM Plex Mono** — every number, dice total, stat, timer, and small-caps label.

The rule underneath: **prose is a serif, data is mono.** A player should be able to tell
at a glance whether they're reading the story or reading their character.

## 4. States to design

This screen changes shape during play. Please design each:

1. **Your turn** — action rows live, your token ringed and pulsing, turn badge lit
2. **Waiting** — someone else's turn; rows dimmed but readable, badge reads `WAITING…`
3. **Bloodied** — at or below half HP: HP bar shifts to red, token tagged
4. **Conditions** — one, and several, condition chips present (they're tappable)
5. **Dying** — **the screen flips.** Action bar is replaced by the death-save card
   (three success pips ✓, three failure pips ☠, one big roll). Identity + vitals dim to
   45%, your token drops to 55% and is tagged `Dying`. Also design `Stable` and `Dead`.
6. **Compose** — a small sheet above the action bar: advantage / straight / disadvantage,
   a situational ± stepper, the live formula, Roll and Cancel
7. **Dice result** — the settled die and its breakdown (see §6)
8. **Info sheet** — tapping any number or condition opens its explanation: kicker, title,
   itemized rows, plain-English rule text, and a line of flavour
9. **Character sheet (the "folio")** — a drawer with tabs: Abilities & Spells · Stats ·
   Inventory · Equipment. These are brief-10's `SpellsAbilitiesTab` (slot pips, upcast
   picker, per-spell DC/bonus, single-active `ConcentrationBadge`) and `InventoryGrid`
   (equip/backpack, attunement/weight tags) — design them under those names, don't invent
   new ones. **The Rogue build cannot exercise the caster half** (no slots/upcast/
   concentration), which is why §9 asks for the Mira (Cleric) variant — that variant is
   what fills the Abilities & Spells tab with real content.
10. **Menu** — settings, safety tools, take a breather, journal, how do I play, back to
    lobby, leave the table
11. **First contact** — a brand-new player's first session: only 2–3 action tiles seeded,
    tabs and inventory dimmed-until-earned. This should feel like *room to grow*, not
    like a locked or disabled product.

## 4a. The menu, specified (what each item does)

§4.10 names menu items the prototype never defined. Their behaviour, so the designer draws real
screens, not placeholders. All obey Law 2 (never say no) and Law 5 (teach by doing); none
require reading while another player talks (Law 4).

- **Safety tools** — a table-safety control for a group of first-timers (an X-card /
  lines-and-veils analog). **Any player *or* the DM can open it, at any time, and invoke it
  without giving a reason** — including mid-combat; it greys nothing and is never gated. Two
  affordances: **(1) Pause** — one tap raises a calm, full-table "let's pause here" signal (a
  quiet overlay + a soft cue — the definition-of-done's "it makes a sound"). It names no one,
  states no reason, and routes to the DM to steer the scene elsewhere; invoking it is never
  logged as blame and never punished. **(2) Lines & veils** — a short, pre-session list of
  content to avoid entirely (lines) or keep off-screen (veils), editable by anyone at the
  table and visible to the DM while prepping. *(Owner-confirmed: any player can raise a Pause.)*
  ⚠ owner-confirm (open sub-question only): whether a Pause is anonymous-only or optionally
  self-attributed (default chosen here: **anonymous**).
- **Take a breather** — a personal, no-stakes step-away. Marks the player "away" in presence so
  the table knows, holds their turn (the DM may act for them, architecture §5), and shows a
  gentle "back when you are" state. Not a disconnect — rejoining is one tap.
- **How do I play** — the player-side help surface (onboarding is DM-only, so players need their
  own). Opens the same "?" info layer (§5), scoped to *right now*: what your live action rows
  mean, what a roll is, what a condition on you does — read from current state, in plain
  language, never a wall of tutorial text. It explains the piece in front of you, not the whole
  game.
- **Journal** — the player's window into the same unified log/journal area the DM has (brief-10
  §4.1): the play log (narration + roll results), a read-only campaign recap ("previously…", the
  catch-up text a joining player reads — session-planner §8), and the player's own private notes
  (STT dictation lands here, brief-15 §3). Journal, the log, and rolls are one area, not three —
  the player just sees the public stream plus their own notes and whispers, never the DM's secret
  notes.

## 5. Two things that must be visible in the design

**Greying.** Any action a player can't currently take is dimmed to ~50% and, on hover,
explains itself in plain English ("You've already used your action this turn.") Never a
disabled grey box with no reason. This is a product principle: the interface teaches the
rules by explaining every refusal.

**Every number is tappable.** AC, HP, to-hit, every dice total. Tapping opens the info
sheet showing exactly how that number was reached. Nothing on this screen is allowed to
be a number the player can't interrogate. Please design the affordance — the prototype
uses a small `?` circle, which works; improve on it if you can.

## 6. The dice — scope note

**Do not design the die itself in this request.** It's getting its own treatment: 3D
dice (d4, d6, d8, d10, d100, d12, d20) that roll on the map surface. That's a separate
brief.

What this screen *does* need from you: **where the result lands.** The dice total, its
breakdown rows (`d20 14 (dropped 6)` · `DEX +3` · `Proficiency +2`), and the verdict line
("Hit — against Armor Class 15"), plus how a roll entry appears in the log — collapsed to
one line, expandable to its breakdown.

## 7. Voice — please match it

The prototype's copy is the product's voice and we want to keep it. It's plain, warm, and
never talks down:

> "The skirmisher is bloodied."
> "Wren — you're up. The lookout's eyes are on you now."
> "A 10 or higher is a success. Three successes and you hold on; three failures and the
> story ends."
> "You hold on. Unconscious, but breathing — healing or an hour will wake you."
> "The DM can still overrule fate. Nothing at this table is final until the story says so."

**Banned words in all user-facing text:** "beat" (say *scene*), "node" (say *member* or
*portrait*). We check this in CI.

Rules text should read like a person explaining the game, not like a rulebook. Flavour
lines are welcome and encouraged — "Supple leather, oiled quiet — armor for someone who
plans not to be hit at all."

## 8. Accessibility — non-negotiable

- **Reduce-motion**: every animation (dice, token pulse, screen effects, emoji bursts)
  must have a still equivalent. Design the reduced state, don't leave it to us.
- Text must stay legible over *any* map — glass fills need enough opacity to survive a
  bright map underneath.
- The accent colour must never be the only thing carrying meaning.

## 9. Demo content to build against

Use the prototype's scenario so we can compare directly:

- **You:** Wren, Halfling Rogue, level 3. HP 22/27. STR 10 · DEX 17 · CON 12 · INT 13 · WIS 14 · CHA 11
- **Party:** Torvald (Fighter 3, 34/40) · Mira (Cleric 3, 18/24) · Ozren (Wizard 3, 9/20)
- **Enemies:** a goblin skirmisher (bloodied) and a goblin lookout
- **Scene:** a smoky yard with a well

Please also produce **one caster variant** — swap Wren for Mira (Cleric 3) — so the
Abilities & Spells tab has real content: spell slots as pips, prepared spells with save
DC and attack bonus, an upcast picker, and a concentration badge. The Rogue build never
shows any of this, and it's the biggest hole in the current prototype.

## 10. Deliverable

A working prototype of the screen, in the same self-contained format as the Wren build,
covering the states in §4 and the caster variant in §9. Interactive where it matters
(tapping a number opens its sheet; the dying flip actually flips).

We'll rebuild it as React components against our design system — so what we need from you
is the *design decided*, not production code.
