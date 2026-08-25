/**
 * Golden tests for the M1.1 rules data — Brief 01 §7 acceptance criteria map
 * 1:1 onto these. If a criterion isn't a test here, it isn't done.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  RulesEntitySchema,
  CONDITION_IDS,
  violatesPlainLanguage,
  type RulesEntity,
} from '@questra/contracts';
import { CONDITIONS } from '../src/data/conditions.js';
import { GOBLIN_WARRIOR, FIREBALL, FIGHTER, SLICE_ENTITIES } from '../src/data/slice.js';
import { ingestConditions, DATASET_VERSION } from '../src/ingest/pipeline.js';
import { extractConditions, CONDITION_NAMES } from '../src/ingest/conditions.js';
import { loadEntities, assertAllVerified } from '../src/data/loader.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const rawSrd = readFileSync(here + '../ingest/.extracted/srd-raw.txt', 'utf8');
const proneFixture = JSON.parse(
  readFileSync(here + '../../contracts/src/fixtures/prone.json', 'utf8'),
) as RulesEntity;

describe('Brief 01 acceptance #1 — every entity validates against the contracts schema', () => {
  it('all 15 conditions parse (zero any)', () => {
    for (const c of CONDITIONS) {
      expect(() => RulesEntitySchema.parse(c)).not.toThrow();
    }
  });
  it('covers exactly the 15 contracts CONDITION_IDS', () => {
    expect(new Set(CONDITIONS.map((c) => c.id))).toEqual(new Set(CONDITION_IDS));
    expect(CONDITIONS).toHaveLength(15);
  });
});

describe('Brief 01 acceptance #2 — condition.prone byte-matches the canonical fixture', () => {
  it('the dataset entry equals fixtures/prone.json field-for-field', () => {
    const prone = CONDITIONS.find((c) => c.id === 'condition.prone')!;
    expect(prone).toEqual(proneFixture);
  });
  it('the ingestion pipeline reproduces prone.srd_text verbatim from the PDF text', () => {
    const extracted = extractConditions(rawSrd.replace(/\r/g, '').split('\n'));
    const prone = extracted.find((e) => e.name === 'Prone')!;
    expect(prone.srdText).toBe(proneFixture.srd_text);
  });
});

describe('Brief 01 acceptance #3 — condition hooks reproduce the SRD text (15 sign-offs)', () => {
  // The sign-off narrative lives as a comment beside each entry in data/conditions.ts.
  // Here we assert the mechanical claims those sign-offs make, per condition.
  const byId = new Map(CONDITIONS.map((c) => [c.id, c]));
  const hooks = (id: string) => byId.get(id)!.effects.map((e) => e.hook);

  it('Prone emits three scoped attack hooks incl. opposing melee/ranged (the proof case)', () => {
    const prone = byId.get('condition.prone')!;
    expect(prone.effects).toEqual(proneFixture.effects);
  });
  it('composition uses includes_condition, not restated effects', () => {
    for (const id of ['condition.paralyzed', 'condition.stunned', 'condition.unconscious']) {
      expect(hooks(id)).toContain('includes_condition');
    }
    // Unconscious composes BOTH Incapacitated and Prone.
    const unc = byId.get('condition.unconscious')!;
    const included = unc.effects.filter((e) => e.hook === 'includes_condition');
    expect(included).toHaveLength(2);
  });
  it('Exhaustion encodes the per-level formulas', () => {
    const ex = byId.get('condition.exhaustion')!;
    expect(ex.meta).toMatchObject({ cumulative: true });
    const d20 = ex.effects.find((e) => e.hook === 'modifier');
    expect(d20).toMatchObject({ value: '-2 * exhaustion_level' });
  });
  it('conditions with prose-only clauses are tagged novel so the Engine escalates them', () => {
    for (const id of ['condition.charmed', 'condition.deafened', 'condition.grappled', 'condition.petrified']) {
      expect(byId.get(id)!.resolution).toBe('novel');
    }
  });
  it('fully-expressible conditions stay routine', () => {
    for (const id of ['condition.prone', 'condition.poisoned', 'condition.restrained', 'condition.stunned', 'condition.paralyzed']) {
      expect(byId.get(id)!.resolution).toBe('routine');
    }
  });
});

describe('Brief 01 acceptance #2 — the slice entities match their canonical fixtures', () => {
  const load = (p: string) => JSON.parse(readFileSync(here + p, 'utf8'));
  it('Goblin Warrior equals its fixture', () => {
    expect(GOBLIN_WARRIOR).toEqual(load('../../contracts/src/fixtures/goblin-warrior.json'));
  });
  it('Fireball equals its fixture', () => {
    expect(FIREBALL).toEqual(load('../../contracts/src/fixtures/fireball.json'));
  });
  it('Fighter equals its fixture .class', () => {
    expect(FIGHTER).toEqual(load('../../contracts/src/fixtures/fighter.json').class);
  });
  it('all three slice entities are verified and load with drafts disallowed', () => {
    for (const e of SLICE_ENTITIES) expect(e.qa).toBe('verified');
    expect(() => loadEntities(SLICE_ENTITIES, { allowDraft: false })).not.toThrow();
  });
});

describe('Brief 01 acceptance #5 — every plain line passes the plain-language ban list', () => {
  it('no condition or slice-entity plain/name trips violatesPlainLanguage', () => {
    for (const c of [...CONDITIONS, ...SLICE_ENTITIES]) {
      expect(violatesPlainLanguage(c.plain), `${c.id} plain`).toBeNull();
      expect(violatesPlainLanguage(c.name), `${c.id} name`).toBeNull();
    }
  });
});

describe('Brief 01 acceptance #6 — dataset is versioned', () => {
  it('every condition carries the dataset version', () => {
    for (const c of CONDITIONS) expect(c.version).toBe(DATASET_VERSION);
  });
});

describe('the ingestion pipeline (deterministic half)', () => {
  it('extracts all 15 conditions from the raw SRD text', () => {
    const drafts = ingestConditions(rawSrd);
    expect(drafts).toHaveLength(15);
    expect(new Set(drafts.map((d) => d.name))).toEqual(new Set(CONDITION_NAMES));
  });
  it('produces qa=draft skeletons with verbatim srd_text', () => {
    const drafts = ingestConditions(rawSrd);
    for (const d of drafts) {
      expect(d.qa).toBe('draft');
      expect(d.srd_text.length).toBeGreaterThan(0);
    }
  });
  it('every ingested srd_text matches the verified dataset (extraction == what we signed off)', () => {
    const drafts = new Map<string, string>(ingestConditions(rawSrd).map((d) => [d.id, d.srd_text]));
    for (const c of CONDITIONS) {
      expect(drafts.get(c.id), c.id).toBe(c.srd_text);
    }
  });
});

describe('the loader — Engine refuses draft entities outside dev', () => {
  // A schema-valid entity that is still qa:draft — the loader validates schema
  // first, so draft-refusal is only reachable once an entity actually parses.
  const draftButValid = () => ({
    ...CONDITIONS.find((c) => c.id === 'condition.prone')!,
    id: 'condition.prone',
    qa: 'draft' as const,
  });

  it('rejects a schema-valid draft when allowDraft is false', () => {
    expect(() => loadEntities([draftButValid()], { allowDraft: false })).toThrow(/draft/i);
  });
  it('accepts drafts when allowDraft is true (dev/ingestion)', () => {
    expect(() => loadEntities([draftButValid()], { allowDraft: true })).not.toThrow();
  });
  it('the verified dataset loads with drafts disallowed, and is all-verified', () => {
    expect(() => loadEntities(CONDITIONS, { allowDraft: false })).not.toThrow();
    expect(() => assertAllVerified(CONDITIONS)).not.toThrow();
  });
});
