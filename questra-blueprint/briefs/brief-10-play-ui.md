# Brief 10 — Player Hub & DM Screen (UI)

*Layer 3. Consumed with contracts + Briefs 03, 05–06, 08. Parent: In-Play spec Parts 1–2 (authoritative for what exists); this brief maps it to components. Design authority: the Claude Design mockups (ADR-0014) — match them; where a mockup and this brief's structure conflict, structure wins, raise the conflict.*

**Scope:** component trees, state wiring, first-contact/dying/empty states, the greying contract.
**Non-goals:** the canvas internals (06), prompt internals (08), prep surfaces (11), visual design invention (Design owns look).

## 1. Shared rules
- Every number renders from `ComputedSheet` Derived values or projection state — tap-"?" opens the info panel showing the derivation (no orphan math; the Brief 03 lint enforces it).
- Greying = the shared legality function, read-only, client-side; tooltip string == server reject string.
- All state from the sync client (snapshot + events); zero component-local game state (UI state like open tabs is fine).
- Every user-facing string passes `violatesPlainLanguage`.

## 2. Player hub tree
`PlayerHub` → `IdentityHeader` (portrait, name, level) · `VitalsBar` (HP watched, AC, conditions with "?") · `ActionBar` (rows Action/Bonus/Reaction as ready-toggles; `AttackCard` with rider chips + resource tags + greying; `ComposeRollSheet` — the tap-to-roll surface animating the *server* result) · `SpellsAbilitiesTab` (slots pips, upcast picker, per-spell DC/bonus, `ConcentrationBadge` single-active) · `InventoryGrid` (equip/backpack drag, attunement/weight tags) · `DiceLog` · side sheets (compendium, notes).
**Dying state:** hub flips — ActionBar replaced by `DeathSaveCard` (three-pip success/failure, one big roll), vitals dimmed, portrait treatment per Design. Revive flips back. **First-contact state:** hotbar seeded 2–3 cards, tabs/inventory dimmed-until-earned — driven by Brief 13 flags, built now as props.

## 3. DM screen tree
`DmScreen` → `MapCanvas(mode:'play')` · `TurnHeader` (round/turn/timer) · `CombatantList` (HP/AC/conditions/bloodied/concentration/**passive Perception**; tap-to-spotlight) · `AssistantPanel` (titled **Assistant · Journal** — one unified stream: the scene's DM notes on top, then the engine-log stream in plain English incl. **roll results**, `RulingCard` (09c), and the multipurpose free-form composer at the bottom — see §4.1) · `WhatOnlyYouKnow` (Override editor, Undo, secret-roll toggle, whisper composer) · `ImmersionConsole` (tabs Sound/Music/NPCs/Map/Effects; NPC tab = cast cards with Become/TTS) · `PromptDock` (Brief 08 cards queue here for DM-held prompts).
First-contact: console + WhatOnlyYouKnow collapsed; Assistant leads with one RulingCard (13 flags).

## 4. Screen effects
Effects tab triggers (shake, torch flicker, rain, thunder, blood vignette, fade) broadcast as `narration`-adjacent ephemeral channel messages (not events — no replay value); table_display and players render them; a player-side reduce-motion setting suppresses all (accessibility, non-negotiable).

## 4.1 The play log + composer — one unified stream, not a side-channel
The right-hand column is **one unified play log**, not a social side-chat. The same stream carries,
in order of play: the DM's scene notes (DM view — the "Journal" half), the Engine's plain-English
narration and **roll results**, **Ruling Suggestions** (09c), in-character roleplay, and whatever
players and the DM type. Its bottom composer — *"Prompt, roleplay, or ask the assistant"* (In-Play
§2.2) — is a **multipurpose free-text input** with three jobs at once: it **declares an improvised
action** (Law 2's "just describe what happens" escape hatch — the typed line becomes the declared
action that escalates to a Ruling Suggestion), it speaks **roleplay**, and it **asks the
assistant**. There is no separate chat box; the log *is* the chat.

**Decision (⚠ owner-confirm): these messages are events, not ephemeral** — they persist on the
session event log and replay on reconnect/late-join, because the log *is* the play record (roll
derivations, declared actions, and narration all read back from it, and recap / "story so far"
sample it). This reuses machinery that already exists: a whisper is a `whisper_sent` event with
whisper-to-X visibility (architecture §4.1); a public line is the same shape at public visibility;
a declared action is the existing intent/`escalated_to_ruling` path. Filtering is the one
server-side visibility filter (ADR-0004): public lines fan out to all viewers, a whisper reaches
only its addressee (and the DM), and DM scene notes never reach a player client. The **reactions**
emoji burst is the exception and stays ephemeral like screen effects (§4) — no replay value.
Rate-limit the composer server-side; table_display renders public lines read-only.

## 5. Acceptance criteria
1. Storybook stories for every component against fixtures (Torvald sheet, trace projection, half-revealed room) — no backend required; visual match to Design mockups signed off per surface.
2. Dying flip golden: feed the Brief 04 dying ladder events ⇒ hub states change at exactly the right seqs (snapshot-tested).
3. Greying parity test: for a scripted set of illegal intents, tooltip strings equal server reject strings (shared fixture list).
4. Concentration badge: exactly one active; casting a second concentration spell surfaces the confirm-drop flow (event-correct).
5. Reduce-motion suppresses every effect (toggle test); all strings pass the ban-list check in CI.
6. Player payload inspection: nothing dm_only reachable in the hub's store (redux/zustand state dump assertion), mirroring the wire test one layer up.
