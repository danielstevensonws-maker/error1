/**
 * Campaign + membership HTTP routes (Brief 14 §2) — a thin Fastify shell over
 * CampaignService, same pattern as routes.ts. `/join/:code` (GET) is deliberately
 * the one public route here: brief-14 §3 says the join link's preview (campaign
 * name) shows before sign-in.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CampaignService } from './campaign-service.js';
import { AuthError } from './service.js';

const CreateCampaignBody = z.object({ name: z.string().min(1).max(80) });

export function registerCampaignRoutes(
  app: FastifyInstance,
  service: CampaignService,
  /** Same seam as registerAuthRoutes's currentAccountId — supplied by the composition root. */
  currentAccountId: (authorization: string | undefined) => Promise<string | null>,
): void {
  const handle = async (reply: { code(n: number): unknown }, fn: () => Promise<unknown>) => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AuthError) {
        reply.code(err.status);
        return { error: err.code, reason: err.message };
      }
      throw err;
    }
  };

  const requireAccount = async (req: { headers: { authorization?: string | undefined } }, reply: { code(n: number): unknown }) => {
    const accountId = await currentAccountId(req.headers.authorization);
    if (!accountId) { reply.code(401); return null; }
    return accountId;
  };

  app.post('/campaigns', async (req, reply) => handle(reply, async () => {
    const accountId = await requireAccount(req, reply);
    if (!accountId) return { error: 'auth', reason: 'Please sign in.' };
    const { name } = CreateCampaignBody.parse(req.body);
    const { campaign, joinCode, playSessionId } = await service.createCampaign(accountId, name);
    reply.code(201);
    return { campaign, joinCode, playSessionId };
  }));

  app.get('/campaigns/mine', async (req, reply) => handle(reply, async () => {
    const accountId = await requireAccount(req, reply);
    if (!accountId) return { error: 'auth', reason: 'Please sign in.' };
    return service.myCampaigns(accountId);
  }));

  // Public — the join link's front door (brief-14 §3): name shows before sign-in.
  app.get<{ Params: { code: string } }>('/join/:code', async (req, reply) => handle(reply, async () => {
    return service.joinPreview(req.params.code);
  }));

  app.post<{ Params: { code: string } }>('/join/:code', async (req, reply) => handle(reply, async () => {
    const accountId = await requireAccount(req, reply);
    if (!accountId) return { error: 'auth', reason: 'Please sign in.' };
    return service.join(accountId, req.params.code);
  }));

  app.delete<{ Params: { campaignId: string; accountId: string } }>(
    '/campaigns/:campaignId/members/:accountId',
    async (req, reply) => handle(reply, async () => {
      const callerId = await requireAccount(req, reply);
      if (!callerId) return { error: 'auth', reason: 'Please sign in.' };
      await service.removeMember(callerId, req.params.campaignId, req.params.accountId);
      return { ok: true };
    }),
  );

  /* Membership-gated, not DM-gated: every player needs the playSessionId to
     open the sync socket. */
  app.get<{ Params: { campaignId: string } }>(
    '/campaigns/:campaignId/session',
    async (req, reply) => handle(reply, async () => {
      const callerId = await requireAccount(req, reply);
      if (!callerId) return { error: 'auth', reason: 'Please sign in.' };
      return service.session(callerId, req.params.campaignId);
    }),
  );

  /* The map the play screen opens onto. Created on first open, so it can
     seat whoever has actually made a character. */
  app.get<{ Params: { campaignId: string } }>(
    '/campaigns/:campaignId/room',
    async (req, reply) => handle(reply, async () => {
      const callerId = await requireAccount(req, reply);
      if (!callerId) return { error: 'auth', reason: 'Please sign in.' };
      return service.currentRoom(callerId, req.params.campaignId);
    }),
  );

  /* The wizard's destination. Membership-gated, and it replaces rather than
     duplicates — see saveCharacter. */
  app.put<{ Params: { campaignId: string }; Body: { choices: unknown } }>(
    '/campaigns/:campaignId/character',
    async (req, reply) => handle(reply, async () => {
      const callerId = await requireAccount(req, reply);
      if (!callerId) return { error: 'auth', reason: 'Please sign in.' };
      return service.saveCharacter(callerId, req.params.campaignId, req.body?.choices);
    }),
  );

  app.get<{ Params: { campaignId: string } }>(
    '/campaigns/:campaignId/character',
    async (req, reply) => handle(reply, async () => {
      const callerId = await requireAccount(req, reply);
      if (!callerId) return { error: 'auth', reason: 'Please sign in.' };
      /* null is a real answer here — "you have not made one yet" — so it is
         wrapped rather than returned bare, which would look like an empty body. */
      return { character: await service.myCharacter(callerId, req.params.campaignId) };
    }),
  );

  app.post<{ Params: { campaignId: string } }>(
    '/campaigns/:campaignId/table-display-token',
    async (req, reply) => handle(reply, async () => {
      const callerId = await requireAccount(req, reply);
      if (!callerId) return { error: 'auth', reason: 'Please sign in.' };
      return service.mintTableDisplayToken(callerId, req.params.campaignId);
    }),
  );

  /**
   * The map, for the screen in the middle of the table.
   *
   * A SEPARATE ROUTE BECAUSE A TELEVISION HAS NO ACCOUNT. Every other route
   * here answers "who is signed in?"; this one answers "is this the campaign's
   * live display credential?" — a different question with a different answer,
   * and folding them together would mean one of them is being asked loosely.
   *
   * The room comes back filtered exactly as a player's does. A screen everybody
   * can see is the last place a hidden creature should appear, and the fact
   * that it is physically visible to the room is precisely why it gets the
   * players' view rather than the DM's.
   */
  app.get<{ Params: { playSessionId: string } }>(
    '/table-display/:playSessionId/room',
    async (req, reply) => handle(reply, async () => {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
      if (!token) { reply.code(401); return { error: 'auth', reason: 'This screen has no credential.' }; }

      const room = await service.tableDisplayRoom(token, req.params.playSessionId);
      if (!room) { reply.code(403); return { error: 'auth', reason: 'This screen is no longer connected to that table.' }; }
      return room;
    }),
  );
}
