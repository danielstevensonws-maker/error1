/**
 * PromptHolderCard + its contracts adapters.
 *
 * The card tests cover the one thing that must never happen twice: an
 * auto-decline firing more than once past the deadline (declinedRef's whole
 * job). The adapter tests parse REAL PromptContext data through the actual
 * schema so they fail if the card's view of a prompt ever drifts from the
 * contracts spine.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { PromptContextSchema } from '@questra/contracts';
import { PromptHolderCard } from './PromptHolderCard.js';
import { promptContextToLines, promptKindLabel, promptOptionsToVM } from './promptContextToLines.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function timeEl(container: HTMLElement): HTMLElement {
  const el = container.querySelector('time');
  if (el === null) throw new Error('no <time> element found');
  return el;
}

describe('PromptHolderCard — rendering', () => {
  it('is a labelled alertdialog combining kind and holder', () => {
    render(<PromptHolderCard kind="Opportunity Attack" holder="Wren" context={[]} onTake={() => {}} onDecline={() => {}} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.getAttribute('aria-label')).toBe('Opportunity Attack — Wren');
  });

  it('renders context lines', () => {
    render(<PromptHolderCard kind="X" holder="Y" context={['Line one.', 'Line two.']} onTake={() => {}} onDecline={() => {}} />);
    expect(screen.getByText('Line one.')).toBeDefined();
    expect(screen.getByText('Line two.')).toBeDefined();
  });

  it('shows the asDm note only when asDm is true', () => {
    const { rerender } = render(<PromptHolderCard kind="X" holder="Torvald" context={[]} onTake={() => {}} onDecline={() => {}} />);
    expect(screen.queryByText('Answering for Torvald.')).toBeNull();
    rerender(<PromptHolderCard kind="X" holder="Torvald" context={[]} asDm onTake={() => {}} onDecline={() => {}} />);
    expect(screen.getByText('Answering for Torvald.')).toBeDefined();
  });
});

describe('PromptHolderCard — bare Take/Decline vs. an options menu', () => {
  it('without options renders a single Take button that fires onTake with no argument', () => {
    const onTake = vi.fn();
    render(<PromptHolderCard kind="X" holder="Y" context={[]} onTake={onTake} onDecline={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    expect(onTake).toHaveBeenCalledWith();
  });

  it('with options renders one button per option (no bare Take), firing onTake(optionId)', () => {
    const onTake = vi.fn();
    render(
      <PromptHolderCard
        kind="X"
        holder="Y"
        context={[]}
        options={[
          { id: 'a', label: 'Wing Attack', detail: '2 points' },
          { id: 'b', label: 'Tail Attack' },
        ]}
        onTake={onTake}
        onDecline={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Take' })).toBeNull();
    expect(screen.getByText('2 points')).toBeDefined();
    fireEvent.click(screen.getByText('Wing Attack'));
    expect(onTake).toHaveBeenCalledWith('a');
  });

  it('Decline fires immediately, independent of the countdown', () => {
    const onDecline = vi.fn();
    render(<PromptHolderCard kind="X" holder="Y" context={[]} onTake={() => {}} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onDecline).toHaveBeenCalledOnce();
  });
});

describe('PromptHolderCard — the countdown is a mirror, not the authority', () => {
  beforeEach(() => vi.useFakeTimers());

  it('starts at timeoutSec and ticks down', () => {
    const { container } = render(
      <PromptHolderCard kind="X" holder="Y" context={[]} timeoutSec={30} onTake={() => {}} onDecline={() => {}} />,
    );
    expect(timeEl(container).getAttribute('aria-label')).toBe('30 seconds left');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(timeEl(container).getAttribute('aria-label')).toBe('25 seconds left');
  });

  it('turns urgent (danger colour) at 10 seconds remaining, not before', () => {
    const { container } = render(
      <PromptHolderCard kind="X" holder="Y" context={[]} timeoutSec={12} onTake={() => {}} onDecline={() => {}} />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(timeEl(container).getAttribute('aria-label')).toBe('11 seconds left');
    expect(timeEl(container).style.color).not.toBe('var(--qa-danger)');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(timeEl(container).getAttribute('aria-label')).toBe('10 seconds left');
    expect(timeEl(container).style.color).toBe('var(--qa-danger)');
  });

  it('auto-declines EXACTLY once when the countdown reaches zero, never again', () => {
    const onDecline = vi.fn();
    render(<PromptHolderCard kind="X" holder="Y" context={[]} timeoutSec={2} onTake={() => {}} onDecline={onDecline} />);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(onDecline).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onDecline).toHaveBeenCalledOnce();
  });
});

describe('promptKindLabel / promptContextToLines / promptOptionsToVM — the contracts seam', () => {
  it('formats an opportunity_attack context validated through the real schema', () => {
    const context = PromptContextSchema.parse({
      kind: 'opportunity_attack',
      moverId: 'a',
      provokerId: 'b',
      pathStep: { from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
      attackOptions: ['Scimitar'],
    });
    expect(promptKindLabel(context)).toBe('Free Attack');
    // Plain narration, not a field dump -- the attack options themselves surface
    // as the card's `options` buttons (see promptOptionsToVM), not in these lines.
    expect(promptContextToLines(context).join(' ')).toContain('moving away from you');
  });

  it('formats a legendary_action context and adapts its options with cost details', () => {
    const context = PromptContextSchema.parse({
      kind: 'legendary_action',
      poolRemaining: 2,
      options: [{ name: 'Tail Attack', cost: 1 }],
    });
    expect(promptContextToLines(context)[0]).toBe('2 boss moves left this round.');
    const options = context.kind === 'legendary_action' ? promptOptionsToVM(context.options) : [];
    expect(options).toEqual([{ id: 'Tail Attack', label: 'Tail Attack', detail: '1 point' }]);
  });

  it('formats a legendary_resistance context with singular "1 use"', () => {
    const context = PromptContextSchema.parse({
      kind: 'legendary_resistance',
      save: { ability: 'con', dc: 18 },
      usesLeft: 1,
    });
    const lines = promptContextToLines(context).join(' ');
    expect(lines).toContain('Constitution roll (needed 18 or higher)');
    expect(lines).toContain('1 use left');
  });

  it('lair options omit the cost detail when a PromptOption has no cost', () => {
    const context = PromptContextSchema.parse({ kind: 'lair', options: [{ name: 'Freeze the Water' }] });
    const options = context.kind === 'lair' ? promptOptionsToVM(context.options) : [];
    expect(options).toEqual([{ id: 'Freeze the Water', label: 'Freeze the Water' }]);
  });
});
