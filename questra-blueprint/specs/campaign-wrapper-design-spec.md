# Campaign Wrapper — Design Spec

*A design document for the Campaign Wrapper feature of the D&D companion / VTT app. Built on the 2024 SRD (5.2.1) ruleset. This is the third and final structural spec, sitting alongside* Character Creation Wizard *and* Session Planner*. It designs the outermost floor of the app — the wrapper that chains sessions into a story and holds the resources that span all of them.*

---

## 1. What the Campaign Wrapper is

The Campaign is the top floor of the app. It sits above everything already designed:

**Campaign → Session → Scene → Room**

- The **Campaign** is the whole story: its premise, its party, its recurring cast, its overarching secrets, and the ordered run of sessions that make it up. *This document.*
- The **Session** is a single night of play (see *Session Planner* spec).
- A **Scene** is one distinct moment or unit of a session.
- A **Room** is the map + tokens + assets for a combat/exploration scene.

The core realization, carried up from the two floors below: a campaign is **not** a document or a plot. It is the same shape those floors already use — **a sequence + a shared pool + a review layer on top** — applied one level higher. A campaign is *sessions in sequence* + a *campaign-wide pool* the sessions draw from + a *"story so far"* review layer.

This is the third time that shape repeats. That is the single most important fact about the whole app's learnability (see §11): a DM learns **one** pattern and applies it at three zoom levels, instead of learning three tools.

---

## 2. Guiding principles (carried up from the floors below)

The wrapper inherits every principle already established, unchanged. It invents no new philosophy:

- **Prep situations, not plots.** The campaign prepares a *starting situation* and a *pool of resources*, never a scripted storyline. Where the story goes is discovered session by session. This applies with full force to the premise (§3) — the base layer is a situation, not a plot.
- **Session by session, not pre-planned.** The campaign is built out as it is played. You never have to plan session five before session two happens. The chain grows *behind* the party as they play.
- **Guided template, not blank page.** The app owns the skeleton; the DM owns the content. The co-pilot seeds a starter pool from the premise so the DM never faces five empty screens.
- **AI co-pilot, not autopilot.** AI always *suggests*; the human always *decides*. Every draft — a premise, a bond, a promoted NPC — arrives as accept / tweak / reject. Held especially hard at the promotion moments (§6), where it would be most tempting to let the app decide.
- **Plain language over jargon.** Prefer the word a first-time player would use. This now applies to our *own* design vocabulary too (see §10 and the terminology note).
- **One pattern, three floors.** Sequence + shared pool + review layer, at campaign, session, and scene levels. Learned once, reused three times.

---

## 3. The base layer — campaign identity (name + premise)

The seed the entire pool and every session grow out of. Authored once at the very top, and the first thing that exists.

### 3.1 The name
What the campaign is called ("The Ashfall Conspiracy"). Trivial mechanically, but it is the campaign's identity — the thing on the shelf, the thing a player joins.

### 3.2 The premise — a *situation*, not a *storyline*
A short pitch of the **starting situation**: the setting, the tone, the central tension, the hook that pulls the party in. A paragraph, not a plot outline.

> *"A frontier mining town has gone silent under an unnatural winter, and something beneath the ice is waking."*

**Critical distinction.** The premise sets the opening pressure and stops there. It answers *"what's going on and why does it pull the party in?"* — **not** *"what happens and how does it end?"* If the premise were a full storyline, the campaign would be pre-plotted on day one — the exact railroad the whole app refuses to build. The premise is the match; the campaign is the fire that catches from it, shaped by what the players actually do.

This is real DM practice: the "campaign pitch" / "session zero premise" every DM writes, and the setup paragraph published adventures open with — a setup, a tone, a hook, never a spoiler of the ending.

### 3.3 How the premise is built — presets + free-form
The premise is the blankest blank page in the app (it is floor zero — nothing exists above it to lean on), so it is the screen where the app's most-proven pattern earns the most: **preset buttons *and* a free-form box**, exactly like the character wizard's four pillars and the session sequencer's "describe it in a sentence, or build it yourself." Presets are the beginner's on-ramp; free-form is the escape hatch; neither is mandatory.

**The screen offers two paths to the same paragraph:**
- **Preset buttons that assemble a starting situation** — the DM taps one from each of a few small groups, and the co-pilot drafts a premise *paragraph* from the combination (accept / tweak / rewrite):
  - **Setting** — frontier town, sprawling city, haunted wilds, war front, …
  - **Tone** — grim, heroic, mystery, comedy, …
  - **Hook / pressure** — something's gone missing, something's waking, someone's lying, a threat is coming, …
- **A free-form box** — the DM ignores all of the above and just writes their own premise.

**Guardrail — the buttons assemble a *situation*, not a *plot*.** This is the one thing that must stay true, or the preset path quietly re-introduces the railroad the whole app avoids. The chips give a **starting situation and a tension** — a setting, a tone, an opening pressure — and *never* "and here's how it ends." Prep the match, not the fire, holds for the buttons too.

This is also the first screen a *veteran* meets when starting top-down, so making it presets-first is the "beginner ramp with a veteran skip" principle showing up at floor zero: a nervous first-time DM taps three chips and has a real premise in ten seconds; a confident one ignores the buttons and writes their own. Same screen, both served. (Ties directly to the onboarding strand, §14.)

### 3.4 How the premise seeds everything below it
This is why it is the *base layer* and not just another strand:

- **It is the co-pilot's north star.** Every suggestion the co-pilot ever makes — a session, an NPC, a scene, a bond — is drafted *in the key of* the premise, so the whole campaign feels coherent instead of generic.
- **It seeds the initial pool.** From the premise, the co-pilot proposes starter cast (the town's people), a location or two (the town, the mine), and the first overarching secret (*what's* under the ice) — as accept/tweak/reject drafts. A running start, not a blank page. The preset choices (§3.3) pay off twice here: "frontier town + something waking" is not just a nicer premise, it's a richer prompt for everything the co-pilot seeds next.
- **It is line one of the "story so far."** The review layer's running narrative opens with the premise and grows downward from it.

### 3.5 It stays loose
The premise is editable throughout. Campaigns drift — the players ignore the mine and start a war next door, and that is *allowed*. The premise is the starting push, not a contract; it can be rewritten when the story outgrows it.

---

## 4. The campaign pool — overview

Everything a story carries *across* its nights. Each strand cascades *down* into sessions through the same seam: **"pull from campaign."** The pool has five strands:

1. **The party** (§5) — the player characters, seated from the character wizard.
2. **The recurring cast** (§6) — campaign-level NPCs who appear in more than one session.
3. **Overarching secrets** (§7) — campaign-wide mysteries that reveal across many sessions.
4. **Locations** (§8) — recurring places.
5. **Rewards** (§8) — loot and boons that matter across the arc.

---

## 5. The party

The party is **not new content** — it is the character sheets from the wizard (see *Character Creation* spec), promoted up a level and wired together. Most of this strand is *wiring*, not authoring.

### 5.1 What the party is
A campaign has one party: the roster of player characters running through it. Each character is still **owned by its player** — the campaign doesn't copy the sheet, it *seats* it. The player keeps editing their own sheet; the DM gets a live view of the whole table. One source of truth, two audiences (plan-mode/play-mode, same object).

### 5.2 One character, one campaign *(locked decision)*
A character belongs to exactly one campaign, with a **"copy to a new campaign"** escape hatch. This keeps each character's level, inventory, and history unambiguous — one character, one state, one story — and keeps the cascade clean: a character only ever cascades *down* into one campaign's sessions, never sideways into two. NPC promotions (§6) obey the same rule: a promoted NPC lives in *this* campaign's cast only.

### 5.3 The join flow
The DM creates the campaign and invites players (share code / link). Each player, on joining, either **brings an existing character** or **makes one now** — and "make one now" simply opens the character wizard. No separate tool. The wizard is the front door; the party is where its outputs gather. (The wizard is thus *nested inside* the campaign's party strand, fired once per player as they join — not a standalone step in the flow. See §12.)

### 5.4 What the party holds beyond the individual sheets
The only genuinely new content the campaign level adds, and it is small:

- **The roster** — auto-filled as players join.
- **The bonds web** (§5.5) — the web between characters. The real upgrade from "a list" to "a party."
- **Party identity (optional)** — a group name and one-line premise ("why these people adventure together"). Co-pilot can draft it from the bonds. Never forced.
- **A composition + tier readout** — a quiet at-a-glance panel: party size, average level, roles covered (frontline / healing / face / utility). A mirror, not a rule — same spirit as the encounter-difficulty badge.

### 5.5 The bonds web
The one piece in the party strand that is genuinely new UI.

**The problem it solves.** Each character arrives from the wizard carrying their *own* bonds — individual threads pointing outward. A party is what happens when those threads connect to *each other*. That web lives *between* sheets, so the campaign level is the only place it can exist. It is the digital "session zero" party-bonds step.

**The model — deliberately dead simple: a bond is a line between two members with a short label.** Not a relationship-type taxonomy to learn — just "these two are connected, and here's how," in a sentence. Visually: the roster as portraits with lines between them; tap a line to read/edit, drag between two portraits to make a new one.

**The public/secret split** carries straight over (a fourth reuse of read-aloud-vs-DM-notes): a bond has a shared half the party agrees on and, optionally, a DM-secret half only the DM sees ("Thorne doesn't know Wren left him behind").

**The co-pilot's job here is the payoff.** A blank web is the "session zero, everyone stares at each other" problem. The co-pilot reads every character's backstory/bonds/goals and *proposes* connections ("Wren and Kael both reference the same fallen order — want a shared history?"). Accept / tweak / reject. It turns inventing why strangers travel together into *editing* instead of blank-page authoring.

**Three kinds of member a line can attach to** (same line model, three member types — see §10 on why we say "member," not "node"):
- **A PC** — another player character. Real, player-owned.
- **A cast NPC** — a defined character from the cast pool (§6). Real, DM-owned.
- **An open thread** (§5.6) — a promissory note. No character behind it yet.

### 5.6 Open threads — vague hooks, not villains
A bond to an NPC comes in two kinds, and the distinction is essential:

- **A resolved bond** points at a cast NPC that already exists ("Kael's mentor *is* Seraphine"). Concrete, because that person is already real in the story.
- **An open thread** points at an NPC-shaped *hole* that doesn't exist yet ("the goblins who took Wren's sister"). A dangling hook waiting for a session to catch it.

**At genesis, the co-pilot proposes vague hooks, never specific villains.** This is a real behavioral rule. *"Want a sworn-vengeance thread against a group who wronged you?"* — yes. *"Your nemesis is Lord Vane, a fallen paladin in the northern keep"* — no, too much, too early. It suggests the **oath** and leaves the **who** and **where** blank, to be resolved session by session when the story reaches them. This is "prep situations, not plots" applied one layer back, to the *backstory* itself.

**Open threads live in two views:** as a ghost member on the bonds web (the *character's* view — clearly a placeholder: dashed outline, "?" where a portrait would be), and as a line item in the campaign's **dangling-hooks list** (the *campaign's* view — §9). Same object, two windows. Making the placeholder *look* unfinished is honesty, not decoration: it stops an unfilled hole from masquerading as a finished plot.

### 5.7 The party over time (review layer for the roster)
The party isn't frozen — it levels, someone dies, someone joins mid-campaign. The party view carries a light history (current tier + a short membership-change log) that the campaign recap pulls from ("since Kael fell at Ashfall, the party travels with the cleric Mara"). Same sequence-plus-pool-plus-review shape, applied to the roster itself.

---

## 6. The recurring cast

The pool that promotions land in, and the strand that cascades down into a session's social scenes the way the party does.

### 6.1 What it is
The campaign's roster of NPCs that matter across more than one night — the returning ally, the recurring villain, the shopkeeper the party keeps visiting. **The test for "does this belong at campaign level":** *will they appear in more than one session?* If yes, they live in the cast and cascade down. If no (a guard for one fight), they stay inside that session.

### 6.2 What each cast member carries
Deliberately the same shape as everything else — nothing new to learn:

- **Name, portrait, one-line motive.** The motive is the engine — it lets them *act* consistently across sessions instead of being a static card.
- **The public/secret split.** Public: what the party knows ("Seraphine, retired knight"). Secret: only the DM ("she betrayed Wren's order"). This is where recurring villains get their teeth — three sessions of trust over a secret half that says otherwise.
- **Their own bonds.** Cast members connect into the same web the party uses. An NPC is just another member on the web.
- **A light history.** Where they've appeared and what changed ("Session 3: revealed she knew the goblin captain"). Feeds the campaign recap.

### 6.3 The cast view
A gallery of the campaign's recurring people — portrait, name, one-line motive per card; same visual language as the party roster. Tap to open the full member. A light **sort/filter** (by role: allies / villains / neutrals; or "appeared recently") is the only organizing help it needs — it's an address book, not a database. Two quiet per-card signals earn their place:
- **A web indicator** — shows if this NPC is linked to a party member (a tied NPC matters more than a free-floating one).
- **A secret marker** — a subtle, DM-only tell that this member *has* a secret half (never *what* — just *that*), so you can scan the cast for who's hiding something.

### 6.4 How the cast cascades down
The "pull from campaign" seam, firing for people. When you build a **social scene** in a session, instead of inventing an NPC you **pull one from the cast** — and they arrive carrying motive, secret half, and bonds, pre-filled. The session borrows them; it never re-authors them. Define Seraphine once, use her in six sessions, and every session's co-pilot already knows her secret and her ties.

### 6.5 Promotion — the two directions (the hinge)
Promotion is where the party strand and the cast strand physically hand off to each other. Two directions:

**Downward — an open thread becomes a real NPC** (mid-session, never at genesis). Prepping a night, the co-pilot reads the hooks bank and nudges: *"Open vengeance thread — Wren's sister, goblins. Want tonight's goblins to be the ones?"* The DM says yes — **that yes is the promotion** — and the app: (1) opens a lightweight NPC create card (guided template: name, portrait, one-line motive) so the DM authors *who* the goblin captain is, now that the story needs him real; (2) writes the new NPC into the cast pool, permanent and reusable; (3) auto-rewires the bond — the dashed ghost becomes a solid line, and the hooks list ticks the thread from "unresolved" to "in play." *Campaign-hook → session-reality.*

**Upward — a session NPC becomes recurring** (one tap: **"add to campaign cast"**). A throwaway NPC the players unexpectedly adore lifts out of its single session into the permanent cast, carrying whatever it already had. This matches how recurring NPCs are *actually* born — improvised, then kept — and lets the campaign grow **organically from play**, not only from prep. *Session-improvisation → campaign-permanence.*

**Guardrail (philosophy protection):** an open thread can only be *promoted*, never auto-resolved. The co-pilot proposes the match; the DM performs the promotion; the DM authors who the NPC is. The app never quietly decides tonight's goblins are the captors — that would be autopilot authoring a plot point. Suggests, never commits — held at the one moment it's most tempting to break.

### 6.6 The full triangle, wired
All three strands now move freely into each other through the same bonds web:
- **Party → Cast:** a PC is linked to a recurring NPC (Kael ↔ Seraphine).
- **Cast → Session:** pull a cast member into a scene; they arrive pre-filled.
- **Session → Cast:** promote an improvised NPC up into the recurring cast.
- **Party → Session → Cast (the full loop):** an open thread off a PC is promoted *down* into a session NPC, who is then promoted *up* into the cast. A vague line a player wrote at character creation ("goblins took my sister") can become, entirely through play, a named nemesis haunting the whole campaign — without anyone ever planning him. The structure carries the improvisation instead of fighting it.

---

## 7. Overarching secrets

The session-level secrets kit (see *Session Planner* spec), scaled one floor up.

### 7.1 What it is
A big truth that unspools across many sessions — "the duke is funding the cult," "the plague is deliberate." The truth sits at campaign level; its **clues cascade down** into individual sessions over time (clue one in session two, clue three in session five).

### 7.2 A container of clues living in different sessions
The one thing the campaign version adds. The campaign secret view is a **progress readout**: *"The duke's betrayal — 2 of 5 clues revealed."* This answers the hardest part of running a long mystery — remembering what the players *know* versus what the DM knows — at a glance, via the same live checkboxes the session kit uses.

### 7.3 A truth, not a plot
A secret is a *fact about the world*, not a script for its discovery. "The duke is guilty" does **not** dictate how, in what order, or whether the party finds out. Clues are droppable in any session, in any sequence; the party may hit clue four before clue one. Prep the truth, not the path to it — the anti-railroad rule at campaign scale.

### 7.4 Co-pilot behavior
The mirror of the dangling-hooks nudge: when prepping a session, *"The duke secret is at 2 of 5 — want to seed a clue tonight?"* The campaign's big mysteries feed themselves into sessions organically.

---

## 8. Locations and rewards (the light strands)

Shared libraries the sessions pull from. Both are address books — little design needed; the point is only that they live at campaign level so they persist and cascade.

- **Campaign locations** — recurring places (home base, the villain's keep, a city the party returns to). Define once, pull into any session's scene (same seam as the cast). Can carry the public/secret split (the tavern everyone knows / the smuggler cellar beneath it) and its own saved map, so the home base isn't regenerated every visit.
- **Campaign rewards** — loot and boons that matter across the arc (a named magic sword, a title, a debt owed by a powerful NPC), distinct from throwaway gold in a single fight. A reward that's a magic item flows *down* into a player's inventory on the character sheet — closing another loop back to the wizard.

---

## 9. The sequence — chaining the nights

The shelf the pool sits behind. An **ordered, reorderable list of sessions** — the exact same sequencer built for scenes inside a session, lifted one floor up. Same interaction (drag to reorder, tap to open, "add a session"), same looseness (skip, reorder, insert an unplanned session mid-campaign). The control already exists; the campaign reuses it wholesale.

**The seam is the join between sessions.** A session's **"leads to next"** note *is* the link in the campaign chain. It holds multiple outcomes on purpose ("if they side with the duke → 5a; if against → 5b"), so the chain is a loose web of possibilities, not a fixed line. The campaign sequence is where those per-session notes become visible as the story's connective tissue.

**It stays session by session.** The sequence never forces planning session five before session two happens. Run tonight, see what the players did, *then* add the next session. The chain grows behind the party as they play. Prep the next step, not the whole staircase.

---

## 10. The review layer — "the story so far"

The top floor — what turns a pile of sessions into a campaign a DM can hold in their head. The campaign-scale version of the session recap. Three things live here, all **auto-drafted from what's already been built**, not authored fresh:

- **The story so far** — a running narrative drafted from each session's play log and recap. The "previously on…" for the whole arc. Doubles as the catch-up text a new player reads when joining mid-campaign (solving the transcript case one floor up).
- **The dangling-hooks list** — every open thread in one place ("Wren's sister — unresolved"; "the duke secret — 2 of 5"). The DM's live sense of *what's still in play*, and the source the co-pilot reads for all its "want to advance this tonight?" nudges. The single most valuable screen in the wrapper — it answers the universal long-campaign fear: *what have I set up that I haven't paid off yet?*
- **The campaign dashboard** — quiet at-a-glance state: party tier, session count, cast size, secrets progress. A mirror, not a control — same spirit as the encounter badge and party composition readout.

The review layer maintains itself from the play that's already happened — which is why it is the *last* thing built: it has nothing to render until the layers beneath it exist.

---

## 11. Terminology note — "member" / "portrait," not "node"

"Node" is techie jargon for *a thing on a diagram that lines connect to*. It is **not** language a new player should ever see — it's an insider word leaking in, exactly like "beat" did before "scene" replaced it (see *Session Planner* spec). The interface says **"the people on the web,"** **"member,"** or **"portrait"** / **"card."** "Node" is fine as private design shorthand; it is banned from the showroom.

This earns a third entry in the project's plain-language rule, all earned the same way: **beat → scene**, **node → member/portrait**, and the general principle — *any word one of us has to stop and define is a word the app shouldn't show a player.*

---

## 12. Two orders — build/nesting vs. learning

The app has **two orders running in opposite directions**, and keeping them distinct prevents confusion:

**Build / nesting order (how it's structured — top-down):**
Campaign → Session → Scene → Room. The campaign contains sessions; a session contains scenes; a scene contains a room. For an *experienced* DM starting a real campaign, the flow is:
1. Campaign created — name, premise, co-pilot seeds a starter pool.
2. Players invited → each runs the **character wizard** (the wizard is *nested inside* the party strand, fired once per player — not a standalone step).
3. Session planned — pulling from the campaign pool.
4. Play.

**Learning / onboarding order (how a newcomer meets it — bottom-up):**
Room/scene first → session → campaign. Start tiny with one scene, succeed, then learn the layer above. A beginner must **not** be dropped at "create a campaign" first — the finished wrapper is a cockpit, not a doorway. Both orders are true at once; they answer different questions ("how is it built" vs. "how do you learn it"). Veterans start at the top; beginners start at the bottom; the onboarding strand (§14) routes each to the right door.

---

## 13. Build feasibility

The entire campaign wrapper sits in the **safe pile** — lists, linked records, address books, auto-drafted summaries, reorderable sequences. **No new research risk lives in the wrapper.** By the time you build this floor you've already built its pattern (sequence + pool + review) twice.

The app's only hard bets remain the ones flagged from the start, and **none of them live here**: AI asset/map generation, art consistency across a campaign, the live roleplay co-pilot being fast and good at the table, and real-time multiplayer sync (the party editing sheets while the DM watches live — the *same* sync risk as the shared table, so it's solved once for both, not new risk).

**Build order reminder:** design was done top-down (to understand); build bottom-up and risk-first (prove one AI-composed room first). The wrapper is solid engineering on foundations already designed — it is the *easy* floor.

---

## 14. Open strand — onboarding / progressive disclosure *(flagged, not yet designed)*

The stated goal of the whole project: make the app feel like **a game, not a tool**, and be genuinely learnable by a brand-new player/DM. This is a **first-class design strand, not a tutorial sprinkled on at the end**, and it is the natural capstone because it touches every floor.

What's already working *for* learnability: the repeating **one-pattern-three-floors** shape (learn once, apply three times), the **plain-language rule**, and the **"?" info-layer** (the fine-grained half — learn one term in place).

What still must be designed (the coarse half — learn a whole floor at a time):
- **Bottom-up learning path.** Onboarding = the build order reversed into a *learning* path. Start a beginner at **one scene** ("let's make one scene right now" — frame a sentence, generate a map, drop one token), ending in a visible payoff in ~5 minutes. Then "string a couple of scenes into a night" (session). Then "chain your nights into a story" (campaign). Each layer unlocks only *after* the one below it clicks, so understanding is always built on something the player already *did*, never on an explanation taken on faith.
- **Teach the philosophy, not the buttons.** The thing a new DM must learn isn't the UI — it's that they're *allowed* to prep a situation instead of a whole story, and that they can't do it wrong. A button-tour can't teach that; doing can.
- **Gate complexity until earned.** A new DM never sees a screen they haven't earned the pieces to understand. Same principle as presets-before-free-form in the character wizard, scaled from one step to the whole app.
- **A skip for veterans.** "I know D&D — drop me at the campaign." Same system serves both, like a good game's skippable tutorial.

*Recommendation: design this strand next, then it becomes the layer that makes all the other layers learnable.*

---

## 15. Open decisions / backlog

- **Onboarding strand** (§14) — the whole bottom-up learning path. The highest-value remaining design work.
- **Party identity** — how much the optional group name/premise is surfaced vs. hidden.
- **Bond richness** — whether a bond ever needs more than a single label + public/secret half (leaning: no, keep it a sentence).
- **Cast sort/filter** — which axes actually matter once a campaign is long (role vs. recency vs. tied-to-PC).
- **Secret clue seeding** — how strongly the co-pilot pushes clue-seeding vs. leaving it entirely to the DM.
- **"Copy to new campaign"** — exactly what state copies with a character (sheet only? level reset? inventory?).
- **Multiplayer sync** — the one shared hard bet the party strand leans on; prototype alongside the shared table, not separately.

---

*End of Campaign Wrapper spec. With this, the full app structure is designed top to bottom — Campaign → Session → Scene → Room — every floor built on the same shape: a sequence, a shared pool, and a review layer. The one remaining strand is onboarding (§14): the layer that makes all of it learnable.*
