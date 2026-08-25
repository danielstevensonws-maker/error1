/**
 * Moving and choosing a target, by pointing at the map.
 *
 * THE ONE IDEA: SELECT, THEN ACT. Tap yourself and the map enters move mode —
 * squares you can reach light up, and the next tap goes there. Tap an enemy and
 * they become the target your action rows will hit. One gesture, two meanings,
 * decided by what you touched — which is how every game a player has already
 * played works, and it needs no explanation.
 *
 * WHAT IT REFUSES TO DECIDE. Whether a move is legal is the server's answer,
 * not this hook's. Showing reach as a highlight is a HINT — the honest kind,
 * because the server refuses an illegal move with a sentence the player reads.
 * A client that enforced the rule would be a second rules engine free to
 * disagree with the first, and the disagreement always favours the cheat.
 *
 * SPEED IS THE SHEET'S. Thirty feet is six squares at five feet a square
 * (ADR-0012), and a Goliath's thirty-five is seven — read off the character
 * rather than assumed, because that difference is exactly the sort of thing a
 * hardcoded 6 gets wrong forever.
 */
import { useCallback, useState } from 'react';
import type { Cell, Room } from '@questra/contracts';

/** Five feet a square (ADR-0012) — the same metric the engine's geometry uses. */
const FEET_PER_CELL = 5;

export interface MapAction {
  /** Whose square the move starts from, when a move is being planned. */
  moveFrom: Cell | null;
  /** Squares within reach — a hint, drawn as the map's range ring. */
  reachable: Cell[];
  /** The enemy your action rows will hit. */
  targetId: string | null;
  /** Tapping a token: yourself starts a move, anybody else becomes the target. */
  onTokenClick: (creatureRef: string) => void;
  /** Tapping a square: the destination, when a move is being planned. */
  onCellClick: (cell: Cell) => void;
  /** Nothing selected, nothing planned. */
  clear: () => void;
}

export interface UseMapActionOptions {
  room: Room | null;
  /** The creature this viewer plays. A DM has none and moves anybody. */
  myCreatureId: string | null;
  /** How far they can go, in feet, off the sheet. */
  speedFt: number;
  /** Send the move. Legality is the server's call, not ours. */
  onMove: (tokenId: string, path: Cell[]) => void;
}

export function useMapAction({ room, myCreatureId, speedFt, onMove }: UseMapActionOptions): MapAction {
  const [moving, setMoving] = useState<{ tokenId: string; from: Cell } | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const clear = useCallback(() => { setMoving(null); setTargetId(null); }, []);

  const onTokenClick = useCallback((creatureRef: string) => {
    const token = room?.tokens.find((t) => t.creatureRef === creatureRef || t.id === creatureRef);
    if (!token) return;

    /* Tapping yourself picks you up; tapping yourself again puts you down. */
    if (creatureRef === myCreatureId || token.creatureRef === myCreatureId) {
      setTargetId(null);
      setMoving((m) => (m ? null : { tokenId: token.id, from: token.cell }));
      return;
    }

    /* Anybody else is a target — and choosing one cancels a half-planned move,
       because you cannot be walking and aiming at the same moment. */
    setMoving(null);
    setTargetId((t) => (t === creatureRef ? null : creatureRef));
  }, [room, myCreatureId]);

  const onCellClick = useCallback((cell: Cell) => {
    if (!moving) return;
    /**
     * A straight line between the two squares, which is what a player means by
     * tapping there. Real pathfinding around walls is the map's next piece;
     * until it exists a declared path is honest about being declared, and the
     * server is what decides whether it was allowed.
     */
    const path = lineBetween(moving.from, cell);
    onMove(moving.tokenId, path);
    setMoving(null);
  }, [moving, onMove]);

  const reachable = moving && room ? within(moving.from, speedFt, room) : [];

  return {
    moveFrom: moving?.from ?? null,
    reachable,
    targetId,
    onTokenClick,
    onCellClick,
    clear,
  };
}

/**
 * Every square within reach, by the Chebyshev metric — diagonals cost the same
 * as straight steps (ADR-0012), which is the SRD's own simplification and the
 * one the engine already uses.
 */
function within(from: Cell, speedFt: number, room: Room): Cell[] {
  const steps = Math.floor(speedFt / FEET_PER_CELL);
  const out: Cell[] = [];
  for (let y = Math.max(0, from.y - steps); y <= Math.min(room.gridSize.h - 1, from.y + steps); y++) {
    for (let x = Math.max(0, from.x - steps); x <= Math.min(room.gridSize.w - 1, from.x + steps); x++) {
      if (x === from.x && y === from.y) continue;
      if (Math.max(Math.abs(x - from.x), Math.abs(y - from.y)) <= steps) out.push({ x, y });
    }
  }
  return out;
}

/** The squares between two cells, inclusive — one step per square, diagonals allowed. */
function lineBetween(from: Cell, to: Cell): Cell[] {
  const path: Cell[] = [from];
  let { x, y } = from;
  while (x !== to.x || y !== to.y) {
    x += Math.sign(to.x - x);
    y += Math.sign(to.y - y);
    path.push({ x, y });
  }
  return path;
}
