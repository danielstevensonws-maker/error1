/**
 * Spell-slot progressions and prepared-spell counts, SRD 5.2.1.
 *
 * Every number here is transcribed from a class table in the SRD text the
 * ingestion pipeline extracts (`ingest/.extracted/srd-raw.txt`) — the Wizard
 * table for full casters, the Paladin/Ranger tables for half casters, the
 * Warlock table for Pact Magic. `test/spell-slots.golden.test.ts` re-reads those
 * rows and asserts these tables against them, so a typo here fails the suite
 * rather than quietly teaching a table the wrong number of slots.
 *
 * Note on SRD 5.2.1 vs earlier rules: **Paladins and Rangers get Spellcasting at
 * level 1**, not level 2. Their level-1 rows in the dataset carry
 * `feature.paladin.spellcasting` / `feature.ranger.spellcasting`.
 *
 * 'third' (Eldritch Knight / Arcane Trickster) has no table here on purpose: SRD
 * 5.2.1 ships one subclass per class — Champion and Thief — and neither casts.
 * There is no in-repo source to verify a third-caster progression against, and a
 * remembered table is exactly the kind of guess that loses a table's trust. A
 * class declaring `casterType: 'third'` therefore gets no slots and is reported
 * by `unsupportedCasterType()` rather than silently given a made-up ladder.
 */

/** spell level (as a string key) → slots at that level. */
export type SlotTable = Record<string, number>;

const F = (...counts: number[]): SlotTable => {
  const t: SlotTable = {};
  counts.forEach((n, i) => { if (n > 0) t[String(i + 1)] = n; });
  return t;
};

/**
 * Full casters — Bard, Cleric, Druid, Sorcerer, Wizard.
 * Transcribed from the Wizard Features table (slot columns 1–9).
 */
export const FULL_CASTER_SLOTS: Record<number, SlotTable> = {
  1: F(2), 2: F(3), 3: F(4, 2), 4: F(4, 3), 5: F(4, 3, 2),
  6: F(4, 3, 3), 7: F(4, 3, 3, 1), 8: F(4, 3, 3, 2), 9: F(4, 3, 3, 3, 1),
  10: F(4, 3, 3, 3, 2), 11: F(4, 3, 3, 3, 2, 1), 12: F(4, 3, 3, 3, 2, 1),
  13: F(4, 3, 3, 3, 2, 1, 1), 14: F(4, 3, 3, 3, 2, 1, 1),
  15: F(4, 3, 3, 3, 2, 1, 1, 1), 16: F(4, 3, 3, 3, 2, 1, 1, 1),
  17: F(4, 3, 3, 3, 2, 1, 1, 1, 1), 18: F(4, 3, 3, 3, 3, 1, 1, 1, 1),
  19: F(4, 3, 3, 3, 3, 2, 1, 1, 1), 20: F(4, 3, 3, 3, 3, 2, 2, 1, 1),
};

/**
 * Half casters — Paladin and Ranger, who share one progression.
 * Transcribed from the Paladin Features table (slot columns 1–5); the Ranger
 * table carries the same slot numbers.
 */
export const HALF_CASTER_SLOTS: Record<number, SlotTable> = {
  1: F(2), 2: F(2), 3: F(3), 4: F(3), 5: F(4, 2),
  6: F(4, 2), 7: F(4, 3), 8: F(4, 3), 9: F(4, 3, 2), 10: F(4, 3, 2),
  11: F(4, 3, 3), 12: F(4, 3, 3), 13: F(4, 3, 3, 1), 14: F(4, 3, 3, 1),
  15: F(4, 3, 3, 2), 16: F(4, 3, 3, 2), 17: F(4, 3, 3, 3, 1),
  18: F(4, 3, 3, 3, 1), 19: F(4, 3, 3, 3, 2), 20: F(4, 3, 3, 3, 2),
};

/**
 * Pact Magic — the Warlock. Every slot is at the same level and they come back
 * on a Short Rest, so this is a (count, level) pair rather than a ladder.
 * Transcribed from the Warlock Features table's "Spell Slots" + "Slot Level".
 */
const PACT: Record<number, [count: number, level: number]> = {
  1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [2, 2], 5: [2, 3], 6: [2, 3],
  7: [2, 4], 8: [2, 4], 9: [2, 5], 10: [2, 5], 11: [3, 5], 12: [3, 5],
  13: [3, 5], 14: [3, 5], 15: [3, 5], 16: [3, 5], 17: [4, 5], 18: [4, 5],
  19: [4, 5], 20: [4, 5],
};

export const PACT_MAGIC_SLOTS: Record<number, SlotTable> = Object.fromEntries(
  Object.entries(PACT).map(([lvl, [count, level]]) => [Number(lvl), { [String(level)]: count }]),
);

/**
 * "Prepared Spells" column, per class table. This is the number of level-1+
 * spells a character may have prepared — not a count of spells known, and it
 * excludes cantrips (their own column).
 */
export const PREPARED_SPELLS: Record<string, Record<number, number>> = {
  // Wizard/Sorcerer share the full-caster prepared column.
  'class.wizard':   { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15, 11: 16, 12: 16, 13: 17, 14: 18, 15: 19, 16: 21, 17: 22, 18: 23, 19: 24, 20: 25 },
  'class.sorcerer': { 1: 2, 2: 4, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15, 11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22 },
  'class.bard':     { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15, 11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22 },
  'class.cleric':   { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15, 11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22 },
  'class.druid':    { 1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12, 9: 14, 10: 15, 11: 16, 12: 16, 13: 17, 14: 17, 15: 18, 16: 18, 17: 19, 18: 20, 19: 21, 20: 22 },
  'class.paladin':  { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 6, 7: 7, 8: 7, 9: 9, 10: 9, 11: 10, 12: 10, 13: 11, 14: 11, 15: 12, 16: 12, 17: 14, 18: 14, 19: 15, 20: 15 },
  'class.ranger':   { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 6, 7: 7, 8: 7, 9: 9, 10: 9, 11: 10, 12: 10, 13: 11, 14: 11, 15: 12, 16: 12, 17: 14, 18: 14, 19: 15, 20: 15 },
  'class.warlock':  { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10, 11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15 },
};

export type CasterType = 'none' | 'third' | 'half' | 'full' | 'pact';

/**
 * The slot table for a caster type at a level, or undefined when the class
 * casts nothing (or casts by a progression we have no verified source for).
 */
export function slotsFor(casterType: CasterType, level: number): SlotTable | undefined {
  switch (casterType) {
    case 'full': return FULL_CASTER_SLOTS[level];
    case 'half': return HALF_CASTER_SLOTS[level];
    case 'pact': return PACT_MAGIC_SLOTS[level];
    case 'third': return undefined; // see the module note — no SRD source
    case 'none': return undefined;
  }
}

/** Why a caster type produced no slots, for the sheet to report honestly. */
export function unsupportedCasterType(casterType: CasterType): string | null {
  return casterType === 'third'
    ? "Third-casters aren't supported yet — SRD 5.2.1 ships no third-caster subclass to build the table from."
    : null;
}

/** The highest slot level a character can currently cast at. 0 = cantrips only. */
export function highestSlotLevel(slots: SlotTable): number {
  let best = 0;
  for (const [lvl, n] of Object.entries(slots)) if (n > 0) best = Math.max(best, Number(lvl));
  return best;
}
