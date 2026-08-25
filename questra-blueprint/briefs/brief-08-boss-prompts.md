# Brief 08 — Boss Machinery & the Prompt-the-Holder Component

*Layer 3. Consumed with contracts + Briefs 02, 04–05. Parent: Rules Engine §7, §10. Revalidate at build time.*

**Scope:** the one interrupt component and its consumers — OA, reaction features, readied actions, legendary actions, legendary resistance, lair actions.
**Non-goals:** the underlying OA *detection* (Brief 02/06 own it), monster AI (none — the DM plays monsters).

## 1. The component (one, used six ways)
`PromptCard{promptId, kind, holder, context, options[], timeoutSec}` rendered wherever the holder lives (player screen for PC reactions, DM Assistant panel for monsters/boss/lair). Server owns lifecycle: `reaction_prompted` → response or timeout → `reaction_taken/declined`. Rules: one modal-priority prompt at a time per viewer, queue the rest; DM can always answer for anyone; timeout default 60s ⇒ declined (Brief 05 rule 7). Context payload is typed per kind (contract PR: `PromptContext` discriminated union replacing the v0.1 record).

## 2. Consumers
- **Opportunity attack:** context {mover, path step, attack options}; take ⇒ the melee attack runs the d20 pipeline as a reaction (economy spent).
- **Reaction features** (e.g. Redirect Attack on the SRD goblin boss variant, Shield when ingested): trigger hooks `{event:'take_damage'|custom}` matched by the engine ⇒ prompt with the feature card.
- **Readied action:** authored at ready-time (action spent, trigger text + prepared response); DM marks trigger met (human call) ⇒ prompt the holder to release ⇒ routine resolution. Concentration rule applies to readied spells (slot spent at ready; concentration until release).
- **Legendary actions:** boss meta `legendary: {pool: 3, options: [{name, cost, action}]}`; pool resets at boss turn start (`resource_changed`); after each *other* creature's turn ends, if affordable options exist ⇒ quiet DM prompt listing them; taken ⇒ cost spent + action resolves.
- **Legendary resistance:** boss fails a save ⇒ interrupt DM prompt "Use Legendary Resistance? (2 left)" before the failure cascades; accept ⇒ outcome flipped to success, use spent, log shows both (dm_only detail).
- **Lair actions:** pseudo-combatant at initiative 20 (losing ties); its turn ⇒ DM prompt with the lair's options or skip.

## 3. Ordering & economy edge cases (lock these)
1. Multiple OA candidates on one step ⇒ prompts resolve in initiative order; each spends its own reaction.
2. A reaction taken on someone else's turn is unavailable until the holder's next turn start (`turn_advanced` resets only the active creature — verify Brief 02 implementation matches; if it resets all, fix to per-creature).
3. Legendary pool cannot interrupt mid-cascade — offered only at turn boundaries (keeps the log linear).
4. Legendary resistance *can* interrupt mid-cascade (that's its whole rule); implement as a held cascade: the failure's downstream events emit only after the prompt resolves.

## 4. Acceptance criteria
1. OA golden already in Brief 02 now passes through the real component (prompt → taken → reaction attack events).
2. Legendary round golden (SRD dragon fixture): 3-action pool, spend 1+2 across two turn-ends, reset on boss turn; byte-matched.
3. Legendary resistance golden: failed save held → accepted → outcome success, zero downstream failure events ever emitted; declined → normal cascade.
4. Readied-spell golden: slot spent at ready; released two turns later; concentration window spans correctly; unreleased by encounter end ⇒ slot stays spent.
5. Timeout + DM-answers-for-player both produce valid closures on every kind.
