/**
 * The room, with everybody standing where they actually are.
 *
 * THE MAP WAS FROZEN. A room arrives once over HTTP and never changes, while
 * `token_moved` events flow past on the socket — and nothing applied them, so
 * tokens sat wherever they were when the page loaded no matter how much the
 * table moved. Movement was wired end to end on the server and invisible on
 * every screen.
 *
 * WHY NOT FOLD THE ROOM INTO PROJECTION STATE. The projection is combatants,
 * turns and rounds — the numbers a fight is made of. A room is geometry, fog
 * and art, it is fetched per viewer already filtered, and it changes for
 * reasons that have nothing to do with the event log (a DM editing the map
 * between sessions). Keeping them apart means neither has to know about the
 * other; this function is the one place they meet.
 *
 * REPLAYING FROM THE FETCHED ROOM RATHER THAN MUTATING IT is what makes this
 * safe: the room is the base, the moves are the log, and the result is derived
 * fresh. A refetch mid-session cannot desync, because the next render simply
 * replays the same moves onto the newer room.
 */
import type { Cell, PlacedToken, PlayEvent, Room } from '@questra/contracts';
import { arrivalToken } from '@questra/engine';

export function roomWithMoves(room: Room | null, events: readonly PlayEvent[]): Room | null {
  if (!room) return null;

  /* Last known cell per token — later moves win, which is what makes this a
     replay rather than an accumulation. */
  const moved = new Map<string, Cell>();
  /* Cells revealed by walking into them. Fog is the server's to lift, but a
     token standing in a square nobody can see is worse than a square that
     turned out to be visible early. */
  const walked = new Set<string>();
  /**
   * Creatures the DM brought in mid-session, and the ones they took away.
   *
   * ARRIVALS ARE THE SAME KIND OF FACT AS MOVES and were missing for the same
   * reason: the room arrives once over HTTP and the log flows past on the
   * socket. A DM added a goblin, the server accepted it, the turn order gained
   * it — and the map stayed empty through reloads and restarts, because nothing
   * here was listening for it (found by running the app, 2026-08-25).
   *
   * THE SQUARE IS THE SERVER'S, not this function's. `creature_added` now
   * carries the cell the server chose, so every screen at the table replays the
   * same placement rather than each guessing its own.
   */
  const arrived = new Map<string, PlacedToken>();
  const departed = new Set<string>();

  for (const e of events) {
    const b = e.body as {
      t: string;
      tokenId?: string;
      to?: Cell;
      path?: Cell[];
      creatureId?: string;
      cell?: Cell;
    };

    if (b.t === 'token_moved' && b.tokenId && b.to) {
      moved.set(b.tokenId, b.to);
      for (const step of b.path ?? []) walked.add(`${String(step.x)},${String(step.y)}`);
      continue;
    }

    if (b.t === 'creature_added' && b.creatureId !== undefined && b.cell !== undefined) {
      departed.delete(b.creatureId);
      arrived.set(b.creatureId, arrivalToken(b.creatureId, b.cell));
      continue;
    }

    if (b.t === 'creature_removed' && b.creatureId !== undefined) {
      arrived.delete(b.creatureId);
      departed.add(b.creatureId);
    }
  }

  if (moved.size === 0 && arrived.size === 0 && departed.size === 0) return room;

  /* Arrivals go through the same move replay as everybody else, so a creature
     added and then walked somewhere ends up where it was walked to rather than
     back at the square it arrived on. */
  const place = (t: PlacedToken): PlacedToken => {
    const to = moved.get(t.id) ?? moved.get(t.creatureRef);
    return to ? { ...t, cell: to } : t;
  };

  return {
    ...room,
    revealed: [...new Set([...room.revealed, ...walked])],
    tokens: [
      ...room.tokens
        /**
         * Tokens are matched on `creatureRef` as well as `id` because a move
         * names the CREATURE — that is what a player selected — while the room
         * names the token that stands for it. Matching only one of the two
         * silently drops half the moves.
         */
        .filter((t) => !departed.has(t.creatureRef) && !departed.has(t.id))
        .map(place),
      /* Only the ones the room does not already carry: a room refetched after
         an arrival has the token, and adding it again would double the piece. */
      ...[...arrived.values()]
        .filter((t) => !room.tokens.some((existing) => existing.creatureRef === t.creatureRef || existing.id === t.id))
        .map(place),
    ],
  };
}
