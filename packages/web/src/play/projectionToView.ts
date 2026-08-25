/**
 * play/projectionToView — the engine's projection becomes what the screen draws.
 *
 * THE SEAM THIS FILLS. `PlayerViewV2` takes a fully-formed view-model (hero,
 * cast, tiles, log) and was built against fixtures; the sync client delivers a
 * `ProjectionState` (combatants keyed by id, a round, whose turn it is). Until
 * now nothing converted one into the other, so the play surface had never
 * rendered live data.
 *
 * WHY A PURE FUNCTION AND NOT A HOOK. Everything here is derivation: given a
 * projection, a room and who is looking, there is exactly one right answer. A
 * pure function can be tested against a projection built by hand — which is
 * what the suite does — and cannot accidentally hold state that drifts from
 * the server's.
 *
 * WHAT IT REFUSES TO DECIDE. It never hides anything. Visibility is settled
 * server-side before a payload is built (`eventVisibleTo`, `filterRoomForViewer`)
 * and re-deciding it here would be a second implementation of the security
 * model, free to disagree. What this DOES do is present what arrived at the
 * resolution a viewer is owed: an ally's exact hit points, an enemy's condition
 * as a word rather than a number. That is presentation, not permission — the
 * numbers for a hidden creature never reached the client at all.
 */
import type { ComputedSheet, PlayEvent, Room, ViewerRole } from '@questra/contracts';
import type { ExplainVM } from '../design/explain.js';
import type {
  AbilityKey, AbilityVM, ConditionVM, HeroVM, Hurt, LogEntryVM, SpineEntryVM,
} from '../primitives/v2/viewModel.js';

/** The engine's shape, restated structurally — the web package has no engine dep. */
export interface Combatant {
  id: string;
  name: string;
  abilities: Record<string, number>;
  profBonus: number;
  proficientSkills?: string[];
  proficientSaves?: string[];
  maxHp: number;
  hp: number;
  tempHp: number;
  ac: number;
  conditions: { conditionId: string }[];
  concentratingOn?: string;
  isPlayer: boolean;
}

export interface Projection {
  combatants: Record<string, Combatant>;
  round: number;
  activeCreatureId?: string;
  /** Initiative order, highest first. Empty or absent means nobody has rolled. */
  order?: string[];
  nextSeq: number;
}

/** What the roster knows about the character a viewer plays. */
export interface MyCharacter {
  id: string;
  name: string;
  /** "Human Fighter" — what they ARE, as a table would say it. */
  summary: string;
  sheet: ComputedSheet;
}

export interface ViewInput {
  projection: Projection;
  room: Room | null;
  /** The character this viewer plays, if any. A DM has none. */
  myCharacter: MyCharacter | null;
  role: ViewerRole;
  events: readonly PlayEvent[];
  campaignName: string;
  /** Character id → current name, so a rebuilt character is not shown stale. */
  rosterNames?: Record<string, string>;
}

const mod = (score: number): number => Math.floor((score - 10) / 2);
const sign = (n: number): string => (n >= 0 ? `+${String(n)}` : `−${String(Math.abs(n))}`);

/**
 * A value plus the arithmetic behind it — the shared readout every number on
 * the screen taps into. `rule` is the plain sentence explaining what the thing
 * IS, which is the layer a first-time player actually needs.
 */
function explain(
  id: string,
  kicker: string,
  title: string,
  value: number,
  rows: { label: string; value: number }[],
  rule: string,
  asSign = true,
): ExplainVM {
  return {
    id,
    kicker,
    title,
    value: asSign ? sign(value) : String(value),
    rows: rows.map((r) => ({ label: r.label, value: sign(r.value) })),
    rule,
  };
}

/**
 * A creature is Bloodied at or below half its maximum hit points (SRD).
 * Derived rather than stored, exactly as the engine derives it — restating the
 * threshold is safe because it is a definition, not a calculation that could
 * drift.
 */
const isBloodied = (c: Combatant): boolean => c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2);

/**
 * How much an enemy's health a player is owed.
 *
 * A player does not get an enemy's exact hit points — that is the DM's to
 * reveal — but "unhurt / hurt / bloodied / down" is what anyone at a real table
 * can see by looking. Note this is PRESENTATION of data that already arrived,
 * not concealment: an enemy the players cannot see was filtered out server-side
 * and never reached this function.
 */
function hurtOf(c: Combatant): Hurt {
  if (c.hp <= 0) return 'Down';
  if (isBloodied(c)) return 'Bloodied';
  if (c.hp < c.maxHp) return 'Hurt';
  return 'Unhurt';
}

/**
 * Turn one of the sheet's Derived values into the shared readout.
 *
 * The sheet already carries the arithmetic — this only dresses it. That is the
 * whole learn-while-playing mechanic: a new player taps armour class and reads
 * where it came from rather than being told to trust a number.
 */
function fromDerived(
  id: string,
  kicker: string,
  title: string,
  derived: { value: number; derivation: readonly { label: string; value: number }[] },
  rule: string,
  asSign = true,
): ExplainVM {
  return {
    id,
    kicker,
    title,
    value: asSign ? sign(derived.value) : String(derived.value),
    rows: derived.derivation.map((d) => ({ label: d.label, value: sign(d.value) })),
    rule,
  };
}

export function heroFrom(c: Combatant, me: MyCharacter): HeroVM {
  const sheet = me.sheet;
  const ac = sheet.acOptions[sheet.acDefault];

  return {
    id: c.id,
    /**
     * The ROSTER's name, not the combatant's.
     *
     * A combatant is seated into the projection when the play session first
     * starts, and it keeps whatever it was seated with. Rebuild your character
     * and the database is right immediately while the live session still holds
     * the old one — which showed a player their previous character's name
     * beside their new character's class (owner, 2026-08-20). The roster is
     * re-read from storage, so it is the one that can be trusted to be current.
     */
    name: me.name,
    initial: me.name.slice(0, 1).toUpperCase(),
    /* "Human Fighter" — from the roster, which computed it from the stored
       choices. The projection carries combatants, not classes, so without this
       the panel could only say a name. */
    className: me.summary,
    level: 1,
    hp: { current: c.hp, max: c.maxHp, temp: c.tempHp },
    bloodied: isBloodied(c),
    /* Every one of these comes off the sheet with its derivation attached —
       none is recalculated here, so none can disagree with the character sheet
       the player is looking at. */
    ac: ac
      ? fromDerived('ac', 'Defence', 'Armour class', ac, 'How hard you are to hit. An attack has to meet or beat it.', false)
      : explain('ac', 'Defence', 'Armour class', c.ac, [{ label: 'Armour class', value: c.ac }],
          'How hard you are to hit. An attack has to meet or beat it.', false),
    speed: fromDerived('speed', 'Movement', 'Speed', sheet.speedFt,
      'How far you can move on your turn, in feet.', false),
    passivePerception: fromDerived('passive-perception', 'Awareness', 'Passive perception',
      sheet.passives.perception, 'What you notice without looking for it.', false),
    initiative: fromDerived('initiative', 'Turn order', 'Initiative', sheet.initiative,
      'Rolled at the start of a fight to decide who goes when.'),
    hitDice: { die: sheet.hp.value.hitDie, max: sheet.hp.value.hitDiceMax },
    coins: '0 gp',
    abilities: abilitiesOf(sheet),
    /* The projection carries condition ids; naming them plainly is the
       compendium's job and it is not wired here yet, so the id stands in
       rather than a guessed label. */
    conditions: c.conditions.map((x): ConditionVM => ({
      id: x.conditionId,
      name: x.conditionId.replace(/^condition\./, '').replace(/-/g, ' '),
      explain: explain(x.conditionId, 'Condition', x.conditionId.replace(/^condition\./, ''), 0, [],
        'Something is affecting you. Tap for what it does.', false),
    })),
    saves: ABILITY_KEYS.map((key) => ({
      key,
      label: ABILITY_LABEL[key],
      mod: sheet.saves[key].value,
      explain: fromDerived(`save-${key}`, 'Saving throw', ABILITY_LABEL[key], sheet.saves[key],
        'Rolled to resist something happening to you.'),
    })),
    /* The sheet keys `skills` by the ones this character is trained in, so the
       list is exactly what they are good at — no entry for the rest, which is
       what a character sheet shows too. */
    skills: Object.entries(sheet.skills).map(([key, derived]) => ({
      key: key as never,
      label: key.replace(/-/g, ' ').replace(/^./, (ch) => ch.toUpperCase()),
      mod: derived.value,
      explain: fromDerived(`skill-${key}`, 'Skill', key.replace(/-/g, ' '), derived,
        'Added when you try something this covers.'),
    })),
  };
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

function abilitiesOf(sheet: ComputedSheet): AbilityVM[] {
  return ABILITY_KEYS.map((key) => {
    const score = sheet.abilities[key].value;
    return {
      key,
      short: key.toUpperCase(),
      score,
      mod: mod(score),
      /* The derivation shows where the SCORE came from (base plus background),
         which is the question a player actually asks at this point. */
      explain: fromDerived(`ability-${key}`, 'Ability', ABILITY_LABEL[key],
        { value: mod(score), derivation: sheet.abilities[key].derivation },
        'Added to anything you try that leans on it.'),
    };
  });
}

/**
 * The round, in initiative order.
 *
 * Sorted by the projection's own order where there is one; falling back to
 * name so a pre-combat table still reads as a stable list rather than
 * reshuffling on every render.
 */
export function castFrom(
  projection: Projection,
  myCreatureId: string | null,
  /* Character id → current name, from the roster. The projection's combatants
     keep whatever they were seated with when the session started, so a rebuilt
     character shows its old name there; the roster is re-read and is current. */
  names: Record<string, string> = {},
  /** A DM's roster carries numbers a player's spine must not. */
  forDm = false,
): SpineEntryVM[] {
  return Object.values(projection.combatants)
    .map((c): SpineEntryVM => {
      const you = c.id === myCreatureId;
      const kind = you ? 'you' : c.isPlayer ? 'ally' : 'foe';
      const down = c.hp <= 0;
      /* Built conditionally rather than with undefined values: under
         exactOptionalPropertyTypes an optional field must be ABSENT, not
         present-and-undefined, and the distinction is the point here — an
         enemy has no `hp` key at all rather than an empty one. */
      return {
        id: c.id,
        initiative: 0,
        name: names[c.id] ?? c.name,
        kind,
        /**
         * ARMOUR CLASS IS THE DM'S NUMBER. A player is owed a word for an
         * enemy's health and nothing about their defences — finding out how
         * hard something is to hit is what swinging at it is FOR. So this is
         * present only when the viewer runs the game.
         */
        ...(forDm ? { ac: c.ac } : {}),
        /* Allies show real hit points; enemies show a word. */
        ...(c.isPlayer ? { hp: { current: c.hp, max: c.maxHp } } : { hurt: hurtOf(c) }),
        ...(down ? { status: c.isPlayer ? 'Dying' : 'Down' } : {}),
        /* Nobody has acted outside a fight, and whose turn it is comes from
           the projection rather than from the list. */
        acted: false,
        acting: c.id === projection.activeCreatureId,
      };
    })
    /**
     * IN A FIGHT, THE ORDER IS THE ORDER. Sorting a turn order alphabetically
     * would be actively misleading — the list's whole job is to answer "who is
     * next?", and it can only do that in initiative sequence. Outside a fight
     * there is no sequence to respect, so a stable alphabetical list is the
     * kindest way to find somebody by name.
     */
    .sort((a, b) => {
      const order = projection.order ?? [];
      if (order.length > 0) {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        /* Anybody not in the order joined mid-fight; they sit at the end
           rather than jumping the queue. */
        if (ia !== ib) return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib);
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * The play log.
 *
 * Only events that SAY something get a line: narration and rulings are the
 * table's record. Mechanical events (a resource ticking down, concentration
 * starting) change the numbers the screen already shows and would otherwise
 * bury the story under bookkeeping — the thing the journal exists to prevent.
 */
export function logFrom(
  events: readonly PlayEvent[],
  /* Creature id → name, so a roll reads "Mira rolled 17" rather than quoting
     an id at somebody who has never seen one. */
  names: Record<string, string> = {},
): LogEntryVM[] {
  const lines: LogEntryVM[] = [];
  const who = (id: string | undefined): string => (id ? names[id] ?? id : 'The table');

  for (const e of events) {
    const body = e.body as {
      t: string; text?: string; creatureId?: string; from?: string;
      d20?: number; modifiers?: { label: string; value: number }[]; total?: number;
      kind?: string; outcome?: string; vs?: { type: string; value: number };
      amount?: number; type?: string; round?: number; activeCreatureId?: string;
      order?: { creatureId: string; total: number }[];
      /* roll_made names its creature here rather than in a creatureId field. */
      sources?: string[];
      as?: { name: string; creatureId?: string };
      creatureIds?: string[]; skill?: string; reason?: string;
      verdict?: string; note?: string; name?: string;
    };

    switch (body.t) {
      case 'narration':
        if (body.text) {
          /**
           * A DM PERFORMING IS NOT A DM NARRATING, and the journal has to say
           * which. "The goblin boss says" reads as somebody speaking; "The DM"
           * reads as the world being described. Flattening both into one voice
           * is what makes a log feel like a chat window instead of a table.
           */
          lines.push({
            id: String(e.seq),
            tone: body.as ? 'chat' : 'narration',
            actor: body.as ? body.as.name : body.from === 'dm' ? 'The DM' : 'The table',
            text: body.text,
          });
        }
        break;

      /**
       * A WHISPER ONLY EVER REACHES THIS CLIENT IF IT WAS MEANT FOR IT — the
       * server filtered it before the payload was built. Rendering it here is
       * not a decision about who may read it; that was settled upstream.
       */
      case 'whisper_sent':
        if (body.text) {
          /* 'chat' rather than a new tone: a whisper IS a line somebody spoke,
             and the actor label is what marks it private. */
          lines.push({ id: String(e.seq), tone: 'chat', actor: 'Just to you', text: body.text });
        }
        break;

      /**
       * ROLLS ARE THE PRODUCT'S WHOLE PROMISE MADE VISIBLE (Brief 10 §3: the
       * log carries roll results). "17" teaches nothing. "12 + 5 = 17, beat 15,
       * hit" teaches the game while it is being played, which is the entire
       * reason somebody who has never played can sit down at this table.
       */
      case 'roll_made': {
        if (body.d20 === undefined || body.total === undefined) break;
        const mods = (body.modifiers ?? [])
          .map((m) => `${m.value >= 0 ? '+' : '−'}${String(Math.abs(m.value))} ${m.label}`)
          .join(' ');
        const target = body.vs ? ` against ${String(body.vs.value)}` : '';
        const result = body.outcome && body.outcome !== 'success' ? ` — ${outcomeWord(body.outcome)}` : '';
        lines.push({
          id: String(e.seq),
          tone: 'roll',
          /* A roll names its creature in its sources list — the schema has no
             creatureId on roll_made, and reading one would silently attribute
             every roll to 'The table'. */
          actor: who(body.sources?.[0]),
          text: `${rollName(body.kind)}: rolled ${String(body.d20)}${mods ? ` ${mods}` : ''} = ${String(body.total)}${target}${result}`,
        });
        break;
      }

      case 'damage_applied':
        if (body.amount !== undefined && body.creatureId) {
          lines.push({
            id: String(e.seq),
            tone: 'roll',
            actor: who(body.creatureId),
            text: `takes ${String(body.amount)} ${body.type ?? ''} damage`.replace('  ', ' '),
          });
        }
        break;

      case 'turn_advanced':
        if (body.activeCreatureId) {
          lines.push({
            id: String(e.seq),
            tone: 'system',
            actor: `Round ${String(body.round ?? 1)}`,
            text: `${who(body.activeCreatureId)} is up.`,
          });
        }
        break;

      /**
       * The ask, heard by the whole table. This is what makes a check feel
       * like a table rather than a form: everyone sees "Wren asks Mira for
       * Perception" and then watches the roll land.
       */
      case 'check_asked': {
        const asked = (body.creatureIds ?? []).map(who);
        const names = asked.length === 0
          ? 'everyone'
          : asked.length === 1 ? asked[0]! : `${asked.slice(0, -1).join(', ')} and ${asked[asked.length - 1]!}`;
        lines.push({
          id: String(e.seq),
          tone: 'system',
          actor: 'The DM asks',
          text: `${names} to roll ${skillWords(body.skill)}${body.reason ? ` — ${body.reason}` : ''}.`,
        });
        break;
      }

      /**
       * The answer to something a player described. It belongs in the log
       * because the log IS the play record — reading back later, a table wants
       * to see what was attempted and what was allowed.
       */
      case 'ruled':
        lines.push({
          id: String(e.seq),
          tone: 'system',
          actor: 'The DM',
          text: body.verdict === 'allow'
            ? `says yes.${body.note ? ` ${body.note}` : ''}`
            : `says not this time.${body.note ? ` ${body.note}` : ''}`,
        });
        break;

      case 'creature_added':
        lines.push({
          id: String(e.seq),
          tone: 'system',
          actor: 'The table',
          text: `${body.name ?? 'Something'} appears.`,
        });
        break;

      case 'creature_removed':
        lines.push({
          id: String(e.seq),
          tone: 'system',
          actor: 'The table',
          text: `${who(body.creatureId)} is gone.`,
        });
        break;

      case 'initiative_rolled':
        lines.push({
          id: String(e.seq),
          tone: 'system',
          actor: 'The table',
          text: (body.order?.length ?? 0) > 0
            ? `Order: ${(body.order ?? []).map((o) => who(o.creatureId)).join(', ')}.`
            : 'The fight is over.',
        });
        break;

      default:
        /* Everything else changes numbers the screen already shows. Logging it
           too would bury the story under bookkeeping, which is the one thing
           the journal exists to prevent. */
        break;
    }
  }
  return lines;
}

/**
 * The death-save ladder for one character, counted from the log.
 *
 * DERIVED, NOT STORED, for the same reason everything else here is: the events
 * are the truth, and a separately-held tally is a second copy free to drift. A
 * player watching their own three-and-three has to be able to trust it.
 *
 * The count resets whenever the character comes back up or drops again, so a
 * second knockdown in the same fight starts clean — which is the SRD's rule and
 * also the only thing that makes sense to somebody reading their own pips.
 */
export function dyingFrom(
  events: readonly PlayEvent[],
  creatureId: string | null,
  hp: number,
): { successes: number; failures: number; phase: 'dying' | 'stable' | 'dead' | 'up' } | undefined {
  if (!creatureId) return undefined;

  let successes = 0;
  let failures = 0;
  let phase: 'dying' | 'stable' | 'dead' | 'up' = hp > 0 ? 'up' : 'dying';

  for (const e of events) {
    const body = e.body as {
      t: string; creatureId?: string; kind?: string; outcome?: string; amount?: number;
      sources?: string[];
    };
    /* A roll_made carries its creature in its sources list; everything else
       uses creatureId. Reading only one of the two silently dropped every
       death save, which is the whole ladder. */
    const subject = body.t === 'roll_made' ? body.sources?.[0] : body.creatureId;
    if (subject !== creatureId) continue;

    switch (body.t) {
      case 'creature_unconscious':
        successes = 0; failures = 0; phase = 'dying';
        break;
      case 'creature_stabilized':
        phase = 'stable';
        break;
      case 'creature_died':
        phase = 'dead';
        break;
      case 'healing_applied':
        /* Any healing brings you back up and wipes the ladder. */
        successes = 0; failures = 0; phase = 'up';
        break;
      case 'roll_made':
        if (body.kind === 'death_save') {
          if (body.outcome === 'success' || body.outcome === 'crit') successes += 1;
          else failures += body.outcome === 'fumble' ? 2 : 1;
          if (successes >= 3) phase = 'stable';
          if (failures >= 3) phase = 'dead';
        }
        break;
      default:
        break;
    }
  }

  /* Nothing to show for somebody on their feet — the near edge stays as it is
     rather than flipping to an empty ladder. */
  if (phase === 'up' && hp > 0) return undefined;
  return { successes, failures, phase };
}

/** The key only exists when there is something to show — under
    exactOptionalPropertyTypes an absent field and one set to undefined are
    different things, and PlayView means the former. */
function dyingOf(me: Combatant | undefined, events: readonly PlayEvent[]): Pick<PlayView, 'dying'> {
  if (!me) return {};
  const d = dyingFrom(events, me.id, me.hp);
  return d ? { dying: d } : {};
}

/** animal_handling → Animal Handling, so the log reads as speech. */
function skillWords(skill: string | undefined): string {
  if (!skill) return 'something';
  return skill.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Roll kinds in words a first-timer reads without a glossary. */
function rollName(kind: string | undefined): string {
  switch (kind) {
    case 'attack_roll': return 'Attack';
    case 'saving_throw': return 'Saving throw';
    case 'ability_check': return 'Check';
    case 'death_save': return 'Death save';
    case 'concentration_save': return 'Holding concentration';
    case 'initiative': return 'Initiative';
    default: return 'Roll';
  }
}

function outcomeWord(outcome: string): string {
  switch (outcome) {
    case 'hit': return 'a hit';
    case 'miss': return 'a miss';
    case 'crit': return 'a critical hit';
    case 'fumble': return 'a fumble';
    case 'failure': return 'failed';
    default: return outcome;
  }
}

export interface PlayView {
  scene: { title: string; subtitle: string; round: number; elapsed: string };
  hero: HeroVM | null;
  cast: SpineEntryVM[];
  room: Room | null;
  entries: LogEntryVM[];
  turn: { active: boolean; activeName?: string; exploring: boolean };
  /**
   * Present and not 'up' means the near edge flips to the death-save ladder.
   * Only ever about YOUR character: watching somebody else's death saves is
   * the DM's view of the table, not a player's near edge.
   */
  dying?: { successes: number; failures: number; phase: 'dying' | 'stable' | 'dead' | 'up' };
}

export function projectionToView(input: ViewInput): PlayView {
  const { projection, room, myCharacter, events, campaignName, rosterNames = {} } = input;
  const me = myCharacter ? projection.combatants[myCharacter.id] : undefined;
  const active = projection.activeCreatureId
    ? projection.combatants[projection.activeCreatureId]
    : undefined;

  /* No active creature means nobody has rolled initiative — the table is
     exploring rather than fighting, and the frame says so instead of showing
     an empty round counter. */
  const exploring = projection.activeCreatureId === undefined;

  return {
    scene: {
      title: campaignName,
      subtitle: exploring ? 'Not in a fight' : `Round ${String(projection.round)}`,
      round: projection.round,
      elapsed: '',
    },
    hero: me && myCharacter ? heroFrom(me, myCharacter) : null,
    cast: castFrom(projection, myCharacter?.id ?? null, rosterNames, input.role === 'dm'),
    room,
    entries: logFrom(events, Object.fromEntries(Object.values(projection.combatants).map((c) => [c.id, rosterNames[c.id] ?? c.name]))),
    ...dyingOf(me, events),
    turn: {
      active: me !== undefined && projection.activeCreatureId === me.id,
      ...(active ? { activeName: active.name } : {}),
      exploring,
    },
  };
}
