# Primitives/PublicSecretField

**Story file:** `packages/web/src/primitives/PublicSecretField.stories.tsx`
**Component:** `packages/web/src/primitives/PublicSecretField.tsx`
**Spec:** Build Playbook §3 · `packages/contracts/src/play/events.ts` (visibility vocabulary)
**Security:** CLAUDE.md non-negotiable #3

---

## Screens

**The DM authoring screens.** Anywhere a DM writes something with a part the
table sees and a part only they see:

| Screen | Use |
|---|---|
| **Session Planner** | Scene notes (public read-aloud + secret staging), cast entries, secrets, locations |
| **Campaign Wrapper** | Bonds, campaign-level cast and locations |

Never appears on the Player View — by definition, a player never authors a
DM-only half.

## What it is for

Making the public/secret split a **single field** rather than two disconnected
inputs, so the DM writes both halves in one motion and the relationship between
them stays visible.

---

## How it functions

### ⚠️ This is authoring UI, NOT the security filter

The most important thing in the file, and it is called out as a disclaimer in
the doc-comment.

CLAUDE.md non-negotiable #3: **secret data is filtered server-side.** Secret text
is kept out of player payloads by `eventVisibleTo` / `filterStream` in
`packages/contracts/src/play/visibility.ts` — the choke point — and **never** by
this component.

The visual "secret" treatment here (the heavier left rule, the lock mark) is a
**reminder to the DM about what they are typing**, not a protection. A
player client must never be sent the secret half in the first place. If the only
thing stopping a player seeing a secret were this component's styling, the
system would already be broken.

### It speaks the contracts visibility vocabulary

```ts
export const VISIBILITY_FOR: Record<keyof PublicSecretValue, Visibility> = {
  public: 'public',
  secret: 'dm_only',
};
```

The two halves map 1:1 onto contracts `Visibility` values, so a caller can emit
them as two events (or one event with `dm_only` detail) with **no translation
step** — and no opportunity for a mapping bug to mislabel a secret as public.

`VISIBILITY_FOR` is exported precisely so callers use the shared mapping rather
than writing `'dm_only'` inline.

### The value shape

```ts
interface PublicSecretValue { public: string; secret: string }
```

Fully controlled — `onChange` fires with the whole next value on every keystroke
in either half.

### Single-line vs multiline

`multiline` switches both halves between `<input type="text">` and
`<textarea rows={2}>` (vertically resizable). Single-line suits a cast entry;
multiline suits scene notes.

### Presentation

Each half is the shared `Field` from `design/parts.tsx` — a mono-caps label
boxed **with** its control rather than floating above it, because these arrive
in stacks (notes over cast over secrets) and a label separated from its box by
the stack's gap attaches itself to the field above just as readily as the one
below. Default placeholders state the audience plainly: *"Everyone at the table
sees this"* / *"Only you (the DM) see this."*

The two halves are told apart by **ink weight only**: a `--qa-ink-faint` rule
down the public half, `--qa-ink-dim` down the secret one, plus the lock on its
label. Design has not supplied a `--qa-secret` tint and a session must not
invent one — `packages/theme/test/tokens.test.ts` deliberately asserts its
absence. Swap in the real token, and drop that guard line, the day it lands.

The lock is a drawn glyph, not the 🔒 emoji it used to be. Emoji carry their own
palette and their own era, and one sitting beside mono caps in a warm-dark frame
looked like it had wandered in from another product.

Labels are properly associated via `useId()` + `htmlFor`. Every value is a
`--qa-*` token, enforced by the type-hygiene suite.

---

## The stories

| Story | Shows |
|---|---|
| `CastEntry` | Single-line. Sister Aldous — public name/role, secret motive (she's the cult's paymaster). Includes `help` text: *"The table meets the public face; the truth stays with you."* |
| `SceneNotes` | Multiline. Public read-aloud description + secret staging (two cutpurses, Perception DC 13). |

### The `Emitted` panel

Both stories render a small mono `<dl>` beneath the field showing
`public → "public"` and `secret → "dm_only"`, read live from `VISIBILITY_FOR`.

This is the seam to the wire made visible: the story doesn't just show the input,
it shows *what visibility each half will be emitted with* — reinforcing that the
split resolves to real contracts values rather than a UI-only convention.
