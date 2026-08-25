/**
 * AcceptTweakRejectCard + its contracts adapters.
 *
 * The adapter tests parse/validate REAL contracts shapes (RulingSuggestionSchema,
 * DIFFICULTY_LADDER) so they fail if the card's view of an AI output ever
 * drifts from the spine. The card tests cover the one product invariant:
 * nothing applies until a human decision, and only Accept/Save/Reject ever
 * reach a resolved outcome.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DIFFICULTY_LADDER, RulingSuggestionSchema } from '@questra/contracts';
import { AcceptTweakRejectCard } from './AcceptTweakRejectCard.js';
import { difficultyLadderToFallbackOptions, rulingSuggestionToRows } from './aiOutputToCard.js';

afterEach(cleanup);

describe('aiOutputToCard — the contracts seam', () => {
  it('maps a RulingSuggestion to Check / DC / On a fail rows', () => {
    const suggestion = RulingSuggestionSchema.parse({
      check: { kind: 'ability_check', ability: 'dex', skill: 'acrobatics' },
      dc: 14,
      failConsequence: "You slip; you're knocked prone.",
      rationale: 'Balance, not strength.',
    });
    const rows = rulingSuggestionToRows(suggestion);
    expect(rows).toEqual([
      { label: 'Check', value: 'Dexterity (Acrobatics)' },
      { label: 'DC', value: '14', variant: 'number' },
      { label: 'On a fail', value: "You slip; you're knocked prone.", variant: 'note' },
    ]);
  });

  it('omits the parenthetical when there is no skill (a bare ability check)', () => {
    const suggestion = RulingSuggestionSchema.parse({
      check: { kind: 'ability_check', ability: 'str' },
      dc: 12,
      failConsequence: 'The door holds.',
      rationale: 'Raw force.',
    });
    expect(rulingSuggestionToRows(suggestion)[0]).toEqual({ label: 'Check', value: 'Strength' });
  });

  it('maps the real DIFFICULTY_LADDER to fallback tiles, marking the recommended one', () => {
    const options = difficultyLadderToFallbackOptions(DIFFICULTY_LADDER, 'Moderate');
    expect(options).toContainEqual({ name: 'Easy', value: '10' });
    expect(options).toContainEqual({ name: 'Moderate', value: '13', recommended: true });
    expect(options.filter((o) => o.recommended === true)).toHaveLength(1);
  });
});

describe('AcceptTweakRejectCard — draft (text)', () => {
  it('renders the prose body and all three motions', () => {
    render(<AcceptTweakRejectCard state="draft" kind="text" text="A plank splits underfoot." />);
    expect(screen.getByText('A plank splits underfoot.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDefined();
  });

  it('offers Tweak only when onTweak is supplied', () => {
    const { rerender } = render(<AcceptTweakRejectCard state="draft" kind="text" text="x" />);
    expect(screen.queryByRole('button', { name: 'Tweak' })).toBeNull();

    rerender(<AcceptTweakRejectCard state="draft" kind="text" text="x" onTweak={() => {}} />);
    expect(screen.getByRole('button', { name: 'Tweak' })).toBeDefined();
  });

  it('fires onAccept and onOutcome("accepted") on Accept', () => {
    const onAccept = vi.fn();
    const onOutcome = vi.fn();
    render(<AcceptTweakRejectCard state="draft" kind="text" text="x" onAccept={onAccept} onOutcome={onOutcome} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledWith(undefined);
    expect(onOutcome).toHaveBeenCalledWith('accepted');
  });

  it('fires onReject and onOutcome("rejected") on Reject — never a partial apply', () => {
    const onReject = vi.fn();
    const onOutcome = vi.fn();
    render(<AcceptTweakRejectCard state="draft" kind="text" text="x" onReject={onReject} onOutcome={onOutcome} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledOnce();
    expect(onOutcome).toHaveBeenCalledWith('rejected');
  });
});

describe('AcceptTweakRejectCard — draft (structured)', () => {
  it('renders the ruling rows', () => {
    render(<AcceptTweakRejectCard state="draft" kind="structured" rows={[{ label: 'DC', value: '14', variant: 'number' }]} />);
    expect(screen.getByText('DC')).toBeDefined();
    expect(screen.getByText('14')).toBeDefined();
  });

  /**
   * A ruling's rows are not free-text editable, and the tweak MODE stays
   * prose-only for that reason. But "not editable as text" is not "not
   * arguable": law 1 puts the ruling with the table, so a structured card
   * offers Tweak too and the host answers it by opening the ladder.
   */
  it('offers Tweak on a ruling — the host decides what changing it means', () => {
    const onTweak = vi.fn();
    render(<AcceptTweakRejectCard state="draft" kind="structured" rows={[{ label: 'DC', value: '14' }]} onTweak={onTweak} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tweak' }));
    expect(onTweak).toHaveBeenCalledOnce();
  });

  it('still offers nothing when the host cannot honour it', () => {
    render(<AcceptTweakRejectCard state="draft" kind="structured" rows={[{ label: 'DC', value: '14' }]} />);
    expect(screen.queryByRole('button', { name: 'Tweak' })).toBeNull();
  });
});

describe('AcceptTweakRejectCard — streaming', () => {
  it('is aria-busy and has no footer — you cannot accept an unfinished draft', () => {
    render(<AcceptTweakRejectCard state="streaming" kind="text" text="still arriving" />);
    expect(screen.getByRole('region').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});

describe('AcceptTweakRejectCard — tweak mode', () => {
  it('seeds the textarea from text and commits the EDITED value on save', () => {
    const onSaveTweak = vi.fn();
    const onOutcome = vi.fn();
    render(<AcceptTweakRejectCard state="tweak" kind="text" text="original" onSaveTweak={onSaveTweak} onOutcome={onOutcome} />);
    const textarea = screen.getByLabelText('Edit the suggestion') as HTMLTextAreaElement;
    expect(textarea.value).toBe('original');

    fireEvent.change(textarea, { target: { value: 'edited by the player' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSaveTweak).toHaveBeenCalledWith('edited by the player');
    expect(onOutcome).toHaveBeenCalledWith('tweaked');
  });

  it('Cancel does not call onSaveTweak', () => {
    const onSaveTweak = vi.fn();
    const onCancelTweak = vi.fn();
    render(<AcceptTweakRejectCard state="tweak" kind="text" text="original" onSaveTweak={onSaveTweak} onCancelTweak={onCancelTweak} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelTweak).toHaveBeenCalledOnce();
    expect(onSaveTweak).not.toHaveBeenCalled();
  });
});

describe('AcceptTweakRejectCard — fallback (the non-AI path)', () => {
  it('accepting fallback passes the recommended option, never the model', () => {
    const onAccept = vi.fn();
    render(
      <AcceptTweakRejectCard
        state="fallback"
        fallbackOptions={[
          { name: 'Easy', value: '10' },
          { name: 'Medium', value: '14', recommended: true },
          { name: 'Hard', value: '18' },
        ]}
        acceptLabel="Use Medium (14)"
        rejectLabel="Dismiss"
        onAccept={onAccept}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use Medium (14)' }));
    expect(onAccept).toHaveBeenCalledWith({ name: 'Medium', value: '14', recommended: true });
  });

  it('never offers Tweak — a fallback ladder pick is not free-text editable', () => {
    render(<AcceptTweakRejectCard state="fallback" fallbackOptions={[]} />);
    expect(screen.queryByRole('button', { name: 'Tweak' })).toBeNull();
  });

  /**
   * The ladder's whole purpose is "set the difficulty YOURSELF". It used to
   * render three tiles that looked pickable, arm the recommended one, and
   * apply that no matter which tile you pressed — a menu that lied. Every rung
   * is a real choice now.
   */
  it('applies the rung you picked, not the one it recommended', () => {
    const onAccept = vi.fn();
    render(
      <AcceptTweakRejectCard
        state="fallback"
        fallbackOptions={[
          { name: 'Easy', value: '10' },
          { name: 'Moderate', value: '13', recommended: true },
          { name: 'Hard', value: '18' },
        ]}
        onAccept={onAccept}
      />,
    );
    expect(screen.getByRole('radio', { name: /Moderate/ }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByRole('radio', { name: /Hard/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Hard (18)' }));
    expect(onAccept).toHaveBeenCalledWith({ name: 'Hard', value: '18' });
  });

  it('Accept renames itself to whatever is armed — it cannot promise the wrong number', () => {
    render(
      <AcceptTweakRejectCard
        state="fallback"
        fallbackOptions={[
          { name: 'Easy', value: '10' },
          { name: 'Moderate', value: '13', recommended: true },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Use Moderate (13)' })).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: /Easy/ }));
    expect(screen.getByRole('button', { name: 'Use Easy (10)' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Use Moderate (13)' })).toBeNull();
  });
});

describe('AcceptTweakRejectCard — resolved', () => {
  it('shows the outcome line and returns to Draft on Undo', () => {
    const onUndo = vi.fn();
    render(<AcceptTweakRejectCard state="resolved" outcome="rejected" onUndo={onUndo} />);
    expect(screen.getByText('Rejected — nothing was applied.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('has no footer — a resolved card is terminal, not re-decidable', () => {
    render(<AcceptTweakRejectCard state="resolved" outcome="accepted" />);
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});
