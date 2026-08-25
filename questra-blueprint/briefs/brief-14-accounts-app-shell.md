# Brief 14 — Accounts, Auth & the App Shell

*Layer 3. Consumed with contracts + Architecture §2 (which designed roles/membership but built nothing). Closes gaps A1–A2, B3. Revalidate at build time (ADR-0013). Split across milestones: §1–2 land M2/M3 (sync needs tokens), §3–4 minimal-shell M3, full M4, §5 M4.*

**Scope:** account lifecycle, session auth, the shell surfaces (landing → home → campaign list → join → settings), navigation, notifications surface.
**Non-goals:** billing/plan enforcement UI (M8; tiers per ADR-0016 decision), OAuth providers beyond one (start email+password or one OAuth, config seam for more), native apps (non-goal D3).

## 1. Accounts (M2/M3)
> **Build-ready sub-brief:** [brief-14-1-accounts-tokens.md](brief-14-1-accounts-tokens.md)
> extracts and revalidates this section (ADR-0013) with exact contract shapes, the
> `resolveToken` swap, migrations, worked ladder, and 1:1 acceptance tests. Build from
> there. The paragraph below is the original scope note it expands.

`Account {id, email (unique, verified flag), displayName, passwordHash?, oauth?, createdAt, onboarding (brief-13's state), settings, ageBracket?}` — `ageBracket` reserved for the C5 minors decision; nullable until decided, schema ready so signup doesn't churn later.
Flows: signup (email+password, argon2id; verification email), login, logout, password reset (tokened email), account deletion (soft-delete + 30-day purge job; campaign ownership must transfer or archive — DM-owned campaigns block deletion until resolved, plain-language explanation). Email delivery via one provider behind a `Mailer` interface (config seam, ADR-0011 spirit).
Session tokens: short-lived signed JWT (accountId + issuedAt), refresh via httpOnly cookie; the same token is what brief-05's `hello` consumes — **this brief mints what brief-05 assumed.** Rate-limit auth endpoints; lockout with backoff on repeated failures.

## 2. Membership plumbing (M3)
Implements Architecture §2.2 for real: create campaign ⇒ `Membership{role:dm}` + join link (revocable/regenerable token); join ⇒ `Membership{role:player}` + the seat-or-create character flow; remove member; table_display token minting (DM action). All role checks middleware on brief-11's API; the visibility filter already exists — this supplies the identities it filters for.

## 3. The shell surfaces
- **Landing** (public): the pitch + sign in / create account. Marketing copy is owner-supplied content; structure ships with a placeholder. (M3 minimal.)
- **Home** (signed in): "Your campaigns" (DM'd and playing-in, two groups), "Your characters," resume-last-session card, the onboarding ramp entry for `floor0` accounts (brief-13's Floor 0 IS the home for new accounts — existence-gating means a brand-new account's home is the near-empty "Let's make your first scene" screen; the full home appears as floors clear or via veteran skip). (M3 minimal: list + resume; M4 full.)
- **Join flow** (`/join/:code`): shows campaign name + premise (public half only), sign-in-or-signup interstitial if logged out, then the seat-or-create flow into the wizard. This is the player's entire front door — it gets polish priority. (M3.)
- **Campaign switcher + nav**: persistent top-level nav (home / current campaign / character hub / settings), campaign-scoped subnav (campaign / sessions / party / cast). Plain-language labels; ban-list-checked. (M3 minimal.)
- **Settings**: account (email/password/deletion), per-campaign settings surface (the toggles other briefs defined: physical-dice mode, proactive co-pilot, XP mode, reduce-motion), a **campaign export/download** control (the brief-11 §6 export file — JSON + media manifest — delivering architecture §6's "it's my campaign, I can keep it"; DM-scoped), and the **attribution/legal screen (ADR-0010) lives here — ships with the first shell**, not M8. (M4.)

## 4. Shell states
Empty states everywhere (no campaigns yet → the ramp or "create/join"; no characters yet → wizard CTA); loading skeletons; error boundary with plain-language recovery. The shell is built from primitives + tokens like everything else; match the prototype's Landing/Hub/Lobby look as reference-only (ADR-0014).

## 5. Notifications (M4)
`Notification {accountId, kind, payload, readAt}` — kinds v1: campaign invite accepted, homebrew approval requested (brief-12), approval granted, level-up offered (brief-07), moderation outcome. Delivery: in-app only v1 (bell + list in the shell nav); email digests a v2 flag. Server side rides brief-11's API + subscription channel; each producing brief's "notifies X" line now has a concrete target.

## 6. Acceptance criteria
1. Full auth ladder golden: signup → verify → login → refresh → reset → deletion-blocked-as-DM → transfer → deletion; tokens accepted by a real brief-05 `hello`.
2. Join-flow golden: logged-out invite link → signup → seated character → lands in the party view; the link is the *only* path a player needs (spec promise held).
3. Role enforcement: every brief-11 route rejects wrong-role access (generated test, not hand-listed); table_display token grants exactly spectator scope.
4. New-account home IS Floor 0 (existence-gate assertion); veteran-skip account sees the full home.
5. Notification produced end-to-end from a brief-12 approval request to a rendered bell item.
6. All shell strings pass the ban list; attribution screen present and linked from settings + landing footer.
