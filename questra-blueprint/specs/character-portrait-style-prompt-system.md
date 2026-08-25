# Character Portrait — Style Prompt System

A reusable prompt engine for generating on-style character portraits at the wizard's final reveal. The goal: every image reads as one coherent family, while each character stays unique.

> **IP note — read once.** This template describes *ownable style attributes* (medium, palette, lighting, composition, subject archetypes). It deliberately names **no studio, brand, or living artist**. That's intentional on two fronts: (1) prompting by artist/brand name is the legally and ethically risky move you want to avoid, and (2) attribute prompting is simply more controllable. Build your style reference set from **original seed art you own or commissioned**, never from someone else's published illustrations. Get real legal advice before launch.

---

## 1. How it works

Every final prompt is assembled from four layers, in this order:

```
[ LOCKED STYLE BLOCK ]  →  [ PRESET TOKENS ]  →  [ FREE-FORM FLAVOR ]  →  [ COMPOSITION + LOCK ]
   (never changes)          (from wizard chips)    (user's own words)      (never changes)
```

The **locked** layers keep everything on-model. The **preset tokens** are a controlled vocabulary — each wizard chip maps to one reliable, pre-approved phrase, so users can't accidentally steer the model off-style. **Free-form** adds personality on top without touching the scaffold.

---

## 2. The locked style block

Append this to **every** generation. This is your floor.

**Base (positive):**
```
Painterly semi-realist fantasy illustration, digital oil painting with visible
brushwork and soft gouache texture, fantasy book-cover quality, richly detailed.
Single-character hero portrait. Soft diffused lighting, a warm-lit figure against
a cool ground. Muted desaturated palette dominated by pale, cold tones, lifted by
one or two rich saturated accent colors on the character.
```

**Composition + lock (positive, goes at the end).** Only the isolation instruction is fixed. The **setting** and **frame** are pulled from the variable tables in §3, so no two cards share the same ground:
```
{SETTING token}. Character cleanly separated from the background on soft negative
space, {FRAME token}. Clean silhouette, poised stance, three-quarter or full-body
view, centered.
```

**Exclusions.** ChatGPT (GPT Image) has **no separate negative-prompt field**, so fold a short avoid-list into the *end* of the positive prompt, just before or after the aspect ratio, and keep it minimal — long negative lists dilute it:
```
Avoid: anime or cel-shaded style, 3D render, photograph, text, watermark, logos,
extra limbs, deformed hands, cluttered background, multiple characters.
```

**Parameters (ChatGPT / GPT Image):**
- **Aspect ratio:** state it in words in the prompt — e.g. *"a tall 2:3 portrait image."* GPT Image supports ratios from 3:1 wide to 1:3 tall; it occasionally ignores the ratio, so just regenerate if it comes back square.
- **Style reference:** attach one or two of your owned seed images and add *"match the painterly style of the attached reference."* This is your strongest consistency lever here — there's no LoRA or style-reference flag in ChatGPT.
- **Prompt fidelity:** ChatGPT sometimes rewrites your prompt before handing it to the image model. Add *"use this prompt exactly as written"* to reduce drift.
- **No seed control:** you can't lock a seed in ChatGPT, so same-character consistency relies on reference images (see §7).

---

## 3. Preset-token vocabulary

Each wizard chip = one token phrase injected into the prompt. Swap in your own world's roster; the examples below follow the fae/winter-garden archetypes as a pattern.

### Ancestry / Species → features
| Chip | Injected token |
|---|---|
| Fae | `delicate fae features, pointed ears, translucent iridescent insect wings (dragonfly/butterfly/moth)` |
| Gnome | `small stout gnome, round freckled face, rosy cheeks, pointed ears` |
| Barghest | `hulking ape-like build, thick fur mane, rugged weathered features` |
| Elder folk | `aged folk, long white beard, weathered lined face` |
| *(your race)* | *(3–5 physical descriptors, no proper nouns)* |

### Vocation / Class → pose + signature gear
| Chip | Injected token |
|---|---|
| Duelist | `dynamic dueling stance, curved thorn-blade rapier` |
| Handler | `accompanied by a small tamed creature perched nearby` |
| Wayfarer / Bard | `traveling minstrel playing a carved fiddle` |
| Scholar | `scholarly demeanor, monocle, one finger raised, long coat` |
| Soldier / Courier | `military bearing, satchel, mid-salute` |
| Feral / Brute | `wild aggressive lunge, improvised heavy weapon` |

### Costume motif (multi-select)
| Chip | Injected token |
|---|---|
| Military | `Napoleonic/Victorian-style military coat, bicorn or tricorn hat, epaulets` |
| Baroque | `ornate baroque brocade garb, embroidery, tassels` |
| Samurai | `lacquered plate armor, layered robes, kabuto-style helm` |
| Pirate | `open-collared shirt, sash, buckled leather` |
| Folk | `handwoven folk textiles, embroidered patterns, bells` |
| Natural materials | `gear repurposed at tiny scale from leaf, thorn, mushroom, berry, and seed` |

### Palette accent (pick 1–2)
`crimson red` · `gold-ochre` · `deep teal` · `plum purple` · `emerald green`

### Mood / expression
`stoic and determined` · `mischievous and playful` · `weary and melancholy` · `regal and proud` · `warm and cheerful`

### Setting / ground (varies per character)
| Chip | Injected token |
|---|---|
| Winter Garden | `cold snowy ground, pale grey-white winter atmosphere, drifting snow` |
| Spring Garden | `soft mossy ground with scattered wildflowers, pale green atmosphere, drifting pollen and petals` |
| Autumn Garden | `fallen-leaf ground in amber and rust, warm hazy golden light, drifting leaves` |
| Woodland Floor | `dim forest floor of ferns and roots, dappled green-gold light, soft mist` |
| Sunlit Meadow | `pale sunlit grassland, warm diffuse daylight, floating seed-fluff` |
| Twilight Bog | `muted marsh ground, cool blue-violet dusk light, faint drifting fireflies` |
| Neutral Studio | `plain warm parchment-toned backdrop, soft even light` *(cleanest cutout for cards)* |

### Frame (varies per character — keep thin and edge-only)
| Chip | Injected token |
|---|---|
| Thorn Bramble | `framed at the edges by thorny bramble vines` |
| Holly & Berries | `framed at the edges by holly branches with red berries` |
| Flowering Vines | `framed at the edges by climbing vines in soft bloom` |
| Autumn Ivy | `framed at the edges by trailing ivy in amber and rust` |
| Bare Winter Branches | `framed at the edges by delicate frost-covered bare branches` |
| Twisting Roots | `framed at the edges by gnarled twisting roots` |
| Mushroom & Moss | `framed at the edges by clustered mushrooms and creeping moss` |
| No Frame | *(omit the frame clause — cleanest cutout for cards)* |

*Tip: pair the frame to the setting so they reinforce each other — Autumn Garden → Autumn Ivy, Winter → Bare Branches or Holly, Spring → Flowering Vines — either auto-linked or player-overridable.*

---

## 4. Assembly formula

```
{BASE}
Full-body hero portrait of a {ANCESTRY token} {VOCATION token},
{FREE-FORM appearance in user's words},
wearing {COSTUME MOTIF token(s)}, {PALETTE ACCENT} accents,
expression {MOOD}.
{SETTING token}. Character cleanly separated on soft negative space, {FRAME token}.
{COMPOSITION LOCK}
```
→ then fold in the **Avoid:** line and state the **aspect ratio** in words (§2), and attach a style reference.

---

## 5. Worked example (paste-ready)

**Wizard selections:** Fae · Duelist · plum + gold accents · free-form: *"long silver braid, a thin scar over one eye, a confident smirk"* · mischievous · Winter Garden

**ChatGPT prompt (paste-ready, one block):**
```
Create a tall 2:3 portrait image. Painterly semi-realist fantasy illustration,
digital oil painting with visible brushwork and soft gouache texture, fantasy
book-cover quality, richly detailed. Single-character hero portrait, soft diffused
lighting, a warm-lit figure against a cool ground, muted desaturated palette lifted
by one or two rich saturated accent colors.
Full-body portrait of a delicate fae duelist with pointed ears and translucent
iridescent dragonfly wings, in a dynamic dueling stance holding a curved thorn-blade
rapier — long silver braid, a thin scar over one eye, a confident smirk — wearing
ornate baroque brocade garb repurposed at tiny scale from leaf and thorn, plum
purple and gold-ochre accents, expression mischievous and playful.
Cold snowy ground, pale grey-white winter atmosphere, drifting snow. Character
cleanly separated from the background on soft negative space, framed at the edges
by thorny bramble vines. Clean silhouette, three-quarter or full-body view, centered.
Avoid: anime or cel-shaded style, 3D render, photograph, text, watermark, logos,
extra limbs, deformed hands, cluttered background, multiple characters.
Use this prompt exactly as written.
```
Then attach one seed reference image and add *"match the painterly style of the attached reference."*

---

## 6. Generator notes

**Primary target — ChatGPT (GPT Image):**
- No negative field → use the folded **Avoid:** line from §2.
- No `--ar` flag → state the ratio in words ("a tall 2:3 portrait image"); regenerate if it comes back the wrong shape.
- Attach one or two owned seed images for style and add "match the attached reference."
- Add "use this prompt exactly as written" so ChatGPT doesn't silently rewrite it.
- One image per turn (no batching) → just ask it to regenerate for variations.

**If you later move to other generators:**
- **Midjourney:** append `--ar 2:3`, move the Avoid list after `--no`, use `--sref <seed image>` for style and `--seed <n>` to fix a character.
- **SDXL / Flux (ComfyUI, etc.):** paste positive and negative into their separate fields; use an IP-Adapter / style-reference node for the seed set and a fixed seed integer per character.

---

## 7. Consistency: two different problems

**Style consistency** (all cards look like one set): locked style block + **one or two owned seed images attached to every generation** as a style reference + a uniform post-process color grade and card frame over every output. (A trained LoRA/style model only applies if you move to SDXL/Flux later.)

**Character consistency** (the *same* hero across future images): ChatGPT has no seed lock, so **attach that character's reveal image** on later generations and say "keep this character's face, hair, and outfit," and keep their preset tokens + free-form string saved verbatim so the prompt is reproducible.

---

## 8. Testing protocol

1. **Isolate one variable.** Lock the full prompt, change only ancestry (or only palette) across a batch. Confirm each token behaves predictably before combining.
2. **Build the seed set first.** Generate or commission ~10–20 originals you're happy with; these become your style reference *and* your visual QA benchmark.
3. **Regenerate, don't batch.** ChatGPT makes one image per turn — expect a painterly style to miss sometimes, so plan a "regenerate" button and a light human QA pass on hero outputs. Watch for the occasional wrong aspect ratio and re-ask.
4. **Log what drifts.** If wings/costume/background wander, tighten that token's wording or move it earlier in the prompt (earlier = more weight in most models).
5. **Watch cost.** This rendering is heavy per image — reinforces spending the one expensive call only at the reveal.
