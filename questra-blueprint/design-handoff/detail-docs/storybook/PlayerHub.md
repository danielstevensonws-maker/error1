# Play/PlayerHub — SUPERSEDED

> **This describes code that no longer exists.** There were two authored
> directions for the Player View; the owner picked v2, and this one — the hub
> bar docked to the bottom of a map — was deleted along with `VitalsBar`,
> `ActionBar`, `DeathSaveCard`, `DiceLog`, `PlayerMenu`, `StatBar`,
> `SceneHeader`, `TurnStrip` and `sheetToPlayerHub`. See
> [PlayerViewV2.md](PlayerViewV2.md) for the surface that shipped.
>
> The document is kept for the design reasoning in it — the dying ladder, the
> greying rule, the seam from `ComputedSheet` to a hub view-model — all of
> which v2 re-implements rather than discards. Read it as a record, never as a
> description of the tree. Everything below this line is as it was written.

**Story file:** `packages/web/src/primitives/PlayerHub.stories.tsx` *(deleted)*
**Storybook title:** `Play/PlayerHub` — the only story file outside the `Primitives/` tree.
**Brief:** 10 §2 (Play UI) · dying ladder from Brief 04 · legality from Brief 02/05

---

## Screen

**The Player View** — the whole in-play surface a player looks at during a
session. This story file is the closest thing in the repo to a screen: `Hub` and
`HubComposedReview` are the §2 component tree fully composed.

## Components covered

Five product components ship from this one file. The four leaf components have
**no story file of their own** — their isolated stories live here.

| Component | File | Story that isolates it |
|---|---|---|
| `PlayerHub` | `PlayerHub.tsx` | `Hub`, `HubDyingFlip`, `HubComposedReview` |
| `VitalsBar` | `VitalsBar.tsx` | `Vitals`, `VitalsBloodied` |
| `ActionBar` | `ActionBar.tsx` | `Actions`, `ActionsGreyed` |
| `DeathSaveCard` | `DeathSaveCard.tsx` | `DeathSaves` |
| `DiceLog` | `DiceLog.tsx` | `Log` |

`ComposeRollSheet` also appears in `HubComposedReview`, but has its own story
file — see [ComposeRollSheet.md](ComposeRollSheet.md).

---

## How it functions

### The composition tree

```
PlayerHub
├── character panel   IdentityHeader (Avatar + name + level)
│                     VitalsBar   (dimmed when dying)
│                     readiness   (init · hit dice · carrying, pinned bottom)
├── StatBar           its own panel, paired beside the character panel
└── action panel      TurnStrip                     ← attached to this panel
                      ActionBar ⇄ DeathSaveCard     ← THE FLIP

SceneHeader and DiceLog are siblings on the screen, not children.
```

### Three panels, one chrome contract (2026-08 redesign)

    [ character ][ stats ]        [ turn strip ]
                                  [ action bar ]        (log, a sibling)

Grouped by the question each panel answers. **Who you are** (character + stats)
pairs off to the left; **what you can do** takes the centre of the screen,
because it is the only panel a player actually operates — the other two are
read, not clicked. The turn strip is attached to the *action* panel rather than
spanning the whole bar: whose turn it is, what you're aimed at, and how far you
can move are all facts about acting.

These were briefly merged into one hairline-divided frame to stop three cards of
three different widths (240 / 216 / 340) and two different radii from
disagreeing. Separation came back by request — and the fix turned out to be
portable. **It was never the merging; it was the shared chrome contract:** one
radius (`large`), one padding (`--qa-s4`), one internal rhythm (`--qa-s3`), one
fill, one type ramp. That contract lives in `PlayerHub`'s `HubPanel`, and in
`StatBar`'s own `Panel` for when it ships standalone — **those two must be kept
in step.** Build any new hub surface through `HubPanel` and they cannot drift
apart again.

Also worth knowing:

- `StatBar` takes a `chrome` prop: `panel` (default, its own surface) or `bare`
  (no wrapper, for a parent that owns the chrome).
- **AC is no longer duplicated.** It used to render in both `VitalsBar` and
  `StatBar`'s header. It now lives only with the vitals, where a defensive
  number belongs; `StatBar`'s footer carries speed and passive perception.
- The gap in the middle of the character panel is **reserved, not dead** — it's
  where condition chips render. The readiness line is pinned to the bottom
  (`marginTop: auto`), which lands it on the same baseline as `StatBar`'s
  footer chips.
- `Panel` gained an `aria-label` prop so each surface can name its region.

### The flip

The single most important behaviour. `PlayerHub` takes an optional `dying`
prop. When it is present **and** `dying.phase !== 'up'`:

- `ActionBar` is replaced by `DeathSaveCard`
- `VitalsBar` receives `dimmed` and fades to 45% opacity

Revive flips it back. There is no local state involved — the flip is a pure
function of the `dying` view-model, so the server's dying ladder (Brief 04)
drives it entirely.

### Zero component-local game state

Every number on screen arrives as a view-model built by
`sheetToPlayerHub.ts` from two inputs: a contracts `ComputedSheet` and an engine
projection `Combatant`/`ProjectionState`. The components hold UI state only
(open tabs, expanded rows) — never game state.

### Greying is the server's answer, not the client's

`toActionTiles()` runs every tile through `greyingReason()` — the **shared**
legality function imported from `@questra/engine`, the same one the server calls
to reject an illegal intent. The returned `greyReason` is either `null` (legal)
or the exact server reject string, which becomes:

- the tile's `title` (tooltip), and
- `aria-disabled` + 50% opacity.

Client and server therefore cannot disagree about what is legal. `ActionsGreyed`
demonstrates this by handing the same tiles a projection where it is *not*
Torvald's turn — every tile greys, each carrying the real reject text.

### No orphan math

`VitalsBar` renders AC and each condition as a **button** carrying a `?`. Tapping
fires `onExplain(ref)` where `ref` is `'ac'` or a condition id — the caller opens
an `InfoPanel` on that derivation. `toVitals()` packs the AC derivation
(`sheet.acOptions[sheet.acDefault].derivation`) into the view-model precisely so
that panel has something to show. Brief 10 §1: every number renders from a
Derived value.

### Typography — five roles, three sizes

The hub had drifted into **four sizes doing one job**: `8.5px`, `9px`, `9.5px`
and the real `--qa-text-whisper` (10px) were all rendering "small mono caps
label", plus one-off `13px`/`22px`. Nothing caught it — `packages/ui`'s
token-hygiene suite scans only that package, and these primitives live in
`packages/web`.

`hudType.ts` replaces sizes with **roles**, so a component cannot pick a number:

| Role | Token | Font |
|---|---|---|
| `sectionLabel` | whisper 10 | mono, caps, tracked |
| `name` | lg 20 | IM Fell English |
| `statValue` | lg 20 | mono |
| `statMeta` | **label 12** | mono |
| `itemName` / `prose` | **label 12** | EB Garamond |

The rule underneath (Player View design request §3): **prose is a serif, data is
mono** — a player should be able to tell at a glance whether they're reading the
story or reading their character. `--qa-text-label` (12px) was previously unused
in the hub, which is exactly why `13px` kept being invented to fill the 10→16
gap. No new tokens: `packages/theme` is byte-identity-guarded against the
upstream Claude Design project, so the ramp had to be composed from what exists.

`packages/web/test/hud-type-hygiene.test.ts` now fails the build on a numeric
`fontSize`, a directly-named font family, a colour literal, or a literal
duration in any HUD file. It is scoped to the HUD file list rather than all of
`packages/web` — the wizard/lobby surfaces have their own drift, and failing on
those here would just get the suite skipped. Widen `HUD_FILES` as they land.

### Component detail

**`VitalsBar`** — composes `HPBar` + `Chip` from `@questra/ui` rather than
reinventing bars and pills. Computes nothing except display: `bloodied` is
already decided in `toVitals()` as `hp > 0 && hp <= floor(maxHp/2)` and surfaces
as a danger `Chip`. Temporary HP renders as a separate `+N temporary` line.

**`ActionBar`** — two labelled rows, not three: Action on its own (usually the
busiest economy), Bonus and Reaction sharing a second row split by a hairline
divider (three full-width rows read as too tall and too empty once
Bonus/Reaction's typical 1-2 real tiles are padded out). Attacks are hard-coded
to the `action` row and resource-bearing features to `bonus` in
`toActionTiles`. The dashed `+` placeholder sockets are real progression slots
(where a future ability will go), not filler — they still pad each economy out
to its own `minSlots`.

To-hit and damage are **off the tile face**, in a reserved **detail strip**
under the rows. Not an expanding tile: an expanding tile reflows its row, so
sweeping the mouse across six sockets makes the bar jitter. The strip is fixed
height, so nothing above it ever moves. It also gives greying somewhere honest
to live — the reason used to replace the tile's *name* and wrap to three ragged
lines, which is what made a greyed row look broken. Now the tile keeps its name
and the strip carries the explanation ("It isn't Torvald's turn."). With nothing
hovered the strip falls back to the first legal tile, so it is never empty.

**`TurnStrip`** — turn badge · target chips · movement meter, along the frame's
top edge. The hub had every number a character *sheet* holds and nothing a
*turn* holds, which is the other half of why it read as static: a sheet is a
document, a turn is a game. The badge is the one accent-filled element in the
whole HUD; targets use the accent *line* only, so nothing competes with it.
Deliberately **not animated** — CLAUDE.md law 4 prefers glanceable state over
motion that pulls the eye while another player is talking, and a static fill
plus `--qa-accent-glow` needs no reduced-motion variant.

**`SceneHeader`** — scene name, round, whose turn, session clock. Floats
top-centre, non-interactive.

**`DeathSaveCard`** — three success pips, three failure pips, one big button.
Disabled unless `phase === 'dying'`. Headlines per phase: *Making death saves /
Stable / Dead / Back on your feet*. Never mutates counters locally — it reports
the roll and the server decides.

**`DiceLog`** — an `<ol>` of already-formatted entries, newest last. Entries have
a `tone` (`roll` | `narration` | `system`); narration renders in full-strength
ink, rolls in soft ink. A roll entry may carry a `breakdown` (rendered as a mono
`"STR +3  Proficiency +2"` line) and a `total` (right-aligned mono). The text is
the engine's plain-English narration, so the log reads like table talk.

---

## The stories

| Story | Shows |
|---|---|
| `Vitals` | Healthy Torvald — HP 12/12, AC 18, no conditions. `onExplain` logs. |
| `VitalsBloodied` | HP 5/12 → the `Bloodied` chip appears, plus a Prone condition chip. |
| `Actions` | Torvald's turn — all tiles legal and live. |
| `ActionsGreyed` | The goblin's turn — every tile greyed, tooltip = server reject string. |
| `DeathSaves` | 1 success / 2 failures, live: clicking adds a success (harness state only). |
| `Log` | A roll entry with breakdown + total, followed by a narration entry. |
| `Hub` | The full tree, healthy state. |
| `HubDyingFlip` | HP 0 → ActionBar replaced by DeathSaveCard, vitals dimmed. |
| `HubComposedReview` | **The review story.** Hub + ComposeRollSheet side by side over the map. |

### `HubComposedReview` is the one to judge from

It puts every hub primitive on screen at once, in the design's real context:
identity header, bloodied+prone vitals, action tiles including a greyed one, a
three-entry dice log, and the compose sheet mid-roll. It exists so composition
can be judged directly rather than inferred from isolated parts — which
components hold up wearing the right tokens, and which are structurally wrong.

---

## Fixtures and staging

- **`torvald-sheet.json`** — the real contracts fixture, cast to `ComputedSheet`.
- **Torvald / goblin `Combatant`s** — hand-built to the trace's stated stats
  (Torvald: STR 16, AC 18, 12 HP; goblin: AC 15, 10 HP).
- **A 10×7 fully-revealed room** with both tokens placed.

Every story in this file is wrapped in a `TableBackdrop` decorator carrying that
room. This is deliberate: the design's panels are translucent glass meant to
float over the map, and on Storybook's flat canvas they read as washed out. The
backdrop reproduces the Player View's actual ground so what you see is what the
player sees. See [TableBackdrop.md](TableBackdrop.md).

## Related files

- `sheetToPlayerHub.ts` — the view-model seam (`toVitals`, `toActionTiles`).
- `sheetToPlayerHub.test.ts` — tests for that seam.
