/**
 * Intent legality — THE shared legality function (Brief 10 §1, §5 #3). Pure and
 * AI-free (ADR-0005). One function, two callers:
 *   - the SERVER runs it before the cascade; an illegal intent is rejected and
 *     the `reason` string goes on the wire (`intent_rejected.reason`).
 *   - the CLIENT runs the SAME function read-only to grey out illegal actions;
 *     the greying tooltip == the reason string. There is no second implementation
 *     of legality — this is the choke point (mirrors visibility.ts for secrecy).
 *
 * Every reason is plain language (Brief 10 §1; `violatesPlainLanguage` in the UI
 * string tests checks the rendered tooltips). The function is deliberately
 * conservative: it encodes the legality rules the slice needs (turn, action
 * economy, incapacitation, target validity, resource cost) and returns
 * `{ legal: true }` for anything it doesn't restrict — the server still validates
 * fully in the cascade, so a client false-positive greys nothing it shouldn't.
 */
import type { Intent } from '@questra/contracts';
import type { Combatant, ProjectionState } from './state.js';

export type Legality = { legal: true } | { legal: false; reason: string };

const LEGAL: Legality = { legal: true };

/** Conditions that stop a creature from taking actions (Incapacitated & family). */
const INCAPACITATING = new Set([
  'condition.incapacitated', 'condition.paralyzed', 'condition.petrified',
  'condition.stunned', 'condition.unconscious',
]);

function hasCondition(c: Combatant, ids: Set<string>): boolean {
  return c.conditions.some((x) => ids.has(x.conditionId));
}

/** The actor of an intent, if it names one we can resolve. */
function actorOf(intent: Intent, state: ProjectionState): Combatant | undefined {
  const id =
    intent.kind === 'attack' ? intent.attackerId
    : intent.kind === 'cast' ? intent.casterId
    : intent.kind === 'move' ? intent.tokenId
    : intent.kind === 'use_feature' ? intent.creatureId
    : undefined;
  return id ? state.combatants[id] : undefined;
}

/**
 * Decide whether `intent` is legal in `state`. `opts.activeTurnEnforced` gates the
 * "it's not your turn" rule (off outside structured combat). Extra per-kind data
 * (a target's reach, a resource's remaining count) is passed in when the caller
 * has it — absent, that specific check is skipped rather than guessed.
 */
export function checkIntent(
  intent: Intent,
  state: ProjectionState,
  opts: {
    activeTurnEnforced?: boolean;
    /** remaining count for a use_feature's resource pool, if it has one. */
    resourceRemaining?: number;
    /** whether the attack/cast target is within reach/range (caller computes geometry). */
    targetInRange?: boolean;
    /**
     * Unspent slots by spell level, when the caller knows them. Absent means the
     * check is skipped rather than guessed — same rule as `resourceRemaining`.
     * Cantrips (slotLevel 0) never consult this.
     */
    slotsRemaining?: Record<number, number>;
  } = {},
): Legality {
  const actor = actorOf(intent, state);

  // free text never greys — it routes to a ruling, always legal to ASK.
  if (intent.kind === 'free_text') return LEGAL;

  if (actor) {
    // incapacitation blocks actions/moves (SRD: no action, bonus action, reaction).
    if (hasCondition(actor, INCAPACITATING) && intent.kind !== 'move') {
      return { legal: false, reason: `${actor.name} can't take actions right now.` };
    }
    // a downed creature can't act or move.
    if (actor.hp <= 0) {
      return { legal: false, reason: `${actor.name} is down and can't act.` };
    }
    // it's not your turn (only when combat is enforcing turns).
    if (opts.activeTurnEnforced && state.activeCreatureId && state.activeCreatureId !== actor.id) {
      return { legal: false, reason: `It isn't ${actor.name}'s turn.` };
    }
  }

  switch (intent.kind) {
    case 'attack': {
      const target = state.combatants[intent.targetId];
      if (target && target.hp <= 0) {
        return { legal: false, reason: `${target.name} is already down.` };
      }
      if (opts.targetInRange === false) {
        return { legal: false, reason: `That target is out of reach.` };
      }
      return LEGAL;
    }
    case 'cast': {
      if (opts.targetInRange === false) {
        return { legal: false, reason: `That target is out of range.` };
      }
      // Cantrips are level 0 and spend nothing, so they can never run out.
      if (intent.slotLevel > 0 && opts.slotsRemaining !== undefined) {
        const remaining = opts.slotsRemaining[intent.slotLevel] ?? 0;
        if (remaining <= 0) {
          return { legal: false, reason: `No level ${intent.slotLevel} slots left — take a rest to get them back.` };
        }
      }
      return LEGAL;
    }
    case 'use_feature': {
      if (opts.resourceRemaining !== undefined && opts.resourceRemaining <= 0) {
        return { legal: false, reason: `No uses of that left — take a rest to recover it.` };
      }
      return LEGAL;
    }
    case 'move':
      return LEGAL;

    /**
     * The table controls and the two conversation intents never grey.
     *
     * Greying answers "would the rules allow this?", and none of these are
     * rules questions: starting a fight, ending one, and passing the turn are
     * the DM's to make, and whether SOMEBODY MAY send one is authorisation,
     * decided server-side by role. Answering it here too would give the
     * question two answers free to disagree — and the client's copy is the one
     * an attacker skips. Whispering and answering a prompt are likewise always
     * legal to attempt.
     */
    case 'start_combat':
    case 'end_combat':
    case 'advance_turn':
    case 'whisper':
    case 'prompt_reply':
      return LEGAL;

    /**
     * A rest is a fiction decision the DM makes, not a rules gate — the engine
     * decides what a rest RESTORES (canLongRest holds the 16-hour rule), which
     * is a different question from whether the button is pressable.
     */
    case 'rest':
      return LEGAL;

    /**
     * You roll death saves because you are dying, and the greying layer is not
     * where that is decided: the near edge flips to the ladder only when the
     * character is down, so the button does not exist to be greyed. The server
     * still refuses one from somebody on their feet.
     */
    case 'death_save':
      return LEGAL;

    /**
     * Asking for a check, answering one, ruling on a description, and putting
     * a creature on the board never grey.
     *
     * A check is not a rules gate — it is the DM asking a question, and the
     * whole point of rolling is that you might fail. Rolling one you were
     * asked for is likewise always allowed; a player who cannot roll when
     * asked is a player who cannot play. Ruling and adding creatures are
     * authorisation (the DM's), decided server-side by role, and answering
     * them here too would give the question two answers free to disagree.
     */
    case 'ask_for_check':
    case 'roll_check':
    case 'rule_on':
    case 'add_creature':
    case 'remove_creature':
    /* Speaking is never a rules question — a DM performing is authorisation
       (theirs), decided server-side by role. */
    case 'speak_as':
      return LEGAL;
  }
}

/** Convenience for the client greying layer: the tooltip string, or null if legal. */
export function greyingReason(intent: Intent, state: ProjectionState, opts?: Parameters<typeof checkIntent>[2]): string | null {
  const r = checkIntent(intent, state, opts);
  return r.legal ? null : r.reason;
}
