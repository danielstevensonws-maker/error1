# Questra — Onboarding / Progressive Disclosure Spec

*The capstone strand. Designed last, over the locked pyramid, because it ramps into every other surface. Slots in as §14 of the Campaign Wrapper spec or stands alone.*

Built on SRD 5.2.1. Goal restated: the completeness that makes Questra powerful is a **wall** if shown all at once. Onboarding dissolves the wall by teaching the pyramid **bottom-up** — understanding always built on something the player already *did*, never an explanation taken on faith. This is the *coarse* teaching layer (which floor you meet, and when); the "?" info-layer remains the *fine* one (what a single term means, in place). Onboarding never re-explains a word "?" already covers.

## Core design decisions (locked)

- **Real stakes, not a sandbox.** The room built in minute one is the room they actually play. A campaign is silently scaffolded beneath the ramp from the first keystroke; the scaffolding is revealed later as a reward, not built from scratch. This is the "game, not tool" answer made structural.
- **This is the DM ramp.** Players don't need it — a player arrives via a friend's invite link, which routes them straight into the Character Wizard (itself a gentle ramp). The invite link *is* player onboarding. This strand is for the DM building from nothing.
- **Invitation, never a forced march.** Every floor is an opt-in offer. Complexity is *gated*, not hidden: a floor's UI does not exist on screen until the floor below is finished — it hasn't been summoned yet.
- **No quiz.** Never ask "are you experienced?" — that's a tool move. The fork is structural (below).

## The ramp — floor by floor

### Floor 0 — Entry
Near-empty screen: **"Let's make your first scene."** Quiet corner escape: **"I've run games before → take me to the campaign."**
- Beginners take the default; veterans self-select out. No quiz, no profile.
- **Unlock state is account-permanent.** Ramp once, never again. A veteran who skips starts at the top next time; a beginner who ramped never re-ramps.

### Floor 1 — First room *(the magic beat)*
*"Every adventure starts somewhere. Describe a place."*
- Three preset chips (torchlit tavern / dungeon cell / forest clearing) above a free-form field — rehearses Questra's core input grammar (**presets-before-free-form**) before teaching anything else.
- Pick or type → map generates in the painterly house style. **This is the payoff** — their sentence became a place. Rhymes with the Wizard's silhouette-to-portrait reveal, scaled to a room.
- One guided micro-action: *"Now put something in it"* — drag in one token.
- **One verb learned: describe → generate → place.** They know what a scene *is* because they made one.
- *(Real-stakes:)* this becomes seed content in the campaign scaffolded beneath them.

### Floor 2 — First night
Offer: *"Want to string a few scenes into a night?"*
- The Session Planner UI appears **now**, for the first time. They meet it already holding a scene, so the sequencing idea lands — they have pieces to sequence.

### Floor 3 — First play *(learn the loop by doing)*
Actually run the night on the in-play screen. **The ramp seats a pre-made demo party for this fight** — the solo DM has invited no one yet, so the tutorial can't depend on friends being online. The demo party keeps Floor 3 self-contained; "invite real players" is deferred to Floor 4. *You learn to run before you gather a table.*

The Engine and Ruling Suggestions do the teaching:
- First attack **auto-narrates** ("8 slashing — it's bloodied"): the d20-test wall dissolves before their eyes.
- First improvised action surfaces a **Ruling Suggestion** (suggested check + DC + fail consequence, human keeps the call): the new-DM improv terror is met the first time it can occur.
- The DM screen opens in its **first-contact state** — immersion console and "What Only You Know" collapsed, hotbar seeded with 2–3 cards — expanding as floors clear.

### Floor 4 — Campaign reveal *(the reward)*
Offer: *"Want to chain your nights into a bigger story?"*
- The Campaign Wrapper surfaces — and it is **not a blank novel**. It's already populated with everything they made across Floors 1–3. The silent scaffolding becomes visible: the premise-as-situation makes sense because they've *felt* how loose a session already is.
- **Situation-shaped, never a plot.** The auto-populated campaign comes out as bonds, open threads, and premise-as-situation — honoring the anti-railroad rule the Session Planner and Campaign Wrapper both enforce. The scaffolding never generates a storyline; it hands the DM loose materials, not a script.
- **Invite your real players** is introduced here as its own beat (the demo party from Floor 3 was tutorial-only). This is where the invite link — which is itself the players' entire onboarding — gets handed to the DM to send out.

## Gating & progress

- **Existence-gating:** each floor's UI is absent until the floor below is complete. Complexity isn't behind a menu — it hasn't been summoned. A new DM never sees a screen they haven't earned the pieces to understand.
- **Progress motif:** the pyramid lights up floor by floor — styled as *a world opening*, never a "complete your profile" nag.
- **Veteran path:** the Floor 0 escape hatch flips all first-contact states to fully-expanded and drops the DM at the Campaign Wrapper.

## Hooks already reserved in other specs
- In-play spec, Part 4: player hotbar seeds to 2–3 cards, tabs/inventory dimmed until earned; DM immersion console + "What Only You Know" collapsed; Assistant panel leads with a single Ruling Suggestion.
- Character Wizard: presets-before-free-form and the reveal beat are the per-step version of this same philosophy — Floor 1 mirrors them deliberately.

## Division of labor (so we don't teach the same thing twice)
| Layer | Job | Owner |
|---|---|---|
| Coarse | *When* you first meet each floor, bottom-up | This strand |
| Fine | *What* a single term means, in place | "?" info-layer |
| Player | Arrive → make a character → show up | Invite link + Wizard |
