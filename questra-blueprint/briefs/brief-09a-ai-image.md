# Brief 09a — AI Image Tier

*Layer 3. Consumed with contracts + AI Orchestration spec §2.1. Parent: Portrait Style Prompt System (authoritative for the prompt content). Revalidate at build time.*

> **⚠️ ADR-0013 revalidation note — M2.4 (2026-07-19).** M2.4 builds the **minimal** asset path (§1 assembler + §2 generation *interface* with a STUBBED vendor). The `assemblePortraitPrompt`/asset-prompt assemblers are pure and byte-testable (the acceptance target); the `ImageGen` interface is real but its vendor implementation is a deterministic stub (real image models + acceptability judgment are the slice-environment manual step, not CI). Vendor-swap-via-config and the import-graph rule (§5.4) hold with the stub. No new contracts shapes are strictly required for the minimal assembler (it takes/returns plain strings); token tables live as engine/ai data.

**Scope:** the prompt assembler as code, the generation service interface, the library write path, quotas.
**Non-goals:** prompt *content* design (Portrait spec owns it), model vendor lock (config).

## 1. The assembler (pure function, byte-testable)
```ts
assemblePortraitPrompt(input: { presetTokens: PresetSelection; freeForm: string;
  setting: SettingToken; frame: FrameToken; aspect: '2:3' }): { prompt: string; styleRefs: AssetRef[] }
```
Implements the Portrait spec's four layers in order (locked base → tokens → free-form → composition lock → Avoid line → ratio words → exact-as-written line). Token tables live as data (`imagegen/tokens.ts`), one row per wizard chip. **Golden test: the Portrait spec §5 worked example reproduces byte-for-byte from its listed selections.** NPC-portrait and asset assemblers are the same function shape with their own token tables (asset prompts add top-down + transparent/neutral-ground constraints and the sprite footprint).

## 2. Generation service
`ImageGen` interface: `generate(prompt, styleRefs, kind) → {imageRef, meta}` — one implementation per vendor behind config (ADR: start with the Portrait spec's primary target; the spec's §6 translations are the alt-vendor implementations). All calls server-side; results written to object storage immediately (immutable, CDN-cached) with provenance meta {prompt, tokens, vendor, ts}; the *saved prompt string* persists on the character/asset for regeneration and consistency (Portrait spec §7).
Safety: the standard safety-instruction layer appends to every prompt; vendor safety settings on; failed-moderation ⇒ typed error to the UI's regenerate path, never a silent blank.

## 3. Library write path
`generate → preview → keep?` — keep writes a `LibraryAsset{imageRef, kind, tags, campaignId?, public:false}`. Campaign art consistency = pulling from the campaign's library before generating new (the picker shows library-first). Publishing an asset to the community library routes through Brief 12's moderation pipeline, not a second one.

## 4. Quotas & cost
Per-account monthly image quota by plan tier (config table); check-and-decrement atomically at generate time; friendly plain-language exhaustion message with the regenerate-vs-library nudge. Per-touchpoint cost counters emit telemetry (Brief 09b's analytics schema).

## 5. Acceptance criteria
1. §5 worked-example byte test; token-isolation tests (change only ancestry ⇒ only ancestry tokens differ in output string).
2. Every generated image lands in storage with full provenance meta before any UI sees it.
3. Quota atomicity under concurrent generates (property test); exhausted ⇒ zero vendor calls.
4. Vendor swap via config only — no vendor import outside the ImageGen implementation (import-graph lint).
5. Regeneration with the saved string + style refs produces a *valid request* identical to the original (vendor nondeterminism accepted; the request is what's tested).
