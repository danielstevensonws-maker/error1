/**
 * The caster fixture's arithmetic.
 *
 * WHY THIS EXISTS. Mira's spell list is hand-authored. The engine can compute a
 * caster sheet now — `sim/sheet.ts` covers every caster type and resolves spell
 * ids into real cards — but every ingested spell is still `qa: 'draft'`, so no
 * verified Cleric spell exists to resolve. That is a deliberate stand-in, but
 * a stand-in that is internally WRONG is worse than none: it teaches the wrong
 * shape to whoever wires the real path, and the screen's whole promise is that
 * a number can be interrogated and will hold up.
 *
 * `derivationSumsToValue` is a stated invariant of the contract (sheet.ts's own
 * property helper). These tests hold the fixture to it, and to the 5e
 * arithmetic a Cleric 3 with WIS 17 and proficiency +2 actually has — so the
 * day the engine grows spell cards, the expected output is already pinned.
 */
import { describe, it, expect } from 'vitest';
import { derivationSumsToValue, type ComputedSheet } from '@questra/contracts';
import { miraSheet, mira, MIRA_SPELLS, MIRA_SLOTS } from '../src/primitives/v2/fixtures.js';
import { MAX_SLOTS, toHero, toSpells, toTiles } from '../src/primitives/v2/viewModel.js';
import { mirasTurn, MIRA_IDENTITY } from '../src/primitives/v2/fixtures.js';

/** Every numeric Derived on the sheet, flattened with a name for the failure message. */
function numericDeriveds(s: ComputedSheet): { name: string; d: { value: number; derivation: { value: number }[] } }[] {
  const out: { name: string; d: { value: number; derivation: { value: number }[] } }[] = [];
  for (const [k, v] of Object.entries(s.abilities)) out.push({ name: `abilities.${k}`, d: v });
  for (const [k, v] of Object.entries(s.saves)) out.push({ name: `saves.${k}`, d: v });
  for (const [k, v] of Object.entries(s.skills)) if (v) out.push({ name: `skills.${k}`, d: v });
  for (const [k, v] of Object.entries(s.passives)) out.push({ name: `passives.${k}`, d: v });
  s.acOptions.forEach((v, i) => out.push({ name: `acOptions[${i}]`, d: v }));
  out.push({ name: 'profBonus', d: s.profBonus });
  out.push({ name: 'initiative', d: s.initiative });
  out.push({ name: 'speedFt', d: s.speedFt });
  if (s.spellcasting) {
    out.push({ name: 'spellcasting.saveDc', d: s.spellcasting.saveDc });
    out.push({ name: 'spellcasting.attackBonus', d: s.spellcasting.attackBonus });
  }
  return out;
}

describe("the hand-authored Cleric fixture is arithmetically honest", () => {
  it('every derivation sums to its value', () => {
    for (const { name, d } of numericDeriveds(miraSheet)) {
      expect(derivationSumsToValue(d), `${name}: ${d.derivation.map((m) => m.value).join(' + ')} != ${d.value}`).toBe(true);
    }
  });

  it("hit points add up to the combatant's maximum", () => {
    const sum = miraSheet.hp.derivation.reduce((s, m) => s + m.value, 0);
    expect(sum).toBe(miraSheet.hp.value.max);
    expect(mira.maxHp).toBe(miraSheet.hp.value.max);
  });

  it("the projection's Armor Class matches the sheet's default loadout", () => {
    expect(mira.ac).toBe(miraSheet.acOptions[miraSheet.acDefault]!.value);
  });

  it('save DC and spell attack follow from WIS 17 and proficiency +2', () => {
    // 8 + prof + WIS mod, and prof + WIS mod. If either drifts, the folio and
    // the spell cards start disagreeing with each other.
    expect(miraSheet.spellcasting?.saveDc.value).toBe(13);
    expect(miraSheet.spellcasting?.attackBonus.value).toBe(5);
    for (const card of MIRA_SPELLS) {
      if (card.save) expect(card.save.dc, `${card.name} save DC`).toBe(13);
      if (card.attack !== undefined) expect(card.attack, `${card.name} attack bonus`).toBe(5);
    }
  });

  it('no spell claims more slots than the sheet grants', () => {
    for (const card of MIRA_SPELLS) {
      if (card.level === 0) continue;
      const max = miraSheet.spellcasting?.slots[String(card.level)];
      expect(max, `${card.name} is level ${card.level} but the sheet has no slots at that level`).toBeGreaterThan(0);
      expect(MIRA_SLOTS[card.level] ?? 0).toBeLessThanOrEqual(max!);
    }
  });
});

describe('the caster seam produces what the screen needs', () => {
  const tiles = toTiles(miraSheet, mira, mirasTurn, {
    activeTurnEnforced: true,
    targetId: 'npc-goblin-1',
    spells: MIRA_SPELLS,
    slotsRemaining: MIRA_SLOTS,
  });

  it('every prepared spell becomes a tile, alongside the weapon and the universals', () => {
    for (const card of MIRA_SPELLS) {
      expect(tiles.find((t) => t.id === `spell.${card.id}`), `${card.name} is missing from the action row`).toBeDefined();
    }
    expect(tiles.find((t) => t.id === 'attack.Mace')).toBeDefined();
    expect(tiles.find((t) => t.id === 'universal.dodge')).toBeDefined();
  });

  it("a spell's greying is the shared legality function's answer, not an invented one", () => {
    // On her own turn nothing is refused. Off it, every tile carries the exact
    // string the server would send back — including the spells.
    expect(tiles.every((t) => t.greyReason === null)).toBe(true);

    const offTurn = toTiles(miraSheet, mira, { ...mirasTurn, activeCreatureId: 'pc-wren' }, {
      activeTurnEnforced: true, targetId: 'npc-goblin-1', spells: MIRA_SPELLS, slotsRemaining: MIRA_SLOTS,
    });
    const spell = offTurn.find((t) => t.id === 'spell.spell.guiding-bolt');
    expect(spell?.greyReason).toBe("It isn't Mira's turn.");
  });

  it('cantrips carry no slot count and levelled spells do', () => {
    const cantrip = tiles.find((t) => t.id === 'spell.spell.sacred-flame');
    const levelled = tiles.find((t) => t.id === 'spell.spell.guiding-bolt');
    expect(cantrip?.resource).toBeUndefined();
    expect(levelled?.resource).toBe('2 left');
  });

  it('a bonus-action spell lands in the bonus economy, not the action one', () => {
    expect(tiles.find((t) => t.id === 'spell.spell.spiritual-weapon')?.economy).toBe('bonus');
    expect(tiles.find((t) => t.id === 'spell.spell.sacred-flame')?.economy).toBe('action');
  });

  it('the folio gets slots, DC, attack and a prepared list', () => {
    const spells = toSpells(miraSheet, MIRA_SPELLS, MIRA_SLOTS);
    expect(spells).toBeDefined();
    expect(spells!.saveDC).toBe(13);
    expect(spells!.attack).toBe(5);
    expect(spells!.slots).toEqual([{ level: 1, max: 4, used: 2 }, { level: 2, max: 2, used: 0 }]);
    expect(spells!.prepared).toHaveLength(MIRA_SPELLS.length);
  });

  it('concentration reaches the hero view-model from the projection, not from the fixture text', () => {
    expect(toHero(miraSheet, mira, MIRA_IDENTITY).concentratingOn).toBe('Bless');
    /* NOT concentrating means the field is ABSENT, not present-and-undefined.
       The engine's projection omits it; spreading `concentratingOn: undefined`
       over the fixture builds a combatant the engine never emits, and under
       exactOptionalPropertyTypes it is not even a legal Combatant. */
    const { concentratingOn: _notHolding, ...idle } = mira;
    expect(toHero(miraSheet, idle, MIRA_IDENTITY).concentratingOn).toBeUndefined();
  });

  /**
   * The icon row carries the meaning now that the tiles have no names on them,
   * so two tiles in the SAME economy resolving to the same mark makes that row
   * unreadable. This has already happened twice — Dash/Disengage and
   * Dodge/Opportunity Attack on the martial row, then Cure Wounds/Shield of
   * Faith on a caster's. Adjacency across rows is fine; within a row it is not.
   */
  /**
   * Mira's action economy is Mace + Dash + Disengage + Dodge + four
   * action-cost spells — 8 tiles, a genuine full loadout, not a synthetic
   * count. This does not test `ActionRows` (a rendering concern) — it tests
   * that the RAW TILE COUNT `toTiles()` returns is unbounded, which is the
   * precondition the overflow tile depends on: nothing upstream of the screen
   * should ever trim her list to fit a layout.
   *
   * It no longer asserts she EXCEEDS `MAX_SLOTS.action`. She used to (8 vs a
   * first-pass cap of 5); the cap moved to 8 once Action got its own
   * full-width row (owner direction, 2026-08-18), and 8 tiles fitting exactly
   * at a cap of 8 is the intended outcome of widening the panel, not a
   * regression to paper over. The real overflow case — a Wizard holding every
   * SRD reaction spell — lives in `ActionRows.test.tsx`, tied to `MAX_SLOTS`
   * itself so it can't go stale the same way this one did.
   */
  it("Mira's real action-economy count is unbounded upstream, and now fits the widened cap exactly", () => {
    const actionTiles = tiles.filter((t) => t.economy === 'action');
    expect(actionTiles.length).toBe(8);
    expect(actionTiles.length).toBeLessThanOrEqual(MAX_SLOTS.action);
  });

  it('no two tiles in the same economy share a glyph', () => {
    for (const economy of ['action', 'bonus', 'reaction'] as const) {
      const inRow = tiles.filter((t) => t.economy === economy);
      const seen = new Map<string, string>();
      for (const t of inRow) {
        const clash = seen.get(t.glyph);
        expect(clash, `${economy}: "${t.name}" and "${clash}" both draw the ${t.glyph} glyph`).toBeUndefined();
        seen.set(t.glyph, t.name);
      }
    }
  });
});
