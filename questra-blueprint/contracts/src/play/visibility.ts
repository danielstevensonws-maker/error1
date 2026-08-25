/**
 * The permission filter (Architecture §2.3, Brief 02 §1).
 * Runs server-side BEFORE fan-out. A player client never receives a dm_only
 * event — not received-and-hidden: NOT RECEIVED. This is the single choke
 * point every "public/secret split" in the app resolves to.
 */
import type { PlayEvent } from './events.js';

export type ViewerRole = 'dm' | 'player' | 'table_display';

export interface Viewer {
  role: ViewerRole;
  accountId?: string;
}

/** Decide whether one event reaches one viewer. Pure; wire tests assert against it. */
export function eventVisibleTo(event: PlayEvent, viewer: Viewer): boolean {
  if (viewer.role === 'dm') return true;
  const v = event.visibility;
  if (v === 'public') return true;
  if (v === 'dm_only') return false;
  // whisper: only the addressed player; the table display never sees whispers
  if (viewer.role === 'table_display') return false;
  return viewer.accountId !== undefined && v.whisperTo === viewer.accountId;
}

/** Filter a stream for a viewer. Sequence numbers are preserved (gaps are expected client-side and are NOT errors for non-DM viewers). */
export function filterStream(events: readonly PlayEvent[], viewer: Viewer): PlayEvent[] {
  return events.filter((e) => eventVisibleTo(e, viewer));
}
