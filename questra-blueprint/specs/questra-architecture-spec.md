# Questra — Data, Sync & Platform Architecture Spec

*The eighth spec. Closes the system gaps: identity and permissions, the persistence model, the event-sourced Engine, real-time sync, and dice trust. This is the document the whole codebase is built against — the specs above it describe what the app does; this one pins where the truth lives and how it moves.*

---

## 1. Locked architectural decisions (the short list)

1. **The Engine is server-authoritative.** All game-state mutations happen on the server; clients send *intents*, receive *events*. No client ever computes truth. This single decision solves sync integrity, dice trust, and the DM's hidden layer all at once.
2. **The Engine is event-sourced.** State is a fold over an append-only event log. Three already-specced features silently demanded this — Undo ("reverse the last event"), recaps ("auto-drafted from the play log"), and sync ("the same event stream") — so it's now explicit rather than backed into.
3. **One realtime channel per session, permission-filtered per viewer.** The DM's hidden layer is enforced *server-side at the channel*, never by the client hiding things it received.
4. **Both play modes are first-class: remote and in-person.** (The open product question, now answered.) Remote: every player on their own device, full sync. In-person: players on phones as their hubs, the DM's map optionally cast to a shared screen via a **table display mode** (a third, read-only, spectator-permission view of the same channel). Same architecture serves both; in-person additionally motivates the physical-dice entry mode (§7).
5. **Contract-first.** A single shared types package (schema + event vocabulary + API surface) is the first artifact in the repo and the reference every feature is built against. (Expanded in the Build Playbook.)

---

## 2. Identity, roles & permissions

### 2.1 Accounts
One account type. Anyone can be a DM in one campaign and a player in another — **role is per-campaign, not per-account.** The account carries: profile, owned characters, owned campaigns, homebrew creations, onboarding unlock state (the account-permanent flag from the Onboarding spec), and settings.

### 2.2 Campaign membership & the invite link
- The DM creates a campaign → gets a **join link/code** (the link that *is* player onboarding). Joining creates a membership: `{account, campaign, role: player}`. The creator holds `role: dm`. Co-DM support is a backlog flag, not v1.
- Link hygiene: links are revocable and regenerable; a joined member stays if the link rotates; the DM can remove members.
- Joining fires the seat-or-create character flow (Campaign §5.3); the wizard runs inside the joiner's own account, and the resulting character is *seated* (referenced), not copied — preserving "one character, one campaign, player-owned."

### 2.3 The permission matrix (the public/secret split, enforced)
Visibility is a property of the *data*, checked at the server, per field:

| Data | Player sees | DM sees |
|---|---|---|
| Own character sheet | read/write | read (+ Override write) |
| Other PCs | public summary (portrait, name, visible vitals) | full |
| Scene read-aloud, table log | yes | yes |
| DM notes, "leads to", secret bond halves, NPC secret halves, secrets & clues pool | **never transmitted** | yes |
| Map | revealed regions only (Rules spec §9) | all |
| Tokens | visible + revealed only | all incl. staged |
| Rolls | public rolls; whispers addressed to them | all incl. secret rolls |

The rule that matters: **secret data never leaves the server toward a player client.** Not hidden by CSS — not sent. Every "public/secret split" across all specs (bonds, cast, scenes, secrets, locations) resolves to this one server-side filter, written once.

### 2.4 Homebrew & library permissions
Homebrew is private by default; explicit publish to the community library; the DM-approval gate is a per-campaign allowlist (`campaign_approved_content`) checked when a player picks a class/species in the wizard — locking the Character Wizard spec's recommended decision.

---

## 3. The data model (entity map)

The persistence schema, mirroring the design's own nesting so the code speaks the specs' language. (Names are the plain-language ones — the "member not node" rule applies to the schema too.)

**Account layer:** `Account`, `Character` (the wizard's full output: choices, computed sheet, portrait refs + saved prompt string, voice pick), `HomebrewEntity` (same shape as SRD entities, per Rules spec §1.5), `LibraryEntry` (published homebrew + version lineage + ratings + moderation state).

**Campaign layer:** `Campaign` (name, premise, settings), `Membership`, `PartySeat` (character ↔ campaign, + membership-change log for §5.7), `Bond` (two member refs + label + public/secret halves; member ref = PC | CastMember | OpenThread), `OpenThread` (the ghost member; status unresolved/in-play/resolved), `CastMember` (name, portrait, motive, public/secret, history entries), `CampaignSecret` (truth + `Clue[]` with revealed flags), `Location` (public/secret + saved map ref), `Reward`, `CampaignRecapEntry` (the story-so-far, one per session, auto-drafted + editable).

**Session layer:** `Session` (order, status, leads-to notes), `SessionKit` (recap, strong start, secrets/clues refs, cast refs, rewards), `Scene` (type, read-aloud, DM notes, leads-to, time estimate, order), `Room` (base terrain ref, grid config, revealed-region geometry), `Asset` (image ref, position, `blocking/movable/interactive/difficult_terrain` flags, state e.g. closed/open, pinned prep note), `Token` (position, stat block ref → rules data or bespoke, visibility flag, staged flag).

**Play layer:** `PlaySession` (a live run of a Session), **`EventLog`** (§4 — the append-only spine), `EncounterState` (a *projection*, not a source: initiative order, round, per-creature HP/conditions/resources/reactions/concentration — always reconstructible from the log).

**Rules layer:** the read-only SRD dataset (Rules spec §1), versioned so a data fix doesn't silently change a live game mid-session (a PlaySession pins its rules-data version).

Two structural notes worth locking: **(a)** "pull from campaign" = sessions hold *references* into campaign pools, never copies — edit Seraphine once, every session sees it; **(b)** promotion (Campaign §6.5) is therefore just re-parenting + rewiring refs, which is why it can be one tap.

---

## 4. The event-sourced Engine

### 4.1 Event vocabulary (the core of the shared contract)
All mutations during play are events, e.g.: `intent_declared`, `roll_made` (with server seed/result + full derivation from the d20 pipeline), `damage_applied`, `condition_applied/removed/expired`, `resource_spent/restored`, `token_moved` (with `forced` flag), `turn_advanced`, `reaction_prompted/taken/declined`, `ruling_suggested/decided`, `override_set`, `whisper_sent`, `secret_roll_made`, `rest_completed`, `death_save_rolled`, `character_level_up`, `scene_changed`, `narration_spoken`. Each event carries actor, timestamp, causal parent, and a **visibility scope** (public / dm-only / whisper-to-X) — the permission filter from §2.3 operates on this field.

### 4.2 What the log buys (all already promised elsewhere)
- **Undo** = append a compensating reversal of the last event *and its cascade* (an attack that applied damage + a condition + broke concentration reverses as one causal group — this is why events carry causal parents). Undo is itself an event, so the log stays honest.
- **Recaps & "story so far"** = the AI drafts from the event log filtered to narratively significant events. The log *is* the play log every spec references.
- **Sync** = clients replay the same stream (§5).
- **Reconnect/late-join** = snapshot (projection) + events since.
- **Post-mortem trust** = any disputed number has a full derivation in its `roll_made` event.

### 4.3 Boundaries
Prep-side editing (planner, wizard, campaign pool) is ordinary CRUD with updated-at auditing — event sourcing is for *play*, where undo/replay/narration live. Don't gold-plate the quiet floors.

---

## 5. Real-time sync

- **Transport:** WebSockets (or a managed realtime layer providing them). One channel per PlaySession; members join with their role; the server fans events out through the per-viewer permission filter. Prep surfaces can use plain request/response + lightweight subscriptions (the "party edits sheets while DM watches" case is low-frequency document sync, not combat-grade).
- **Authority & optimism:** clients send intents; the server validates against the Engine (legal move? has the resource? their turn?) and either emits events or rejects with a reason (which is exactly the contextual-greying string — the greying *is* the validator running client-side read-only against synced state, one function shared). Client-side prediction only for cosmetic latency (token drag ghosting); state renders from acknowledged events.
- **Ordering & idempotency:** events carry per-session monotonic sequence numbers; clients detect gaps and request replay; intents carry client-generated idempotency keys so a retry can't double-fire a fireball.
- **Presence:** who's connected, whose turn, "DM is typing a ruling" — presence is ephemeral channel metadata, not events.
- **Degradation:** a dropped player doesn't stall the table; the DM can act for them (Override); on reconnect they replay forward. In-person mode degrades gracefully to "the DM's screen is the table" if phones drop.
- **The one hard bet, scoped:** the specs called realtime sync a genuine risk. This design makes it *narrow* — one channel, server-authoritative, event-replay recovery — which is a well-trodden pattern (this is how multiplayer turn-based games work), not research. The risk that remains is *feel* (latency of the roll→narration loop), which the vertical slice exists to measure.

---

## 6. Persistence & infrastructure notes

- Relational store for entities + the event log (append-only table, indexed by session + sequence); object storage for generated images (portraits, maps, assets) with the library as metadata over it; the rules dataset shipped as versioned static data.
- Media pipeline: generation writes to storage once; clients get CDN URLs; the "generate-then-save-to-library" pattern means images are immutable artifacts — cache forever.
- Backups/exports: a campaign export (JSON + media manifest) is cheap insurance and the answer to "it's my campaign, can I keep it" — plan the format early, it doubles as the test-fixture format.

---

## 7. Dice trust

- **All authoritative rolls are server-side** (CSPRNG), delivered as `roll_made` events with the full derivation — no client can manufacture a 20. The player's dice animation *renders* the server result; the tap-to-roll feel is preserved, the physics is theater over truth (and honesty about that lives in a "?" if anyone asks).
- **Physical-dice mode (in-person tables):** a per-campaign setting where player rolls open an entry pad instead — the player rolls real dice and types the raw die value; the Engine still applies all modifiers and emits the same event, flagged `manual_entry`. Trust is the table's business (as it always was in person); the flag keeps the log honest.
- Secret rolls and DM rolls are the same events with dm-only visibility — one mechanism, already built.

---

## 8. Gap-closure checklist (system)

| Flagged gap | Closed by |
|---|---|
| Accounts / auth / roles | §2 — per-campaign roles, invite membership |
| Public/secret enforcement | §2.3 — server-side filter, secrets never transmitted |
| Persistence & data model | §3 — entity map mirroring the design's nesting |
| Event sourcing (implied) | §4 — explicit, with the event vocabulary |
| Undo / recap / replay | §4.2 — all fall out of the log |
| Realtime sync architecture | §5 — server-authoritative channel, replay recovery |
| In-person vs remote | §1.4 — both, + table display mode |
| Dice trust | §7 — server rolls + manual-entry mode |
| Homebrew/library permissions | §2.4 — private-by-default + DM allowlist, locked |

*End of Architecture spec. Companions: Rules Engine spec (what the Engine computes), AI Orchestration spec (the one subsystem allowed to be slow, and how it's kept fast and cheap).*
