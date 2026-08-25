/**
 * Reaction prompts, derived from the log rather than stored.
 *
 * A PROMPT IS NOT STATE THE CLIENT OWNS. `reaction_prompted` opens one and
 * `reaction_taken` / `reaction_declined` closes it, so what is outstanding is
 * always a function of the events that have arrived. Holding a separate list
 * and mutating it on each message would be a second copy of the truth, free to
 * drift — and the drift shows up as a card that will not go away while five
 * people wait.
 *
 * THE TRANSLATION IS THE WHOLE POINT. The engine hands over a typed context —
 * `{kind: 'opportunity_attack', moverId, provokerId, pathStep}` — and a person
 * has to read it mid-fight and decide in seconds. Turning that into "The goblin
 * is leaving your reach" is the difference between a game somebody can play on
 * their first night and one they need the rules for. Every string here is
 * written for a reader who has never played (Law 1).
 */
import type { PlayEvent } from '@questra/contracts';
import type { PromptVM } from './PromptDock.js';

/** How long a prompt lives when the server does not say (Brief 05 rule 7). */
const DEFAULT_TIMEOUT_SEC = 60;

export function promptsFrom(
  events: readonly PlayEvent[],
  /** Creature id → name, so a prompt names people rather than ids. */
  names: Record<string, string> = {},
  /**
   * The character this viewer plays. A check asked of the whole party should
   * only be TAPPABLE by the person whose roll it is — everyone else watches it
   * happen in the journal, which is what a table does.
   */
  myCreatureId: string | null = null,
): PromptVM[] {
  const open = new Map<string, PromptVM>();
  const who = (id: string): string => names[id] ?? id;

  for (const e of events) {
    const body = e.body as {
      t: string;
      promptId?: string;
      context?: Record<string, unknown>;
      timeoutSec?: number;
      askId?: string;
      skill?: string;
      creatureIds?: string[];
      dc?: number;
      reason?: string;
      kind?: string;
      sources?: string[];
    };

    /**
     * A check the DM asked for becomes a card on the screens of the people who
     * owe the roll, and a line in everyone else's journal. Same event, two
     * readings — which is exactly how it works at a table.
     */
    if (body.t === 'check_asked' && body.askId && body.skill) {
      const mine = myCreatureId !== null && (body.creatureIds ?? []).includes(myCreatureId);
      if (mine) {
        open.set(body.askId, {
          promptId: body.askId,
          kind: 'Roll it',
          context: body.reason
            ? `${body.reason} — roll ${skillName(body.skill)}.`
            : `Roll ${skillName(body.skill)}.`,
          options: [{ name: `Roll ${skillName(body.skill)}` }],
          /* No countdown on a check. A reaction interrupts a fight and has to
             resolve; a check waits for the player, and a clock on it would
             rush somebody who is deciding how to describe what they do. */
          timeoutSec: 0,
        });
      }
    }

    /* Rolling it closes the card — for the person who rolled, and nobody else. */
    if (body.t === 'roll_made' && body.kind === 'ability_check') {
      const roller = body.sources?.[0];
      if (roller !== undefined && roller === myCreatureId) {
        for (const [id, p] of open) if (p.kind === 'Roll it') open.delete(id);
      }
    }
    if (body.t === 'check_closed' && body.askId) open.delete(body.askId);

    if (body.t === 'reaction_prompted' && body.promptId && body.context) {
      open.set(body.promptId, {
        promptId: body.promptId,
        kind: kindLabel(body.context.kind as string),
        context: contextSentence(body.context, who),
        options: optionsOf(body.context),
        timeoutSec: body.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
      });
    }

    /* Taken and declined both CLOSE it — from here they are the same fact:
       this decision is no longer waiting on anybody. What each one did to the
       fight is the engine's business and shows up in the log. */
    if ((body.t === 'reaction_taken' || body.t === 'reaction_declined') && body.promptId) {
      open.delete(body.promptId);
    }
  }

  return [...open.values()];
}

/** Skill ids read as words a person says: animal_handling → Animal Handling. */
export function skillName(skill: string): string {
  return skill.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** The six kinds, named as a DM would say them out loud. */
function kindLabel(kind: string): string {
  switch (kind) {
    case 'opportunity_attack': return 'A chance to strike';
    case 'feature': return 'You can react';
    case 'readied': return 'Your moment';
    case 'legendary_action': return 'Between turns';
    case 'legendary_resistance': return 'Shrug it off?';
    case 'lair': return 'The lair stirs';
    default: return 'Your call';
  }
}

/**
 * One sentence explaining why you are being asked, built from the typed
 * context. No jargon survives this function: "opportunity attack" becomes
 * somebody walking out of your reach, which is what actually happened.
 */
function contextSentence(context: Record<string, unknown>, who: (id: string) => string): string {
  switch (context.kind as string) {
    case 'opportunity_attack':
      return `${who(String(context.moverId))} is moving out of reach. You can take a swing as they go.`;

    case 'feature': {
      const text = context.triggerText as string | undefined;
      return text ?? 'Something just happened that you can respond to.';
    }

    case 'readied': {
      const trigger = String(context.triggerText ?? 'what you were waiting for');
      const response = String(context.response ?? 'what you prepared');
      return `${trigger} — this is the moment. Do you go ahead with ${response}?`;
    }

    case 'legendary_action': {
      const left = Number(context.poolRemaining ?? 0);
      return `A turn just ended. You have ${String(left)} ${left === 1 ? 'action' : 'actions'} to spend before the next one starts.`;
    }

    case 'legendary_resistance': {
      const save = context.save as { ability?: string; dc?: number } | undefined;
      const uses = Number(context.usesLeft ?? 0);
      return `That save failed${save?.dc ? ` against ${String(save.dc)}` : ''}. You can turn it into a success — ${String(uses)} left today.`;
    }

    case 'lair':
      return 'The lair takes its turn. Something here moves on its own.';

    default:
      return 'Something is waiting on you.';
  }
}

/**
 * What the holder may choose. Declining is not listed — the card always offers
 * "let it pass", so putting a decline option here would show it twice.
 */
function optionsOf(context: Record<string, unknown>): PromptVM['options'] {
  switch (context.kind as string) {
    case 'opportunity_attack': {
      const attacks = (context.attackOptions as string[] | undefined) ?? [];
      return attacks.map((name) => ({ name, cost: 'Your reaction' }));
    }

    case 'feature':
      return [{ name: 'Do it', cost: 'Your reaction' }];

    case 'readied':
      return [{ name: 'Go ahead', cost: 'Already paid for' }];

    case 'legendary_action':
    case 'lair': {
      const options = (context.options as { name?: string; cost?: number }[] | undefined) ?? [];
      return options.map((o) => ({
        name: String(o.name ?? 'Act'),
        ...(o.cost === undefined
          ? {}
          : { cost: o.cost === 1 ? '1 action' : `${String(o.cost)} actions` }),
      }));
    }

    case 'legendary_resistance':
      return [{ name: 'Shrug it off', cost: 'One use' }];

    default:
      return [{ name: 'Do it' }];
  }
}
