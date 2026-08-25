# Brief 13 — Onboarding Gating & the Ramp

*Layer 3. Consumed with contracts + Briefs 10–11. Parent: Onboarding spec (authoritative for the experience — floors, copy tone, the magic beats). Built last, per the design. Revalidate hard at build time — this brief depends on every finished floor.*

**Scope:** the floor state machine, existence-gating flags, the silent campaign scaffolding, the demo party, the veteran skip.
**Non-goals:** re-designing the floors (the spec owns them), the "?" info layer (exists), player onboarding (the invite link + wizard *are* it).

## 1. The floor state machine (account-level, permanent)
`onboarding: { state: 'floor0'|'floor1'|'floor2'|'floor3'|'floor4'|'complete', enteredVia: 'ramp'|'veteran_skip' }`
Transitions fire on *completion signals*, never timers: floor1 → first map generated + first token placed; floor2 → first session with ≥2 scenes saved; floor3 → demo fight reached round 2 (they've run a loop); floor4 → campaign surface visited + invite link viewed ⇒ complete. `veteran_skip` at floor0 ⇒ complete immediately. **Permanent:** no regression, no re-ramp, survives everything (it's on the Account, not a campaign).

## 2. Existence-gating flags (how the app reads it)
One derived object, computed from state, consumed as props everywhere (Brief 10 already takes them):
`gates: { sessionPlannerExists, campaignWrapperExists, hotbarSeedOnly, tabsDimmed, consoleCollapsed, wokCollapsed, assistantLeadsWithRuling, inviteVisible }` — floors below current ⇒ fully open; the current floor's surface exists; floors above **do not render** (existence-gating: not disabled — absent from the tree and from navigation). `complete` ⇒ everything open, all first-contact states expanded for `veteran_skip`, expanded-as-earned for `ramp`.

## 3. Silent scaffolding (real stakes)
Floor 1's first keystroke creates a real Campaign `{name: 'My first adventure' (renameable at reveal), premise: null, scaffolded: true}` invisible to the DM (gates hide the wrapper). Everything made on the ramp writes into it normally (rooms → a scene → a session). Floor 4 reveal = the gate opening on data that was always there — **plus the seeding pass**: 09b drafts the situation-shaped materials (premise-as-situation from what they built, open threads, no plot) as accept/tweak cards. The scaffold flag clears on reveal.

## 4. The demo party (content deliverable — author it, don't generate it)
Four pre-built level-1 characters (SRD: Fighter, Cleric, Rogue, Wizard — the teaching spread) with portraits from the house pipeline, one-line personalities, and a tuned first fight (3 Goblin Warriors, the fixture monster) sized to showcase: one routine auto-narration, one contextual grey, one concentration moment, one Ruling Suggestion bait ("the chandelier hangs low"). Demo party members are engine-driven-but-DM-rolled (the solo DM plays them — teaches both screens); flagged `demo: true`, excluded from campaign exports, removed at floor 4 (their seats free for real invites).

## 5. Floor 0/1 surfaces
Floor 0: the near-empty screen, one line + three preset chips + free-form + the quiet veteran escape (copy per the Onboarding spec verbatim). The chips are the standard presets-above-free-form primitive. Floor 1 payoff: chip/sentence → 09a terrain generation → the reveal beat → "now put something in it" (one guided token drag). Progress motif: the pyramid lighting per floor — a small persistent affordance, never a checklist nag (Design owns the look).

## 6. Acceptance criteria
1. State machine goldens: every transition fires on its exact signal and nothing else; permanence survives logout/login and campaign deletion.
2. Existence test: below-floor surfaces absent from the rendered tree *and* route table (not merely hidden) for a floor-2 fixture account.
3. Scaffolding: the floor-1 room is byte-identical inside the revealed campaign at floor 4; seeding pass produces only situation-shaped drafts (BondProposal genesis guardrail reused — no named villains, no plot outline field ever populated).
4. Demo party: excluded from export; seats release at floor 4; the tuned fight script hits all four teaching moments in a scripted run-through.
5. Veteran skip ⇒ complete + expanded first-contact states + lands on the campaign wrapper; a ramp account never sees floor copy twice.
