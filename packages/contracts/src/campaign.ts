/**
 * @questra/contracts — campaign (Brief 14 §2, minimal).
 *
 * Only what the M3 shell needs: the campaign a Membership binds to, and the
 * public half a logged-out visitor sees at `/join/:code`. Brief-11's full
 * Campaign Data Ops (premise chips, pools, bonds web, promotions, secrets) is
 * M4 — this is deliberately not that shape. Extending it later is a contracts
 * PR like any other; this file does not pre-guess those fields.
 */
import { z } from 'zod';
import { AccountIdSchema } from './identity.js';
import { ComputedSheetSchema } from './rules/sheet.js';

export const CampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  ownerAccountId: AccountIdSchema,
  createdAt: z.string().datetime(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

/**
 * What `/join/:code` shows before sign-in — brief-14 §3: "campaign name + premise
 * (public half only)". Premise doesn't exist as a shape yet (that's the Campaign
 * Wrapper, M4), so this is name-only for now rather than a guessed field.
 */
export const JoinPreviewSchema = z.object({
  campaignName: z.string(),
});
export type JoinPreview = z.infer<typeof JoinPreviewSchema>;

/** The two groups Home splits a account's campaigns into (brief-14 §3). */
export const MyCampaignSchema = z.object({
  campaignId: z.string().min(1),
  campaignName: z.string(),
});
export type MyCampaign = z.infer<typeof MyCampaignSchema>;

export const MyCampaignsSchema = z.object({
  dming: z.array(MyCampaignSchema),
  playing: z.array(MyCampaignSchema),
});
export type MyCampaigns = z.infer<typeof MyCampaignsSchema>;

/**
 * A player character, as stored.
 *
 * IT HOLDS CHOICES, NOT A COMPUTED SHEET, and that is the important decision.
 * `computeSheet(choices, rules)` is a pure function of the choices and the
 * rules data, so persisting the sheet would mean storing a value that goes
 * stale the moment a rules table is corrected — and worse, storing it in two
 * places that can disagree. Every consumer recomputes instead. The same
 * reasoning is why levelling re-runs computeSheet over bumped choices rather
 * than patching a stored sheet (see engine/sim/advancement).
 *
 * One character belongs to exactly one campaign. A player in three campaigns
 * has three characters, which is what a real table does — the sheet you bring
 * to one game is not the sheet you bring to another.
 */
export const CharacterSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  accountId: AccountIdSchema,
  /** Denormalised from choices.identity.name so a roster need not fold rules. */
  name: z.string().min(1).max(60),
  /** The wizard's output. Validated as CharacterChoices when the engine reads it. */
  choices: z.unknown(),
  createdAt: z.string().datetime(),
});
export type Character = z.infer<typeof CharacterSchema>;

/**
 * One person at a campaign's table.
 *
 * `displayName` exists here because the sync protocol's `presence` message
 * carries `accountId` and nothing else, by design — presence is broadcast on
 * every connect and disconnect and has no business shipping profile data. So a
 * lobby resolves ids to names ONCE from this list rather than fattening a hot
 * message. Anything that needs a name for an accountId looks it up here.
 */
export const CampaignMemberSchema = z.object({
  accountId: AccountIdSchema,
  displayName: z.string().min(1),
  role: z.enum(['dm', 'player']),
  /**
   * The character this person brings, if they have made one yet.
   *
   * Null is a real and expected state, not a missing value: a player who has
   * just followed a join link has a seat and no character, and the lobby's job
   * is to show exactly that. A DM legitimately never has one.
   */
  character: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    /**
     * What the character IS, in the words a table uses — "Human Fighter".
     *
     * Denormalised rather than derived on the client because a lobby roster
     * should not have to load the rules engine to render a list, and the play
     * screen should not have to guess. The projection carries combatants, not
     * classes; without this the hero panel could only say a name.
     */
    summary: z.string().min(1),
    /**
     * The computed sheet, sent so every number on the play screen can explain
     * itself — each value arrives with the arithmetic that produced it.
     *
     * This is the learn-while-playing mechanic made concrete: a new player taps
     * their armour class and reads "11 base + 2 Dex + 3 shield" rather than
     * being told to trust 16. Recomputed server-side from the stored choices,
     * never stored, so it cannot go stale against a rules correction.
     */
    sheet: ComputedSheetSchema,
  }).nullable(),
});
export type CampaignMember = z.infer<typeof CampaignMemberSchema>;

/**
 * What a member needs to actually open a campaign: which play session to sync
 * against, and who else belongs at the table.
 *
 * `playSessionId` is minted alongside the campaign (campaign-service creates
 * Membership + play session + join code in one call) but was previously not
 * surfaced anywhere, which meant the web app had no way to say `hello` on the
 * sync socket — the protocol requires it. This is the endpoint that closes
 * that gap.
 *
 * Members are everyone with a Membership, NOT everyone currently connected.
 * Presence answers "who is here right now"; this answers "who belongs". A
 * lobby needs both: the roster to render, presence to light it up.
 */
export const CampaignSessionSchema = z.object({
  campaignId: z.string().min(1),
  campaignName: z.string(),
  playSessionId: z.string().min(1),
  members: z.array(CampaignMemberSchema),
  /** The caller's own role, so a client need not scan `members` to find itself. */
  yourRole: z.enum(['dm', 'player']),
});
export type CampaignSession = z.infer<typeof CampaignSessionSchema>;
