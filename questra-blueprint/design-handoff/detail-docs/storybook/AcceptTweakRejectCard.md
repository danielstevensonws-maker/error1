# Primitives/AcceptTweakRejectCard

**Story file:** `packages/web/src/primitives/AcceptTweakRejectCard.stories.tsx`
**Component:** `packages/web/src/primitives/AcceptTweakRejectCard.tsx`
**Adapters:** `packages/web/src/primitives/aiOutputToCard.ts`
**Spec:** AI Orchestration §4 · CLAUDE.md non-negotiable #5 · ADR "AI always has a non-AI fallback"

---

## Screens

**Global — every AI touchpoint on every screen.** Orchestration §4 states it
flatly: *"Any AI output that populates UI renders into the single
accept/tweak/reject card."* There is no second AI presentation anywhere in the
product.

Named consumers:

| Screen | AI output it frames |
|---|---|
| DM Play View | Rulings, NPC lines, read-aloud text |
| Player View journal | Ruling suggestions on a player's free text |
| Campaign Wrapper | Premise drafts, bond proposals |
| Session Planner | Scene sequences, recaps |
| Character Wizard | Backstory drafts, portrait prompts |
| Level-up | Level-up nudges |

Briefs 09a (AI image), 09b (AI creative text), 09c (AI table-time) all render
through this card.

### The second presentation that used to exist

The play screen's journal had grown its own version — a quote, a paragraph, and
a generic `actions: {label, onClick}[]` array. Three buttons that happened to be
captioned Accept-ish, Tweak-ish and Reject-ish, with nothing tying them to the
guarantee. It renders **this** card now, inline, which is what `placement` is
for.

---

## What it is for

Being the universal AI-output *grammar* — and enforcing exactly one rule.

---

## How it functions

### Suggests, never commits

CLAUDE.md non-negotiable #5. Nothing here auto-applies. The draft sits in the
card until a human accepts it, tweaks it, or rejects it — **three motions,
always all three**, so the human gate is structural rather than a policy someone
could forget to implement.

### The host owns the state machine

The card never transitions itself. It reports intent through callbacks
(`onAccept` / `onTweak` / `onReject` / `onSaveTweak` / `onUndo`) and the host
flips `state` and `outcome` in response — the same way `InfoPanel`'s open/close
lives in its caller. `InteractiveLoop` is the story that demonstrates the whole
cycle; every other story is one frozen frame of it.

| `state` | What it shows |
|---|---|
| `streaming` | The body with a blinking caret and `aria-busy`, **no footer** — you cannot accept a draft that is still arriving. |
| `draft` | The proposal and the three motions. |
| `tweak` | A focused textarea seeded from `text`, with `Save changes` / `Cancel`. |
| `fallback` | The difficulty ladder, when there was no model to ask. |
| `resolved` | What was decided, and Undo. Terminal — no footer. |

### Two placements, one object

| `placement` | Where | What changes |
|---|---|---|
| `float` (default) | Over the map. It interrupted you. | Glass, its own shadow, 560 px, and Reject pushed to the far edge by a flex spacer so the destructive motion is never adjacent to the primary one. |
| `inline` | One item in the journal's stream. | No glass of its own (it is already on the rail's), an accent rule down the left edge, compact buttons, and no far edge to push Reject to. |

Both are built on `.qa2-modal` — the shared glass-card chrome, which
`PromptHolderCard` also uses. A suggestion and a held prompt arrive the same
way: over whatever you were looking at, asking for one decision.

### Content-agnostic by design

`kind` selects the body shape, and neither shape knows anything about a
particular AI schema — `aiOutputToCard.ts` is the seam, exactly as
`entityToInfoPanel.ts` is for `InfoPanel`. A new AI output schema needs a
mapping there, never a change here.

| `kind` | Body |
|---|---|
| `text` | `text` as prose, in the narration role. |
| `structured` | `rows` as label/value lines. `variant` picks the value's type role: `value` (prose), `number` (mono numeral), `note` (an italic consequence, which stacks under its label rather than being squeezed into the right half of a narrow rail). |

`quoted` sits above either body: what the player *said* that prompted this, so a
suggestion in a busy journal still says what it is answering.

### Tweak is offered on rulings too

`onTweak`'s presence decides whether the button exists — but its presence is now
the *only* condition. The card used to refuse Tweak on structured content, which
conflated two different things:

- **A ruling's rows are not free-text editable.** True, and the tweak *mode*
  stays prose-only for that reason.
- **A ruling cannot be argued with.** False, and law 1 says the opposite: the
  engine resolves the maths, the table decides the fiction.

A structured host answers Tweak by opening the ladder; a prose host opens the
editor. The labels are the caller's — the Player View journal renders them as
"Ask for the roll", "Change it", "No roll needed" — but the meanings are not
negotiable, and a caller cannot invent a fourth.

### The non-AI fallback

An ADR-level requirement: AI always has a non-AI fallback. `state="fallback"`
swaps the eyebrow to `Fallback` and renders `fallbackOptions` as the difficulty
ladder above the prompt *"set the difficulty yourself"*.

**Every rung is a real choice.** They used to be plain `<div>`s: pressing Hard
did nothing, and Accept applied the recommendation whatever you had pressed — a
menu that lied, under a prompt promising the opposite. They are radios now, the
recommendation is the starting position rather than the answer, and Accept
renames itself to whichever rung is armed (`Use Hard (18)`) so the button cannot
promise a difficulty other than the one it will apply. An explicit `acceptLabel`
still wins.

### Telemetry

`onOutcome(outcome)` fires on every terminal action with `'accepted' |
'tweaked' | 'rejected'`. Orchestration §4 treats this as the quality metric for
every prompt — the accept rate *is* how a prompt is judged.

### Presentation

- The accent dot in the header is quiet provenance ("an assistant wrote this"),
  never a warning icon. It is the one thing that does not vary with placement.
- Type comes from the shared ramp's roles; chrome from `design/styles.tsx`.
  The card is on the `HUD_FILES` list, so it cannot drift back.
- Reduced motion disables the caret and the card's entrance.

---

## The stories

Staged over the **real map** (`MapCanvas` at `fit="fill"`), not a gradient
standing in for one — glass judged against flat paint is judged wrong.

| Story | Shows |
|---|---|
| `DraftText` | A prose draft, seeded from the **real Fireball fixture's** `plain` line. |
| `DraftStructured` | A ruling as rows, validated through the real `RulingSuggestionSchema` before being adapted. Tweak offered, labelled "Change it". |
| `Inline` | The same card docked in a rail — what the Player View journal renders for a suggestion. |
| `Streaming` | Mid-arrival: blinking caret, `aria-busy`, no footer. |
| `TweakMode` | The editor, with `Save changes` / `Cancel`. |
| `Fallback` | The real `DIFFICULTY_LADDER` as pickable rungs; Accept tracks the armed one. |
| `ResolvedAccepted` / `ResolvedTweaked` / `ResolvedRejected` | The three terminal states, each with Undo. |
| `InteractiveLoop` | The host driving the whole machine: a stream completing, a tweak being saved, an Undo returning to draft. **This is the story to judge** — the frozen frames above are reference, not behaviour. |

## Tests

`primitives/AcceptTweakRejectCard.test.tsx` covers the invariant (no motion
reaches a resolved outcome except Accept / Save / Reject), the adapters against
real contracts shapes, the ladder's pick-and-apply, and the tracking Accept
label. `primitives/v2/JournalRail.test.tsx` asserts the rail renders *this* card
rather than a look-alike.
