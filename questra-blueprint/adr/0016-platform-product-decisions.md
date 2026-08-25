# ADR-0016 — Platform & product decisions

*Status: Accepted (with two owner decision points still OPEN, due end of M5). 2026-07-19.*

## Context

The GAP-AUDIT surfaced a class of decisions the feature corpus assumed but never
made: a responsive-vs-desktop contradiction, several silent absences that need to
be explicit non-goals (so their absence reads as intent, not oversight), an
unowned notifications surface, and two business decisions only the owner can make.
This ADR records them so future sessions don't re-litigate or improvise.

## Decision

### 1. Responsive split (resolves audit A7 — the Architecture-vs-Wizard contradiction)

Architecture §1.4's in-person mode puts the **player hub on phones**; the wizard
spec is desktop-first. Both are right for their surface. The split:

- **Responsive by M3 (in-person mode is v1):** the **player hub, the death-save
  card, and the dice surface**. These are held at a real table on real phones —
  they must work on a small screen from first ship.
- **Desktop-first, responsive later:** the **prep surfaces** — Character Wizard,
  Session Planner, Campaign Wrapper. DMs build campaigns at a desk; phone support
  for prep is a later polish, not v1.
- **Native mobile apps: non-goal (see D3).** v1 is responsive web everywhere.

### 2. Explicit non-goals (resolves audit Class D — absence = intent, not oversight)

- **D1 — Internationalization.** v1 is **English-only**. Plain-language tooling,
  the ban list, and all copy assume English; no i18n framework, no translation
  pipeline in v1.
- **D2 — Offline play.** v1 is **online-required**. The event-sourced sync model
  is the product; there is no offline/local mode or conflict-merge story in v1.
- **D3 — Native mobile apps.** v1 is **responsive web** (per the split above). No
  iOS/Android native shell.
- **D4 — Streaming/spectator beyond `table_display`.** The one spectator surface
  is `table_display` (the cast-to-TV token). No broadcast/streaming integrations,
  audience chat, or public-session features in v1.
- **(Brief-15) Voice cloning of real people — banned;** real-time inter-player
  voice chat — **out of scope** (tables bring their own Discord/etc.); music
  *generation* — out of scope. (These live in brief-15's non-goals; recorded here
  so the platform-level "no" is discoverable.)

### 3. Notifications ownership (resolves audit B3)

Every producing brief says "notifies X" but nothing owned the surface. **Brief-14
§5 owns it**: the `Notification` model + the in-app bell/list in the shell nav
(v1: in-app only; email digests a v2 flag). Producing briefs (07 level-up, 12
moderation/homebrew, 14 invites) target it; the server side rides brief-11's API.
Scheduled **M4** with the full shell.

### 4. Owner decision points — DUE END OF M5 (still OPEN)

Two business decisions only the owner can make. Flagged so Claude Code **stops**
rather than improvising, and calendared so they don't slip:

- **DP-1 — Pricing tiers + billing provider.** Brief-09a's quotas are "by plan
  tier (config table)" and M8 wires billing — but the *tiers themselves* exist
  nowhere. **Owner defines the tiers (names, quotas, price points) and picks a
  billing provider by end of M5;** M8 implements against that. (Ties audit B5, C6.)
- **DP-2 — TTS/STT vendor + budget.** Brief-15 needs ≥12 licensed designed voices
  with in-app playback rights and streaming TTS. **Owner selects the vendor and
  approves the budget by end of M5** (brief-15 Decision Point 1); M6 builds
  against it. The immersion audio-library license (brief-15 DP-2) is a related
  owner decision at M6 start. (Ties audit B1, C6.)

These two are the only OPEN items in this ADR; everything else above is decided.

## Consequences

- The responsive split becomes an acceptance dimension for M3 (player hub) and a
  deferred item for prep surfaces — the Master Plan is amended to say so.
- The non-goals are now citable: a reviewer asking "where's offline mode?" is
  answered by D2, not a scramble.
- The owner has two explicit, dated deliverables (DP-1, DP-2) tracked in the
  Master Plan's owner-deliverables checklist.

## Related

GAP-AUDIT (A7, B3, B5, Class C, Class D) · Brief-14 (shell + notifications) ·
Brief-15 (voice + the vendor decision point) · ADR-0010 (attribution/legal, which
the settings/landing surface must link) · ADR-0011 (config seams the vendor
choices slot into).
