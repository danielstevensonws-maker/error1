/**
 * Composition root (ADR-0015 dev-env). Wires the real pieces together and picks the
 * durable stores by config:
 *
 *   DATABASE_URL set   → PostgresEventStore + PostgresAuthRepo (durable)
 *   DATABASE_URL unset → InMemoryEventStore + InMemoryAuthRepo (bare dev / CI)
 *
 * This is where the resolveToken STUB finally dies: SyncCore gets the real
 * makeResolveToken(repo, tokenCfg), and /auth/* routes mount over the real
 * AuthService. The intent resolver here is the slice's attack path (mirrors the
 * persistence golden) — enough to run the end-to-end round-trip; the full
 * every-intent engine resolver is the play-slice's job, not the dev-env's.
 */
import {
  RulesEntitySchema, RoomSchema, type Cell, type PlayEvent, type Room,
} from '@questra/contracts';
import {
  buildRulesData, resolveAttack, CONDITIONS, type Combatant, type RulesData,
  rollInitiative,
  advanceTurn,
  inCombat,
  takenEvent,
  declinedEvent,
  longRest,
  completeShortRest,
  SKILL_ABILITY,
  deathSave,
} from '@questra/engine';
import { arrivalCell } from '@questra/engine';
import { SyncCore, type IntentResolver, type ResolvedToken } from './sync-core.js';
import { InMemoryEventStore, type EventStore } from './store/event-store.js';
import { PostgresEventStore } from './store/postgres-event-store.js';
import {
  CLASSES, DRAFT_ITEMS, DRAFT_SPELLS,
  buildSheetRulesData, combatantFromCharacter, speciesSpeedFt,
} from '@questra/engine';
import { CharacterChoicesSchema } from '@questra/contracts';
import {
  AuthService, CampaignService, InMemoryAuthRepo, LogMailer, makeResolveToken,
  registerAuthRoutes, registerCampaignRoutes, registerCompendiumRoutes,
  verifySession, secretFromEnv, type AuthRepo, type TokenConfig,
} from './auth/index.js';
import { PostgresAuthRepo } from './auth/postgres-repo.js';
import type { ServerConfig } from './config.js';
import type { FastifyInstance } from 'fastify';

export interface App {
  core: SyncCore;
  /** Load a campaign's characters so the session can seat them (see below). */
  primeCampaignRoster: (playSessionId: string) => Promise<void>;
  auth: (app: FastifyInstance) => void;
  /** Release DB pools (if any). */
  close: () => Promise<void>;
}

let accountSeq = 0;
let campaignSeq = 0;
let playSessionSeq = 0;
let characterSeq = 0;
let roomSeq = 0;

/** Build the wired application from config. Does not start the HTTP server (main.ts does). */
export function createApp(config: ServerConfig): App {
  const usePg = Boolean(config.databaseUrl);

  // --- stores (durable vs in-memory) ---
  const eventStore: EventStore = usePg
    ? new PostgresEventStore(config.databaseUrl!)
    : new InMemoryEventStore();
  const repo: AuthRepo = usePg
    ? new PostgresAuthRepo(config.databaseUrl!)
    : new InMemoryAuthRepo();

  // --- auth ---
  if (!config.jwtSecret) {
    throw new Error('QUESTRA_JWT_SECRET is required to wire auth (set it in .env.local).');
  }
  const tokens: TokenConfig = { secret: secretFromEnv() };
  const auth = new AuthService({
    repo, mailer: new LogMailer(), tokens,
    newAccountId: () => `acc_${Date.now().toString(36)}_${(accountSeq++).toString(36)}`,
  });
  const campaigns = new CampaignService({
    repo,
    newCampaignId: () => `camp_${Date.now().toString(36)}_${(campaignSeq++).toString(36)}`,
    newPlaySessionId: () => `ps_${Date.now().toString(36)}_${(playSessionSeq++).toString(36)}`,
    newCharacterId: () => `char_${Date.now().toString(36)}_${(characterSeq++).toString(36)}`,
    newRoomId: () => `room_${Date.now().toString(36)}_${(roomSeq++).toString(36)}`,
  });

  /**
   * Seat the campaign's characters at the table.
   *
   * SyncCore takes `initialCombatants` as the base a session's event log folds
   * on top of, and nothing was supplying it — so every play session started
   * empty no matter who had made a character. This is the join between the
   * wizard's output and the engine's projection.
   *
   * Synchronous by necessity: the seam is called during session creation,
   * which is inside the hello path and cannot await. So the roster is loaded
   * ahead of time by `primeCampaignRoster` (below) and read from a cache
   * here. A session whose roster has not been primed yet seats nobody, which
   * is the same thing that happened before and is recoverable — the next
   * connection primes it.
   *
   * A character that fails validation is SKIPPED rather than thrown: one
   * corrupt row should cost that player their seat, not take the whole
   * table's session down with it.
   */
  const seatedByCampaign = new Map<string, Combatant[]>();

  /**
   * The map each live session is playing on, cached for the resolver.
   *
   * SAME SEAM, SAME REASON as the roster above: placing an arriving creature
   * needs to know which squares are taken, the room is stored per campaign, and
   * the resolver is synchronous. So it is loaded here, on the same connect path
   * that primes the roster, and read from the cache when an intent arrives.
   *
   * THE UNFILTERED ROOM, deliberately. This is the server choosing a square,
   * not a payload going anywhere: it has to see hidden tokens, or it will place
   * a goblin on top of the one the DM has already hidden there. Nothing from
   * this cache is ever sent to a client — only the CELL it produces reaches the
   * log, and that is a square, not a secret.
   */
  const roomBySession = new Map<string, Room>();

  const primeCampaignRoster = async (playSessionId: string): Promise<void> => {
    const campaignId = await repo.campaignIdForSession(playSessionId);
    if (!campaignId) return;

    const storedRoom = await repo.currentRoom(campaignId);
    if (storedRoom) {
      const parsed = RoomSchema.safeParse(storedRoom.body);
      /* A room that fails validation costs the table its placement heuristic,
         not its session — the same trade the roster makes one line down. */
      if (parsed.success) roomBySession.set(playSessionId, parsed.data);
    }

    const characters = await repo.charactersOfCampaign(campaignId);
    const seated: Combatant[] = [];
    for (const row of characters) {
      const parsed = CharacterChoicesSchema.safeParse(row.choices);
      if (!parsed.success) continue;
      const rules = buildSheetRulesData(
        [...CLASSES, ...DRAFT_ITEMS, ...DRAFT_SPELLS],
        speciesSpeedFt(parsed.data.speciesId),
      );
      seated.push(combatantFromCharacter({ id: row.id, choices: parsed.data }, rules));
    }
    seatedByCampaign.set(playSessionId, seated);
  };

  // --- SyncCore with the REAL resolveToken (stub is dead) + the slice resolver ---
  const core = new SyncCore({
    resolveToken: makeResolveToken(repo, tokens),
    resolveIntent: makeSliceResolver({ roomFor: (playSessionId) => roomBySession.get(playSessionId) ?? null }),
    store: eventStore,
    initialCombatants: (playSessionId) => seatedByCampaign.get(playSessionId) ?? [],
  });

  const currentAccountId = async (authorization: string | undefined): Promise<string | null> => {
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    if (!bearer) return null;
    const claims = await verifySession(bearer, tokens);
    return claims?.sub ?? null;
  };

  const mountAuth = (fastify: FastifyInstance): void => {
    registerAuthRoutes(fastify, auth, currentAccountId);
    registerCampaignRoutes(fastify, campaigns, currentAccountId);
    /* Public: the SRD is the same text in every campaign, and requiring a
       login to read a rule would be friction with nothing behind it. */
    registerCompendiumRoutes(fastify);
  };

  return {
    core,
    primeCampaignRoster,
    auth: mountAuth,
    close: async () => {
      await eventStore.close();
      if (repo instanceof PostgresAuthRepo) await repo.close();
    },
  };
}

// -------------------------------------------------------------- slice resolver
/**
 * The dev-env's intent resolver: the vertical-slice attack path (mirrors the
 * persistence golden). Legal `attack` intents produce the engine cascade; anything
 * else rejects with a plain-language reason (the greying string). The full
 * per-intent resolver is play-slice scope.
 */
/** Exported so its behaviour can be asserted directly — the alternative is
    driving a socket to observe a pure function. */
export interface SliceResolverDeps {
  /**
   * The map this table is playing on, or null if it has not been opened yet.
   *
   * SYNCHRONOUS BY NECESSITY, for exactly the reason `initialCombatants` is —
   * the resolver runs inside the intent path and cannot await, so the room is
   * loaded ahead of time by `primeCampaignRoster` and read from a cache here.
   * A session whose room has not been primed places by the grid's own defaults,
   * which is recoverable: the DM sees the creature land somewhere plain and can
   * move it, rather than seeing nothing land at all.
   */
  roomFor?: (playSessionId: string) => Room | null;
}

export function makeSliceResolver(deps: SliceResolverDeps = {}): IntentResolver {
  const rules: RulesData = buildRulesData(CONDITIONS.map((c) => RulesEntitySchema.parse(c)));
  /**
   * Real dice. A fixed rng made every fight identical, which is fine for a
   * golden and wrong for a table — the whole point of rolling is not knowing.
   * Goldens inject their own rng; this is the live server's.
   */
  const rng = () => Math.random();
  let n = 0;

  /**
   * Squares this resolver has handed out, per table, since it started.
   *
   * THE ROOM IT READS IS A SNAPSHOT taken when the connection said hello, and
   * it never hears about the creatures placed on top of it — so without this,
   * every monster of a pack lands on the square the first one took. The room
   * knows what was there at load; this knows what has happened since; together
   * they are the board.
   *
   * A removal gives its square back. A MOVE does not — a creature that walks
   * away leaves its arrival square marked, so a later arrival steps one along
   * rather than into a square that is genuinely empty. That is deliberately the
   * conservative error: crowding the next monster one cell east is invisible at
   * the table, and two creatures in one square is not.
   */
  const placedBySession = new Map<string, Map<string, Cell>>();

  /**
   * The context is defaulted rather than required HERE, while staying required
   * on `IntentResolver` itself.
   *
   * SyncCore always passes it — that contract is the one that matters and it
   * stays honest. But the resolver is also called directly by the golden suites
   * with three arguments, and those files are outside this package's tsconfig
   * `include`, so nothing would have told them: the first run after the
   * parameter landed failed at RUNTIME on a session id that was undefined.
   * An empty session id is not a lie either — it genuinely has no room primed,
   * which is exactly the case the placement fallback below already handles.
   */
  return (envelope, state, actor, context = { playSessionId: '' }) => {
    const intent = envelope.intent as {
      kind?: string;
      attackerId?: string; targetId?: string; actionName?: string;
      creatureId?: string; text?: string;
      rest?: 'short' | 'long';
      skill?: 'acrobatics' | 'animal_handling' | 'arcana' | 'athletics' | 'deception' | 'history' | 'insight' | 'intimidation' | 'investigation' | 'medicine' | 'nature' | 'perception' | 'performance' | 'persuasion' | 'religion' | 'sleight_of_hand' | 'stealth' | 'survival';
      creatureIds?: string[]; dc?: number; reason?: string; secret?: boolean;
      onSeq?: number; verdict?: 'allow' | 'refuse'; note?: string;
      name?: string; maxHp?: number; ac?: number; monsterId?: string;
      cell?: { x: number; y: number };
      tokenId?: string; path?: { x: number; y: number }[];
      toAccountId?: string;
      promptId?: string; take?: boolean; optionName?: string;
    };
    const at = new Date().toISOString();
    const seq = state.nextSeq;
    const stamp = (i = 0) => ({ seq: seq + i, id: `e-${String(n)}-${String(i)}`, at });

    /** Running the game is a role, and these controls belong to it. */
    const isDm = actor.role === 'dm';
    const dmOnly = (): { ok: false; reason: string } =>
      ({ ok: false, reason: 'Only whoever runs the game can do that.' });

    switch (intent.kind) {
      /**
       * FREE TEXT IS THE ESCAPE HATCH THE WHOLE PRODUCT RESTS ON (Law 2, Brief
       * 10 §4.1). A player who cannot find the right button types what they
       * want to do, and it becomes part of the table's record rather than being
       * refused. A DM narrating uses the same path — one composer, one event,
       * no separate chat channel to keep in sync.
       */
      case 'free_text': {
        if (!intent.text) return { ok: false, reason: 'Say something first.' };
        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-say-${String(n)}`,
            actor: { kind: isDm ? 'dm' : 'player', accountId: actor.accountId },
            visibility: 'public',
            body: { t: 'narration', text: intent.text, from: isDm ? 'dm' : 'engine' },
          }] as PlayEvent[],
        };
      }

      /**
       * The DM speaking AS somebody — the goblin boss, the innkeeper, the
       * voice behind the door.
       *
       * A different act from narrating, and the table needs to hear which is
       * happening: narration describes the world, this performs in it. The
       * event carries the speaker so a journal can set it apart rather than
       * flattening everything the DM types into one voice.
       */
      case 'speak_as': {
        if (!isDm) return dmOnly();
        if (!intent.name || !intent.text) return { ok: false, reason: 'Pick a voice, and say something.' };
        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-voice-${String(n)}`,
            actor: { kind: 'dm', accountId: actor.accountId, ...(intent.creatureId ? { creatureId: intent.creatureId } : {}) },
            visibility: 'public',
            body: {
              t: 'narration',
              text: intent.text,
              from: 'dm',
              spoken: true,
              as: { name: intent.name, ...(intent.creatureId ? { creatureId: intent.creatureId } : {}) },
            },
          }] as PlayEvent[],
        };
      }

      /**
       * A whisper reaches one person and the DM, and nobody else — enforced by
       * the event's own visibility, which is the single filter every fan-out
       * and every replay already goes through (ADR-0004). There is no second
       * code path here that could disagree with it.
       */
      case 'whisper': {
        if (!intent.toAccountId || !intent.text) return { ok: false, reason: 'Pick somebody, and say something.' };
        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-whisper-${String(n)}`,
            actor: { kind: isDm ? 'dm' : 'player', accountId: actor.accountId },
            /* The addressee lives in visibility, not in the body — so the ONE
               filter every fan-out and replay already goes through is what
               decides who reads it. A body field would be a second, weaker
               answer to the same question. */
            visibility: { whisperTo: intent.toAccountId },
            body: { t: 'whisper_sent', text: intent.text },
          }] as PlayEvent[],
        };
      }

      /**
       * Moving a token. The path is trusted as declared for now — the movement
       * budget and opportunity attacks are checkIntent's job. What matters here
       * is that a move REACHES EVERYONE: a table where one person drags a token
       * and nobody else sees it move is not a shared table.
       */
      case 'move': {
        if (!intent.tokenId || !intent.path?.length) return { ok: false, reason: 'Nowhere to go.' };
        const to = intent.path[intent.path.length - 1]!;
        const from = intent.path[0] ?? to;
        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-move-${String(n)}`,
            actor: { kind: isDm ? 'dm' : 'player', accountId: actor.accountId },
            visibility: 'public',
            body: {
              t: 'token_moved',
              tokenId: intent.tokenId,
              from, to,
              path: intent.path,
              forced: false,
              /* Chebyshev, five feet a square (ADR-0012) — the same metric the
                 engine's own geometry uses. */
              costFt: 5 * Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)),
            },
          }] as PlayEvent[],
        };
      }

      /**
       * Starting a fight is the boundary between the table's two modes. It
       * rolls for everybody present, publishes the order, and opens round one —
       * all as one cascade, so a client never sees a half-started fight.
       */
      case 'start_combat': {
        if (!isDm) return dmOnly();
        if (Object.keys(state.combatants).length === 0) {
          return { ok: false, reason: 'There is nobody here to fight.' };
        }
        n++;
        const cause = `cause-init-${String(n)}`;
        return {
          ok: true,
          events: rollInitiative(state, rng, { seq, ids: [], at, causeId: cause }),
        };
      }

      case 'advance_turn': {
        if (!isDm) return dmOnly();
        const events = advanceTurn(state, { seq, id: `e-${String(++n)}`, at, causeId: `cause-turn-${String(n)}` });
        if (events.length === 0) return { ok: false, reason: 'Nobody is in this fight.' };
        return { ok: true, events };
      }

      /**
       * Ending a fight returns the table to exploring. The order is cleared by
       * an initiative event carrying nobody rather than by a bespoke event —
       * one way to say a thing, not two.
       */
      case 'end_combat': {
        if (!isDm) return dmOnly();
        if (!inCombat(state)) return { ok: false, reason: 'You are not in a fight.' };
        n++;
        return {
          ok: true,
          events: [
            {
              ...stamp(0),
              causeId: `cause-end-${String(n)}`,
              actor: { kind: 'dm', accountId: actor.accountId },
              visibility: 'public',
              body: { t: 'initiative_rolled', order: [] },
            },
            {
              ...stamp(1),
              causeId: `cause-end-${String(n)}`,
              actor: { kind: 'dm', accountId: actor.accountId },
              visibility: 'public',
              body: { t: 'narration', text: 'The fight is over.', from: 'engine' },
            },
          ] as PlayEvent[],
        };
      }

      /**
       * Answering a reaction prompt (Brief 08). The engine owns what a taken
       * reaction DOES; this closes the prompt's lifecycle so the holder is not
       * left with a card that never resolves.
       */
      case 'prompt_reply': {
        if (!intent.promptId) return { ok: false, reason: 'That prompt has gone.' };
        n++;
        const body = intent.take
          ? takenEvent(intent.promptId, intent.optionName)
          : declinedEvent(intent.promptId, 'holder');
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-prompt-${String(n)}`,
            actor: { kind: isDm ? 'dm' : 'player', accountId: actor.accountId },
            visibility: 'public',
            body,
          }] as PlayEvent[],
        };
      }

      /**
       * A rest, for everybody at once.
       *
       * The DM's call because resting is a FICTION decision — you rest when the
       * story lets you, not when a button becomes available. The engine owns
       * what a rest restores; this walks the party and lets it decide per
       * character, so a rest that gives one person nothing still gives the
       * others theirs.
       */
      case 'rest': {
        if (!isDm) return dmOnly();
        const party = Object.values(state.combatants).filter((c) => c.isPlayer);
        if (party.length === 0) return { ok: false, reason: 'There is nobody here to rest.' };

        const events: PlayEvent[] = [];
        let i = 0;
        n++;
        for (const c of party) {
          const resources = {
            creatureId: c.id,
            hp: c.hp, maxHp: c.maxHp,
            /* Hit dice are per-class and live on the sheet, which the
               projection does not carry — so a rest restores hit points and
               pools here, and spending dice is the player screen's job. */
            hitDie: 8, hitDiceRemaining: 0, hitDiceMax: 0,
            conMod: Math.floor((c.abilities.con - 10) / 2),
            exhaustion: 0,
            pools: [],
          };
          /* A short rest heals nothing on its own — hit dice are spent one at a
             time, and that interaction belongs to the player's own screen. So
             the short branch records that it happened and restores what
             recharges on one; the long branch is the whole transaction. */
          const review = intent.rest === 'long'
            ? longRest(resources)
            : completeShortRest(resources, []);

          for (const body of review.events) {
            events.push({
              ...stamp(i++),
              causeId: `cause-rest-${String(n)}`,
              actor: { kind: 'dm', accountId: actor.accountId },
              visibility: 'public',
              body,
            } as PlayEvent);
          }
        }
        if (events.length === 0) return { ok: false, reason: 'Nobody needs that rest yet.' };
        return { ok: true, events };
      }

      /**
       * A death save. Three successes and you are stable; three failures and
       * you are gone — the ladder every player learns the hard way.
       *
       * The roll is flat: no modifier, no proficiency, nothing on your sheet
       * changes it (SRD). That is worth preserving exactly, because it is the
       * one roll in the game where being a high-level character does not help,
       * and a table feels that.
       */
      case 'death_save': {
        if (!intent.creatureId) return { ok: false, reason: 'Nobody is dying.' };
        const c = state.combatants[intent.creatureId];
        if (!c) return { ok: false, reason: 'That character is not here.' };
        if (c.hp > 0) return { ok: false, reason: 'You are on your feet.' };

        const die = Math.floor(rng() * 20) + 1;
        n++;

        /**
         * THE ENGINE OWNS THE LADDER, and this must not restate it.
         *
         * An earlier version of this case labelled the roll correctly and then
         * applied nothing: a natural 20 read as "crit" and left the character
         * at 0 hit points, still dying, rolling again next turn. The SRD is
         * explicit — "If you roll a 20 on the d20, you regain 1 Hit Point" —
         * and `deathSave` in cascade.ts has always implemented it, along with
         * the natural 1 costing two failures and three of a kind resolving.
         * Nothing called it.
         *
         * Counting the prior successes and failures off the log rather than
         * holding them: the log is the record, and a tally kept beside it is a
         * second copy free to drift.
         */
        const outcome = deathSave(die, c.deathSuccesses ?? 0, c.deathFailures ?? 0);
        const cause = `cause-death-${String(n)}`;
        const events: PlayEvent[] = [{
          ...stamp(0),
          causeId: cause,
          actor: { kind: 'player', accountId: actor.accountId, creatureId: c.id },
          visibility: 'public',
          body: {
            t: 'roll_made',
            rollId: `death-${String(n)}`,
            kind: 'death_save',
            d20: die,
            collapsed: 'straight',
            sources: [c.id],
            modifiers: [],
            total: die,
            vs: { type: 'dc', value: 10 },
            outcome: die === 20 ? 'crit' : die === 1 ? 'fumble' : die >= 10 ? 'success' : 'failure',
            entry: 'server',
          },
        } as PlayEvent];

        /* What the roll DID, not just what it was. Each of these is the SRD
           rule made real rather than announced. */
        if (outcome.result === 'revive_1hp') {
          events.push({
            ...stamp(1),
            causeId: cause,
            actor: { kind: 'engine' },
            visibility: 'public',
            body: { t: 'healing_applied', creatureId: c.id, amount: 1, resultingHp: 1 },
          } as PlayEvent);
        } else if (outcome.result === 'stable') {
          events.push({
            ...stamp(1),
            causeId: cause,
            actor: { kind: 'engine' },
            visibility: 'public',
            body: { t: 'creature_stabilized', creatureId: c.id },
          } as PlayEvent);
        } else if (outcome.result === 'dead') {
          events.push({
            ...stamp(1),
            causeId: cause,
            actor: { kind: 'engine' },
            visibility: 'public',
            body: { t: 'creature_died', creatureId: c.id },
          } as PlayEvent);
        }

        return { ok: true, events };
      }

      /**
       * "Give me a perception check." THE MOST COMMON THING THAT HAPPENS AT A
       * TABLE, and until now there was no way to say it.
       *
       * Public by default because at a real table it is said out loud —
       * everyone hears the ask and everyone watches the roll. A secret check
       * goes dm_only instead: a real tool, since players should not know they
       * failed to spot the ambush, but not the common case.
       */
      case 'ask_for_check': {
        if (!isDm) return dmOnly();
        if (!intent.skill) return { ok: false, reason: 'Pick what they are rolling.' };
        /* Nobody named means everybody — "everyone give me a perception
           check" is one of the most common asks there is. */
        const who = intent.creatureIds?.length
          ? intent.creatureIds
          : Object.values(state.combatants).filter((c) => c.isPlayer).map((c) => c.id);
        if (who.length === 0) return { ok: false, reason: 'There is nobody to ask.' };

        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-ask-${String(n)}`,
            actor: { kind: 'dm', accountId: actor.accountId },
            visibility: intent.secret === true ? 'dm_only' : 'public',
            body: {
              t: 'check_asked',
              askId: `ask-${String(n)}`,
              skill: intent.skill,
              creatureIds: who,
              ...(intent.dc === undefined ? {} : { dc: intent.dc }),
              ...(intent.reason === undefined ? {} : { reason: intent.reason }),
            },
          }] as PlayEvent[],
        };
      }

      /**
       * Rolling the check. The arithmetic is shown out loud — d20, the ability
       * modifier, proficiency if they have it — because that is the whole
       * learn-while-playing promise: you find out WHY you rolled a 17, not
       * just that you did.
       */
      case 'roll_check': {
        if (!intent.creatureId || !intent.skill) return { ok: false, reason: 'Nothing to roll.' };
        const c = state.combatants[intent.creatureId];
        if (!c) return { ok: false, reason: 'That character is not here.' };

        const ability = SKILL_ABILITY[intent.skill] ?? 'int';
        const abilityMod = Math.floor(((c.abilities[ability] ?? 10) - 10) / 2);
        /* Proficiency is on the combatant, computed from the sheet when they
           were seated — not guessed here. */
        const trained = c.proficientSkills?.includes(intent.skill) ?? false;
        const prof = trained ? c.profBonus : 0;
        const die = Math.floor(rng() * 20) + 1;
        const total = die + abilityMod + prof;

        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-check-${String(n)}`,
            actor: { kind: 'player', accountId: actor.accountId, creatureId: c.id },
            visibility: 'public',
            body: {
              t: 'roll_made',
              rollId: `check-${String(n)}`,
              kind: 'ability_check',
              d20: die,
              collapsed: 'straight',
              sources: [c.id],
              modifiers: [
                { label: ability.toUpperCase(), value: abilityMod },
                ...(trained ? [{ label: 'Proficiency', value: prof }] : []),
              ],
              total,
              /* Against a DC only when the DM set one. A check with no target
                 number is the DM deciding after the fact, which is legitimate
                 and common — showing "against undefined" would not be. */
              ...(intent.dc === undefined ? {} : { vs: { type: 'dc' as const, value: intent.dc } }),
              outcome: intent.dc === undefined
                ? 'success'
                : total >= intent.dc ? 'success' : 'failure',
              entry: 'server',
            },
          }] as PlayEvent[],
        };
      }

      /**
       * The DM ruling on something a player described. This is what makes
       * Law 2's escape hatch real rather than decorative: a typed line stops
       * being a message in a log and becomes a request somebody answers.
       */
      case 'rule_on': {
        if (!isDm) return dmOnly();
        if (intent.onSeq === undefined || !intent.verdict) {
          return { ok: false, reason: 'Nothing to rule on.' };
        }
        n++;
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-rule-${String(n)}`,
            actor: { kind: 'dm', accountId: actor.accountId },
            visibility: 'public',
            body: {
              t: 'ruled',
              onSeq: intent.onSeq,
              verdict: intent.verdict,
              ...(intent.note === undefined ? {} : { note: intent.note }),
            },
          }] as PlayEvent[],
        };
      }

      /**
       * Putting a creature on the board. Without this the map is empty, every
       * attack row is dead, and a fight is the party rolling initiative
       * against nobody (owner, 2026-08-25).
       *
       * IT NOW SAYS WHERE, WHICH IS THE HALF THAT WAS MISSING. Until
       * 2026-08-25 the cell was emitted only when the client had named one, and
       * no client ever did — so every creature a DM brought in joined the turn
       * order and stood nowhere. The map stayed empty through reloads and
       * restarts, because there was never a square in the log to replay.
       *
       * The SERVER picks it, and that is not an implementation detail: choosing
       * a square means knowing what is already on the board, and two clients
       * with different ideas of the room would each pick confidently and
       * disagree. Same division as a move — the server settles where, the
       * clients draw it.
       */
      case 'add_creature': {
        if (!isDm) return dmOnly();
        if (!intent.name || !intent.maxHp || !intent.ac) {
          return { ok: false, reason: 'A creature needs a name, hit points and an armour class.' };
        }
        n++;
        const room = deps.roomFor?.(context.playSessionId) ?? null;
        let placed = placedBySession.get(context.playSessionId);
        if (!placed) {
          placed = new Map<string, Cell>();
          placedBySession.set(context.playSessionId, placed);
        }
        /* No room primed yet ⇒ place by the grid's own defaults rather than
           refuse. A creature standing somewhere plain can be moved; a creature
           that never arrived cannot. */
        const cell = room
          ? arrivalCell(room, { preferred: intent.cell, taken: [...placed.values()] })
          : intent.cell ?? { x: 0, y: 0 };
        const creatureId = `foe-${String(Date.now())}-${String(n)}`;
        placed.set(creatureId, cell);
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-add-${String(n)}`,
            actor: { kind: 'dm', accountId: actor.accountId },
            visibility: 'public',
            body: {
              t: 'creature_added',
              creatureId,
              name: intent.name,
              maxHp: intent.maxHp,
              ac: intent.ac,
              cell,
              ...(intent.monsterId === undefined ? {} : { monsterId: intent.monsterId }),
            },
          }] as PlayEvent[],
        };
      }

      case 'remove_creature': {
        if (!isDm) return dmOnly();
        if (!intent.creatureId || !state.combatants[intent.creatureId]) {
          return { ok: false, reason: 'That creature is not on the board.' };
        }
        n++;
        /* The square goes back into circulation — see placedBySession. */
        placedBySession.get(context.playSessionId)?.delete(intent.creatureId);
        return {
          ok: true,
          events: [{
            ...stamp(),
            causeId: `cause-rm-${String(n)}`,
            actor: { kind: 'dm', accountId: actor.accountId },
            visibility: 'public',
            body: { t: 'creature_removed', creatureId: intent.creatureId },
          }] as PlayEvent[],
        };
      }

      case 'attack': {
        if (!intent.attackerId || !intent.targetId) return { ok: false, reason: 'Pick a target.' };
        const attacker = state.combatants[intent.attackerId];
        const target = state.combatants[intent.targetId];
        if (!attacker || !target) return { ok: false, reason: 'That target is not here.' };
        /* In a fight, you attack on your own turn. Outside one, anybody may
           swing — that is what makes an ambush possible. */
        if (inCombat(state) && state.activeCreatureId !== intent.attackerId && !isDm) {
          return { ok: false, reason: 'It is not your turn.' };
        }
        const events: PlayEvent[] = resolveAttack(
          {
            kind: 'attack', attackerId: intent.attackerId, targetId: intent.targetId,
            actionName: intent.actionName ?? 'Attack', damageDice: '1d8 + 3', damageType: 'slashing',
            coverDegree: 'none',
          },
          state, rules, rng,
          {
            seq,
            timestamps: [at, at, at],
            ids: [`e-${String(n)}-a`, `e-${String(n)}-b`, `e-${String(n)}-c`],
            rollId: `roll-${String(n)}`,
            actor: { kind: 'player', accountId: actor.accountId, creatureId: attacker.id },
          },
          `cause-attack-${String(n++)}`,
        );
        return { ok: true, events };
      }

      default:
        return { ok: false, reason: 'That action is not available yet.' };
    }
  };
}
