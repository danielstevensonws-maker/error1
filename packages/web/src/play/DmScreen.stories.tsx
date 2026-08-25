/**
 * Play/DM Screen — the screen a DM runs the game from, staged on the same
 * fixture table as Player View v2 so the two can be judged side by side.
 *
 * That comparability is the whole point of the story: the DM's screen and the
 * player's screen are two windows on ONE table, and every complaint about them
 * so far has been about them not looking like it.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DmScreen } from './DmScreen.js';
import { castOrder, ROOM, ENTRIES } from '../primitives/v2/fixtures.js';
import type { PlayView } from './projectionToView.js';

const cast = castOrder('pc-torvald').map((c) => ({
  ...c,
  ac: c.id === 'pc-wren' ? 14 : c.id === 'pc-torvald' ? 18 : c.id.startsWith('npc') ? 15 : 13,
  ...(c.kind === 'foe' ? { hp: { current: c.id === 'npc-goblin-1' ? 4 : 10, max: 10 } } : {}),
}));

const view: PlayView = {
  scene: { title: 'The Ruined Steading', subtitle: 'Round 3', round: 3, elapsed: '01:42:33' },
  hero: null,
  cast,
  room: ROOM,
  entries: ENTRIES,
  turn: { active: false, activeName: 'Torvald', exploring: false },
};

const seats = [
  { accountId: 'a1', displayName: 'Sam', characterName: 'Wren', here: true },
  { accountId: 'a2', displayName: 'Dan', characterName: 'Torvald', here: true },
  { accountId: 'a3', displayName: 'Priya', characterName: 'Mira', here: true },
  { accountId: 'a4', displayName: 'Alex', characterName: 'Ozren', here: false },
];

const noop = (): void => undefined;

/**
 * The rules the compendium sheet reads. Shaped exactly as
 * `/compendium` replies — entries plus the type list — so the sheet in the
 * story exercises the same path the live one does.
 */
const COMPENDIUM = {
  entries: [
    { id: 'cond.grappled', name: 'Grappled', entityType: 'condition', plain: 'Speed drops to 0. Ends if the grappler is incapacitated.' },
    { id: 'cond.prone', name: 'Prone', entityType: 'condition', plain: 'Crawl at half speed. Melee attackers have advantage on you.' },
    { id: 'mon.goblin', name: 'Goblin', entityType: 'monster', plain: 'Small humanoid. Armour Class 15, 7 hit points, Nimble Escape.' },
    { id: 'spell.bless', name: 'Bless', entityType: 'spell', plain: 'Level 1. Three creatures add 1d4 to attacks and saves.' },
  ],
  types: ['condition', 'monster', 'spell'],
};

const fetchJson = (async (path: string) =>
  path.startsWith('/compendium') ? COMPENDIUM : { entries: [], types: [] }) as <T>(p: string) => Promise<T>;

const meta: Meta<typeof DmScreen> = {
  title: 'Play/DM Screen',
  component: DmScreen,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof DmScreen>;

export const InAFight: Story = {
  args: {
    view,
    room: ROOM,
    campaignName: 'The Ruined Steading',
    seats,
    prompts: [],
    rulings: [{ seq: 41, who: 'Wren', text: 'I want to swing on the well-rope and drop on the lookout.' }],
    effect: null,
    fetchJson,
    onLeave: noop, onSay: noop, onSpeakAs: noop, onWhisper: noop,
    onStartCombat: noop, onEndCombat: noop, onAdvanceTurn: noop, onRest: noop,
    onAnswerPrompt: noop, onAskCheck: noop, onRule: noop,
    onAddCreature: noop, onRemoveCreature: noop, onEffect: noop, onMove: noop,
  },
};


export const Exploring: Story = {
  args: {
    ...InAFight.args as Required<Story>['args'],
    view: { ...view, cast: cast.map((c) => ({ ...c, acting: false, acted: false })), turn: { active: false, exploring: true } },
    rulings: [],
  },
};

/**
 * The link for a screen in the middle of the table, which used to be mintable
 * only from the lobby — so a DM who decided mid-session to put the map on the
 * television had to leave the table to do it. Press the TV tile to see it.
 */
export const TheTableScreen: Story = {
  args: {
    ...InAFight.args as Required<Story>['args'],
    onTableScreenLink: async () => 'https://questra.app/display/ps_8f3c1?t=td_9Kq2LmXv',
  },
};
