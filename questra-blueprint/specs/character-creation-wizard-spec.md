# Character Creation Wizard — Design Spec

The anchor feature of the app. Built on the 2024 D&D SRD (5.2.1) ruleset, desktop-first (mobile later). This document is the single source of truth for the creation feature; the painterly portrait engine lives in its companion, *Character Portrait — Style Prompt System*.

---

## 1. Concept & layout

Character creation should feel like a character *becoming*, not a form being filled. The screen is split:

- **Left — the wizard.** The step-by-step flow.
- **Right — the live character panel.** A silhouette surrounded by stat and gear slots.

The silhouette is a cheap preset/vector swap that updates on every choice (species changes the body, class changes the pose and signature weapon, gear fills the slots). It is **not** AI-generated — that would be too slow and costly to run live. The single expensive AI image call fires **once, at the reveal**, replacing the silhouette with the finished portrait. This puts the money and the drama in the same place.

---

## 2. The four design pillars

Every step is shaped by four ideas that, together, cover every kind of player:

1. **Presets** — tappable chips and cards for speed. The beginner path; nobody is forced to type.
2. **Free-form** — an "add your own" option on every step for players who want depth. Always available, never required.
3. **The info layer (the "?")** — tap anything to understand it (see §4). This is what lets the app add complexity without adding intimidation.
4. **The living silhouette → AI portrait reveal** — visible payoff at every step, and a hero moment at the end.

---

## 3. The AI co-pilot

The co-pilot is present at every step but governed by constant rules so it always feels consistent and never takes authorship away from the player:

- **Suggests, never commits.** Every output is an accept / tweak / reject card. Nothing auto-applies.
- **Reads context.** Each suggestion is built from earlier answers, so it gets smarter as the wizard progresses.
- **Always optional.** A player can dismiss it and build entirely by hand.
- **Explains on demand.** "Why this?" opens the same info panel as the "?" system — the co-pilot and the help layer are one thing, not two.
- **Two entry points:** ambient suggestion chips inside each step, and a persistent "ask the co-pilot" bar for free-form questions.

---

## 4. The info-panel component (one component, used everywhere)

This is the unifying piece. A single slide-over panel (desktop) renders the details of any class, species, feat, spell, or stat, and it does three jobs at once:

- **It informs.** Layered depth so beginners and veterans both get what they need:
  - *Layer 1* — one plain sentence ("Armor Class is how hard you are to hit").
  - *Layer 2* — where the number came from ("15 = 11 base + 2 Dex + 2 shield").
  - *Layer 3* — the full SRD rules text.
- **It selects.** The "Choose" button lives *inside* the panel, so reading, understanding, and deciding are one motion rather than three.
- **It renders homebrew identically.** A player-made class opens in the exact same panel as an official one, with the "?" working on it too. Custom content never looks second-class.

---

## 5. The wizard flow

**Step 0 — Entry fork.** Quick Start (pick a pre-built level 1 character and play), or Build My Own. The co-pilot also offers a "describe your character" box that turns a sentence into pre-selected suggestions across every step. *Homebrew is not a separate fork* — it lives as a "+ Create your own" option inside Steps 1 and 2 (see §6).

**Step 1 — Class.** The 12 class cards, each with a Low / Average / High complexity badge (Fighter and Rogue are Low; Barbarian, Cleric, Paladin, Ranger, Wizard are Average; Bard, Druid, Monk, Sorcerer, Warlock are High). Beginners see low-complexity first, with a "show all" toggle. Tap any card → info panel → Choose. A "+ Create your own class" card sits at the end of the list. The silhouette takes on the class's pose and signature weapon.

**Step 2 — Origin.** Three sub-steps, in the order the 2024 rules require:
1. **Background** first — it grants the feat, the ability score increases, and two skill + one tool proficiency. Show which abilities each background boosts, and highlight the one matching the class's primary ability.
2. **Species** (Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling) — framed flavor-first, giving size, speed, and traits. A "+ Create your own species" option lives here too.
3. **Languages** (Common + 2) and **starting equipment** (default to the class/background package; "buy with coins" behind an advanced toggle).

The silhouette's body and size shift to the species; gear slots fill in.

**Step 3 — Ability Scores.** Three SRD methods, with **Standard Array (15, 14, 13, 12, 10, 8)** recommended as the beginner default. Point Buy (27 points) under "customize," 4d6-drop-lowest under "roll." A guided assignment step suggests the highest score for the class's primary ability, auto-applies background bonuses, and computes every modifier. Stat slots populate on the right.

**Step 4 — Identity & Appearance.** The creative heart, and the step that quietly assembles the image prompt. Personality (traits, ideals, bonds, flaws), alignment (kept light), and appearance descriptors (hair, eyes, skin, build, art style, mood) — all chips first, free-form always available. The co-pilot can draft personality lines and a full appearance description from everything chosen so far, all editable.

**Step 5 — Voice.** The player auditions and picks a character voice from a **curated designed library** (no cloning of real people). TTS = the character speaks aloud (or narrates); STT = the app listens (hands-free play). An optional voice-transform layer re-renders the player's own voice as the character's for in-character moments. The co-pilot recommends two or three voices matching the species, class, and personality. Frame it partly as accessibility. A waveform/play control joins the character card.

**Final reveal.** Every descriptor from Steps 2 and 4 compiles into one image generation; the portrait replaces the silhouette in a dramatic reveal (regenerate / tweak available, character reference stored for future consistency). Simultaneously the mechanical sheet auto-populates — HP, AC, initiative, saves, skills, spell slots, attacks — and it hands off to a "walk me through my first turn" tutorial.

---

## 6. The homebrew class builder

Homebrew is an **option inside the wizard**, not a parallel track: at the end of the Step 1 class list sits a "+ Create your own class" card. Choosing it expands into the builder below; everything a player makes then flows through Steps 2–5 exactly like an official class. The design principle throughout is **guided template, not blank page** — the app owns the 5e skeleton, the player owns the identity.

1. **Concept & identity.** Name, a one-line fantasy, and a power source (martial / arcane / divine / primal / occult). A class needs a distinct identity filling a niche the existing 12 don't. The co-pilot uses this sentence to seed later suggestions.

2. **Chassis (auto-scaffolded).** The player picks constrained options; the app fills the rest to 5e math: hit die (d6–d12), primary ability, two saving-throw proficiencies, armor/weapon/skill proficiencies against the standard budgets, and caster type (none / third / half / full) — which auto-generates the correct spell-slot table so nobody hand-builds one.

3. **The level table.** All 20 levels shown pre-structured, enforcing the two rules that keep homebrew sane: every level must grant *something* (feature, ASI, subclass feature, or spell progression), and the standard cadence holds — subclass at level 3, ASIs at 4/8/12/16/19. Empty levels are flagged; the scaffold won't let holes through.

4. **Features.** For each slot the player writes their own or asks the co-pilot for options fitting the fantasy and level. Gentle nudges surface the design rules: cover all three pillars (combat, exploration, interaction) rather than combat-only, and avoid abusable synergies. Every AI suggestion is an editable draft.

5. **Subclasses.** At least one required now, with a reminder that a real class wants three or more — if you can't imagine three, it's probably a subclass, not a class. Offers to stub the others.

6. **Balance check (the differentiator).** Before saving, the app compares the class against the SRD's 12 official classes and flags outliers, focused on **damage output** — the most common way homebrew breaks — benchmarked at the tier breakpoints (levels 1, 5, 11, 17, 20). It's a warning with a one-tap "tone it down," not a hard block; under-powered gets a softer note since low damage rarely ruins a table.

7. **Publish.** The finished class drops into the class list as a selectable card with its own info panel and a "table-approved" flag a DM can set.

The **same scaffold-and-check pattern collapses down for species** (size, speed, 2–3 traits, one ability flavor), so players learn the shape once.

*Honest caveat: balance-checking catches the obvious breakage (damage is calculable) but can't judge the value of a clever utility feature — treat it as a smart assistant backed by the DM-approval gate.*

---

## 7. The homebrew community library

Homebrew shouldn't die in one player's account. A shared library lets players browse, use, and remix each other's creations — turning homebrew from a solo tool into the app's community engine.

- **Browse & search.** A gallery of published classes (and species) filterable by power source, complexity, role, and balance status, sortable by popularity, newest, or rating. Each entry opens in the same info panel used everywhere, so a community class reads exactly like an official one.
- **Use it.** One tap imports a library class into the player's own roster; it then flows through the normal wizard. Imports still respect the **DM-approval gate** — a class from the library isn't automatically legal at someone's table.
- **Remix it.** "Fork" any class into the builder and modify it — the co-pilot helps rework it, and lineage/attribution to the original creator is preserved.
- **Trust signals.** Surface the builder's **balance-check result** as a badge (e.g. "balance-verified" vs "flagged: high damage") and let players rate and mark classes "table-tested." This is where the balance checker pays off publicly — it becomes the library's quality signal.
- **Attribution & versioning.** Creators are credited; classes are versioned so an update doesn't silently break a character already built on an older version.
- **Moderation.** A public, user-generated library needs reporting, content review, and clear community guidelines — plan this in from the start rather than bolting it on. Keep content age-appropriate and within the app's overall content standards.

**Decisions to lock:** whether a class is private / shareable / table-scoped by default, and how the DM-approval gate interacts with library imports (recommended: private by default, explicit publish, DM must approve any class — homebrew or imported — before it appears for their players). This gate is what makes the whole system usable in real campaigns instead of a chaos generator.

---

## 8. Companion systems (summarized)

- **Portrait generation.** Painterly house-style locked via a base block + preset tokens + free-form, with setting and frame as per-character variables, targeting ChatGPT / GPT Image, built on original art you own. Validated across five very different characters (fae duelist, warrior-mage, barghest brute, gnome forager, fae samurai) confirming the presets move body type, gender, costume, and environment while the style holds. Full detail in *Character Portrait — Style Prompt System*.
- **Voice.** Curated TTS voice library + STT dictation + optional voice-transform, doubling as an accessibility feature and reused for NPC/narration elsewhere in the app.

---

## 9. Suggested build order

1. **MVP:** the split-screen wizard (Steps 0–5), the info-panel component, silhouette + one-shot AI reveal, auto-calculated sheet. This alone is a strong product.
2. **Differentiator:** the in-wizard homebrew builder + balance check.
3. **Community engine:** the homebrew library (browse / use / remix / moderate).
4. **Delight, later:** full voice (TTS/STT/transform), then the mobile transition.
