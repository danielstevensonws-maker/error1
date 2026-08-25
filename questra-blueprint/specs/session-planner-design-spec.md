# Session Planner — Design Spec

*A design document for the Session Planner feature of the D&D companion / VTT app. Built on the 2024 SRD (5.2.1) ruleset. This spec covers the Session Planner only; the Campaign Wrapper is deferred to a separate document.*

---

## 1. What the Session Planner is

The Session Planner is the tool a DM uses to prepare and run a single session — one night of play. It sits inside a nesting of scopes:

**Campaign → Session → Scene → Room**

- The **Campaign** gives the base layer of the story (the premise/pitch). It's a wrapper, covered separately.
- The **Session** is where the actual story forms — a single night of play. This is the focus of this document.
- A **Scene** is one distinct moment or unit of the session (see terminology note below).
- A **Room** is the map + tokens + assets for a combat/exploration scene.

The core realization: a session is **not** a map or a single room. A session is a *sequence of scenes* plus a *shared pool of resources* the scenes draw from, with a *review layer* on top. This same shape (sequence + shared pool + review layer) repeats at the campaign level one floor up.

---

## 2. Guiding principles

These run through every part of the design and should not be compromised:

- **Prep situations, not plots.** The planner prepares a stocked situation (a map, NPCs with motives, assets with states, a few keyed notes) and hands it to the live table, where the DM and players improvise the actual outcomes. It never authors a branching script — players will always find a door that wasn't written. This is established, widely-taught DM philosophy (e.g. "Don't Prep Plots"), not something specific to this app.
- **The session gives context, not a track.** Everything is deliberately loose: scenes reorder, skip, or get added mid-session; clues surface in any order; "leads to" notes hold multiple outcomes. The DM keeps full creative control (can discard the plan entirely); players keep full freedom. The structure never decides what happens.
- **Guided template, not blank page.** The app owns the skeleton; the DM owns the identity/content. Same philosophy as the character creation wizard and homebrew builder.
- **AI co-pilot, not autopilot.** AI always *suggests*; the human always *decides*. Every generated map, NPC, line, or hook arrives as an editable draft with accept / tweak / reject.
- **Curator for any story.** Scene *types* describe modes of play (what players are doing), not story content. The DM's infinite creativity lives in the content and order; the app only recognizes the mode so it knows what to offer. The gut-check: could a DM build a heist, a murder mystery, or a war council with the same pieces? If yes, it's a curator, not a template.
- **Plain language over jargon.** Prefer the word a first-time player would use over the word a veteran would — the same instinct behind the "?" info layer. (See terminology.)

---

## 3. Terminology note — "scenes," not "beats"

"Beat" is borrowed from screenwriting jargon (the smallest unit of story where something changes). It is **not** an official D&D term and confuses new players. The app uses **"scene"** everywhere in the interface — it needs no explanation. If the storytelling nuance is ever needed, "moment" is the plain-English fallback.

---

## 4. Two altitudes

The planner works at two zoom levels:

1. **The scene sequencer (top altitude)** — arrange the ordered scenes that make up the night; write the narration and notes for each.
2. **The room editor (inside a scene)** — only *combat* and *exploration* scenes drop down into a map editor. Social, narration, and downtime scenes don't need a battle map.

You zoom out to arrange the story; zoom in to stock a fight.

---

## 5. The scene sequencer

An ordered, **reorderable** list of scene cards representing the session's flow. Drag to reorder, tap to open a scene, and an "add a scene" control opens the type palette. The whole list is loose — reorder, skip, drop a blank scene for pure freeform, or add an unplanned scene mid-session.

### 5.1 Scene types (modes of play)

A small fixed set of containers that every story is made of. Based on D&D's own "three pillars of play" (combat, exploration, social interaction), lightly extended:

- **Social** — talking to NPCs (tavern, negotiation, courtroom, interrogation).
- **Combat** — a fight on a map. Opens the room editor.
- **Exploration** — traversing a place (dungeon, city, wilderness). Can use the room editor.
- **Puzzle / challenge** — a trap, riddle, chase, or timed ritual.
- **Narration** — pure story (cutscene, vision, flashback, transition).
- **Downtime** — resting, shopping, training, crafting between the action.
- **Blank** — the DM's own notes with no imposed structure (or a hybrid, e.g. a tavern that becomes a brawl).

Type is a helpful *default*, not a requirement.

### 5.2 What every scene card contains

Regardless of type, each scene carries the same story slots:

- **Read-aloud narration** — the "boxed text" a DM reads to set the scene. Draftable by co-pilot. Can be spoken aloud via the TTS voice library (narrator voice) and appears in the table log during play.
- **DM notes** — the secret half (NPC motives, the twist, what's really going on). Hidden from players.
- **Leads to** — a plain note on how the scene moves the story. Holds *multiple* outcomes on purpose (e.g. "if she escapes → next-session hook; if killed → villagers found"). Not a rail, not an engine — a note the DM acts on.
- **Time estimate** (pacing) — a rough duration for the scene (see §8).
- **Open room editor** — only appears on combat/exploration scenes.

### 5.3 Scene sequencer co-pilot

Describe the session in a sentence and the co-pilot drafts the whole scene sequence as editable cards — or the DM builds beat-by-beat and ignores it. Suggests, never commits.

---

## 6. The room editor (combat / exploration scenes)

### 6.1 The three-layer scene model

A map is **not a flat picture** — it's a stack of layers. This is the distinction between a pretty background and a functional VTT:

1. **Base terrain** — the AI-generated top-down map (walls, floors, doors). A flat image is *only this layer*.
2. **Asset layer** — movable, stateful objects placed on the grid: a rock, a tomb, loot, braziers. Each is its own **separate image**, draggable and deletable. Some are scenery; some are interactive (a tomb with a closed/open state, blocking/interactive flags).
3. **Trigger layer** — the rules and events ("open tomb → spawn boss"). **For v1 this is manual**: the DM swaps the closed-tomb image for an open one and drags in the boss token. A prep note pinned to the asset reminds them. Automation is deferred; the inspector can later grow a "when opened → …" rule without changing the layout.

### 6.2 Asset generation approach

- Assets are generated as **separate images**, not cut out of one composed scene. (Auto-decomposing one big generated image into movable objects is the single hardest technical bet and is deliberately avoided.)
- Likely pipeline: base terrain (generated or from a library) + assets placed as separate sprites carrying metadata (blocking? movable? interactive? trigger?), assembled onto the grid.
- Assets should come from **both** on-demand generation *and* a growing **library** (generate-then-save-to-library), which also solves art consistency across a campaign.
- **Open decision:** how much does "generate room" produce in one shot — just terrain, or the whole stocking? Leaning toward terrain-first, then separate "suggest assets" and "suggest a note" steps, so the DM builds up in accept/tweak steps rather than untangling a wall of AI output.

### 6.3 Tokens

- NPC and monster tokens each **carry a stat block**, so when a token is on the table and gets hit, the play screen already knows its AC and HP. This threads the planner to the play screen and to the bestiary/compendium.
- The **boss starts off-map** (staged, not placed), ready to drag in when triggered.

### 6.4 Planner = table canvas in edit mode

The planner and the live table view are the **same canvas in two modes**. The play screen *is* the room, in play mode; the planner is that exact canvas in edit mode (with an asset palette, inspector, staged tokens). One map renderer, two modes. (Mirrors the character hub's "home mode vs session mode.")

---

## 7. The social scene (non-combat detail)

The half of D&D most VTTs neglect, and a genuine differentiator.

**Key insight: don't script the dialogue.** Video-game RPGs use branching dialogue trees; tabletop players say *anything*, so a tree can't hold it. A social scene preps an **NPC** defined well enough that the DM (with AI help) can improvise as them, no matter what a player says.

### 7.1 NPC definition

- **Portrait** (AI-generated, same pipeline as character portraits).
- **Voice** (from the TTS library) — so a solo DM juggling several NPCs gets help sounding like each.
- **Wants** — the NPC's motive/goal, which drives roleplay.
- **Attitude meter** — a friendly ↔ wary indicator that *moves* as the conversation goes; a warmer NPC gives up more. The game-y touch that makes social feel as "played" as combat.
- **Knows** — a list of facts/clues the NPC can reveal, surfaced "as it comes up" (any order), not as an interrogation checklist.

### 7.2 Roleplay co-pilot

When a player says something unexpected, the co-pilot reads the NPC's motive + attitude + knowledge and offers an in-character line the DM can **Speak** (TTS), **regenerate** (Another), or **rewrite** (Tweak). Suggests, never commits — the DM always delivers the line.

- **Open decision:** on-demand vs proactive suggestions. Default to **on-demand** (a DM enjoying their own performance shouldn't be crowded), with proactive as a toggle.

### 7.3 Skill-check hooks

Social scenes note likely checks and DCs (e.g. "Insight or Persuasion, DC 13"), threading into the dice roller and character sheets so conversation has real mechanical stakes.

---

## 8. The session kit (session-level shared resources)

The connective tissue: resources that live *above* the scenes and get dropped into any of them. Nothing here is trapped in the timeline — scenes *reference* this pool. This is what makes prep survive players who wander off-plan. Maps directly onto the real "Lazy Dungeon Master" prep checklist.

- **Recap** — sits at the very top, above the strong start. Auto-drafted from the *last* session's play log ("Previously: …"), editable, read aloud to open. Also what a player joining an ongoing campaign reads to catch up (the "transcript" case).
- **Your players** (character connection) — see §9.
- **Strong start** — a punchy opening beat so the session doesn't open flat (Lazy DM's literal first prep step). Open mid-crisis, not "you're all in a tavern."
- **Secrets & clues** — a pool of ~facts discoverable **in any order, any scene** (Lazy DM's anti-railroad centerpiece). Live checkboxes double as a play-time tracker (ticked = already revealed). Not tied to a specific room or question.
- **Cast** — the NPC roster. Each NPC defined once, dropped into whatever scenes. Reusable across scenes and "pull from campaign" for recurring NPCs.
- **Rewards** — magic items and treasure the DM might hand out this session.

---

## 9. Character connection ("review the characters")

The highest-value connective link: prep for *these* players, not a generic party. There are **two directions**, at different times, done by different people:

1. **At join (player side, once):** the player sees the campaign premise/pitch and builds a character to fit it. (For a brand-new campaign there's no transcript yet — it's a premise. Only a latecomer to an *ongoing* campaign reads a recap.)
2. **Each session (DM side, ongoing):** the DM reviews the characters that already exist and hooks the session into their backstories, bonds, and goals. This is what "review the characters" means and was the missing link.

### 9.1 The "Your players" panel

A session-level panel that surfaces each character's hooks (pulled from their existing sheets) where the DM preps. The co-pilot reads them and suggests a personal tie-in (e.g. "the thing walled up in the mine bears the Ashen Hand's mark — pull Wren's vendetta into this session"), which drops into the session's DM notes.

Nothing new is created — it's a window into data the app already has (from the character wizard), opened where it's relevant. This is the piece that makes the tool feel indispensable rather than nice.

---

## 10. Pacing

- Each scene card carries a rough **time estimate** (e.g. social ~30 min, combat ~45 min).
- The session header **totals** them ("~3.5 hrs — about right for one night").
- The cheapest possible fix for the universal DM fear of prepping too much or too little for the time slot.

---

## 11. Encounter balancing

- Lives **inside the combat scene / room editor**.
- The moment tokens are placed, the builder already knows the party (from the Your Players panel), so it shows a live difficulty readout ("2 lurkers + brood-mother vs. 4 level-3 characters — Hard"), updating as monsters are added/removed.
- A safety rail against accidental party-wipes; a natural co-pilot job ("this is Deadly — cut one lurker?").

---

## 12. Run-mode helpers (not prep)

These belong to the **play screen**, not the prep builder, on purpose — prep shouldn't try to anticipate the unplanned; it should hand the DM a fast improv tool when the unplanned arrives.

- **Oracle** — a "what happens?" button giving a fast yes/no-and-a-twist for when players do something no one prepped.
- **Quick rulings** — on-the-spot rules lookup.

These sit next to the table log on the play screen.

---

## 13. Cross-cutting systems this relies on

The Session Planner leans on systems designed elsewhere in the app:

- **The "?" info layer** — any stat/term/card taps to a 3-layer explanation (plain sentence → where it came from → full SRD text). Applies to the planner too.
- **AI co-pilot** — suggests-not-commits, reads context, optional, explains on demand.
- **Voice (TTS/STT)** — designed voice library; TTS speaks NPC lines and narration; a curated library, no cloning of real people; framed partly as accessibility.
- **AI image / portrait system** — painterly style locked via base block + preset tokens + free-form; seed-locked for consistency; used for NPC portraits and (via the asset pipeline) maps and assets.
- **Dice roller** — powers skill-check hooks and combat.
- **Character sheets / hub, compendium, bestiary** — the player-facing and reference systems the planner threads into.

---

## 14. Grounding in real DM practice

Almost nothing here is invented — the design reconstructs how DMs already prep, which is a good sign (it matches the DM's existing mental model):

- **Read-aloud narration** = "boxed text," a decades-old published-adventure convention.
- **DM notes** = the private notes every DM keeps behind the screen.
- **Scene types** = D&D's official "three pillars of play," finer-grained.
- **Prep situations, not plots** = widely-taught DM philosophy.
- **Manual triggers** = how a physical table works (the DM *is* the engine).
- **The session kit** ≈ the "Lazy Dungeon Master" checklist (strong start; secrets & clues; NPC, location, monster, and reward lists; review the characters).

---

## 15. Build feasibility

The whole thing is buildable, but it is **not one project** — it's a large app with a couple of hard AI bets inside it. Two piles:

**Buildable with proven tools (ordinary, if large, engineering):**
Scene sequencer, session kit, character sheets and hub, Your Players panel, encounter math, dice, compendium, drag-and-drop tokens on a grid, state toggles, manual triggers, shared table. Real effort, but no research risk.

**Buildable but genuinely risky — prototype early, don't assume:**
- AI **map generation**, and especially **assets as separate, grid-scaled, tagged images** (the hardest single piece).
- **Art consistency** across a whole campaign.
- The **live roleplay co-pilot** being fast and good enough at the table.
- **Real-time multiplayer sync** so a DM and players see the board move smoothly.

None is impossible (the industry is doing all of it), but these are where quality, cost, and latency fight back, and where "works in a demo" ≠ "works every session for months."

### Build order

Design was done **top-down** (campaign → session → scene → room) because that's how it makes sense to *understand*. Build **bottom-up and risk-first**: prove the scariest small piece — **one AI-composed room** with one draggable/deletable/tagged asset and one token — before building anything around it. If that one room feels like magic and works reliably, the rest is solid engineering. If it doesn't, that's learned for the price of a prototype instead of a year.

---

## 16. Open decisions / backlog

- **Asset pipeline:** generate-on-demand vs library (leaning: both, generate-then-save).
- **"Generate room/session" scope:** how much AI produces in one shot (leaning: terrain/skeleton first, then accept/tweak steps).
- **Roleplay co-pilot:** proactive vs on-demand (leaning: on-demand default, proactive toggle).
- **Scene card fields:** uniform across all types vs tailored per type (e.g. social wanting an NPC list, puzzle wanting a solution + hint).
- **Non-combat maps:** a look for places (a village) that aren't battle grids.
- **The Campaign Wrapper** — the next document. Same sequence-plus-pool pattern one level up: sessions in sequence + campaign-wide resources (the party, overarching secrets, recurring cast). "Pull from campaign" is the seam. Recurring NPCs live at campaign level and cascade down.

---

*End of Session Planner spec. Next: the Campaign Wrapper.*
