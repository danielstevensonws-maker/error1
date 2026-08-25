# Design Request — The Dice (3D, on the table)

**For:** Claude Design · **From:** Questra build · **Status:** ready to build

## What this is

Questra is a D&D 5e companion/VTT. This is **the dice** — the single most-watched
object in the product. Your own design system already stakes the claim
(`guidelines/brand-dice.html`):

> **DICE TRAY** — The signature. 3D dice tumble & land here — the whole table
> watches. Spend all boldness on this one object.

That mandate exists; the design behind it doesn't yet. This request fills it.

Dice appear on **every** roll in the game: attacks, ability checks, saving throws,
initiative, death saves, and damage. Both the player screen and the shared table
display show them. When a die is rolling, everyone stops and looks — that's the
moment to design for.

## The one hard constraint (please read this first)

**The dice must land on a result that was decided before the animation starts.**

Questra's server rolls the dice, not the browser (ADR-0008 — it's what makes rolls
trustworthy across a table and replayable afterwards). By the time a die appears on
screen, the number is already decided and recorded. The animation is a *reveal*, not
a lottery.

This inverts how physics dice normally work, and it has real design consequences:

- The die must **finish** on a specified face. Tumble freely, land deliberately.
- The player must never be able to read the outcome early — mid-tumble faces must
  not telegraph the result.
- **Timing must be bounded and predictable.** We need a known, consistent settle
  time (the current 2D placeholder uses ~840ms). A physics sim that sometimes takes
  1.2s and sometimes 3s is unusable — the rest of the interface is waiting on it.
- If a die would land awkwardly (cocked, off-tray, mid-air), the design needs a
  defined recovery. Please decide what that looks like rather than leaving it.

If any of this pushes against the look you want, say so — but the constraint itself
isn't negotiable, so we'd rather adapt the design than the architecture.

## What to design

### 1. The seven dice

**d4 · d6 · d8 · d10 · d100 (percentile) · d12 · d20**

For each: the solid, its material, its numerals, and how a result reads at a glance.
The d20 carries the most weight — it's the die of every attack, check, and save — but
the set must look like one family. Percentile is conventionally two d10s (tens + ones);
decide how you want to present it and how the pair reads as one number.

Numerals must be legible **at small sizes on a phone**, at a glance, in motion.

### 2. Material and identity

The design system's own words: *"spend all boldness on this one object."* The rest of
Questra is restrained — hairlines, glass, warm near-black, one ember accent, no
decorative colour. The dice are the sanctioned exception.

Please explore what they're made of — bone, horn, worn ivory, cut stone, smoked glass,
metal — and how they catch light in a candlelit room. They should feel like objects a
person owns, not UI. Consider whether a natural 20 and a natural 1 look *materially*
different (a glow, an ember flare, a cold cast) rather than just being labelled.

### 3. The tray

Your system sketches it at **260×132** with a dashed hairline border. Where the dice
land, on the map surface. Design:

- the tray at rest (empty — is it visible at all, or does it only appear in use?)
- dice tumbling in it
- dice settled, result readable
- how it sits over a map without hiding what matters underneath
- how it clears

### 4. States and moments

- **Idle** — no roll in progress
- **Throwing** — dice in motion
- **Settled** — result readable, the die that matters highlighted
- **Advantage / disadvantage** — two d20s, one kept and one visibly discarded. This
  is a *design* problem worth real attention: the dropped die must read as dropped
  without becoming clutter.
- **Critical hit (natural 20)** and **fumble (natural 1)** — the two moments the
  whole table reacts to
- **Multiple dice at once** — damage rolls throw several (e.g. `2d6 + 3`); a fireball
  throws `8d6`. Please design how a handful reads without becoming noise.
- **Someone else's roll** — dice thrown by another player, seen on your screen
- **A secret roll** — the DM rolls something hidden. The table sees that *a roll
  happened* but not its result. This one is a real design problem, not a hidden div.

### 5. Reduce-motion — required, not optional

Some players get motion sick; some devices can't run this smoothly. There must be a
**still, dignified equivalent** that shows the same information with no tumbling —
and it should feel like a deliberate alternative, not a broken version of the good
one. We already ship a flat 2D die for this; improve on it.

Please also consider what a low-end phone gets. A 60fps physics sim isn't universal.

### 6. Sound

Dice sound is half the feeling. If you have opinions on what the tumble and the
landing sound like — and how it stays pleasant on the hundredth roll of a session —
we want them.

## What we'll build from your design

To be clear about the split, so you know what to hand over:

- **You design:** the dice, the tray, the material, the states, the moments, the
  reduce-motion alternative, the sound direction.
- **We build:** the renderer, the physics, and the landing-on-a-decided-face solve.
  We wire it to the server's roll events.

**We do not need production 3D code.** If it's easier to communicate the design as a
working prototype, that's welcome — but a prototype that rolls its own random numbers
is fine for *demonstration*, because we'll replace the number source with the server's.
What we need is the look, the timing, and the states decided.

If you do build something interactive, the interface we'll ultimately want is roughly:

```
show({ dice: ['d20', 'd20'], results: [14, 6], keep: 0 })   // advantage, keeps the 14
show({ dice: ['d6','d6','d6'], results: [4, 2, 6] })        // 3d6 damage
```

Results **in**, animation out. Never the reverse.

## A known limitation worth designing around

Right now our server reports the **d20** face for every roll, but for damage it
currently reports only the **total** (`"1d8 + 3"` resolves to a number) — individual
damage-die faces aren't in the event yet.

So: please design multi-die damage as though we have the faces (we intend to add
them), but know that the first shipped version may show damage as a single settled
total rather than individual dice. If that changes what you'd design for §4's
"multiple dice at once", tell us — it's a contract change we can make, and it's better
to make it because the design needs it than to quietly ship a lesser version.

## Voice

Any text near the dice follows the product voice: plain, warm, never jargon. We say
*scene*, never "beat"; *member* or *portrait*, never "node". Verdicts read like
"Critical hit" or "Miss — against Armor Class 15", never "SUCCESS: 19 >= 15".

## Deliverable

The dice and tray designed across the states in §4, including the reduce-motion
alternative, in your usual self-contained prototype format. Built against the Questra
design system (`--qa-*` tokens, IM Fell English / EB Garamond / IBM Plex Mono).

Use the existing table scenario so it's comparable to the Player View: Torvald swings
a longsword at a goblin — d20 with advantage, keeps the 14, hits Armor Class 15 for
`1d8 + 3` slashing.
