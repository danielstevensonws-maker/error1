# Primitives/PresetsAboveFreeForm

**Story file:** `packages/web/src/primitives/PresetsAboveFreeForm.stories.tsx`
**Component:** `packages/web/src/primitives/PresetsAboveFreeForm.tsx`
**Spec:** Build Playbook §3 · Character Creation Wizard spec · Onboarding spec (Floor 1) · Portrait style prompt system

---

## Screens

| Screen | Use |
|---|---|
| **Character Creation Wizard** | Wizard steps — class fantasy, appearance traits for the portrait prompt, backstory hooks |
| **Campaign Wrapper** | The campaign premise |
| **Session Planner** | Scene creation, scene tags |
| **Onboarding (Floor 1)** | The first-run "what kind of game" prompts |

## What it is for

The design principle in one component: **presets teach the beginner without
caging the veteran.** Tap a chip to learn what a good answer looks like, or
ignore them entirely and type your own. Presets are a starting point, never a
fence.

---

## How it functions

### Two selection shapes, one component

A discriminated union on `mode` gives two genuinely different behaviours:

**`'pick'` (single, the default)** — the field always holds exactly one value.

- Choosing a preset **replaces** the free-form text with that preset's label.
- Re-tapping the active chip clears the field.
- The active chip is derived, not stored: `presets.find(p => p.label === value)`.
- Consequence: editing the text after picking naturally leaves all chips
  unselected — you've gone your own way, and the UI reflects that without any
  extra state.

Used for: a campaign premise, a class fantasy — anything that is one answer.

**`'tags'` (multi)** — the value is a `string[]`.

- Presets are toggles.
- Free-form entries become tags too: type and press **Enter** (or blur) to add.
- Custom tags render as removable chips, visually distinct from the preset
  chips by being always-on. The distinction is behavioural, not decorative: a
  preset you deselect is still on offer, but something you typed has nowhere to
  go back to, so it needs a delete rather than a deselect.
- Duplicates are rejected on add.

Used for: appearance traits, scene tags — anything additive.

### Controlled, caller owns the data

`value` / `onChange` in both modes. The only internal state is the `draft` text
buffer in tags mode, which is transient by nature (it empties on add).

### Shared internals

`PickField` and `TagsField` share a `Labelled` wrapper (label, then the offers,
then the box you can ignore them in) and the shared layer's `Tag`, `Help` and
`.qa2-open` text field — so the two modes are visually identical apart from
behaviour. Chips carry `aria-pressed` for toggle semantics; labels are
associated via `useId()` + `htmlFor`. Every value is a `--qa-*` token, enforced
by the type-hygiene suite.

The label sits **above** the chips rather than boxed with the input (unlike
`PublicSecretField`'s `Field`), because it names the whole question and the
chips are part of the answer to it.

**Chips you can press look pressable.** The play HUD's chips carry no border
when unselected — correct there, where one is always lit and the rest should sit
back. On an authoring screen nothing is chosen yet and the presets *are* the
teaching mechanism (law 5), so an unpressed chip keeps a hairline. The row also
gets a target sized for a finger rather than the HUD's 1 px, via `.qa2-offers`.

The free-form input's default placeholders state the escape hatch explicitly:
*"Or write your own…"* (pick) and *"Add your own — press Enter"* (tags).

---

## The stories

| Story | Mode | Shows |
|---|---|---|
| `Premise` | `pick` | Campaign premise with four spark presets (heist gone wrong, haunted frontier town, war on two fronts, fae court intrigue). Starts empty. |
| `AppearanceTraits` | `tags` | Portrait traits (Scarred, Weathered, Regal, Youthful), starting with `['Weathered']` selected. |

`AppearanceTraits` prints the live `JSON.stringify(values)` beneath the field, so
you can watch preset toggles and free-form additions land in the same array —
the evidence that a typed trait is a first-class value, not a lesser one.

Both stories are live-state harnesses, so the pick-then-edit behaviour (which
deselects the chip) is exercisable directly.
