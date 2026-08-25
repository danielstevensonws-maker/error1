/**
 * The WebSocket wire protocol (Brief 05 §1). The exact messages a client and
 * server exchange over the sync channel. Composes the existing event +
 * intent-envelope + visibility shapes — no parallel definitions.
 *
 * The wire's `welcome.snapshot` is an OPAQUE JSON value here: the server fills it
 * with the engine's ProjectionState (fold of the log), which is engine-internal
 * (contracts own the event vocabulary, not the folded runtime state). The wire
 * schema validates the envelope; the engine validates the snapshot content.
 */
import { z } from 'zod';
import { ClientIntentEnvelopeSchema, PlayEventSchema } from './events.js';

const ID = z.string().min(1);
const ViewerRoleSchema = z.enum(['dm', 'player', 'table_display']);

// ---- client → server -----------------------------------------------------

export const ClientMsgSchema = z.discriminatedUnion('m', [
  z.object({ m: z.literal('hello'), playSessionId: ID, token: z.string(), lastSeq: z.number().int().nonnegative().optional() }),
  z.object({ m: z.literal('intent'), envelope: ClientIntentEnvelopeSchema }),
  z.object({ m: z.literal('ruling_response'), promptId: ID, response: z.unknown() }),
  z.object({ m: z.literal('prompt_response'), promptId: ID, response: z.unknown() }),
  z.object({ m: z.literal('ping') }),
]);
export type ClientMsg = z.infer<typeof ClientMsgSchema>;

// ---- server → client -----------------------------------------------------

/** Opaque projection snapshot — the engine's fold(log), validated engine-side. */
export const ProjectionSnapshotSchema = z.unknown();
export type ProjectionSnapshot = unknown;

export const ServerMsgSchema = z.discriminatedUnion('m', [
  z.object({ m: z.literal('welcome'), viewer: z.object({ role: ViewerRoleSchema }), snapshotSeq: z.number().int().nonnegative(), snapshot: ProjectionSnapshotSchema }),
  z.object({ m: z.literal('event'), event: PlayEventSchema }),
  z.object({ m: z.literal('intent_ack'), idempotencyKey: z.string(), accepted: z.literal(true), firstSeq: z.number().int().nonnegative() }),
  z.object({ m: z.literal('intent_rejected'), idempotencyKey: z.string(), reason: z.string() }),
  z.object({ m: z.literal('presence'), connected: z.array(z.object({ accountId: ID, role: ViewerRoleSchema })), activeCreatureId: ID.optional() }),
  z.object({ m: z.literal('pong') }),
  z.object({ m: z.literal('error'), code: z.enum(['auth', 'not_member', 'bad_message', 'rate_limited']), detail: z.string().optional() }),
]);
export type ServerMsg = z.infer<typeof ServerMsgSchema>;
