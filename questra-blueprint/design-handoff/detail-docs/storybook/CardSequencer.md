# Primitives/CardSequencer

**Story file:** `packages/web/src/primitives/CardSequencer.stories.tsx`
**Component:** `packages/web/src/primitives/CardSequencer.tsx`
**Spec:** Build Playbook §3 · Session Planner design spec · Campaign Wrapper design spec

---

## Screens

**Two screens, one primitive** — the "one pattern, three floors" ordering made
concrete:

| Screen | What it orders | `itemNoun` |
|---|---|---|
| **Session Planner** | Scenes within a session | `"scenes"` |
| **Campaign Wrapper** | Sessions within a campaign | `"sessions"` |

The Playbook lists further uses in the same family (ordering any card list where
sequence carries meaning), but these two are the canonical ones the stories
cover.

## What it is for

Owning **order and nothing else**. The caller decides what a card looks like;
the sequencer frames it, numbers it, and reports the new order.

---

## How it functions

### Content-agnostic

Each item is a `SequenceItem {id, render: ReactNode}`. The sequencer renders the
node inside its frame and never inspects it. This is why the same component
serves scenes and sessions with no branching — the difference is entirely the
caller's card component and the `itemNoun`.

### It owns no data

`onReorder(nextOrderedIds)` fires with the full reordered id list on every move.
The caller owns the array and re-renders. The sequencer holds only transient
drag state and the announcement string.

### Keyboard-first, drag second

The stated principle: *accessibility is not an enhancement.*

- **Every item has explicit Move up / Move down buttons.** These are the primary
  mechanism, and they work with no pointer at all. First item's Up and last
  item's Down are disabled.
- **Native HTML5 drag is layered on top** for mouse users (`draggable`,
  `onDragStart` / `onDragOver` / `onDrop`). The dragged card drops to 50%
  opacity.
- Drag never becomes the only way to reorder.

`moveTo(from, to)` is the single reorder path both mechanisms call, with bounds
guards for `to < 0`, `to >= length`, and `from === to`.

### Screen-reader announcements

An `aria-live="polite"` visually-hidden region announces every move in plain
language: *"Moved scene to position 3 of 4."* Note the singularisation —
`itemNoun.replace(/s$/, '')` turns `"scenes"` into `"scene"` for the
announcement and for every button label (`Move scene up`, `Remove scene`).

### Plain language

CLAUDE.md non-negotiable #7. These are **scenes** and **sessions** — never
"beats", never "nodes". The component enforces this by taking the noun from the
caller and threading it through every generated string, so there is no
hardcoded jargon to leak.

### Optional removal

`onRemove` is optional. Omit it for fixed-membership lists and the ✕ button
never renders. When present it renders in `--q-danger`.

### Presentation

Each row is a `.qa2-card`: a grip glyph and the 1-based position in a disc (both
`aria-hidden`, since the buttons carry the semantics) → the caller's content →
the control column of `.qa2-mini` buttons. Rows are separate cards with a gap
rather than a welded list, so a card being dragged reads as a card.

Drag state is drawn on both ends: the row being dragged dims, and the row it is
over takes an accent border — the drop target used to be invisible.

**The number is information.** This is one of the few lists in the product that
earns its numbering: "which scene is this" is a real question a DM asks, and the
answer changes when the order does. Numbers as decoration are exactly what the
design language rules out elsewhere.

The marks are drawn glyphs (`grip`, `chevronUp`, `chevronDown`, `close`), not
the `⠿ ▲ ▼ ✕` characters they replaced — box-drawing characters render at a
different weight in whatever font the user happens to have. Every value is a
`--qa-*` token, enforced by the type-hygiene suite.

---

## The stories

| Story | Shows |
|---|---|
| `ScenesInASession` | Four scenes (market, ambush, almshouse, vault) with remove enabled. Live state — reorder and delete both work. |
| `SessionsInACampaign` | Three sessions. Same primitive, different noun, **no** `onRemove` — so no ✕ column. |

Both hold their list in harness state so the controls are genuinely exercised
rather than static. The scene cards are a tiny local `SceneCard` component
(title + note), demonstrating that the card body is entirely the caller's.

The pairing is the point: the two stories differ only in the data and the
`itemNoun`, which is the evidence that one primitive covers both screens.
