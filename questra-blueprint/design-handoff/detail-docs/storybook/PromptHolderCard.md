# Primitives/PromptHolderCard

**Story file:** `packages/web/src/primitives/PromptHolderCard.stories.tsx`
**Component:** `packages/web/src/primitives/PromptHolderCard.tsx`
**Brief:** 08 §1 (boss machinery & the interrupt prompt) · Brief 05 rule 7 (server owns lifecycle)

---

## Screens

**Both play screens — it renders wherever the prompt's holder lives.**

| Holder | Screen it appears on |
|---|---|
| A player character's reaction | **Player View** (that player's screen only) |
| A monster, boss, or lair | **DM View** (the DM panel) |
| Anyone, when the DM answers for them | **DM View**, with the `asDm` note |

It is an overlay/interrupt surface, not part of either screen's resting layout.
One modal-priority prompt at a time per viewer.

## What it is for

Brief 08 §1: **one card, used six ways.** Rather than six bespoke interrupt UIs:

1. Opportunity attacks
2. Reaction features
3. Readied actions
4. Legendary actions
5. Legendary resistance
6. Lair actions

Plus two DM-facing decision kinds from the Playbook §3 table: `ruling` and
`rest`.

---

## How it functions

### The server owns the lifecycle

The card only *surfaces* the prompt and reports take/decline. It never decides
the outcome. Default timeout is 60 s ⇒ declined, and the server enforces that
independently — the countdown here is a **mirror**, not the authority.

The countdown is computed from a `Date.now()` baseline captured on mount and
ticked every 250 ms, so it stays accurate even if the tab throttles timers. On
reaching zero it calls `onDecline()` exactly once, guarded by `declinedRef` so a
re-render can't fire it twice.

### Urgency

At `remaining <= 10` the card turns urgent: the border and the countdown bar
switch to `--q-danger`, and so does the numeric readout.

The bar itself is a simple `width: pct%` div with a 250 ms linear transition,
matching the tick interval so it reads as smooth.

### The deliberate contract gap

`context` is `string[]` — pre-summarized plain lines — and the doc-comment is
explicit about why. Brief 08 §1 calls for a typed `PromptContext` discriminated
union, and that is an acknowledged **future contract PR**. Until it lands, this
card renders pre-formatted lines so that no contracts shape is invented here in
a feature (CLAUDE.md non-negotiable #1).

When `PromptContext` ships, the caller formats it into lines and **the card is
unchanged**.

> Note: `packages/contracts/src/play/events.ts` currently has uncommitted
> changes adding a `PromptContext` union — so this gap may be in the process of
> closing.

### Options vs. the bare Take/Decline

- With `options`: each renders as a quiet button carrying an optional `detail`
  suffix (`Reaction`, `2 actions`, `1 point`), then a spacer, then `Decline`.
  `onTake(optionId)`.
- Without: a single accented `Take` / `Decline` pair. `onTake()` with no
  argument.

**The accent answers "whether", not "which".** A bare prompt asks one question —
take it or not — so Take is the committing action and wears the accent. A menu
of costed moves asks a different question, and the accent has no answer to it:
rendering every option accented made a one-point Detect shout as loudly as a
two-point Wing Attack. Options are a menu — quiet, equal, with their cost on
them. Decline keeps danger either way.

### The DM can always answer for anyone

Brief 08 §1. `asDm` adds an italic *"Answering for {holder}."* note in the body.
The card's behaviour is otherwise identical — the DM is simply exercising the
holder's choice.

### It is the same material as the assistant's card

Both arrive over whatever you were looking at, asking for one decision, so both
are built on `.qa2-modal` — glass, three bands, one rhythm — and differ only in
width and contents. They were two hand-rolled glass cards that had already
drifted apart in padding, shadow and button styling; two interrupts reading as
two different products.

This card's one addition is the countdown bar across the top, which turns
danger-coloured at ten seconds. That is the only moment this card raises its
voice.

### Accessibility & theming

- `role="alertdialog"` with a label combining kind and holder.
- The countdown carries `aria-label="{n} seconds left"` on a `<time>` element,
  with `tabular-nums` so the digits don't jitter.
- Type comes from the shared ramp's roles; chrome from `design/styles.tsx`. The
  card is on the `HUD_FILES` list, so it cannot drift back.

---

## The stories

| Story | Kind | Shows |
|---|---|---|
| `OpportunityAttack` | `opportunity_attack` | The **real Goblin Warrior fixture's** first attack as the option. Context lines: reaction available, target within 5 ft. |
| `LegendaryAction` | `legendary` | An Ancient White Dragon with three pooled-cost options (Detect 1, Tail 1, Wing 2). |
| `LairAction` | `lair` | The frozen cavern acting at initiative 20, with a `Skip` option. |
| `DmAnswersRuling` | `ruling` | The DM answering for Torvald — the `asDm` note, suggested check + DC as context. |

### Why the timeouts are 600 s

Every story sets `timeoutSec: 600`. This is a **Storybook-only** accommodation:
with the production 60 s, a static snapshot or a left-open story would
auto-decline itself and you'd be looking at the resolved state. In production
the server owns the real 60 s.

### The `Resolvable` harness

The first three stories wrap the card so taking or declining replaces it with
`Took: {id}` / `Declined.` — making the reported outcome visible.
`DmAnswersRuling` skips the harness so the `asDm` note stays on screen.
