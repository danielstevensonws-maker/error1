/**
 * The map a player is handed, over HTTP.
 *
 * WHY THIS EXISTS. The sync socket had always filtered rooms through
 * `filterRoomForViewer`. The HTTP route did not: `currentRoom` returned the
 * whole truth on the reasoning that "the caller decides who may see what", and
 * the caller — the route — never did. So a player fetching their own map
 * received hidden tokens, unrevealed terrain and the DM's prep notes, while the
 * socket carefully withheld the same information.
 *
 * That is the shape every visibility bug takes: not a broken filter, but a
 * SECOND PATH around it (Brief 06 non-negotiable #3). These tests hold the two
 * doors to the same standard.
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

/** A DM, a player, and a room with something hidden in it. */
async function table(): Promise<{ campaignId: string; secret: Room }> {
  const { campaign, joinCode } = await service.createCampaign('acct-dm', 'The Ash Moor');
  await service.join('acct-mira', joinCode);

  /* The room as the DM authored it: one revealed cell, one unrevealed, a hidden
     creature standing in the dark, and a prep note only the DM should read. */
  const flags = { blocking: false, movable: false, interactive: true, difficultTerrain: false };
  const secret: Room = {
    id: 'room-secret',
    terrainImageRef: 'stone',
    gridSize: { w: 4, h: 4 },
    cellTags: { '0,0': { light: 'bright' }, '3,3': { difficultTerrain: true } },
    revealed: ['0,0'],
    assets: [
      { id: 'a1', imageRef: 'lever', cell: { x: 0, y: 0 }, footprint: { w: 1, h: 1 }, flags, prepNote: 'The lever is a trap.' },
      { id: 'a2', imageRef: 'chest', cell: { x: 3, y: 3 }, footprint: { w: 1, h: 1 }, flags },
    ],
    tokens: [
      { id: 't1', creatureRef: 'mira', cell: { x: 0, y: 0 }, size: 'medium', hidden: false, staged: false },
      { id: 't2', creatureRef: 'ambusher', cell: { x: 3, y: 3 }, size: 'medium', hidden: true, staged: false },
    ],
  };

  await repo.putRoom({
    id: secret.id,
    campaignId: campaign.id,
    name: 'The room you start in',
    body: secret,
    isCurrent: true,
    createdAt: '2026-08-23T00:00:00.000Z',
  });

  return { campaignId: campaign.id, secret };
}

describe('the map a player receives', () => {
  it('has no creature standing in the dark', async () => {
    const { campaignId } = await table();
    const room = await service.currentRoom('acct-mira', campaignId);
    expect(
      room.tokens.map((t) => t.creatureRef),
      'an ambusher is the DM\'s to reveal — this door leaked one',
    ).not.toContain('ambusher');
  });

  it('has no terrain nobody has walked into yet', async () => {
    const { campaignId } = await table();
    const room = await service.currentRoom('acct-mira', campaignId);
    expect(Object.keys(room.cellTags)).toEqual(['0,0']);
  });

  it("has none of the DM's notes to themself", async () => {
    const { campaignId } = await table();
    const room = await service.currentRoom('acct-mira', campaignId);
    for (const asset of room.assets) {
      expect(asset, 'prep notes are dm_only').not.toHaveProperty('prepNote');
    }
    expect(JSON.stringify(room)).not.toContain('The lever is a trap.');
  });
});

describe('the map a DM receives', () => {
  it('is the whole truth, which is what running the game means', async () => {
    const { campaignId, secret } = await table();
    const room = await service.currentRoom('acct-dm', campaignId);
    expect(room.tokens).toHaveLength(secret.tokens.length);
    expect(room.tokens.map((t) => t.creatureRef)).toContain('ambusher');
    expect(Object.keys(room.cellTags)).toHaveLength(2);
  });
});

describe('who may ask at all', () => {
  it('refuses somebody who is not at this table', async () => {
    const { campaignId } = await table();
    await expect(service.currentRoom('acct-stranger', campaignId)).rejects.toThrow();
  });
});
