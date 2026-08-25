# Storybook Catalogue

One document per story file: what the component is for, how it works, and which
screen it belongs to. Written from the source as of the M3.4 (Brief 10) commit;
reconciled 2026-08-18 to current source after the design-language consolidation
(v1 play surface deleted, shared layer extracted, four merges landed).

## The two Storybook trees

| Title prefix | What lives there |
|---|---|
| `Primitives/*` | The reusable Playbook §3 primitives, each judged in isolation. |
| `Play/*` | The in-play surfaces, staged over a map — glass is judged in context, never flat. |

Almost every story is a primitive or a composition of primitives. The one
exception is **`Play/Player View v2`**, which is a whole screen: the frame, the
ground and every overlay, composed and interactive. "Screen" elsewhere in these
docs means *the screen this primitive is destined for*, per its brief.

## One Player View

There were two authored directions for this surface. The owner picked **v2** —
discrete panels floating over a full-bleed map, turn order down the left as the
organising idea, the action bar centred — and v1 (`PlayerHub`, a bar of panels
docked to the bottom of a map) was deleted along with the components only it
used. [PlayerHub.md](PlayerHub.md) survives as a record of the rejected
direction; nothing in it describes code that still exists.

## The shared design layer

`packages/web/src/design/` is where the app's visual language lives, and every
surface in this catalogue is now built from it:

| Module | What it owns |
|---|---|
| `type.ts` | The type ramp as named ROLES (`eyebrow`, `statValue`, `narration`, `prose`…), never sizes. Prose is a serif, data is mono. |
| `glyphs.tsx` | The drawn marks. No emoji outside the reactions row, where the emoji *is* the message. |
| `parts.tsx` | The repeats — `Eyebrow`, `ExplainValue`, `Tag`, `Field`, `HP`, `Meter`. |
| `styles.tsx` | Chrome and behaviour: `.qa2-panel`, `.qa2-modal`, `.qa2-chip`, hover, focus-visible, reduced motion. Owns no positions. |

It was extracted out of the play screen, which had grown a coherent language
while the primitives each hand-rolled their own surfaces inline. Positions stay
with whoever composes a screen (`v2/ScreenStyles.tsx`); chrome is shared.

`packages/web/test/hud-type-hygiene.test.ts` scans every file on the list for
hardcoded font sizes, font families, hex/rgb literals and literal durations. Add
a surface to the layer and add it to `HUD_FILES` in the same commit.

## Index

| Doc | Component(s) | Storybook title | Screen |
|---|---|---|---|
| [PlayerViewV2](PlayerViewV2.md) | `PlayerViewV2` + `RoundSpine` + `SceneRail` + `NearEdge` + `ActionRows` + `JournalRail` + `MapCanvas` + overlays | `Play/Player View v2` **and** `Play/Player View v2/*` | Player View |
| [MapCanvas](MapCanvas.md) | `MapCanvas` | `Primitives/MapCanvas` | Map Editor · Play View · Table View |
| [PromptHolderCard](PromptHolderCard.md) | `PromptHolderCard` | `Primitives/PromptHolderCard` | Player View + DM View (overlay) |
| [InfoPanel](InfoPanel.md) | `InfoPanel` | `Primitives/InfoPanel` | Global (every screen) |
| [AcceptTweakRejectCard](AcceptTweakRejectCard.md) | `AcceptTweakRejectCard` | `Primitives/AcceptTweakRejectCard` | Global (every AI touchpoint) |
| [CardSequencer](CardSequencer.md) | `CardSequencer` | `Primitives/CardSequencer` | Session Planner · Campaign Wrapper |
| [PublicSecretField](PublicSecretField.md) | `PublicSecretField` | `Primitives/PublicSecretField` | Session Planner · Campaign Wrapper |
| [PullFromCampaignPicker](PullFromCampaignPicker.md) | `PullFromCampaignPicker` | `Primitives/PullFromCampaignPicker` | Session Planner |
| [PresetsAboveFreeForm](PresetsAboveFreeForm.md) | `PresetsAboveFreeForm` | `Primitives/PresetsAboveFreeForm` | Character Wizard · Campaign Wrapper · Onboarding |
| [PlayerHub](PlayerHub.md) | *(deleted — the rejected Player View direction)* | *(no story)* | — |

### Documented but not in the tree

Three docs describe components the 2026-07-22 working-tree reset cleared and
that have not been recovered yet. They are kept because they are the spec for
recovering them, not because the code is there:

| Doc | Status |
|---|---|
| [ComposeRollSheet](ComposeRollSheet.md) | Not recovered. v2 has its own `ComposeSheet` inside `v2/Overlays.tsx` — reconcile the two when this is brought back. |
| [TableBackdrop](TableBackdrop.md) | Not recovered, and superseded in practice: `v2/stage.tsx` is the Storybook ground now, and it stages the REAL map rather than a gradient. |
| DiceTray *(no doc written)* | Not recovered. Design's finished `<qa-dice-tray>` renderer is the intended source — see the project notes, not this catalogue. |

## What consolidated into what

Four merges collapsed duplicate concepts. Each is documented in its own doc; the
short version:

| Was two | Is one | Why |
|---|---|---|
| `InfoPanel` + v2's `ExplainSheet` | `InfoPanel` | "Where this number came from" and "what this rule says" are one panel with two entry paths, not two panels. `fromExplain()` adapts. |
| `MapCanvas` + v2's `TableGround` | `MapCanvas` | Only one of them called the contracts geometry. `fit="fill"` gives the play screen a full-bleed ground without a second renderer. |
| `AcceptTweakRejectCard` + the journal's ruling block | `AcceptTweakRejectCard` | Orchestration §4: one AI presentation in the product. `placement="inline"` docks it in the rail. |
| Two hand-rolled glass cards | `.qa2-modal` | A suggestion and a held prompt arrive the same way — over what you were looking at, asking for one decision. |

## Story count

73 exported stories across 14 story files. `v2/stage.tsx` is the only component
with no story of its own, correctly — it is a Storybook stage, not product UI.

Player View v2 is the only surface with **both** a composed screen story and a
story file per panel. That is deliberate: it is the only whole screen in the
tree, and a screen has to be judged assembled *and* part by part.

## Coverage gaps

- **Screens**: one exists — `Play/Player View v2`, the whole player screen
  composed and interactive. Every other title is a primitive or a composition of
  them.
- **Casters**: the *design* is exercised — `Play/Player View v2 →
  MiraTheCleric` and `MirasSpellbook` show a Cleric 3 with prepared spells in
  the action row, slot counts, a concentration badge and a filled Spells tab.
  The *engine* now backs it: `sim/sheet.ts` attaches `spellcasting` to every
  caster type (half-casters and Pact Magic included), computes slots from
  SRD-verified tables, and resolves chosen spell ids into real `SpellCard`s.
  What remains hand-authored is Mira's own list — every ingested spell is still
  `qa: 'draft'`, so there is no verified Cleric spell to resolve. Her numbers are
  pinned by `test/v2-caster-fixture.test.ts`. See PlayerViewV2.md's Known gaps.
- **Briefs with no primitive yet**: 07 (rests/leveling), 11 (campaign data ops),
  12 (library/moderation), 13 (onboarding), 14 (accounts/app shell), 15 (voice/audio).

## Tests

12 files, 158 tests (`npx vitest run` in `packages/web`).

| File | Covers |
|---|---|
| `test/hud-type-hygiene.test.ts` | The design layer + every surface on it: no hardcoded sizes, families, colours or durations. |
| `test/v2-caster-fixture.test.ts` | Mira's hand-authored arithmetic against `derivationSumsToValue`; glyph distinctness per economy. |
| `primitives/AcceptTweakRejectCard.test.tsx` | The invariant (nothing applies without a human), the ladder, the contracts adapters. |
| `primitives/CardSequencer.test.tsx` | Reorder by button and by drag; the announcement; bounds. |
| `primitives/InfoPanel.test.tsx` | The three layers, the two entry paths, the contracts adapter against real fixtures. |
| `primitives/MapCanvas.test.tsx` | Fog per mode, names agreeing with the spine, geometry coming from contracts, both fits. |
| `primitives/PresetsAboveFreeForm.test.tsx` | Pick vs tags, the derived active chip, duplicate rejection. |
| `primitives/PromptHolderCard.test.tsx` | The countdown mirror, take/decline, the DM-answering note. |
| `primitives/PublicSecretField.test.tsx` | The visibility vocabulary, label association, the secret treatment. |
| `primitives/PullFromCampaignPicker.test.tsx` | Search, single vs multi, the two different empties. |
| `primitives/v2/ActionRows.test.tsx` | Slot ceilings, overflow vs growth sockets, greying from the shared legality function. |
| `primitives/v2/JournalRail.test.tsx` | Rolls collapsing, and that a suggestion renders THE card rather than a look-alike. |
