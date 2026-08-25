/**
 * Campaign + membership flows (Brief 14 §2) — create, the join link, listing an
 * account's campaigns, removing a member, and minting a table_display credential.
 * Same shape as AuthService: testable async functions the routes are a thin shell
 * over. This is deliberately NOT Brief 11's full Campaign Data Ops (premise chips,
 * pools, bonds web, promotions) — that is M4. This is only what M3's shell needs to
 * make "create → join → land in the party view" real.
 */
import { CharacterChoicesSchema, CharacterSchema, RoomSchema, filterRoomForViewer } from '@questra/contracts';
import {
  CLASSES, DRAFT_ITEMS, DRAFT_SPELLS, VERIFIED_SPECIES,
  buildSheetRulesData, computeSheet, speciesSpeedFt, starterRoom,
} from '@questra/engine';
import type {
  Campaign, CampaignMember, CampaignSession, Character, CharacterChoices,
  ComputedSheet, MyCampaigns, Room,
} from '@questra/contracts';
import type { AuthRepo } from './repo.js';
import { hashToken, newRefreshToken, type Clock, systemClock } from './tokens.js';
import { AuthError } from './service.js';

/** A join code is short and typeable (shared verbally, in a Discord message), unlike
 *  a verification/reset token — but stored + matched the same hashed way (ADR-0004). */
function newJoinCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/i/l — read-aloud safe
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export interface CampaignDeps {
  repo: AuthRepo;
  clock?: Clock;
  newCampaignId: () => string;
  newPlaySessionId: () => string;
  newCharacterId: () => string;
  newRoomId: () => string;
  /** Raw code/token generator. Defaults to a CSPRNG; tests inject a fixed sequence. */
  newSecret?: () => string;
}

/**
 * "Human Fighter" — what a character IS, in the words a table uses.
 *
 * Built from the verified species and class data rather than from the ids, so
 * it reads as English rather than as "species.human class.fighter". A missing
 * entity degrades to the id rather than to an empty string: a reader can act on
 * a strange-looking name, but not on a blank.
 */
function summarise(choices: CharacterChoices): string {
  const species = VERIFIED_SPECIES.find((s) => s.id === choices.speciesId)?.name ?? choices.speciesId;
  const klass = CLASSES.find((c) => c.id === choices.classId)?.name ?? choices.classId;
  return `${species} ${klass}`;
}

/**
 * The sheet, recomputed from the stored choices on every read.
 *
 * Never cached and never stored: computeSheet is pure, and a stored sheet would
 * go stale the moment a rules table is corrected. The rules bundle is rebuilt
 * per character because speciesSpeedFt is baked into it — the Goliath's 35 feet
 * is the case that proves a shared bundle would be wrong.
 */
function sheetFor(choices: CharacterChoices): ComputedSheet {
  return computeSheet(
    choices,
    buildSheetRulesData([...CLASSES, ...DRAFT_ITEMS, ...DRAFT_SPELLS], speciesSpeedFt(choices.speciesId)),
  );
}

export class CampaignService {
  private now: Clock;
  private newSecret: () => string;
  constructor(private deps: CampaignDeps) {
    this.now = deps.clock ?? systemClock;
    this.newSecret = deps.newSecret ?? newJoinCode;
  }
  private nowIso(): string {
    return new Date(this.now() * 1000).toISOString();
  }

  private async requireDm(accountId: string, campaignId: string): Promise<void> {
    const m = await this.deps.repo.membership(accountId, campaignId);
    if (!m || m.role !== 'dm') throw new AuthError('not_dm', "Only this campaign's DM can do that.", 403);
  }

  /**
   * Create ⇒ Membership{role:dm} + a play session + a join code, all at once (brief-14
   * §2's "create campaign ⇒ Membership{role:dm} + join link"). One play session per
   * campaign for the slice — brief-11's session/room CRUD (M4) is what lets a DM run
   * more than one.
   */
  async createCampaign(ownerAccountId: string, name: string): Promise<{ campaign: Campaign; joinCode: string; playSessionId: string }> {
    const campaign: Campaign = { id: this.deps.newCampaignId(), name, ownerAccountId, createdAt: this.nowIso() };
    await this.deps.repo.createCampaign(campaign);

    const playSessionId = this.deps.newPlaySessionId();
    await this.deps.repo.createPlaySession(playSessionId, campaign.id, this.nowIso());

    await this.deps.repo.addMembership({ campaignId: campaign.id, accountId: ownerAccountId, role: 'dm', createdAt: this.nowIso() });

    const joinCode = this.newSecret();
    await this.deps.repo.setJoinTokenHash(campaign.id, await hashToken(joinCode));

    return { campaign, joinCode, playSessionId };
  }

  /** The public half a logged-out visitor sees at /join/:code (brief-14 §3). */
  async joinPreview(code: string): Promise<{ campaignName: string }> {
    const campaign = await this.deps.repo.campaignByJoinTokenHash(await hashToken(code));
    if (!campaign) throw new AuthError('bad_code', "That invite link doesn't work anymore.", 404);
    return { campaignName: campaign.name };
  }

  /** Join ⇒ Membership{role:player} (brief-14 §2). Already a member ⇒ no-op, not an error —
   *  clicking your own invite link twice should land you in the campaign, not fail. */
  async join(accountId: string, code: string): Promise<{ campaignId: string; campaignName: string }> {
    const campaign = await this.deps.repo.campaignByJoinTokenHash(await hashToken(code));
    if (!campaign) throw new AuthError('bad_code', "That invite link doesn't work anymore.", 404);

    const existing = await this.deps.repo.membership(accountId, campaign.id);
    if (!existing) {
      await this.deps.repo.addMembership({ campaignId: campaign.id, accountId, role: 'player', createdAt: this.nowIso() });
    }
    return { campaignId: campaign.id, campaignName: campaign.name };
  }

  /** Home's two lists: campaigns this account DMs vs plays in. */
  async myCampaigns(accountId: string): Promise<MyCampaigns> {
    const rows = await this.deps.repo.membershipsForAccount(accountId);
    const toEntry = (r: (typeof rows)[number]) => ({ campaignId: r.campaignId, campaignName: r.campaignName });
    return {
      dming: rows.filter((r) => r.role === 'dm').map(toEntry),
      playing: rows.filter((r) => r.role === 'player').map(toEntry),
    };
  }

  /** DM-only: remove a member. The DM cannot remove themself this way (transfer/archive
   *  is the deletion-guard's job, same as AuthService.deleteAccount). */
  async removeMember(callerAccountId: string, campaignId: string, targetAccountId: string): Promise<void> {
    await this.requireDm(callerAccountId, campaignId);
    if (targetAccountId === callerAccountId) {
      throw new AuthError('cannot_remove_self', "You can't remove yourself as DM — hand off or archive the campaign instead.", 409);
    }
    await this.deps.repo.removeMembership(targetAccountId, campaignId);
  }

  /**
   * What a member needs to open a campaign: the play session to sync against
   * and who else belongs at the table.
   *
   * Gated on MEMBERSHIP, not on being the DM — every player needs this to say
   * hello on the socket. But it is gated: a campaign's roster is not public,
   * and the unauthenticated join preview deliberately exposes only the name.
   */
  async session(callerAccountId: string, campaignId: string): Promise<CampaignSession> {
    const me = await this.deps.repo.membership(callerAccountId, campaignId);
    if (!me) throw new AuthError('not_member', 'You are not part of this campaign.', 403);

    const campaign = await this.deps.repo.campaignById(campaignId);
    if (!campaign) throw new AuthError('no_campaign', 'That campaign no longer exists.', 404);

    const playSessionId = await this.deps.repo.sessionIdForCampaign(campaignId);
    /* Every campaign gets a play session at creation, so a missing one is a
       broken invariant rather than an expected state — say so plainly instead
       of returning a half-populated session the client cannot use. */
    if (!playSessionId) throw new AuthError('no_session', 'This campaign has no play session yet.', 409);

    return {
      campaignId,
      campaignName: campaign.name,
      playSessionId,
      members: await this.rosterFor(campaignId),
      /* A membership row's role is typed with the full ViewerRole union, but a
         table_display credential never has one — it is not an account. Narrow
         here rather than widening the contract to admit a case that cannot occur. */
      yourRole: me.role === 'dm' ? 'dm' : 'player',
    };
  }

  /**
   * The map this campaign plays on, created on first open if it has none.
   *
   * LAZY RATHER THAN AT CREATION TIME, deliberately. A starter room seats the
   * party, and at the moment a campaign is created nobody has made a character
   * yet — so a room minted then would be empty and would need rebuilding
   * anyway. Creating it when the table is first opened means it can seat
   * whoever actually turned up.
   *
   * Membership-gated: a map is not public, and its unrevealed cells are the
   * DM's to give away.
   *
   * FILTERED PER VIEWER, HERE, BEFORE IT LEAVES. This used to return the whole
   * truth on the reasoning that the caller would filter — and the HTTP route
   * did not, so a player fetching their own map received hidden tokens,
   * unrevealed terrain and the DM's prep notes. The sync socket had always gone
   * through `filterRoomForViewer`; this door did not, which is exactly how a
   * second path around a choke point becomes a leak.
   *
   * The filter is the same one the socket uses (Brief 06 non-negotiable #3 —
   * ONE visibility implementation), so the two doors cannot disagree.
   */
  async currentRoom(callerAccountId: string, campaignId: string): Promise<Room> {
    const me = await this.deps.repo.membership(callerAccountId, campaignId);
    if (!me) throw new AuthError('not_member', 'You are not part of this campaign.', 403);

    const forMe = (room: Room): Room =>
      filterRoomForViewer(room, { role: me.role, accountId: callerAccountId });

    const existing = await this.deps.repo.currentRoom(campaignId);
    if (existing) return forMe(RoomSchema.parse(existing.body));

    const characters = await this.deps.repo.charactersOfCampaign(campaignId);
    const room = starterRoom({
      roomId: this.deps.newRoomId(),
      creatureIds: characters.map((c) => c.id),
    });
    await this.deps.repo.putRoom({
      id: room.id,
      campaignId,
      name: 'The room you start in',
      body: room,
      isCurrent: true,
      createdAt: this.nowIso(),
    });
    /* Filtered on the way out like any other room — a freshly-minted one is
       not a special case, and treating it as one is how the exception that
       leaks gets written. */
    return forMe(room);
  }

  /**
   * Save the character this account plays in this campaign.
   *
   * Membership-gated: you cannot make a character for a table you are not at.
   * Re-running the wizard REPLACES the existing one rather than erroring —
   * rebuilding before session one is ordinary, and the one-per-member
   * constraint means there is exactly one thing to replace.
   *
   * `choices` is validated against CharacterChoicesSchema here rather than
   * trusted: this is the boundary where a browser's JSON becomes rules data,
   * and an invalid character stored now is a crash at the table later.
   */
  async saveCharacter(callerAccountId: string, campaignId: string, choices: unknown): Promise<Character> {
    const me = await this.deps.repo.membership(callerAccountId, campaignId);
    if (!me) throw new AuthError('not_member', 'You are not part of this campaign.', 403);

    const parsed = CharacterChoicesSchema.safeParse(choices);
    if (!parsed.success) {
      throw new AuthError('bad_character', 'That character is not finished — go back and fill in the rest.', 400);
    }

    const name = parsed.data.identity.name.trim();
    if (!name) throw new AuthError('bad_character', 'Your character needs a name.', 400);

    const existing = await this.deps.repo.characterFor(callerAccountId, campaignId);
    const row = {
      /* Keep the id across a rebuild: play events reference characterId, so
         minting a new one would orphan anything already recorded against it. */
      id: existing?.id ?? this.deps.newCharacterId(),
      campaignId,
      accountId: callerAccountId,
      name,
      choices: parsed.data,
      createdAt: existing?.createdAt ?? this.nowIso(),
    };
    await this.deps.repo.putCharacter(row);
    return CharacterSchema.parse(row);
  }

  /** The character this account plays here, or null if they have not made one. */
  async myCharacter(callerAccountId: string, campaignId: string): Promise<Character | null> {
    const me = await this.deps.repo.membership(callerAccountId, campaignId);
    if (!me) throw new AuthError('not_member', 'You are not part of this campaign.', 403);
    const row = await this.deps.repo.characterFor(callerAccountId, campaignId);
    return row ? CharacterSchema.parse(row) : null;
  }

  /**
   * The roster, with each member's character attached.
   *
   * Two queries rather than a join, deliberately: the character table is
   * optional per member and the lobby needs EVERY member listed whether or not
   * they have made one. A join would have to be a LEFT JOIN whose null-handling
   * lives in SQL rather than in a place a reader can see it.
   */
  private async rosterFor(campaignId: string): Promise<CampaignMember[]> {
    const [members, characters] = await Promise.all([
      this.deps.repo.membersOfCampaign(campaignId),
      this.deps.repo.charactersOfCampaign(campaignId),
    ]);
    const byAccount = new Map(characters.map((c) => [c.accountId, c]));
    return members.map((m) => {
      const row = byAccount.get(m.accountId);
      if (!row) return { ...m, character: null };

      const parsed = CharacterChoicesSchema.safeParse(row.choices);
      /* A character whose stored choices no longer validate is reported as
         having none rather than taking the roster down. The player sees an
         empty seat and can rebuild — which is recoverable, unlike a 500 that
         stops the whole table opening. */
      if (!parsed.success) return { ...m, character: null };

      return {
        ...m,
        character: {
          id: row.id,
          name: row.name,
          summary: summarise(parsed.data),
          sheet: sheetFor(parsed.data),
        },
      };
    });
  }

  /**
   * The map for a shared screen, authorised by its own credential.
   *
   * FILTERED LIKE A PLAYER'S, deliberately and not as a compromise: a screen in
   * the middle of the table is looked at by the players, so giving it the DM's
   * view would broadcast every hidden creature to the room it was hidden from.
   * The credential grants the players' view of one campaign and nothing else —
   * no writes, no roster, no whispers.
   *
   * Returns null rather than throwing on a bad or revoked token: a display that
   * has been cut off should say so calmly on its own screen, not surface a
   * stack trace on a television.
   */
  async tableDisplayRoom(token: string, playSessionId: string): Promise<Room | null> {
    const granted = await this.deps.repo.tableDisplayCampaignId(await hashToken(token));
    if (!granted) return null;

    /* The token names a campaign; the URL names a session. They must agree, or
       one display's credential would open another table's map. */
    const campaignId = await this.deps.repo.campaignIdForSession(playSessionId);
    if (!campaignId || campaignId !== granted) return null;

    const existing = await this.deps.repo.currentRoom(campaignId);
    if (!existing) return null;
    return filterRoomForViewer(RoomSchema.parse(existing.body), { role: 'table_display' });
  }

  /**
   * DM-only: mint a table_display credential (brief-14 §2). Regenerating revokes every
   * prior one for this campaign first — there is exactly one live shared-screen token at
   * a time, same "regenerable" contract as the join code.
   */
  async mintTableDisplayToken(callerAccountId: string, campaignId: string): Promise<{ token: string }> {
    await this.requireDm(callerAccountId, campaignId);
    await this.deps.repo.revokeTableDisplayTokens(campaignId);
    const token = newRefreshToken(); // opaque, high-entropy — same generator as a refresh token
    await this.deps.repo.putTableDisplayToken({ tokenHash: await hashToken(token), campaignId, createdAt: this.nowIso() });
    return { token };
  }
}
