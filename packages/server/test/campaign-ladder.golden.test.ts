/**
 * Brief 14 §2 golden — create → join → land in the party view, plus the two DM-only
 * actions (remove a member, mint a table_display token) and resolveToken picking
 * both up. Same style as auth-ladder.golden.test.ts: in-memory repo, injected clock
 * + deterministic ids, every response shape checked against the contracts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignSchema, CampaignSessionSchema, CharacterSchema, JoinPreviewSchema, MyCampaignsSchema, RoomSchema } from '@questra/contracts';
import { AuthService, CampaignService, AuthError, InMemoryAuthRepo, LogMailer, makeResolveToken, type TokenConfig } from '../src/auth/index.js';

const SECRET = new TextEncoder().encode('test-secret-please-ignore-32chars!');

function fixedClock(startSec: number) {
  let t = startSec;
  return { clock: () => t, advance: (sec: number) => { t += sec; } };
}

describe('campaign ladder (Brief 14 §2)', () => {
  let repo: InMemoryAuthRepo;
  let auth: AuthService;
  let campaigns: CampaignService;
  let tokens: TokenConfig;
  let clk: ReturnType<typeof fixedClock>;
  let joinCodeSeq: number;

  beforeEach(() => {
    clk = fixedClock(1_700_000_000);
    repo = new InMemoryAuthRepo();
    tokens = { secret: SECRET, clock: clk.clock };
    let accSeq = 0;
    auth = new AuthService({
      repo, mailer: new LogMailer(() => {}), tokens, clock: clk.clock,
      newAccountId: () => `acc_${['alice', 'bob', 'carol'][accSeq++] ?? accSeq}`,
    });
    joinCodeSeq = 0;
    let campSeq = 0;
    let psSeq = 0;
    let charSeq = 0;
    let roomSeq = 0;
    campaigns = new CampaignService({
      repo, clock: clk.clock,
      newCampaignId: () => `camp_${++campSeq}`,
      newPlaySessionId: () => `ps_${++psSeq}`,
      newCharacterId: () => `char_${++charSeq}`,
      newRoomId: () => `room_${++roomSeq}`,
      newSecret: () => `code-${++joinCodeSeq}`,
    });
  });

  async function seat(email: string, name: string) {
    const { self } = await auth.signup(email, 'a real password', name);
    return self.id;
  }

  it('create ⇒ Membership{role:dm} + a play session + a join code, all real shapes', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { campaign, joinCode, playSessionId } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    expect(() => CampaignSchema.parse(campaign)).not.toThrow();
    expect(campaign.ownerAccountId).toBe(alice);
    expect(joinCode).toBe('code-1');
    expect(playSessionId).toBe('ps_1');

    const dm = await repo.membership(alice, campaign.id);
    expect(dm).toMatchObject({ role: 'dm', accountId: alice, campaignId: campaign.id });
    expect(await repo.campaignIdForSession(playSessionId)).toBe(campaign.id);
  });

  it('the join preview shows the name before sign-in, and rejects a made-up code', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { joinCode } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    const preview = await campaigns.joinPreview(joinCode);
    expect(() => JoinPreviewSchema.parse(preview)).not.toThrow();
    expect(preview.campaignName).toBe('The Sunless Keep');

    await expect(campaigns.joinPreview('not-a-real-code')).rejects.toMatchObject({ status: 404, code: 'bad_code' });
  });

  it('join ⇒ Membership{role:player}; clicking the same link twice does not duplicate or error', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const { campaign, joinCode } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    const first = await campaigns.join(bob, joinCode);
    expect(first).toEqual({ campaignId: campaign.id, campaignName: 'The Sunless Keep' });
    expect(await repo.membership(bob, campaign.id)).toMatchObject({ role: 'player' });

    const second = await campaigns.join(bob, joinCode); // the front-door promise: the link just works
    expect(second.campaignId).toBe(campaign.id);
    expect((await repo.membership(bob, campaign.id))!.role).toBe('player'); // still player, not duplicated/upgraded
  });

  it("Home's two lists split DM'd from playing-in", async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const own = await campaigns.createCampaign(alice, 'The Sunless Keep');
    const guest = await campaigns.createCampaign(bob, "Bob's One-Shot");
    await campaigns.join(alice, guest.joinCode);

    const mine = await campaigns.myCampaigns(alice);
    expect(() => MyCampaignsSchema.parse(mine)).not.toThrow();
    expect(mine.dming).toEqual([{ campaignId: own.campaign.id, campaignName: 'The Sunless Keep' }]);
    expect(mine.playing).toEqual([{ campaignId: guest.campaign.id, campaignName: "Bob's One-Shot" }]);
  });

  it('only the DM can remove a member, and the DM cannot remove themself', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const carol = await seat('carol@example.com', 'Carol');
    const { campaign, joinCode } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    await campaigns.join(bob, joinCode);

    await expect(campaigns.removeMember(bob, campaign.id, bob)).rejects.toMatchObject({ status: 403, code: 'not_dm' });
    await expect(campaigns.removeMember(alice, campaign.id, alice)).rejects.toMatchObject({ status: 409, code: 'cannot_remove_self' });
    await expect(campaigns.removeMember(alice, campaign.id, carol)).resolves.toBeUndefined(); // not a member — no-op, not an error

    await campaigns.removeMember(alice, campaign.id, bob);
    expect(await repo.membership(bob, campaign.id)).toBeNull();
  });

  it('a table_display token resolves to the table_display role for its own campaign, and only that one', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const camp1 = await campaigns.createCampaign(alice, 'The Sunless Keep');
    const camp2 = await campaigns.createCampaign(bob, "Bob's One-Shot");

    await expect(campaigns.mintTableDisplayToken(bob, camp1.campaign.id)).rejects.toBeInstanceOf(AuthError);
    const { token } = await campaigns.mintTableDisplayToken(alice, camp1.campaign.id);

    const resolve = makeResolveToken(repo, tokens);
    const resolved = await resolve(token, camp1.playSessionId);
    expect(resolved).toEqual({ accountId: `table_display:${camp1.campaign.id}`, role: 'table_display', playSessionId: camp1.playSessionId });

    // the same token does not grant camp2's session — it is scoped to the campaign it was minted for.
    expect(await resolve(token, camp2.playSessionId)).toBeNull();
  });

  it('regenerating a table_display token revokes the old one immediately', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { campaign, playSessionId } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    const resolve = makeResolveToken(repo, tokens);

    const first = await campaigns.mintTableDisplayToken(alice, campaign.id);
    expect(await resolve(first.token, playSessionId)).not.toBeNull();

    const second = await campaigns.mintTableDisplayToken(alice, campaign.id);
    expect(await resolve(first.token, playSessionId)).toBeNull(); // dead the moment the new one exists
    expect(await resolve(second.token, playSessionId)).not.toBeNull();
  });

  it('a member can read the play session and the roster; a stranger cannot', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const carol = await seat('carol@example.com', 'Carol');
    const { campaign, joinCode, playSessionId } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    await campaigns.join(bob, joinCode);

    const session = await campaigns.session(alice, campaign.id);
    expect(() => CampaignSessionSchema.parse(session)).not.toThrow();

    /* The whole reason this endpoint exists: the sync protocol's hello needs a
       playSessionId and nothing else surfaced one. */
    expect(session.playSessionId).toBe(playSessionId);
    expect(session.campaignName).toBe('The Sunless Keep');
    expect(session.yourRole).toBe('dm');

    /* Names, not ids — presence carries accountId only, so a lobby resolves
       them from here. */
    expect(session.members).toHaveLength(2);
    expect(session.members.map((m) => m.displayName).sort()).toEqual(['Alice', 'Bob']);
    expect(session.members.find((m) => m.accountId === alice)?.role).toBe('dm');
    expect(session.members.find((m) => m.accountId === bob)?.role).toBe('player');

    /* A player sees the same roster — everyone needs it to open the socket —
       but their own role is reported correctly. */
    const asBob = await campaigns.session(bob, campaign.id);
    expect(asBob.yourRole).toBe('player');
    expect(asBob.members).toHaveLength(2);

    /* Gated on membership: a campaign's roster is not public, unlike the
       join preview which deliberately shows only the name. */
    await expect(campaigns.session(carol, campaign.id)).rejects.toBeInstanceOf(AuthError);
  });

  it('a removed member loses the roster, and the roster loses them', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const { campaign, joinCode } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    await campaigns.join(bob, joinCode);
    await campaigns.removeMember(alice, campaign.id, bob);

    const session = await campaigns.session(alice, campaign.id);
    expect(session.members.map((m) => m.displayName)).toEqual(['Alice']);
    await expect(campaigns.session(bob, campaign.id)).rejects.toBeInstanceOf(AuthError);
  });

  /** A finished level-1 Fighter, as the wizard would hand it over. */
  function fighterChoices(name: string) {
    return {
      classId: 'class.fighter', level: 1,
      backgroundId: 'background.soldier', speciesId: 'species.human',
      abilityMethod: 'standard_array' as const,
      baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      backgroundBonuses: { str: 2, con: 1 },
      skillChoices: [], languageChoices: ['Common'], equipment: [],
      featChoices: {},
      identity: { name, personality: [], bonds: [], appearanceTokens: [] },
    };
  }

  it('a member saves a character, and it comes back on the roster', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const { campaign, joinCode } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    await campaigns.join(bob, joinCode);

    const saved = await campaigns.saveCharacter(bob, campaign.id, fighterChoices('Torvald'));
    expect(() => CharacterSchema.parse(saved)).not.toThrow();
    expect(saved.name).toBe('Torvald');
    expect(saved.accountId).toBe(bob);

    /* The lobby's whole gate: who has a character and who does not. */
    const session = await campaigns.session(alice, campaign.id);
    expect(session.members.find((m) => m.accountId === bob)?.character).toMatchObject({ name: 'Torvald' });
    expect(session.members.find((m) => m.accountId === alice)?.character, 'the DM has not made one').toBeNull();
  });

  /**
   * Re-running the wizard replaces rather than duplicates, and KEEPS THE ID:
   * play events reference characterId, so minting a new one would orphan
   * anything already recorded against it.
   */
  it('rebuilding a character replaces it and keeps its id', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { campaign } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    const first = await campaigns.saveCharacter(alice, campaign.id, fighterChoices('Torvald'));
    const second = await campaigns.saveCharacter(alice, campaign.id, fighterChoices('Torvald the Second'));

    expect(second.id, 'the id survives a rebuild').toBe(first.id);
    expect(second.name).toBe('Torvald the Second');
    expect(second.createdAt, 'and so does the original creation time').toBe(first.createdAt);

    const session = await campaigns.session(alice, campaign.id);
    const mine = session.members.filter((m) => m.accountId === alice);
    expect(mine, 'one member, not two').toHaveLength(1);
    expect(mine[0]!.character?.name).toBe('Torvald the Second');
  });

  /**
   * The boundary where a browser's JSON becomes rules data. An invalid
   * character stored now is a crash at the table later, so it is validated
   * here rather than trusted.
   */
  it('refuses a character that is not a legal set of choices', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { campaign } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    await expect(campaigns.saveCharacter(alice, campaign.id, { classId: 'class.fighter' }))
      .rejects.toBeInstanceOf(AuthError);
    await expect(campaigns.saveCharacter(alice, campaign.id, null)).rejects.toBeInstanceOf(AuthError);

    const blank = { ...fighterChoices('  ') };
    await expect(campaigns.saveCharacter(alice, campaign.id, blank), 'a name of spaces is not a name')
      .rejects.toBeInstanceOf(AuthError);
  });

  it('will not let a stranger make a character at a table they are not at', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const carol = await seat('carol@example.com', 'Carol');
    const { campaign } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    await expect(campaigns.saveCharacter(carol, campaign.id, fighterChoices('Interloper')))
      .rejects.toBeInstanceOf(AuthError);
    await expect(campaigns.myCharacter(carol, campaign.id)).rejects.toBeInstanceOf(AuthError);
  });

  it('reports no character before one is made', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { campaign } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    expect(await campaigns.myCharacter(alice, campaign.id)).toBeNull();
  });

  it('mints a map on first open, and seats whoever has a character', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const bob = await seat('bob@example.com', 'Bob');
    const { campaign, joinCode } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    await campaigns.join(bob, joinCode);
    const bobChar = await campaigns.saveCharacter(bob, campaign.id, fighterChoices('Torvald'));

    const room = await campaigns.currentRoom(bob, campaign.id);
    expect(() => RoomSchema.parse(room)).not.toThrow();

    /* Lazy creation is the point: the room is minted when the table is first
       opened, so it can seat the character Bob made AFTER the campaign was
       created. A room minted at creation time would have been empty. */
    expect(room.tokens.map((t) => t.creatureRef)).toEqual([bobChar.id]);
  });

  it('returns the same map on every open rather than minting a new one', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { campaign } = await campaigns.createCampaign(alice, 'The Sunless Keep');

    const first = await campaigns.currentRoom(alice, campaign.id);
    const second = await campaigns.currentRoom(alice, campaign.id);
    expect(second.id, 'a second open must not mint a second map').toBe(first.id);
  });

  it('will not show the map to somebody who is not at the table', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const carol = await seat('carol@example.com', 'Carol');
    const { campaign } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    await expect(campaigns.currentRoom(carol, campaign.id)).rejects.toBeInstanceOf(AuthError);
  });

  it('a stranger token resolves to nothing, not an error', async () => {
    const alice = await seat('alice@example.com', 'Alice');
    const { playSessionId } = await campaigns.createCampaign(alice, 'The Sunless Keep');
    const resolve = makeResolveToken(repo, tokens);
    expect(await resolve('not-a-jwt-and-not-a-table-token', playSessionId)).toBeNull();
  });
});
