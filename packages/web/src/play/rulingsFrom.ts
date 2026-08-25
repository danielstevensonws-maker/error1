/**
 * Things players have described that the DM has not answered yet.
 *
 * WHAT THIS MAKES REAL. Law 2 says a player who cannot find the right button
 * describes what they want to do instead — "I move my clones in a circle and
 * heal". Until now that line landed in the journal and scrolled away: nothing
 * marked it as needing an answer, and nothing tracked whether it got one. The
 * escape hatch existed but nobody was on the other side of it.
 *
 * A described action is a QUESTION, and the DM is the one who answers it: yes,
 * no, or "roll for it". That last one is why this sits next to the check
 * machinery — the most common answer to "can I do this?" is not yes or no, it
 * is "try it and we will see", which is precisely what a check is for.
 *
 * DERIVED FROM THE LOG, like everything else here. A `free_text` from a player
 * opens one; a `ruled` carrying its seq closes it. Holding a separate list
 * would be a second copy of the truth, and the drift shows up as a request the
 * DM has already answered sitting there demanding an answer.
 */
import type { PlayEvent } from '@questra/contracts';

export interface RulingRequestVM {
  /** The seq of the line that asked — how a ruling ties back to it. */
  seq: number;
  /** Who wants to do it, by name. */
  who: string;
  /** What they said they were doing, verbatim. */
  text: string;
}

export function rulingsFrom(
  events: readonly PlayEvent[],
  /** Creature id → name, so the dock names people rather than ids. */
  names: Record<string, string> = {},
): RulingRequestVM[] {
  const open = new Map<number, RulingRequestVM>();

  for (const e of events) {
    const body = e.body as { t: string; text?: string; from?: string; onSeq?: number };

    /**
     * Only a PLAYER's line is a question. The DM narrating is the DM talking
     * to the table, and queueing their own narration for their own approval
     * would be a dock that never empties.
     */
    if (body.t === 'narration' && body.text && body.from !== 'dm') {
      const creatureId = e.actor.creatureId;
      open.set(e.seq, {
        seq: e.seq,
        who: creatureId ? names[creatureId] ?? creatureId : 'Somebody',
        text: body.text,
      });
    }

    /* Answered — allowed or refused, it is no longer waiting. */
    if (body.t === 'ruled' && body.onSeq !== undefined) open.delete(body.onSeq);
  }

  /* Oldest first: somebody who spoke a minute ago has been waiting longer than
     somebody who spoke just now, and a table answers in the order it was asked. */
  return [...open.values()].sort((a, b) => a.seq - b.seq);
}
