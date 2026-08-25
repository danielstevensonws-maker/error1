/**
 * Spell-slot golden tests — the tables in `sim/spell-slots.ts` are held to the
 * SRD text itself, not to a remembered progression.
 *
 * The class tables in `ingest/.extracted/srd-raw.txt` are the source. Each class
 * table has a header naming its columns and one row per level; this suite parses
 * the rows back out and asserts the shipped tables against them. A typo in a slot
 * count fails here rather than teaching a table the wrong number of slots.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  FULL_CASTER_SLOTS, HALF_CASTER_SLOTS, PACT_MAGIC_SLOTS, PREPARED_SPELLS,
  slotsFor, highestSlotLevel, unsupportedCasterType,
} from '../src/sim/spell-slots.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const SRD = readFileSync(here + '../ingest/.extracted/srd-raw.txt', 'utf8');

/**
 * Pull the 20 level rows out of a class's features table. Rows start with the
 * level number; the numeric tail of each row is the columns we care about, and
 * "--" is an empty cell. Feature names wrap across lines, so a row's numbers are
 * gathered from the row line plus any continuation lines before the next level.
 */
function parseRowsAt(start: number): Record<number, string[]> {
  const body = SRD.slice(start, start + 8000).split('\n');
  const rows: Record<number, string[]> = {};
  let current = 0;
  for (const line of body) {
    const m = /^(\d{1,2}) \+\d/.exec(line);
    if (m) {
      const lvl = Number(m[1]);
      // levels must arrive in order; anything else is a different table
      if (lvl < 1 || lvl > 20 || lvl !== current + 1) { current = 0; continue; }
      current = lvl;
      rows[current] = [];
    }
    if (!current) continue;
    // A row's cells are the FIRST trailing run of numeric / "--" / die cells at
    // or after its level line — a long feature name wraps the row across lines,
    // so the numbers may land a line or two down. Once a row has its cells it is
    // closed: anything numeric further on is the prose after the table, not more
    // columns. (Without this, level 20 keeps swallowing the page's body text.)
    if (rows[current]!.length > 0) continue;
    const tail = /((?:\s(?:\d+|--|D\d+))+)\s*$/.exec(line);
    if (tail) rows[current]!.push(...tail[1]!.trim().split(/\s+/));
  }
  return rows;
}

/**
 * The phrase "<Class> Features" also appears in prose ("as shown in the Warlock
 * Features table"), so take the first occurrence that actually parses into a
 * complete 1–20 ladder.
 */
function levelRows(className: string): Record<number, string[]> {
  const needle = `${className} Features`;
  for (let i = SRD.indexOf(needle); i > -1; i = SRD.indexOf(needle, i + 1)) {
    const rows = parseRowsAt(i);
    const complete = Array.from({ length: 20 }, (_, n) => n + 1)
      .every((lvl) => (rows[lvl]?.length ?? 0) > 0);
    if (complete) return rows;
  }
  throw new Error(`${className} Features table not found in the SRD extraction`);
}

/** Turn the SRD's 9 slot cells into the same shape as a SlotTable. */
function slotTableFrom(cells: string[]): Record<string, number> {
  const t: Record<string, number> = {};
  cells.forEach((c, i) => { if (c !== '--') t[String(i + 1)] = Number(c); });
  return t;
}

describe('full-caster slots match the SRD Wizard table', () => {
  const rows = levelRows('Wizard');
  for (let lvl = 1; lvl <= 20; lvl++) {
    it(`level ${lvl}`, () => {
      const cells = rows[lvl]!;
      // Wizard columns: Cantrips, Prepared Spells, then slots 1-9.
      const slots = slotTableFrom(cells.slice(cells.length - 9));
      expect(FULL_CASTER_SLOTS[lvl]).toEqual(slots);
      expect(PREPARED_SPELLS['class.wizard']![lvl]).toBe(Number(cells[cells.length - 10]));
    });
  }
});

describe('half-caster slots match the SRD Paladin and Ranger tables', () => {
  const paladin = levelRows('Paladin');
  const ranger = levelRows('Ranger');
  for (let lvl = 1; lvl <= 20; lvl++) {
    it(`level ${lvl}`, () => {
      // Half-caster tables carry 5 slot columns.
      const pCells = paladin[lvl]!;
      const rCells = ranger[lvl]!;
      const pSlots = slotTableFrom(pCells.slice(pCells.length - 5));
      const rSlots = slotTableFrom(rCells.slice(rCells.length - 5));
      expect(HALF_CASTER_SLOTS[lvl]).toEqual(pSlots);
      // Paladin and Ranger share one progression — that is why there is one table.
      expect(rSlots).toEqual(pSlots);
      expect(PREPARED_SPELLS['class.paladin']![lvl]).toBe(Number(pCells[pCells.length - 6]));
      expect(PREPARED_SPELLS['class.ranger']![lvl]).toBe(Number(rCells[rCells.length - 6]));
    });
  }
});

describe('Pact Magic matches the SRD Warlock table', () => {
  const rows = levelRows('Warlock');
  for (let lvl = 1; lvl <= 20; lvl++) {
    it(`level ${lvl}`, () => {
      // Warlock columns end: Prepared Spells, Spell Slots, Slot Level.
      const cells = rows[lvl]!;
      const slotLevel = Number(cells[cells.length - 1]);
      const slotCount = Number(cells[cells.length - 2]);
      const prepared = Number(cells[cells.length - 3]);
      expect(PACT_MAGIC_SLOTS[lvl]).toEqual({ [String(slotLevel)]: slotCount });
      expect(PREPARED_SPELLS['class.warlock']![lvl]).toBe(prepared);
    });
  }
});

describe('the other full casters prepare what their own tables say', () => {
  for (const [cls, name] of [['class.bard', 'Bard'], ['class.cleric', 'Cleric'], ['class.druid', 'Druid'], ['class.sorcerer', 'Sorcerer']] as const) {
    const rows = levelRows(name);
    it(`${name} prepared-spell counts`, () => {
      for (let lvl = 1; lvl <= 20; lvl++) {
        const cells = rows[lvl]!;
        // ...Prepared Spells, then 9 slot columns.
        expect(PREPARED_SPELLS[cls]![lvl], `${name} level ${lvl}`).toBe(Number(cells[cells.length - 10]));
      }
    });
    it(`${name} casts on the full-caster ladder`, () => {
      for (let lvl = 1; lvl <= 20; lvl++) {
        const cells = rows[lvl]!;
        expect(slotsFor('full', lvl), `${name} level ${lvl}`).toEqual(slotTableFrom(cells.slice(cells.length - 9)));
      }
    });
  }
});

describe('SRD 5.2.1 rules the tables encode', () => {
  it('half-casters cast from level 1, not level 2', () => {
    // The 2024 rules moved Paladin/Ranger Spellcasting to level 1; the dataset's
    // level-1 feature lists agree, so the slot table must too.
    expect(HALF_CASTER_SLOTS[1]).toEqual({ '1': 2 });
    expect(SRD).toContain('Lay On Hands, Spellcasting');
  });

  it('Pact Magic puts every slot at one level', () => {
    for (let lvl = 1; lvl <= 20; lvl++) {
      expect(Object.keys(PACT_MAGIC_SLOTS[lvl]!)).toHaveLength(1);
    }
    // ...and it is a different shape from a full caster of the same level.
    expect(PACT_MAGIC_SLOTS[5]).not.toEqual(FULL_CASTER_SLOTS[5]);
  });

  it('third-casters are reported as unsupported rather than guessed', () => {
    // SRD 5.2.1 ships Champion and Thief, neither of which casts, so there is no
    // source in this repo for a third-caster ladder.
    expect(slotsFor('third', 5)).toBeUndefined();
    expect(unsupportedCasterType('third')).toMatch(/third-caster/i);
    expect(unsupportedCasterType('full')).toBeNull();
    expect(SRD).not.toContain('Eldritch Knight');
  });

  it('non-casters get nothing', () => {
    expect(slotsFor('none', 20)).toBeUndefined();
  });

  it('highestSlotLevel finds the ceiling', () => {
    expect(highestSlotLevel(FULL_CASTER_SLOTS[1]!)).toBe(1);
    expect(highestSlotLevel(FULL_CASTER_SLOTS[20]!)).toBe(9);
    expect(highestSlotLevel(PACT_MAGIC_SLOTS[9]!)).toBe(5);
    expect(highestSlotLevel({})).toBe(0);
  });
});
