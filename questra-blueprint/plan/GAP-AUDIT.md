# Questra — Full Corpus Gap Audit

*Commissioned after the persistence gap surfaced at M2→M3. Method: sweep every spec, brief, ADR, the Master Plan, the prompts file, and the owner's prototype audit, looking specifically for four seam classes — (A) assumed-but-never-scheduled, (B) scheduled-but-never-briefed, (C) owner-only deliverables no prompt will surface, (D) silent absences that must become explicit non-goals. Feature coverage itself was re-verified and is sound; every gap below is platform, content, or product, not rules or gameplay.*

*Dispositions reference: Brief-14 (Accounts, Auth & App Shell — new), Brief-15 (Voice & Audio — new), ADR-0015 (infra milestones — already commissioned), ADR-0016 (platform & product decisions — to write), and Master Plan amendments (to make).* 

---

## Class A — Assumed everywhere, scheduled nowhere *(the Postgres class; load-bearing)*

| # | Gap | Evidence | Disposition |
|---|---|---|---|
| A1 | **Accounts & auth.** Signup, login, session tokens, password reset, account deletion. | Architecture §2 designs roles/invites; brief-05 says "token minted at HTTP login" — nothing builds the login; zero Master Plan mentions. | **Brief-14 §1–2. Schedule M2/M3** (the sync server cannot ship without real tokens). |
| A2 | **App shell.** Landing, home, campaign list, join flow, settings, profile, navigation. | Owner's prototype audit flagged these ("built but NOT in the repo"); never folded in. Every feature spec assumes arrival at its surface; nothing connects them. | **Brief-14 §3–5. Schedule M3 (minimal shell) + M4 (full).** |
| A3 | **Object storage + CDN.** | Architecture §6 + brief-09a assume it; unscheduled. | Fold into **ADR-0015**; lands with M2 image work. |
| A4 | **CI pipeline.** | Playbook §4: "no Engine PR merges red" — no CI exists or is scheduled. | **Immediate M0-retro task** (one session: GitHub Actions running `npm run check` + engine goldens on PR). |
| A5 | **Narration template pack.** The Engine's plain-English voice. | Roadmap flagged it as a content gap; never assigned. M2's slice *does auto-narration* — it needs these to speak. | **M2 content task**, paired with engine work; templates per outcome type, ban-list-checked. |
| A6 | **DB migrations tooling.** | Implied by Postgres; never named. | Fold into the ADR-0015 persistence task (choose a migration tool; first migration = event table + entities). |
| A7 | **Responsive/mobile contradiction.** In-person mode (Architecture §1.4) puts the player hub *on phones*; wizard spec says desktop-first. | Two specs, opposite assumptions, no decision. | **ADR-0016 decides:** player hub + death card + dice responsive by **M3** (in-person mode is v1); prep surfaces (wizard/planner/campaign) desktop-first, responsive later; native apps a non-goal (D3). |

## Class B — Scheduled milestone, nothing under it

| # | Gap | Evidence | Disposition |
|---|---|---|---|
| B1 | **Voice (M6) has no brief.** No TTS/STT vendor decision, no voice-library curation plan. Claude Code will correctly stop at M6. | Briefs run 01–13; none covers M6. | **Brief-15** (new): interfaces + vendor decision points + curation as a content task. Vendor decision needed by end of M5. |
| B2 | **Immersion audio assets.** Sound effects + music beds the console plays. | Console specced (In-Play §2.4); nobody sources/licenses the audio. | **Brief-15 §4** — licensed-library procurement task, M6; owner approves licensing cost. |
| B3 | **Notifications.** | Brief-07 "flags the offer," brief-12 "notifies DM" — no notification system anywhere. | **Brief-14 §5** (shell owns the surface); server side lands M4 with brief-11's API. |
| B4 | **Compendium browser UI.** | In-Play §1.5 + brief-09c reference it; no brief scope owns it. | Small **scope addition to brief-10** (added); M3. Reads rules data + InfoPanel — cheap. |
| B5 | **Pricing tiers undefined.** | Brief-09a: quotas "by plan tier (config table)" — tiers exist nowhere; M8 wires billing to nothing. | **ADR-0016 schedules the *decision*** (owner, by end of M5) + provider choice; M8 implements. |

## Class C — Owner-only deliverables *(no prompt will ever surface these; calendar them)*

| # | Deliverable | Needed by | Why |
|---|---|---|---|
| C1 | **Seed art set** — 10–20 owned/commissioned originals in the house style. | **Before M2's image measurement.** | Portrait spec §2/§7: attached to *every* generation as the style anchor. Without them, M2 measures placeholder style, i.e. nothing. |
| C2 | **Real preset-token tables** for the SRD species/class roster (the spec's fae tables are examples). | M2 (minimal: the slice's species) → M4 (full). | Portrait spec §3 says "swap in your own world's roster" — someone must author it; can be co-drafted with AI, owner approves. |
| C3 | **Claude Design token set + prototype handoff.** | Before M3 screens. | Already pending (ADR-0014). |
| C4 | **Legal counsel:** SRD attribution check, AI-art policy, UGC terms, privacy policy/ToS. | M8, engage by M6. | ADR-0010 already says "real legal advice before launch." |
| C5 | **Minors / age policy.** D&D's audience includes under-18s; account age handling, content standards, parental posture. | Decision by M5 (shapes signup in Brief-14 — field reserved), legal review M8. | Nowhere in the corpus; a real product-legal decision only the owner can make. |
| C6 | **Pricing model** (ties B5) and **TTS vendor budget** (ties B1). | End of M5. | Business decisions. |
| C7 | **Name/trademark check ("Questra") + domain.** | Before public anything. | Hygiene; cheap now, expensive later. |

## Class D — Explicit non-goals *(write them down so absence ≠ oversight; all in ADR-0016)*
D1 i18n — v1 is English-only. D2 Offline play — online-required v1. D3 Native mobile apps — v1 is responsive web (per A7's split). D4 Streaming/spectator features beyond table_display.

## Verified-covered (so this audit is a floor, not a vibe)
Engine & rules (01–08), sync & visibility (05), AI tiers & fallbacks (09a–c), play/prep surfaces (10–11 + specs), homebrew & moderation (12), onboarding (13), export/backups (11/M8), rate limiting (05), accessibility pass (M6), telemetry schema (09b), SRD attribution (ADR-0010), persistence & vendor wiring & deploy (ADR-0015, in flight). No further feature-level gaps found.

## The pattern, named (for future audits)
Every gap above shares one shape: **the corpus is strongest where the product is novel (rules engine, AI, the pyramid) and thinnest where the product is ordinary (login, shell, audio files, pricing).** Ordinary parts got skipped precisely because they're well-understood — nobody writes a spec for a login page, so nobody scheduled one. The correction rule going forward: *when a brief says "assumes X exists," X gets a line in the Master Plan or this audit's successor within the same PR.*
