/**
 * Starting a fight, and moving it along.
 *
 * THE TABLE HAS TWO MODES AND ONLY ONE OF THEM HAS TURNS. Exploring is the
 * default: people talk, look at things, and nobody is counting rounds. A fight
 * begins when somebody rolls initiative, and from that moment the table owes
 * every creature an ordered turn. Modelling the boundary explicitly — rather
 * than treating "no active creature" as an accident — is what lets the screens
 * say "Not in a fight" honestly instead of showing an empty round counter.
 *
 * INITIATIVE IS A d20 ROLL LIKE ANY OTHER (SRD): d20 + DEX modifier. It runs
 * through the same injected rng every other roll uses, so a golden test can
 * pin it, and it emits `roll_made` events so the log shows the arithmetic. A
 * player who has never played before can read why they are going third.
 *
 * TIES GO TO THE HIGHER DEXTERITY, then to the order the creatures were passed
 * in.
 *
 * THIS IS A DELIBERATE DEVIATION FROM THE SRD, and worth naming as one. The
 * book says: "If a tie occurs, the GM decides the order among tied monsters,
 * and the players decide the order among tied characters." That is a
 * conversation, and stopping a fight to have it — before anybody has acted —
 * costs more than it returns at nearly every table.
 *
 * The higher-Dexterity rule is the common table convention, produces the
 * answer most people would have chosen anyway, and keeps replay byte-identical
 * so a golden can pin it. A DM who cares can reorder; nothing here prevents
 * that. What is NOT acceptable is pretending this is what the book says.
 */
import type { PlayEvent } from '@questra/contracts';
import { abilityMod, type ProjectionState } from './state.js';

/** A d20, from an injected rng in [0, 1). */
function d20(rng: () => number): number {
  return Math.floor(rng() * 20) + 1;
}

export interface RollInitiativeOpts {
  /** First seq to assign; events are numbered from here. */
  seq: number;
  /** Stable ids for the emitted events, one per event produced. */
  ids: string[];
  /** ISO timestamp shared by the emitted events. */
  at: string;
  causeId: string;
}

/**
 * Roll initiative for everybody present and open the first round.
 *
 * Emits one `roll_made` per creature (so the derivation is readable), then a
 * single `initiative_rolled` carrying the order, then `turn_advanced` onto
 * whoever is first. That ordering matters: a client folding these in sequence
 * never sees a turn pointing at an order it does not yet have.
 */
export function rollInitiative(
  state: ProjectionState,
  rng: () => number,
  opts: RollInitiativeOpts,
): PlayEvent[] {
  /* Everyone in the room rolls, not just the ones already in an order — that is
     what starting a fight means. */
  const rolling = Object.keys(state.combatants);

  const rolls = rolling.map((id) => {
    const c = state.combatants[id]!;
    const dex = abilityMod(c.abilities.dex);
    const die = d20(rng);
    return { creatureId: id, die, dex, total: die + dex };
  });

  /* Highest first; ties to the higher DEX modifier, then to input order so the
     result is deterministic and a golden can pin it. */
  const ordered = [...rolls].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.dex !== a.dex) return b.dex - a.dex;
    return rolling.indexOf(a.creatureId) - rolling.indexOf(b.creatureId);
  });

  const events: PlayEvent[] = [];
  let n = 0;
  const next = (): { seq: number; id: string; at: string; causeId: string } => ({
    seq: opts.seq + n,
    id: opts.ids[n] ?? `${opts.causeId}-${String(n)}`,
    at: opts.at,
    causeId: opts.causeId,
  });

  for (const r of rolls) {
    events.push({
      ...next(),
      actor: { kind: 'engine' },
      visibility: 'public',
      body: {
        t: 'roll_made',
        rollId: `${opts.causeId}-init-${r.creatureId}`,
        kind: 'initiative',
        d20: r.die,
        collapsed: 'straight',
        /* Nothing granted advantage on initiative here. Naming the creature in
           sources is what keeps the log readable when six of these land at
           once — otherwise every line reads identically. */
        sources: [r.creatureId],
        modifiers: [{ label: 'DEX', value: r.dex }],
        total: r.total,
        /* Initiative is an ordering, not a pass/fail. The schema has no
           neutral outcome, and 'success' is the honest one of what it does
           offer: nobody fails to roll initiative. */
        outcome: 'success',
        entry: 'server',
      },
    } as PlayEvent);
    n++;
  }

  events.push({
    ...next(),
    actor: { kind: 'engine' },
    visibility: 'public',
    body: {
      t: 'initiative_rolled',
      order: ordered.map((r) => ({ creatureId: r.creatureId, total: r.total })),
    },
  } as PlayEvent);
  n++;

  const first = ordered[0];
  if (first) {
    events.push({
      ...next(),
      actor: { kind: 'engine' },
      visibility: 'public',
      body: { t: 'turn_advanced', round: 1, activeCreatureId: first.creatureId },
    } as PlayEvent);
    n++;
  }

  return events;
}

/**
 * Hand the turn to the next creature in the order, rolling into the next round
 * when it wraps.
 *
 * A creature that has left the fight (dead and removed, or never in the order)
 * is skipped rather than given a turn nobody can take. If the order empties
 * entirely, the fight is over and this produces nothing — the caller decides
 * whether that means victory or a retreat.
 */
export function advanceTurn(
  state: ProjectionState,
  opts: { seq: number; id: string; at: string; causeId: string },
): PlayEvent[] {
  const order = (state.order ?? []).filter((id) => state.combatants[id]);
  if (order.length === 0) return [];

  const current = state.activeCreatureId;
  const at = current === undefined ? -1 : order.indexOf(current);
  const nextIndex = (at + 1) % order.length;
  /* Wrapping past the end is what a new round IS — there is no separate
     "round_ended" event, and inventing one would give the log two ways to say
     the same thing. */
  const round = nextIndex <= at ? state.round + 1 : state.round;

  return [{
    seq: opts.seq,
    id: opts.id,
    at: opts.at,
    causeId: opts.causeId,
    actor: { kind: 'engine' },
    visibility: 'public',
    body: { t: 'turn_advanced', round, activeCreatureId: order[nextIndex]! },
  } as PlayEvent];
}

/** Whether the table is in a fight at all. Exploring is the default. */
export function inCombat(state: ProjectionState): boolean {
  return (state.order ?? []).length > 0 && state.activeCreatureId !== undefined;
}
