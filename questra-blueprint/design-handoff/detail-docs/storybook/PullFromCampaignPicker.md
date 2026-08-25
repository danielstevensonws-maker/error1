# Primitives/PullFromCampaignPicker

**Story file:** `packages/web/src/primitives/PullFromCampaignPicker.stories.tsx`
**Component:** `packages/web/src/primitives/PullFromCampaignPicker.tsx`
**Spec:** Build Playbook §3 · Session Planner design spec

---

## Screens

**The Session Planner**, primarily — with the same pattern reaching into
campaign-level authoring.

| Screen | What gets pulled |
|---|---|
| **Session Planner** | Cast → scene, locations, rewards, recurring maps |
| **Campaign Wrapper** | Campaign-level references into a session |

## What it is for

**Reference, don't duplicate.** Anywhere you point at something that already
exists in the campaign instead of authoring it fresh. The picked item stays one
source of truth; the scene merely points at it — so editing the NPC once updates
every scene that references them.

---

## How it functions

### Content-agnostic view-models

The picker takes `PickableItem[]`:

```ts
interface PickableItem {
  id: string;
  name: string;
  kind: string;   // plain-language category: "Cast", "Location", "Reward"
  hint?: string;  // one-line hint: a role, a district, a rarity
}
```

The caller maps its campaign entities into that shape. This is **the same seam
`entityToInfoPanel` is for `InfoPanel`** — an adapter at the boundary means the
picker needs no knowledge of cast vs. locations vs. rewards, and a new pullable
category needs no component change.

### It owns no data

`selectedIds` in, `onChange(nextSelectedIds)` out. Fully controlled.

### Single vs multi select

- `mode="multi"` (default): toggling adds/removes from the set.
  `aria-multiselectable={true}`.
- `mode="single"`: selecting collapses to `[id]`; re-selecting the same item
  clears to `[]`. Used for "the one recurring map this scene uses".

### Search

Local filter over `name`, `kind`, and `hint`, case-insensitive, memoised on
`[items, query]`. Empty query returns everything.

### Two distinct empty states

A detail worth noting — the component distinguishes them:

| Condition | Message |
|---|---|
| Query typed, nothing matched | `No matches.` |
| No query, no items at all | the `emptyLabel` prop (default: *"Nothing in the campaign to pull from yet."*) |

The second is the *fresh campaign* case, and giving it a caller-supplied message
lets each context say something useful (*"No rewards defined in this campaign
yet."*).

### Accessibility

Proper listbox semantics: `role="listbox"` with `aria-multiselectable`, each row
`role="option"` with `aria-selected`. The search input has a visually-hidden
`<label>` via `useId()`. The checkbox mark is `aria-hidden` since `aria-selected`
already carries the state.

### Presentation

One boxed control — `.qa2-picker`: a search line over a list that scrolls at
420 px. Boxed because a search that scrolled away from its own results would be
two controls, not one.

Each row is the shared `.qa2-row`: tick → name over hint → the `kind` label
right-aligned in small-caps mono. Rows are flat until you touch them, so a long
list reads as a list rather than forty competing cards; selected rows take the
accent wash.

**The tick's column is reserved whether or not it is ticked**, so picking an
item does not shove its name sideways under the cursor. Every value is a
`--qa-*` token, enforced by the type-hygiene suite.

---

## The stories

| Story | Mode | Shows |
|---|---|---|
| `PullIntoScene` | multi | Three items with the first pre-selected. Toggle several into a scene. |
| `SinglePick` | single | "Recurring map for this scene" — selection collapses to one. |
| `Empty` | — | A fresh campaign with a custom `emptyLabel` for rewards. |

### The fixtures prove the adapter pattern

The first two stories build their items from **real contracts fixtures** parsed
through `RulesEntitySchema` — Goblin Warrior, the Fighter class, Fireball — via
a local `toPickable()` adapter:

```ts
kind = entityType === 'monster' ? 'Cast'
     : entityType === 'class'   ? 'Class'
     : 'Reference';
hint = entity.plain;
```

Goblin Warrior standing in as a recurring foe pulled into the cast is the
realistic case. The point of using fixtures rather than invented sample data is
to prove the picker references existing contracts content with **no bespoke
shape** — the adapter is four lines and lives in the caller.
