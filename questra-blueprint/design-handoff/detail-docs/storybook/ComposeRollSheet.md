# Primitives/ComposeRollSheet

**Story file:** `packages/web/src/primitives/ComposeRollSheet.stories.tsx`
**Component:** `packages/web/src/primitives/ComposeRollSheet.tsx`
**Brief:** 10 §2 (Play UI) · ADR-0008 (server dice + manual entry) · Brief 02 step 4 (advantage collapse)

---

## Screen

**The Player View.** The tap-to-roll surface: it opens when a player invokes an
action tile in the `ActionBar` and closes once the roll has settled and been
logged. It also appears inside `Play/PlayerHub` → `HubComposedReview`.

## What it is for

Two phases in one component:

1. **Compose** — the player states their position (advantage / straight /
   disadvantage), dials a situational modifier, and reads the live formula.
   Nothing has been rolled yet.
2. **Settling** — the server's `roll_made` event arrives; the die tumbles, lands
   on the number the server already chose, and the derivation rows + verdict
   resolve underneath it.

---

## How it functions

### THIS COMPONENT NEVER ROLLS

The single easiest thing to get wrong here, and the reason the file carries a
long doc-comment about it.

The Design prototype tumbles a local `Math.random()` d20. This component takes
that *choreography* — the ~840 ms tumble, the settle, the tone flash — but drives
it entirely from the `result` prop. Specifically:

- While tumbling it shows **arbitrary faces** (`useTumble` swaps a random 1–20
  every 70 ms). These are decoration over an already-decided outcome, never
  candidate values — a player who screenshots mid-animation learns nothing.
- `result` arriving is the **only** thing that settles the die. If it never
  arrives, the sheet tumbles until the caller unmounts it.
- The settled face is `keptAndDropped(result).kept` — the server's die.

### The advantage picker is a REQUEST, not a result

The three-way position control states what the player *thinks* they have. The
server re-derives the real collapse from effects (`collapseAdvantage`, Brief 02
step 4), and `result.collapsed` is what the settled sheet reports. A player who
claims advantage they don't have sees the server's answer, not their own — the
settled view renders a `Chip` from `result.collapsed`, never from `draft.position`.

### The live formula never shows a total

`composeFormula(subject, draft)` produces e.g.
`"2d20 keep highest + 3 STR + 2 Proficiency"`. It is a preview of the *request*.
A total only exists once the server has rolled, so the compose phase has no
number to show — showing one would imply the client computed it.

### The reveal sequence

```
result arrives → settledFor.current = result.rollId
              → setSettled(false)          ← tumble begins
              → setTimeout(TUMBLE_MS=840)
              → setSettled(true) + onSettled(rollId)
```

The `settledFor` ref guards against re-running the animation when React
re-renders with the same result. Changing `rollId` starts a fresh reveal.

### Once settled

- **Verdict line** — `verdictLine(result)`, plain English, no jargon:
  *Critical hit* / *Miss — a natural 1* / *Hit — against Armor Class 15*.
- **Tone** — `outcomeTone()` maps outcome → good/bad/neutral, which drives the
  die's border colour and a glow `box-shadow`.
- **Total** — a `StatBlock` from `@questra/ui`, the design's signature scale
  contrast (whisper label over a big number).
- **Chips** — `Advantage`/`Disadvantage` when the server collapsed, and
  `Entered by hand` when `entry === 'manual'`.
- **Derivation rows** — `resultRows(result)` as a `<dl>`: the kept die first
  (labelled `d20 (dropped 4)` when one was discarded), then every named
  modifier. These must sum to the server's total; `RollRow.value` is typed as a
  plain `number` (narrower than `InfoPanel`'s `DerivationLine`) precisely so the
  test can assert that sum.

### Accessibility notes

- The position control is a native `radiogroup` with `role="radio"` +
  `aria-checked`, **not** three `@questra/ui` `Button`s — that component takes a
  closed prop set and forwards no ARIA, so composing it would silently drop the
  roles. Design tokens are applied by hand instead.
- The die carries `aria-live="polite"` and swaps its label from `Rolling` to
  `Rolled 14`.
- The situational readout is `aria-live="polite"`; its steppers have explicit
  labels.
- `@media (prefers-reduced-motion: reduce)` kills the spin animation.

---

## The stories

All five are staged over a `TableBackdrop` (`height={520} center`) — glass is
judged over the map, never on a flat canvas.

| Story | Shows |
|---|---|
| `Compose` | The full loop. Compose → Roll → 400 ms → the fixture HIT arrives → the die settles. Has a `↺ compose again` reset. |
| `HitWithAdvantage` | Pre-settled with `d20: 14, secondD20: 6, collapsed: 'advantage'` — the 6 is named as dropped. |
| `Miss` | The full loop landing on a straight `d20: 4` → total 9 vs AC 15. |
| `CriticalHit` | The full loop landing on a natural 20 → the crit verdict and good tone. |
| `EnteredByHand` | `entry: 'manual'` → the same surface, flagged with a gold chip (ADR-0008 physical dice). |

### The harness stands in for the sync client

`onCommit` does **not** roll. It sets `pending`, waits 400 ms, then hands back a
pre-decided fixture `roll_made` body — exactly the way the sync client will hand
over the server's event in M3.6. The dice you see in Storybook are the fixture's
dice.

## Fixtures

Torvald's longsword swing at the goblin, from the canonical trace: STR +3,
Proficiency +2, vs AC 15. Three fixture server answers (`HIT`, `MISS`, `CRIT`)
represent what `roll_made` will carry off the wire.

## Related files

- `sheetToPlayerHub.ts` — `composeFormula`, `keptAndDropped`, `resultRows`,
  `outcomeTone`, `verdictLine`, and the `ComposeDraftVM` / `ComposeSubjectVM` /
  `RollResultVM` types.
- `ComposeRollSheet.test.tsx` — the only component-level test suite in the
  primitives directory.
