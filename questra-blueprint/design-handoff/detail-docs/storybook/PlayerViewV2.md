# Play/Player View v2 — "The Near Edge"

**Story file:** `packages/web/src/primitives/v2/PlayerViewV2.stories.tsx`
**Storybook title:** `Play/Player View v2`
**Brief:** design-request `player-view-screen.md` (all of it) · Brief 10 §2 · legality from Brief 02/05 · dying ladder from Brief 04

---

## What this is

**The player's screen.** It began as a second concept, authored fresh alongside
[PlayerHub](PlayerHub.md) — a bar of panels docked to the bottom of a map — with
both kept live until the owner picked one. The owner picked this one, and v1 was
deleted along with the components only it used. The "v2" in the name is now
historical: there is one Player View.

Its design language was then extracted into `packages/web/src/design/` so the
rest of the product could speak it too, and the primitives were rebuilt on it.
See the [catalogue README](README.md) for what consolidated into what.

Owner decisions taken before any code was written:

| Question | Decision |
|---|---|
| Reuse v1's components? | **No — fresh.** It shared only `@questra/ui` primitives and `--qa-*` tokens with v1, which is why deleting v1 cost this screen nothing. |
| Who is the player? | **Torvald**, on the real `torvald-sheet.json` fixture, so every "how is this worked out" sheet shows true derivations. |
| Enemies on the left rail? | **Yes** — in turn order, carrying one word for how hurt they are and never a number. |
| Frame or overlay? | **Overlay.** The map is the appeal; the HUD floats over it as discrete panels. |
| Named tiles or icons? | **Icons**, with the name and numbers in the detail strip. |
| Where does the action bar sit? | **Centred**, with your character in the bottom-left corner as its own panel. |
| Panels in Storybook? | **Each on its own**, under `Play/Player View v2/*`, staged over the real map. |
| Action row order and width? | **Bonus + Reaction on top, Action alone on the bottom** (nearest you), panel widened ~600px → ~820px, sockets bumped so a fresh character shows real room to grow (owner direction, 2026-08-18). |
| Does the action panel collapse? | **Yes**, same pattern as the spine and journal — a chevron collapses it to a pill carrying the current turn phrase. Fixed a real centring bug in the same pass: it was leaning toward the journal by exactly the 92px gap between the You panel's and journal's widths (owner direction, 2026-08-19). |

---

## The thesis

v1 arranges a character *sheet* on a screen. v2 arranges the *table you are
sitting at*. Your side is the near edge along the bottom, the cast sits down the
left in the order they act, the journal is at your right hand, and the scene is
across from you. Every panel earns its position from where that thing actually
is when five friends play this game in one room.

**The map is the hero.** The first pass of v2 ran its surfaces flush to the
window, which turned the HUD into a frame — a continuous C down the left, along
the bottom and up the right — and left the map as the hole in the middle of it.
Chrome is the wrong thing to be looking at for three hours. So the map is full
bleed and every surface is a **discrete panel floating over it**, held off the
window by `--qa-hud-inset` and off each other by the spacing scale. Nothing
touches anything else and nothing touches the edge.

What stops separate panels from disagreeing is the one thing the v1 hub paid
for: **it was never the merging, it was the shared chrome contract.** Every
surface here is `.qa2-panel` — one radius, one padding, one internal rhythm, one
fill, one border, one shadow — and nothing is hand-rolled beside it.

```
 ┌──────────┐          ┌──────────────────┐              ⌇ ♪ ☰
 │TURN ORDER│          │The Ruined Steading│
 │ 21 Wren  │          └──────────────────┘
 │ 18 TORVALD ◄ acting
 │ 15 Skirmisher                     G1
 │ 12 Mira            W                                ┌───────────┐
 │ 09 Lookout                             G2           │ ASSISTANT │
 │ 07 Ozren       O                                    │ · JOURNAL │
 ├──────────┤              T                           │           │
 │"You're   │                                          │  notes    │
 │  next."  │          M                               │  feed     │
 └──────────┘                                          │  rulings  │
                    ┌──────────────┐                   │  reacts   │
                    │  LAST ROLL   │ (only while there  │  composer │
                    └──────────────┘  is one)           │           │
 ┌──────────┐   ┌─────────────────────────────────────┐ │           │
 │ Torvald  │   │▀▀▀▀ accent, only on your turn ▀▀▀▀▀▀│ │           │
 │ HP · AC  │   │ your turn · aimed at · move          │ │           │
 │conditions│   │ ○BONUS   ○REACTION                   │ │           │
 │ STR…CHA  │   │ ✳ + + +    ↺ + +                     │ │           │
 └──────────┘   │ ───────────────────────────────────  │ │           │
                │ ●ACTION                               │ │           │
                │ ⚔ 👟 ⇥ ⛉ 🔥 ⚡ ➕ 🩸                    │ │           │
                │ ─ Longsword — +5 to hit ─             │ │           │
                │ ▸ Or describe what you do…            │ │           │
                └─────────────────────────────────────┘ └───────────┘
    244px         Bonus+Reaction on top, Action alone       336px
  bottom-left      below with a hairline between them —   bottom-right
                   ~820px, nearest you at the bottom edge
```

---

## The signature — the round spine

`RoundSpine.tsx`. The left edge is the round, drawn as a timeline.

The design request asks for a "party rail": one card per member, portrait and
HP. That answers *how is everyone doing* — a real question, but not the one a
player actually has. During somebody else's turn the question in the room is
**when am I up**, and v1 could not answer it at all: whose turn it was arrived as
a single badge with no sense of what came before or after.

So the rail is initiative order, top to bottom, with a hairline running down it:

- Turns already spent **dim and desaturate**, and their segment of the line
  carries the accent.
- Segments still ahead carry the frame's own faint border.
- The acting notch holds the one filled dot.
- When the line reaches **your** notch, the same accent continues along the top
  edge of the near edge (`.qa2-band.is-yours::before`). **One accent, one journey
  per round**, arriving at the surface you act from.
- The cue pinned to the bottom of the rail reads *"You're next."* or *"3 turns
  until yours."* — the countdown a player can act on.

Turn order is the one genuine sequence on this screen, which is the only reason
numbering earns its keep here. Names are set in the display serif and initiative
numbers in mono, so the rail reads as a **cast list with a running order** rather
than as a table of rows.

**Enemies get a word, never a number.** Unhurt · Hurt · Bloodied · Down. An
enemy's exact hit points are the DM's to reveal when the DM chooses; a player is
owed enough to make a decision and no more. The word is also what the table
already says out loud.

**Out of combat the rail tells the truth about that too**: no round, no order, so
it becomes a party roster, the initiative column disappears, and the timeline
goes quiet. See the `Exploring` story.

## The quiet second move — the open line

`NearEdge.tsx`. Under the three action rows, past a hairline, one plain input:

> ▸ Or describe what you do — the DM will pick it up

The rows above are what the rules can resolve; the line below is what the story
can. Drawing that boundary *is* the point — law 2 is not a slogan on this
screen, it is a row. It sits last in the list rather than as a button in a
corner, because describing something should feel like the next option, not like
an admission that the interface failed you.

---

## How the rest of it works

### Icon tiles, two rows: Bonus + Reaction on top, Action alone on the bottom

An earlier pass put the **name** on each tile face. It read well and it cost
roughly three times the width, which pushed the action panel back toward being a
bar across the whole bottom of the screen — and the map is supposed to be what
you are looking at. Square icon tiles free up that width instead.

**The rows themselves are split by frequency, not squeezed onto one line**
(owner direction, 2026-08-18). Bonus and Reaction share a row at the top —
divided by a hairline, same pattern v1's `ActionBar` already used for the same
stated reason: those two rarely carry more than a couple of live tiles.
Action sits **alone on its own row at the bottom, nearest you**, because it is
the one you touch on almost every turn — the hand you act with should not have
to share its row with the two you only consult sometimes. A second hairline
separates the two groups. The panel itself widened alongside this, from a
~600px cap to **~820px**, enough for both rows to breathe without pushing back
toward the wide-bar problem the icon-tile pass solved in the first place — a
deliberate middle point between "no wider" and "full edge-to-edge," chosen
because the map still reads as the thing on screen, not the panel.

The meaning moves to the **detail strip**, which was already there and already
fixed height. It names whatever the mouse or keyboard is on and falls back to the
first legal tile, so it is never blank. An icon is therefore a shortcut for a
player who already knows the row, never the only way to find out what something
is (law 5). Every tile also carries that same sentence as its accessible name and
its tooltip — three routes to the information, none of them colour or shape alone
(§8).

**Glyphs have to be distinguishable, not merely present.** The first icon pass
resolved Dash and Disengage to one mark and Dodge and Opportunity Attack to
another — two identical pairs, each sitting adjacent in the same row. With names
on the tiles that was forgiving; with the icon *as* the tile it makes the row
unreadable. `glyphFor()` now orders its specific cases first and ships distinct
`exit` and `counter` marks, and the sword grew a crossguard, because without one
everybody read it as a pencil.

The only number that survives onto a tile face is the **uses-left count**, in the
corner: "have I still got one of these" has to be answerable without hovering,
where "what is its damage die" does not.

**A caster is the real stress test**, and it caught the collision a third time:
Cure Wounds and Shield of Faith both drew an outlined shape with a cross in it,
one tile apart, and Dodge and Shield of Faith both drew the plain shield.
`test/v2-caster-fixture.test.ts` now asserts that **no two tiles in the same
economy share a glyph** — adjacency across rows is fine, within a row it is not
— so this cannot regress a fourth time.

### `MAX_SLOTS` — one ceiling per economy, run in both directions

Sockets and real tiles are the identical 46px square, so "how many empty ones
fit" and "how many real ones fit before the row needs help" are the same
physical question. `MAX_SLOTS` answers it once, per economy:

| | Action | Bonus | Reaction |
|---|---|---|---|
| `MAX_SLOTS` | 14 | 10 | 4 |

Under the cap, dashed growth sockets pad the row out (§4.11 — "room to grow").
Over it, the row adds one **`+N`** tile instead — solid-bordered and
accent-tinted, never dashed, because dashed already means "not yours yet" and
an overflowing ability very much is yours. Tapping it opens the folio's
Abilities & Spells tab: law 2 in miniature, the bar can run out of room but
the app never runs out of a way to reach something you own.

**This used to be two numbers, and that was a real bug, not a style choice.**
An earlier pass had a separate, bigger constant for "how many sockets to show"
on top of this one, reasoning that a fresher, emptier-looking row could
promise more room to grow than the real-tile ceiling. It cannot work: since
sockets and tiles are the same size, a row that physically holds at most 8
before overflowing cannot also hold 10 empty ones without wrapping — the two
numbers were describing the identical constraint and had drifted apart. Once
the "sockets" constant exceeded the overflow constant, a row with, say, 7 real
tiles computed a *positive* sockets count from the bigger number in the same
breath its overflow math correctly fired from the smaller one — a growth
socket and a "+1" tile rendering side by side, which is nonsense on its face.
`ActionRows.test.tsx` now asserts the identity directly and parametrically,
for all three economies at once: an empty row shows exactly `MAX_SLOTS[economy]`
sockets, one more than the cap shows exactly one overflow tile and zero
sockets — so a future change that reintroduces two constants fails
immediately rather than waiting on an economy-specific test to happen to
notice.

**The numbers are tuned to fill the row, not to round numbers** (owner
direction, 2026-08-19: *"add multiple plus buttons until it reaches the end of
the div — I want to see the creativity possibilities."*). `.qa2-slots` carries
`flex-wrap: wrap` as a safety net for narrower windows — sized right, that
never triggers at the reference width; it only matters if the window narrows
past that, in which case the row grows a second line rather than clipping or
overflowing. That safety net is also why the fill is real CSS layout and not a
generously-overrendered list with the excess hidden by `overflow: hidden`: a
clipped-but-still-rendered button remains focusable and screen-reader-visible
even though nobody can see it, which is a genuine accessibility bug, not a
visual shortcut worth taking.

**The first pass at these numbers (8/6/4) was itself too conservative**, and
worth explaining because the mistake is instructive. It was tuned against "how
many of Mira's real tiles fit before the row overflows" — a genuine
measurement, but of the wrong question. It says nothing about how much of the
row's actual *width* is left empty. Action sits alone on the panel's full
~788px content width, while Bonus and Reaction only ever share it — so capping
all three at the same number was never going to fill Action's much larger row.
Measured properly, Action had **~364px of dead space** at a cap of 8, more
than six tile-widths of unclaimed room.

The re-measurement was live in the browser, not by hand: render a generously
oversized run of tiles, read each one's `getBoundingClientRect()`, count how
many share the first tile's `top` (haven't wrapped). Bonus and Reaction needed
an extra step — their econ blocks compete for the *same* physical width, so
measuring one at a huge count while the other is also huge just pushes the
second one onto its own line entirely, silently measuring the wrong thing.
The real numbers came from fixing Reaction at its true ceiling (4) and finding
how far Bonus could grow beside it before Reaction got pushed down:

- **action: 14** — alone on the full-width row, ~55px of slack left over
  (less than one more 54px tile). Mira's real 8-tile kit sits inside it with
  6 sockets to spare and zero overflow.
- **bonus: 10** — sharing the top row with reaction fixed at 4, this is
  genuinely the most that fits beside it before reaction's block wraps to its
  own line; ~14px of slack left.
- **reaction: 4** — pinned to real data, not eyeballed, and it does **not**
  move for visual fullness, even now that Bonus is wide enough that Reaction
  visibly has room to spare beside it. Counted every reaction-cast spell in
  `packages/engine/src/data/spells.draft.json` (339 real SRD entries) by
  class: no class list has more than 3 (Wizard/Sorcerer top out at Shield,
  Counterspell, Feather Fall). Add the universal Opportunity Attack and the
  real ceiling for any single-class character, at any level, is 4. Re-counted
  after the 27 cantrips landed — none of them is reaction-cast, so the 4 holds.
  `ActionRows.test.tsx` holds that exact case by name (a Wizard with all
  three). A sourced fact about the ruleset outranks "make the row look
  fuller" every time.

Casters were checked individually before touching Mira's own list: Clerics
have **zero** reaction spells in the SRD, so giving her one to demo the
reaction row would have been exactly the kind of invented rule CLAUDE.md warns
against — her reaction row pads out on sockets alone, honestly.

### The detail strip is inherited from v1 verbatim

Fixed height, so sweeping the mouse across the bar never reflows anything above
it. A refusal goes *in the strip* rather than inside the tile — putting the
reason on the tile is what used to make a dimmed row look broken.

### The action panel collapses, and a real centring bug got fixed alongside it

Same pattern as the spine and the journal: a chevron collapses the whole panel
to a pill in the same spot, so a player who wants the map back can quiet three
surfaces, not two. It sits at the end of `TurnLine`'s row, sharing the one
`marginLeft: auto` push the movement meter already claims — an earlier pass
floated it as its own absolutely-positioned corner button and it landed
directly on top of the meter's "ft" text, since both were independently
staking a claim to the same corner. The collapsed pill carries the same
phrase the open panel's own badge would show ("Your turn", "Wren is up"), via
one shared `turnPhrase()` helper so the two cannot drift apart. The You panel
does **not** collapse with it — a player who wants a quieter action row still
wants their own hit points visible, so the two toggle independently.

**The centring itself was actually wrong**, not just narrow. `left: 50%;
transform: translateX(-50%)` centres on the whole viewport — but the You panel
(244px) and the journal (336px) are different widths, so centring on the
screen put 92px more gap on one side than the other. It read as leaning toward
the journal, which is exactly what it was doing. The fix is the standard CSS
technique for centring a fixed-width box between two *unequal* neighbours: set
`left` and `right` to the real edges of the You panel and the journal (not the
viewport edges), give the box its explicit width, and set both side margins to
`auto`. The browser splits whatever space is left over equally between the two
margins — specified behaviour (CSS2.1 §10.3.7), not an approximation — so the
gap to each neighbour is identical regardless of how unequal the neighbours
themselves are. Checked against the browser's own `getBoundingClientRect()`
rather than trusted by eye: **140.00px on both sides**, exactly.

### Greying is still the server's answer

`toTiles()` runs every tile through `greyingReason()` from `@questra/engine` —
the same function the server calls to reject an intent. Client and server cannot
disagree, because there is only one implementation. `Waiting` demonstrates it:
every tile dims and the strip reads *"It isn't Torvald's turn."*

The three universal actions (Dash, Disengage, Dodge) are gated by running a
`move` intent through the same `checkIntent`. That intent kind exercises exactly
the actor-level gates that apply to all three — you are down, you are
incapacitated, it is not your turn — and nothing else. It is deliberately **not**
a second legality implementation; it is the one function, asked a narrower
question.

### Every number is tappable — but no field of question marks

§5 asks for the affordance and invites an improvement on v1's `?` circle. At
v2's density a `?` beside every value is a field of punctuation. Instead the
readout's own **label carries a dotted underline** — the long-standing "there is
more behind this word" mark — and the whole readout is the button. It costs no
space, scales down to the log's breakdown rows, and reads as annotation rather
than chrome.

The sheet it opens shows kicker, title, the itemised rows, a plain-English rule,
and a line of flavour. `HowANumberWorks` opens it on Armor Class: **Chain Mail 16
+ Shield 2 = 18**, straight out of the fixture.

### Where the roll lands (§6)

A card rises **directly above the panel you rolled from**, left-aligned with it:
the total, its named rows, and the verdict. The same place every time, so a
player never hunts for it — but only occupying the map while there is something
to say. As a permanent third bay it left a column of the HUD standing empty
between rolls, which is exactly the kind of chrome the overlay direction is
trying to get rid of.

The quiet numbers that bay used to carry — speed, what you notice, initiative,
hit dice, coin — moved into the folio's Stats tab. They are reference: you read
them *between* turns, never during one.

The same roll appears in the journal as one collapsed line, tap-to-expand.
Expanded by default would turn a busy round into a wall of arithmetic.

### The flip

`dying` present and its phase not `up` ⇒ the action panel's contents are replaced
by the death-save ladder, the identity panel dims to 45%, your token drops and is
tagged, and the spine's notch reads *Dying*. Pure function of the view-model. The
copy is the product's voice verbatim.

### One area for the journal

Notes, narration, table talk, rolls and ruling suggestions arrive in one stream
in the order they happened, because that is the order a table experiences them
in. A ruling suggestion is a **proposal with three answers** — ask for the roll,
change it, no roll needed — never a ruling that applies itself (law 1).

Those three answers are not the rail's own buttons. The suggestion renders
`AcceptTweakRejectCard` at `placement="inline"` — THE AI card, docked in the
stream. The rail used to draw its own quote-plus-buttons block behind a generic
`actions` array, which meant the product had two ways of putting a model's
output in front of a human and only one of them carried the guarantee. The
labels are still the table's ("Ask for the roll" beats "Accept" at a table); the
meanings are the card's, and a caller cannot invent a fourth. A decided
suggestion stays in the log as the card's resolved state, Undo included — a
decision that scrolls away unrecorded is one nobody can take back (law 3).

Collapsed, both rails become small **pills** in their corners — "Round 3 ·
You're next", "Assistant · 1 waiting" — rather than the thin edge-welded strips
of the `LOG CLOSED.PNG` reference. A HUD that floats should not grow an edge when
it shrinks, and the point of collapsing is to give the map back, which a
full-height strip does rather less of than it looks like.

### Accessibility (§8), designed not deferred

Every animated rule describes the **finished** state, and the keyframes run
*from* a hidden state *to* nothing. So the reduced-motion block says
`animation: none` and every moving part is left correctly drawn — verified in a
browser with `prefers-reduced-motion: reduce`: the accent lead sits at
`opacity: 1; transform: none`, your token keeps its 3px accent ring. Nothing
disappears and nothing is stuck at zero.

Also: the ground carries a vignette so glass keeps its contrast where the panels
sit; the accent never carries meaning alone; focus is visible
on every control; refusals are in the accessible name, so a screen reader hears
*why* at the moment a sighted player reads it in the strip.

---

## The stories

| Story | Shows |
|---|---|
| `YourTurn` | **The one to judge from.** Round 3, Torvald up, skirmisher bloodied and aimed at, a ruling suggestion waiting. |
| `Waiting` | Wren is up. Every tile dimmed with the server's own reason; the spine's cue reads "You're next." |
| `Bloodied` | 5/12 with temporary hit points and Prone — the bar turns, the tags appear, the tags explain themselves. |
| `Dying` | The flip. Click through the ladder in the harness; it reaches Stable or Dead. |
| `RollLanded` | The result bay carrying a settled roll, and the same roll collapsed in the journal. |
| `HowANumberWorks` | The explain sheet, open on the real Armor Class derivation. |
| `TheFolio` | The character sheet rising from the near edge. Four tabs. |
| `TableMenuOpen` | The menu; picking Safety tools raises the pause. |
| `FirstSession` | §4.11 — two tiles that are actually yours, the rest open sockets. |
| `Exploring` | No round, no order. The rail becomes the party and the accent stays out of the near edge. |
| `EyesUp` | Both rails collapsed. Law 4's payoff: the room takes the screen. |
| `MiraTheCleric` | **The caster variant** (§9). Six prepared spells in the row, slot counts on the tiles, the concentration badge lit. |
| `MirasSpellbook` | Mira's folio on the Abilities & Spells tab — slot pips, save DC, spell attack, prepared list. |

### And each panel on its own — `Play/Player View v2/*`

The composed screen is not the only place to judge from. Every panel also has
its own story file, so it can be looked at without four other surfaces arguing
for attention:

| Title | Stories |
|---|---|
| `Play/Player View v2/Round Spine` | Your turn · You're next · Mid-round · Out of combat · Collapsed |
| `Play/Player View v2/Near Edge` | Your turn · Waiting · Bloodied · Roll landed · Dying · First session · Actions collapsed |
| `Play/Player View v2/Journal` | Full · With a roll · Quiet · Collapsed |
| `Play/Player View v2/Overlays` | How a number works · What a condition does · Setting up a roll · The folio · The menu · The pause |
| `Play/Player View v2/Scene Nameplate` | Your turn · Someone else · Exploring |

They all mount through `stage.tsx`, which renders the **real screen root** over
the **real map ground**. Two consequences worth knowing:

- These panels are translucent glass. On Storybook's flat canvas they read as
  washed-out grey cards and every judgement made about them there is wrong. The
  ground is the REAL `MapCanvas` drawing the REAL room, not a gradient standing
  in for one — glass judged against the wrong material is judged wrong.
- Because the stage is the actual root, an isolated panel lands in **exactly**
  the position it occupies in the composed screen — spine top-left, journal
  bottom-right, action bar centred. Nothing is re-laid-out for the sake of a
  story, so the isolated views cannot drift from the assembled one.

---

## Files

The screen, under `packages/web/src/primitives/v2/`:

| File | What it owns |
|---|---|
| `PlayerViewV2.tsx` | The shell: the grid, the overlay state, the roll choreography. UI state only. |
| `RoundSpine.tsx` | The signature. Turn order as a timeline. |
| `SceneRail.tsx` | The scene's nameplate and the control cluster — two floating things, not a bar. |
| `NearEdge.tsx` | Your two bottom panels: identity/vitals/conditions, and turn line + actions + open line, plus the roll card and the death-save ladder. |
| `ActionRows.tsx` | The two rows (Bonus+Reaction top, Action alone bottom), sockets, the overflow tile, and the fixed detail strip. |
| `JournalRail.tsx` | Right edge: notes, feed, collapsible rolls, ruling suggestions, reactions, composer. |
| `Overlays.tsx` | ComposeSheet · Folio · TableMenu · PauseOverlay · Scrim. |
| `viewModel.ts` | The seam: `ComputedSheet` + projection + `greyingReason` → view-models. |
| `ScreenStyles.tsx` | PLACEMENT — where each panel sits. Chrome lives in the shared layer. |
| `stage.tsx` | The Storybook ground: the real screen root, so an isolated panel lands where it really sits. |
| `fixtures.ts` | The demo table and the demo room. Torvald real; everyone else hand-built, as the rail's needs allow. |

The language it is built from, under `packages/web/src/design/` — extracted out
of this screen so every other surface could speak it too:

| File | What it owns |
|---|---|
| `type.ts` | The type ramp as roles. |
| `glyphs.tsx` | The drawn marks, in `currentColor`. |
| `parts.tsx` | The repeats — `ExplainValue`, `Tag`, `Field`, `HP`, `Ctl`, `Meter`. |
| `styles.tsx` | CHROME and BEHAVIOUR — fill, border, rhythm, hover, focus-visible, reduced motion. Owns no positions. |
| `explain.ts` | `ExplainVM` — a value, its rows, and a sentence. Presentational, not a game concept. |

Two of this screen's own components are gone, absorbed rather than deleted:
`TableGround` became `MapCanvas`'s `fit="fill"`, and `ExplainSheet` became
`InfoPanel`'s explain entry path. Both were second implementations of something
the primitives already owned.

`packages/web/test/hud-type-hygiene.test.ts` scans every surface on the layer —
no numeric font size, no directly named font family outside a type module, no
hex or `rgb()` literal, no literal duration. The stylesheets are in scope too: a
hex colour in a template literal is exactly as much of a leak as one in a style
object.

## Known gaps

- **The caster half is drawn, and the engine now feeds most of it.**
  `MiraTheCleric` and `MirasSpellbook` exercise the whole caster surface — six
  prepared spells in the action row, slot counts on the tile faces, the
  concentration badge, the folio's Spells tab with pips and save DC. The *screen*
  code is final: spells go through the same `greyingReason()` as everything else,
  using the `cast` intent that already exists in the contracts union.

  The engine half landed with the spell-slot work: `sheet.ts` attaches
  `spellcasting` to **every** caster type, computes slots from tables verified
  against the SRD text, carries a `preparedMax`, and resolves chosen spell ids
  into real `SpellCard`s off each spell's own `effects[]`. `CharacterChoices`
  gained `cantripChoices` / `preparedSpellIds` — their absence was the actual
  reason `prepared` could never be populated.

  What is still hand-authored is **Mira's own list**, and the reason has
  narrowed to one thing. The dataset now carries 339 spells across levels 0–9,
  109 of them Cleric spells, so her list could point at real ids today — but no
  draft spell has an authored `effects[]`, and that is where a card's save, DC
  and damage come from. Resolving her from the data now would give correct names
  and ranges on blank tiles, which is worse than the stand-in. When the
  rules-lawyer pass fills `effects[]` in, her tiles come from
  `spellcasting.prepared` and `fixtures.ts`'s hand-written list is deleted.
  Nothing in the components moves.

  `test/v2-caster-fixture.test.ts` holds the hand-authored numbers to the
  contract's own `derivationSumsToValue` invariant and to Cleric-3 arithmetic,
  so the stand-in cannot quietly teach the wrong shape.

- **Slot exhaustion greys a spell now.** `checkIntent`'s `cast` branch takes an
  optional `slotsRemaining` and refuses with "No level 3 slots left — take a rest
  to get them back." Absent, the check is skipped rather than guessed, the same
  rule `resourceRemaining` already followed — so a caller that does not know the
  slot counts still never invents a refusal the server would not send. Cantrips
  (`slotLevel: 0`) are never refused on this account.
- **The ground is a placeholder, and it now matters more.** It is layered
  `--qa-map-*` gradients plus a two-level grid, not terrain art. That was
  acceptable when the HUD was the frame; with the map as the hero it is the
  weakest thing on the screen, and the design cannot be judged at its best until
  a real map image goes in as the bottom layer. Nothing above that layer changes
  when it does.
- **The dice are somebody else's brief.** v2 answers "where the result lands",
  not what the die looks like getting there — see the `dice-tray-3d` request.
