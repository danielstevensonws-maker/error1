# Brief 11 — Campaign & Session Data Ops

*Layer 3. Consumed with contracts + Architecture §2–§3. Parent: Campaign Wrapper + Session Planner specs (authoritative for surfaces); this brief pins the data operations. Revalidate at build time.*

**Scope:** CRUD + HTTP API for prep surfaces, reference semantics, promotion transactions, bonds-web ops, background jobs, the export format.
**Non-goals:** play events (02/05), AI drafting (09b — this brief provides the CRUD its accept-handlers call), UI.

## 1. API shape
Plain HTTP JSON (`/api/v1/...`), zod-validated request/response types in contracts (`api/` — contract PR), session-token auth, campaign-membership middleware, role checks per route. Prep sync = lightweight per-campaign subscription channel pushing `{entity, id, updatedAt}` invalidations (clients refetch) — deliberately not event-sourced (Architecture §4.3).

## 2. Reference semantics (the "pull from campaign" seam)
Sessions/scenes store **refs** into campaign pools (castMemberId, locationId, secretClueId, rewardId) — never copies. Delete of a referenced pool item ⇒ soft-block with usage list ("Seraphine appears in 3 sessions") + archive option (hidden from pickers, refs intact). Clue `revealed` flags live on the campaign clue (single truth) — the session kit renders them, play toggles them.

## 3. Promotion transactions (both directions, atomic)
- **Down (thread → NPC):** input {openThreadId, npcDraft{name, portraitRef?, motive}} ⇒ one transaction: create CastMember; rewire every bond ref thread→member; thread status unresolved→in_play; hooks-list update. Emits one prep-audit record. Co-pilot proposes the match (09b); the DM's tap runs *this* — the app never auto-resolves (guardrail lives here as: no code path creates a CastMember from a thread without an explicit user action id in the request).
- **Up (session NPC → cast):** input {sessionNpcId} ⇒ create CastMember carrying portrait/motive/voice; replace session-local refs with the campaign ref; history line "promoted from Session N".

## 4. Bonds web ops
Bond = {a: MemberRef, b: MemberRef, label, publicHalf, secretHalf?} where MemberRef = pc|cast|thread. Ops: create (drag), edit halves (secretHalf writes require dm role — API-enforced, and never serialized to player responses: the §2.3 filter applied to HTTP too, same helper), delete, list-for-member. Ghost members render from threads (status≠resolved).

## 5. Background jobs
Queue (ADR-0011): `recap_draft(sessionId)` on session end (event log → 09b), `digest_refresh(campaignId)` debounced on pool/premise/recap changes, `stable_heal_timer` (Brief 04's 1d4 h), `library_moderation(entryId)` (Brief 12). Jobs idempotent, keyed, retried with backoff.

## 6. Export format (doubles as fixture format)
`questra-campaign.json` = {formatVersion, campaign, pools, sessions+scenes+rooms (with media manifest: refs → relative paths), characters (owner-consented only), event logs optional flag}. Import validates against contracts and remaps ids. A round-trip test (export→import→export byte-stable modulo ids) is the format's spec.

## 7. Acceptance criteria
1. Ref integrity: deleting referenced cast ⇒ 409 with usage list; archive hides from pickers, sessions still render.
2. Promotion-down golden: full transaction incl. bond rewire + status flip, atomic under injected failure (all-or-nothing).
3. Secret halves absent from player-role HTTP responses (route-level capture test across every endpoint — generated, not hand-listed).
4. Export round-trip test passes on the fixture campaign; import of a tampered file fails validation with plain-language errors.
5. Digest debounce: 5 rapid pool edits ⇒ 1 job; recap job produces a draft referencing only narratively-significant event kinds (allowlist asserted).
