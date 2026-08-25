/**
 * JournalRail — the one stream, and the one AI card inside it.
 *
 * The rail's own rules are covered here (rolls collapse; the DM's secret notes
 * never arrive; collapsing keeps the notification), but the load-bearing test
 * is the last group: a suggestion in the journal must render THE card, not a
 * look-alike. The rail had grown its own quote-plus-buttons block, which is
 * exactly the "second AI presentation" Orchestration §4 rules out — two
 * surfaces where a model's output reaches a human, and only one of them
 * carrying the accept/tweak/reject guarantee.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { JournalRail } from './JournalRail.js';
import type { LogEntryVM } from './viewModel.js';

afterEach(cleanup);

const suggestion = (over: Partial<LogEntryVM['suggestion']> = {}): LogEntryVM => ({
  id: 's1',
  tone: 'suggestion',
  actor: 'Ruling suggestion',
  text: 'I want to swing on the well-rope and drop on the lookout.',
  suggestion: {
    rows: [
      { label: 'Roll', value: 'Dexterity (Acrobatics)' },
      { label: 'Beat', value: '13', variant: 'number' },
    ],
    acceptLabel: 'Ask for the roll',
    rejectLabel: 'No roll needed',
    ...over,
  },
});

const shell = { open: true, onToggle: () => {} };

describe('the stream', () => {
  it('says so plainly when there is nothing in it yet', () => {
    render(<JournalRail entries={[]} {...shell} />);
    expect(screen.getByText('Rolls and story gather here once the session starts.')).toBeDefined();
  });

  it('a roll is one line until you ask for the working', () => {
    const entry: LogEntryVM = {
      id: 'r1',
      tone: 'roll',
      actor: 'Torvald',
      text: 'Longsword against the skirmisher',
      roll: {
        rows: [{ label: 'd20', value: '14' }, { label: 'Strength', value: '+3' }, { label: 'Proficient', value: '+2' }],
        total: 19,
        verdict: 'Hit — against Armor Class 15',
        tone: 'hit',
      },
    };
    render(<JournalRail entries={[entry]} {...shell} />);
    expect(screen.getByText('19')).toBeDefined();
    expect(screen.queryByText('Hit — against Armor Class 15')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Show how this was worked out/ }));
    expect(screen.getByText('Hit — against Armor Class 15')).toBeDefined();
    expect(screen.getByText('Proficient')).toBeDefined();
  });

  it('collapsed, it keeps the count rather than losing the notification', () => {
    const onToggle = vi.fn();
    render(<JournalRail entries={[suggestion()]} open={false} onToggle={onToggle} pendingCount={2} />);
    const pill = screen.getByRole('button', { name: 'Show the journal' });
    expect(pill.textContent).toContain('2 waiting');
    fireEvent.click(pill);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe('a suggestion is THE card, inline — never a second AI presentation', () => {
  it('renders the AI card, marked as the assistant, docked in the stream', () => {
    const { container } = render(<JournalRail entries={[suggestion()]} {...shell} />);
    const card = container.querySelector('.qa2-ai');
    expect(card, 'the suggestion did not render AcceptTweakRejectCard').not.toBeNull();
    expect(card?.className).toContain('is-inline');
    // The dot is how you know a machine wrote it and not the person beside you.
    expect(container.querySelector('.qa2-ai-dot')).not.toBeNull();
  });

  it('shows what the player said above what the assistant proposed', () => {
    render(<JournalRail entries={[suggestion()]} {...shell} />);
    expect(screen.getByText(/swing on the well-rope/)).toBeDefined();
    expect(screen.getByText('Dexterity (Acrobatics)')).toBeDefined();
  });

  it('carries the three motions under the table’s own names', () => {
    render(<JournalRail entries={[suggestion({ tweakLabel: 'Change it', onTweak: () => {} })]} {...shell} />);
    expect(screen.getByRole('button', { name: 'Ask for the roll' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Change it' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'No roll needed' })).toBeDefined();
  });

  it('nothing applies itself — each motion reports to the host and stops', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(<JournalRail entries={[suggestion({ onAccept, onReject })]} {...shell} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask for the roll' }));
    expect(onAccept).toHaveBeenCalledOnce();
    // The card did not transition itself: the motions are still on offer,
    // because only the host may decide the entry is resolved.
    expect(screen.getByRole('button', { name: 'No roll needed' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'No roll needed' }));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('a decided suggestion stays in the log, with the way back', () => {
    const onUndo = vi.fn();
    render(<JournalRail entries={[suggestion({ outcome: 'rejected', onUndo })]} {...shell} />);
    expect(screen.getByText('Rejected — nothing was applied.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ask for the roll' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
