/**
 * The projection, with everybody who has arrived since it was taken.
 *
 * THE SAME HOLE THE MAP HAD, ONE LAYER UP. `roomWithMoves` exists because a
 * room arrives once over HTTP while `token_moved` events flow past on the
 * socket, so tokens sat frozen until a reload. The projection has the identical
 * shape of bug: the snapshot arrives once at hello, `creature_added` and
 * `creature_removed` stream past, and nothing folded them — so a DM brought a
 * monster in, the server accepted it, the journal said "Goblin Warrior
 * appears", and the turn order stayed empty until the page was reloaded.
 *
 * Found by running the app (2026-08-25). It had been invisible because
 * `AddCreature` was sending a malformed `maxHp` and the server rejected every
 * add before it could get this far — one bug hiding behind another.
 *
 * WHY REPLAY RATHER THAN MUTATE, same reasoning as the room: the snapshot is
 * the base, the events are the log, and the result is derived fresh every
 * render. A newer snapshot arriving mid-session cannot desync, because the next
 * render simply replays the same events onto it. Events already folded into the
 * snapshot are re-applied harmlessly — an arrival is idempotent by creature id.
 *
 * WHAT IT DELIBERATELY DOES NOT DO is compute anything. Hit points, conditions,
 * initiative and turns are the engine's, and a client that recomputed them
 * would be a second rules engine free to disagree with the first (ADR-0008).
 * The only fact added here is EXISTENCE: this creature is on the board, at the
 * hit points and armour class the server's own event stated.
 */
import type { PlayEvent } from '@questra/contracts';
import type { Projection } from './projectionToView.js';

interface AddedBody {
  t: string;
  creatureId?: string;
  name?: string;
  maxHp?: number;
  ac?: number;
}

export function castWithArrivals(projection: Projection, events: readonly PlayEvent[]): Projection {
  let touched = false;
  const combatants = { ...projection.combatants };

  for (const e of events) {
    const b = e.body as AddedBody;

    if (b.t === 'creature_added' && b.creatureId !== undefined && b.name !== undefined) {
      /* Already in the snapshot ⇒ the server's version wins. It carries the
         current hit points; the arrival event only ever carried the starting
         ones, so preferring the event would resurrect a monster to full health
         every time the log replayed. */
      if (combatants[b.creatureId] !== undefined) continue;
      const maxHp = typeof b.maxHp === 'number' ? b.maxHp : 1;
      combatants[b.creatureId] = {
        id: b.creatureId,
        name: b.name,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        profBonus: 2,
        maxHp,
        hp: maxHp,
        tempHp: 0,
        ac: typeof b.ac === 'number' ? b.ac : 10,
        conditions: [],
        isPlayer: false,
      } as Projection['combatants'][string];
      touched = true;
      continue;
    }

    if (b.t === 'creature_removed' && b.creatureId !== undefined) {
      if (combatants[b.creatureId] === undefined) continue;
      delete combatants[b.creatureId];
      touched = true;
    }
  }

  return touched ? { ...projection, combatants } : projection;
}
