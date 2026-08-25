/**
 * The screen in the middle of the table, and what its credential is worth.
 *
 * A table_display token is the only credential in the system that belongs to a
 * ROOM rather than a person, so it is the only one where "who is holding it" is
 * genuinely unknown. That makes its boundaries the interesting thing: it opens
 * one campaign's players'-eye view and nothing else, it survives no longer than
 * the DM wants it to, and it cannot be pointed at a table it was not minted for.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignService } from '../src/auth/campaign-service.js';
import { InMemoryAuthRepo } from '../src/auth/repo.js';
import type { Room } from '@questra/contracts';

let repo: InMemoryAuthRepo;
let service: CampaignService;
let n = 0;

beforeEach(() => {
  repo = new InMemoryAuthRepo();
  n = 0;
  service = new CampaignService({
    repo,
    newCampaignId: () => `camp-${String(++n)}`,
    newPlaySessionId: () => `ps-${String(++n)}`,
    newCharacterId: () => `char-${String(++n)}`,
    newRoomId: () => `room-${String(++n)}`,
    newSecret: () => `code-${String(++n)}`,
  });
});

const flags = { blocking: false, movable: false, interactive: true, difficultTerrain: false };

function roomWithSecret(id: string): Room {
  return {
    id,
    terrainImageRef: 'stone',
    gridSize: { w: 4, h: 4 },
    cellTags: { '0,0': { light: 'bright' }, '3,3': { difficultTerrain: true } },
    revealed: ['0,0'],
    assets: [{ id: 'a1', imageRef: 'lever', cell: { x: 0, y: 0 }, footprint: { w: 1, h: 1 }, flags, prepNote: 'The lever is a trap.' }],
    tokens: [
      { id: 't1', creatureRef: 'mira', cell: { x: 0, y: 0 }, size: 'medium', hidden: false, staged: false },
      { id: 't2', creatureRef: 'ambusher', cell: { x: 3, y: 3 }, size: 'medium', hidden: true, staged: false },
    ],
  };
}

async function campaignWithRoom(owner: string, name: string) {
  const { campaign, playSessionId } = await service.createCampaign(owner, name);
  const room = roomWithSecret(`room-${campaign.id}`);
  await repo.putRoom({
    id: room.id, campaignId: campaign.id, name: 'The room you start in',
    body: room, isCurrent: true, createdAt: '2026-08-23T00:00:00.000Z',
  });
  return { campaignId: campaign.id, playSessionId };
}

describe('the shared screen', () => {
  it('opens the table with nothing but its own credential', async () => {
    const { campaignId, playSessionId } = await campaignWithRoom('acct-dm', 'The Ash Moor');
    const { token } = await service.mintTableDisplayToken('acct-dm', campaignId);

    const room = await service.tableDisplayRoom(token, playSessionId);
    expect(room, 'a television has no account to sign in with').not.toBeNull();
  });

  /**
   * THE POINT OF THE WHOLE ROLE. A screen everybody can see is the last place a
   * hidden creature should appear — and the fact that it is physically visible
   * to the players is exactly why it gets their view, not the DM's.
   */
  it('shows the players\' view, because the players are looking at it', async () => {
    const { campaignId, playSessionId } = await campaignWithRoom('acct-dm', 'The Ash Moor');
    const { token } = await service.mintTableDisplayToken('acct-dm', campaignId);

    const room = (await service.tableDisplayRoom(token, playSessionId))!;
    expect(room.tokens.map((t) => t.creatureRef)).not.toContain('ambusher');
    expect(Object.keys(room.cellTags)).toEqual(['0,0']);
    expect(JSON.stringify(room)).not.toContain('The lever is a trap.');
  });

  it('cannot be pointed at a table it was not minted for', async () => {
    const mine = await campaignWithRoom('acct-dm', 'The Ash Moor');
    const theirs = await campaignWithRoom('acct-other', 'Somebody Else');
    const { token } = await service.mintTableDisplayToken('acct-dm', mine.campaignId);

    expect(
      await service.tableDisplayRoom(token, theirs.playSessionId),
      'the token names a campaign; the URL names a session; they must agree',
    ).toBeNull();
  });

  /** Regenerating is how a display gets cut off when a session moves house. */
  it('stops working the moment the DM makes a new one', async () => {
    const { campaignId, playSessionId } = await campaignWithRoom('acct-dm', 'The Ash Moor');
    const first = await service.mintTableDisplayToken('acct-dm', campaignId);
    await service.mintTableDisplayToken('acct-dm', campaignId);

    expect(await service.tableDisplayRoom(first.token, playSessionId)).toBeNull();
  });

  it('refuses a token that was never real', async () => {
    const { playSessionId } = await campaignWithRoom('acct-dm', 'The Ash Moor');
    expect(await service.tableDisplayRoom('not-a-token', playSessionId)).toBeNull();
  });

  it('is the DM\'s to hand out, not a player\'s', async () => {
    const { campaignId } = await campaignWithRoom('acct-dm', 'The Ash Moor');
    await service.join('acct-mira', 'code-3');
    await expect(service.mintTableDisplayToken('acct-mira', campaignId)).rejects.toThrow();
  });
});
