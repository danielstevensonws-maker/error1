/**
 * AI output schemas (Orchestration §4: every AI output that populates UI conforms
 * to a published contracts schema, rendering into the accept/tweak/reject card).
 * M2.4 ships the two table-time schemas (Brief 09c) plus the difficulty ladder.
 *
 * These are OUTPUT shapes only — the models produce them, the UI renders them,
 * nothing here calls a model (that lives in @questra/ai). The Engine never sees
 * a model (ADR-0005): a RulingSuggestion is a *proposal*; `ruling_decided` is the
 * event that hands the chosen check back to the pipeline.
 */
import { z } from 'zod';
import { AbilitySchema, SkillSchema } from '../rules/effects.js';
import { RollKindSchema } from './events.js';

const ID = z.string().min(1);

// ---- RulingSuggestion (Brief 09c §1) --------------------------------------

export const RulingSuggestionSchema = z.object({
  check: z.object({
    kind: RollKindSchema,
    ability: AbilitySchema,
    skill: SkillSchema.optional(),
  }),
  dc: z.number().int().min(1).max(30),
  failConsequence: z.string().min(1),
  rationale: z.string().min(1),
});
export type RulingSuggestion = z.infer<typeof RulingSuggestionSchema>;

// ---- NpcLine (Brief 09c §3) -----------------------------------------------

export const NpcLineSchema = z.object({
  line: z.string().min(1),
  attitudeDelta: z.union([z.literal(-1), z.literal(0), z.literal(1)]).optional(),
  revealsKnowledgeId: ID.optional(),
});
export type NpcLine = z.infer<typeof NpcLineSchema>;

// ---- the difficulty ladder (Brief 09c §2 — data + the fallback) -----------

export interface DifficultyRung {
  label: string;
  dc: number;
  plain: string;
}

/** table.difficulty-ladder — the fallback card's rungs and the Change-it presets. */
export const DIFFICULTY_LADDER: DifficultyRung[] = [
  { label: 'Easy', dc: 10, plain: 'Most people manage it.' },
  { label: 'Moderate', dc: 13, plain: 'Takes a bit of skill or luck.' },
  { label: 'Hard', dc: 15, plain: 'Only the capable pull it off.' },
  { label: 'Very Hard', dc: 18, plain: 'A long shot even for experts.' },
  { label: 'Nearly Impossible', dc: 20, plain: 'You have to be very good and very lucky.' },
];

/** The fully-functional, no-model fallback (§2): a chosen ability + a ladder DC → a RulingSuggestion. */
export function ladderFallback(ability: RulingSuggestion['check']['ability'], rung: DifficultyRung): RulingSuggestion {
  return {
    check: { kind: 'ability_check', ability },
    dc: rung.dc,
    failConsequence: 'The attempt fails; the DM narrates the setback.',
    rationale: `Difficulty picked from the ladder (${rung.label}).`,
  };
}
