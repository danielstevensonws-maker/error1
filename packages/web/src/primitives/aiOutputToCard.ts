/**
 * Adapters from @questra/contracts AI-output schemas to
 * AcceptTweakRejectCard's view-model props — the same seam
 * entityToInfoPanel.ts is for InfoPanel. A new AI output schema (NpcLine,
 * PremiseDraft, …) needs a mapping here, never a change to the card itself.
 */
import type { Ability, DifficultyRung, RulingSuggestion } from '@questra/contracts';
import type { FallbackOption, StructuredRow } from './AcceptTweakRejectCard.js';

/** Plain-language ability names (ADR-0009) — the contract stores the 3-letter SRD codes. */
const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

function titleCase(snake: string): string {
  return snake
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** A RulingSuggestion's structured rows, exactly as the design shows: Check / DC / On a fail. */
export function rulingSuggestionToRows(suggestion: RulingSuggestion): StructuredRow[] {
  const { check, dc, failConsequence } = suggestion;
  const ability = ABILITY_NAMES[check.ability];
  const checkValue = check.skill === undefined ? ability : `${ability} (${titleCase(check.skill)})`;
  return [
    { label: 'Check', value: checkValue },
    { label: 'DC', value: String(dc), variant: 'number' },
    { label: 'On a fail', value: failConsequence, variant: 'note' },
  ];
}

/** The difficulty ladder as Fallback tiles — the no-model path (Orchestration §4 fallback). */
export function difficultyLadderToFallbackOptions(
  ladder: readonly DifficultyRung[],
  recommendedLabel: string,
): FallbackOption[] {
  return ladder.map((rung) => ({
    name: rung.label,
    value: String(rung.dc),
    ...(rung.label === recommendedLabel ? { recommended: true } : {}),
  }));
}
