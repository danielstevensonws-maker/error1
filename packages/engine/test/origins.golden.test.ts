/**
 * Origins golden — every structured fact in origins.ts is asserted against the
 * SRD text it was transcribed from.
 *
 * WHY THIS SUITE IS THE POINT OF THE FILE IT GUARDS. origins.ts turns prose
 * ("Ability Scores: Strength, Dexterity, Constitution") into numbers the
 * character wizard spends. A typo there is not a rendering bug — it silently
 * gives every Soldier the wrong ability options and every sheet computed from
 * one is wrong. CLAUDE.md is explicit that wrong D&D rules are worse than a
 * crash, so nothing here is trusted because it was typed carefully.
 *
 * The assertions read the entity's own `srd_text` rather than a copy, so this
 * cannot pass by comparing a mistake to itself.
 *
 * `plain` is deliberately NOT asserted against the SRD: it is authored product
 * copy, not a paraphrase of rules. What IS asserted is that it stopped being
 * the ingestion stub, and that it is flagged as ours.
 */
import { describe, it, expect } from 'vitest';
import { ORIGINS, VERIFIED_BACKGROUNDS, VERIFIED_SPECIES, speciesSpeedFt } from '../src/data/origins.js';
import { DRAFT_NAMED } from '../src/data/named.js';

/** SRD prose, whitespace-normalised — the PDF extraction wraps mid-sentence. */
const flat = (s: string): string => s.replace(/\s+/g, ' ');

const ABILITY_WORD: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

describe('origins are transcribed from the SRD, not remembered', () => {
  it('covers every species and background the ingestion found', () => {
    const draftSpecies = DRAFT_NAMED.filter((e) => e.entityType === 'species');
    const draftBackgrounds = DRAFT_NAMED.filter((e) => e.entityType === 'background');
    expect(VERIFIED_SPECIES).toHaveLength(draftSpecies.length);
    expect(VERIFIED_BACKGROUNDS).toHaveLength(draftBackgrounds.length);
    expect(VERIFIED_SPECIES).toHaveLength(9);
    expect(VERIFIED_BACKGROUNDS).toHaveLength(4);
  });

  it('carries the draft srd_text through verbatim', () => {
    for (const e of ORIGINS) {
      const draft = DRAFT_NAMED.find((d) => d.id === e.id);
      expect(draft, `no draft for ${e.id}`).toBeDefined();
      expect(e.srd_text, `${e.id} rewrote its SRD text`).toBe(draft!.srd_text);
    }
  });

  /* Every species prints its speed in the SRD as "Speed: N feet". */
  it.each(VERIFIED_SPECIES.map((s) => [s.id, s] as const))('%s speed matches the SRD', (_id, species) => {
    const printed = flat(species.srd_text).match(/Speed:\s*(\d+)\s*feet/);
    expect(printed, `${species.id} has no printed speed`).not.toBeNull();
    const meta = species.meta as { speedFt: number };
    expect(meta.speedFt).toBe(Number(printed![1]));
  });

  /* The one that would be easy to get wrong by assuming — and the reason
     speciesSpeedFt exists rather than a hardcoded 30 in the wizard. */
  it('the Goliath moves 35 feet and everyone else moves 30', () => {
    expect(speciesSpeedFt('species.goliath')).toBe(35);
    for (const s of VERIFIED_SPECIES.filter((e) => e.id !== 'species.goliath')) {
      expect(speciesSpeedFt(s.id), `${s.id}`).toBe(30);
    }
    expect(speciesSpeedFt('species.does-not-exist')).toBe(30);
  });

  it.each(VERIFIED_SPECIES.map((s) => [s.id, s] as const))('%s size matches the SRD', (_id, species) => {
    const meta = species.meta as { sizeLabel: string };
    expect(flat(species.srd_text)).toContain(`Size: ${meta.sizeLabel}`);
  });

  /* A background offers three abilities and the player spends +2/+1 or
     +1/+1/+1 across them (2024 rules) — so the SET must match the SRD line
     exactly, in the order it prints them. */
  it.each(VERIFIED_BACKGROUNDS.map((b) => [b.id, b] as const))('%s ability options match the SRD', (_id, bg) => {
    const printed = flat(bg.srd_text).match(/Ability Scores:\s*([^:]*?)\s+Feat:/);
    expect(printed, `${bg.id} has no printed ability line`).not.toBeNull();
    const words = printed![1]!.split(',').map((w) => w.trim());
    const meta = bg.meta as { abilityOptions: string[] };
    expect(meta.abilityOptions.map((a) => ABILITY_WORD[a])).toEqual(words);
    expect(meta.abilityOptions).toHaveLength(3);
  });

  it.each(VERIFIED_BACKGROUNDS.map((b) => [b.id, b] as const))('%s skills match the SRD', (_id, bg) => {
    const meta = bg.meta as { skills: string[] };
    const printed = flat(bg.srd_text).match(/Skill Proficiencies:\s*(.*?)\s+Tool Proficiency:/);
    expect(printed, `${bg.id} has no printed skill line`).not.toBeNull();
    for (const skill of meta.skills) {
      expect(printed![1], `${bg.id} claims ${skill}`).toContain(skill);
    }
    expect(meta.skills).toHaveLength(2);
  });

  it.each(VERIFIED_BACKGROUNDS.map((b) => [b.id, b] as const))('%s feat matches the SRD', (_id, bg) => {
    const meta = bg.meta as { featId: string };
    /* feat.magic-initiate → "Magic Initiate". The SRD qualifies it per
       background ("Magic Initiate (Cleric)"), so match the base name. */
    const featName = meta.featId
      .replace(/^feat\./, '')
      .split('-')
      .map((w) => w[0]!.toUpperCase() + w.slice(1))
      .join(' ');
    expect(flat(bg.srd_text)).toContain(`Feat: ${featName}`);
  });

  it('every origin is verified and no longer carries the ingestion stub', () => {
    for (const e of ORIGINS) {
      expect(e.qa, `${e.id} is not verified`).toBe('verified');
      expect(e.plain, `${e.id} still has the stub description`).not.toMatch(/^\w+ — an SRD (species|background|feat)\.$/);
      expect(e.plain.length, `${e.id} has an empty description`).toBeGreaterThan(12);
      /* plain is ours, not the SRD's — flagged so a content reviewer can find
         every authored line without reading the whole file. */
      expect((e.meta as { plainAuthored?: boolean }).plainAuthored).toBe(true);
    }
  });
});
