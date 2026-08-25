# Brief 15 — Voice & Audio (M6)

*Layer 3. Closes gaps B1–B2: M6 was a scheduled milestone with no brief beneath it. Consumed with contracts + Wizard spec §5 (voice step), In-Play §2.4 (immersion console), Session Planner §5.2/§7 (narration + NPC voices). Revalidate at build time. Contains two explicit DECISION POINTS the owner must resolve by end of M5 — flagged inline so Claude Code stops at them rather than improvising vendors or licenses.*

**Scope:** TTS (character/NPC/narrator voices), STT (dictation), the curated voice library, voice-transform (flagged), the immersion audio asset pipeline (sound effects + music beds).
**Non-goals:** voice *cloning* of real people (explicitly banned by the specs — the library is designed voices only), real-time voice chat between players (out of scope v1 — tables bring their own Discord/etc.; write into ADR-0016 non-goals), music *generation*.

## 1. Architecture
One `Speech` interface (ADR-0011 config-seam pattern, same shape as `ImageGen`): `tts(text, voiceId, opts) → audioRef`, `stt(audioStream) → text`, `transform(audioStream, voiceId) → audioStream (flagged)`. All server-side; TTS outputs cached to object storage keyed by `(voiceId, textHash)` — narration and repeated NPC lines replay from cache, which is the cost model (read-aloud text is reused across sessions; cache hit rate is the metric).
**DECISION POINT 1 (owner, by end of M5): TTS/STT vendor + budget.** Requirements the choice must satisfy: ≥12 distinct designed voices with license terms permitting in-app playback to end users; streaming TTS (<1s to first audio for table use); per-character licensing that survives commercial launch. STT can be a different vendor (or on-device browser API v1 — cheaper, decide with vendor).

## 2. The voice library (content + code)
- **Curation task (content):** audition vendor voices → select and *name* a curated set (~12–20) tagged by the axes the co-pilot recommends on (tone, age, energy, accent-neutrality); map recommendations from species/class/personality per Wizard §5. Owner signs off the set (it's the app's audible identity).
- **Code:** voice picker in the wizard (audition player + waveform per spec), voiceId stored on Character/CastMember (fields already exist in the data model), the co-pilot's 2–3 recommendations via a 09b recipe.
- Accessibility framing per the spec: TTS narration is also the low-vision path; STT is also the motor-accessibility path — both listed in the M6 accessibility pass, not separate work.

## 3. In-play wiring
- **Narrator:** scene read-aloud "Speak" button (Session Planner §5.2) → narrator voice → plays at DM + optionally table_display (a console toggle); emits `narration{spoken:true}`.
- **NPC Become:** immersion console NPC tab — selecting a cast NPC routes the 09c `NpcLine` Speak action through their voice; manual free-text "say as" box too.
- **STT dictation:** push-to-talk on the DM free-form bar and player notes; transcripts are data (injection posture per 09b).
- **Voice-transform:** behind a feature flag; DM/player opt-in per campaign; latency budget same as TTS streaming; ships only if the vendor path makes it cheap — it is the first thing cut if M6 runs long (spec calls it "delight, later").

## 4. Immersion audio assets (closes B2)
**DECISION POINT 2 (owner, M6 start): licensed audio library** for one-shot effects (~30: door, thunder, steel, roar…) and music beds (~10 loops by mood). Source from a licensed library (budget approval) or commission; license must permit in-app playback. Pipeline: assets → object storage → console tabs reference by id; per-campaign volume/mute; reduce-motion setting also mutes auto-triggered effects (accessibility parity).

## 5. Acceptance criteria
1. TTS cache: same read-aloud spoken twice ⇒ one vendor call (cache-hit assertion); cost counter per touchpoint emits.
2. Voice picker golden: audition → select → character stores voiceId → NPC Become uses CastMember's voice end-to-end (stubbed vendor in CI; live in the M6 checkout).
3. STT transcript enters as delimited data (09b injection test extended).
4. Vendor swap via config only (import-graph lint, same as ImageGen).
5. Transform flag off ⇒ zero transform code paths reachable (flag test).
6. Console audio respects mute/volume per campaign; reduce-motion mutes auto-triggers.
