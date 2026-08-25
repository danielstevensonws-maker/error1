# Questra — In-Play Specs (Player View + DM View)

Covers the two surfaces of the *play* experience (not prep — that's the Session Planner). Built on SRD 5.2.1. Design north star: **the rules never wall the player; the app knows them so the table doesn't.**

---

## Part 0 — Shared Foundation (the contract both views obey)

Written first because the whole audit turned on "do the two screens agree." They agree by sharing one spine.

**The Engine = single source of truth.** One authoritative game state (positions, HP, AC, conditions, slots, concentration, initiative). Both views are windows onto it; neither holds private truth except the DM's hidden layer (below).

**Naming lock — Engine ≠ Assistant (applies across all six specs).** Two distinct systems, never conflated:
- **Engine** — the deterministic bookkeeper. Rolls, math, state, routine resolution. *Decides facts.* No judgment, no suggestion.
- **Assistant** (a.k.a. co-pilot) — the suggestive judge. Ruling Suggestions, social-scene help, Wizard suggestions. *Proposes judgment a human confirms; never commits.*
One decides facts; one proposes calls. Keep the words apart everywhere.

**Core principle — *routine resolves, novel escalates*.**
- *Routine* (a declared attack, a known save, movement): the Engine resolves it, applies the result, and narrates it in plain English. No arithmetic surfaces to any human.
- *Novel* (an improvised action with no rule on rails — "swing on the well-rope and drop on the lookout"): the Engine does **not** auto-adjudicate. It escalates to a **Ruling Suggestion** on the DM's Assistant panel (suggested check + DC + fail consequence) with the human keeping the call.
- *Homebrew* (a player-authored class feature the Engine has no deterministic rule for — from the Wizard's homebrew builder): treated as **novel**, not routine. It surfaces as a Ruling Suggestion for the DM rather than silently auto-resolving. *(Mirror this note into the Character Wizard spec so the two agree.)*

**Roll handoff.** Player **composes and rolls** on their screen (this is where learning lives — they assemble the turn, see the dice). Engine **applies and narrates** on the DM screen (this is bookkeeping — no learning value, so it's automated). One action, two halves, no double-entry.

**Sync contract (closes gap #1).** Engine state pushes to the player view in real time. Concretely: token positions and enemy state drive the player hotbar's contextual greying ("out of range," "they've already seen you"), and enemy "bloodied"/HP tags reflect the same Engine values the DM sees. If the DM uses Override/Undo, the player view updates from the same event stream.

---

## Part 1 — Player In-Game View

The **home screen** — an RPG character hub, not a paper sheet. Portrait is the centerpiece; vitals are things you *watch*; abilities sit in a hotbar you reach for.

### 1.1 Identity & vitals
- AI portrait from the Character Wizard as the visual anchor.
- HP bar (watched, not calculated), AC, key stats, level.
- Self-conditions shown where they affect rolls (e.g. *prone → disadvantage on attacks*), pulled from the Engine.

### 1.2 Action bar — organized by action economy
- Rows are **Action / Bonus Action / Reaction** as ready-toggles, not a flat weapon list. Teaches "one action, one bonus, one reaction" structurally, no tutorial.
- Each card is **tagged to the resource it spends**.
- **Riders**: features like Sneak Attack attach *to* an attack card rather than occupying their own slot (e.g. "1d4+3 piercing" with "+2d6" rider surfaced).
- **Contextual greying**: unavailable options stay visible but greyed with the reason ("out of range," "only when you're hit"). Fed by the Engine sync contract.
- **Compose-and-surface**: tapping composes and rolls, shows the dice and modifiers; the player reads the result. (Deliberately *not* silent auto-resolve — this is the interesting choice, kept manual.)

### 1.3 Expandable Spells & Abilities tab (closes gaps #2 and slots)
The hotbar shows the common front layer; a tab holds the full range so depth isn't amputated. This tab is the home for the bookkeeping that shouldn't clutter the bar:
- **Spell slots**: tracked per level; spend/restore reflected live; **upcasting** picker on cast.
- **Save DCs / attack bonus** shown per spell, precomputed.
- **Concentration**: single active-concentration indicator (only one at a time, enforced). **On taking damage, the Engine auto-prompts the CON save (DC 10 or half damage, whichever higher) and resolves the drop if failed** — status *and* the save are automated, not just the label.

### 1.4 Inventory
Slot/grid layout (equipped vs backpack), drag-to-equip, attunement/weight tags. RPG-hub feel over spreadsheet.

### 1.5 Supporting surfaces
Dice log, compendium, and campaign notes hang off the hub. The Wizard's **"?" info-layer** is present for in-place term definitions (the fine-grain teaching; onboarding handles coarse-grain sequencing later).

---

## Part 2 — DM In-Game View

The power-user surface: the battle map plus the tools to run and narrate the table.

### 2.1 Map & combatants
- Shared battle map with tokens; round + turn + timer header.
- **Combatants list** (party + enemies), **tap to spotlight**. Each shows HP, AC, conditions, "bloodied" tag, and concentration status (e.g. "Concentrating — Bless," "Mage Armor down"). This is the DM's read of the same Engine state the players see.
- Initiative / turn order drives the active-turn highlight on both screens.

### 2.2 Assistant / Journal panel (the new-DM terror, solved)
- **Engine log**: auto-narrated routine resolutions in plain English ("Torvald hits Goblin skirmisher — 8 slashing. It is bloodied"; "Goblin lookout misses Mira — 9 vs AC 16"). No math shown.
- **Ruling Suggestions**: when a player declares a novel action, the panel surfaces a suggested check + DC + fail consequence, with **Ask for the roll / Change it / No roll**. The human always keeps the call — the co-pilot proposes, never decides.
- Free-form input: "Prompt, roleplay, or ask the assistant."

### 2.3 "What Only You Know" (DM information asymmetry)
- **Override** — set any value by hand, silently.
- **Undo** — reverse the last event (anyone's).
- **Secret roll** — hidden by default, per type.
- **Whisper** — send to one player; only they see it.

### 2.4 Immersion console (atmosphere = conducting, not operating)
Tabbed control strip:
- **Sound** — one-shot effects.
- **Music** — background beds.
- **NPCs** — roleplay as cast NPCs with per-NPC TTS voices ("Become"), wired to the Character Wizard's designed voice library.
- **Map** — swap the active map.
- **Effects** — screen effects: screen shake, torch flicker, rain, thunder flash, blood vignette, fade to black.

---

## Part 3 — Gap Closure Checklist

| Flagged gap | Closed by |
|---|---|
| d20 test = math wall | Engine auto-resolves + narrates routine rolls (2.2) |
| On-the-fly DCs (new-DM terror) | Ruling Suggestions with human-in-loop (2.2) |
| Conditions untracked | Combatant list + self-conditions, Engine-driven (1.1, 2.1) |
| Concentration | Status **and** auto CON save on damage (1.3) |
| Spell slots / upcasting / save DCs | Spells & Abilities tab (1.3) |
| "too many spells for a hotbar" | Expandable tab, hotbar = front layer (1.3) |
| Two screens drift apart | Single Engine + sync contract (Part 0) |
| Who rolls? | Player composes+rolls / Engine applies+narrates (Part 0) |

## Part 4 — First-contact hooks (for onboarding later)
Per-surface empty-state notes to capture now so onboarding has grips (cheap insurance, not built yet):
- **Player view, first time**: hotbar seeded with 2–3 cards only; tabs/inventory dimmed until earned.
- **DM view, first time**: immersion console and "What Only You Know" collapsed; Assistant panel leads with a single Ruling Suggestion to teach the loop by doing.

*Onboarding remains the capstone — designed last, over the locked pyramid.*
