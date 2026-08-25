/**
 * CardSequencer. The properties under test: the button path works with no
 * pointer at all (keyboard-first is not decorative), moveTo's bounds guards
 * hold at both ends of the list, onReorder always reports the FULL id list,
 * and the itemNoun singularises correctly through every generated string.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CardSequencer } from './CardSequencer.js';
import type { SequenceItem } from './CardSequencer.js';

afterEach(cleanup);

function items(ids: string[]): SequenceItem[] {
  return ids.map((id) => ({ id, render: <span>{id}</span> }));
}

describe('CardSequencer — rendering', () => {
  it('renders each item numbered 1-based, with the caller content inside', () => {
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={() => {}} itemNoun="scenes" />);
    expect(screen.getByText('a')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('omits the remove column entirely when onRemove is not supplied', () => {
    render(<CardSequencer items={items(['a', 'b'])} onReorder={() => {}} itemNoun="sessions" />);
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('renders Remove buttons, singularised, when onRemove is supplied', () => {
    render(<CardSequencer items={items(['a', 'b'])} onReorder={() => {}} itemNoun="scenes" onRemove={() => {}} />);
    expect(screen.getAllByRole('button', { name: 'Remove scene' })).toHaveLength(2);
  });
});

describe('CardSequencer — move buttons (the primary, pointer-free mechanism)', () => {
  it("disables the first item's Move up and the last item's Move down", () => {
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={() => {}} itemNoun="scenes" />);
    const ups = screen.getAllByRole('button', { name: 'Move scene up' });
    const downs = screen.getAllByRole('button', { name: 'Move scene down' });
    expect((ups[0] as HTMLButtonElement).disabled).toBe(true);
    expect((downs[downs.length - 1] as HTMLButtonElement).disabled).toBe(true);
    expect((ups[1] as HTMLButtonElement).disabled).toBe(false);
    expect((downs[0] as HTMLButtonElement).disabled).toBe(false);
  });

  it('moving an item down reports the FULL reordered id list', () => {
    const onReorder = vi.fn();
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={onReorder} itemNoun="scenes" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move scene down' })[0]!);
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('moving the middle item up swaps it with its predecessor', () => {
    const onReorder = vi.fn();
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={onReorder} itemNoun="scenes" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move scene up' })[1]!);
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('announces the move in plain language, singular noun, 1-based position', () => {
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={() => {}} itemNoun="scenes" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Move scene down' })[0]!);
    expect(screen.getByText('Moved scene to position 2 of 3.')).toBeDefined();
  });
});

describe('CardSequencer — remove', () => {
  it('clicking Remove fires onRemove with that item\'s id only', () => {
    const onRemove = vi.fn();
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={() => {}} itemNoun="scenes" onRemove={onRemove} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove scene' })[1]!);
    expect(onRemove).toHaveBeenCalledWith('b');
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe('CardSequencer — drag and drop (layered on top, not the only way)', () => {
  it('dropping item a onto item c\'s row reorders a after c, reporting the full list', () => {
    const onReorder = vi.fn();
    render(<CardSequencer items={items(['a', 'b', 'c'])} onReorder={onReorder} itemNoun="scenes" />);
    const rows = screen.getAllByRole('listitem');
    fireEvent.dragStart(rows[0]!);
    fireEvent.dragOver(rows[2]!);
    fireEvent.drop(rows[2]!);
    expect(onReorder).toHaveBeenCalledWith(['b', 'c', 'a']);
  });
});
