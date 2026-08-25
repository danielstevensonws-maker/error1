/**
 * PullFromCampaignPicker. Covers the two things a picker can get wrong: the
 * single/multi selection rules, and the two empty states that must never be
 * conflated ("no matches" vs. "nothing to pick from at all").
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PullFromCampaignPicker } from './PullFromCampaignPicker.js';
import type { PickableItem } from './PullFromCampaignPicker.js';

afterEach(cleanup);

const ITEMS: PickableItem[] = [
  { id: 'npc-1', name: 'Sister Aldous', kind: 'Cast', hint: 'Keeper of the small shrine' },
  { id: 'loc-1', name: 'The Ashfen', kind: 'Location', hint: 'A goblin-held bog' },
  { id: 'item-1', name: 'Emberweave Cloak', kind: 'Reward' },
];

describe('PullFromCampaignPicker — rendering', () => {
  it('renders every item as a listbox option with its kind and hint', () => {
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={[]} onChange={() => {}} />);
    expect(screen.getByRole('listbox')).toBeDefined();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Sister Aldous')).toBeDefined();
    expect(screen.getByText('Keeper of the small shrine')).toBeDefined();
    expect(screen.getByText('Cast')).toBeDefined();
  });

  it('marks pre-selected items aria-selected and multi-selectable by default', () => {
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={['npc-1']} onChange={() => {}} />);
    expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');
    expect(screen.getByText('Sister Aldous').closest('[role="option"]')?.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('The Ashfen').closest('[role="option"]')?.getAttribute('aria-selected')).toBe('false');
  });
});

describe('PullFromCampaignPicker — multi select', () => {
  it('toggling an unselected item adds it, keeping the others', () => {
    const onChange = vi.fn();
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={['npc-1']} onChange={onChange} mode="multi" />);
    fireEvent.click(screen.getByText('The Ashfen'));
    expect(onChange).toHaveBeenCalledWith(['npc-1', 'loc-1']);
  });

  it('toggling a selected item removes only that one', () => {
    const onChange = vi.fn();
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={['npc-1', 'loc-1']} onChange={onChange} mode="multi" />);
    fireEvent.click(screen.getByText('Sister Aldous'));
    expect(onChange).toHaveBeenCalledWith(['loc-1']);
  });
});

describe('PullFromCampaignPicker — single select', () => {
  it('picking an item collapses selection to just that id', () => {
    const onChange = vi.fn();
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={['npc-1']} onChange={onChange} mode="single" />);
    fireEvent.click(screen.getByText('The Ashfen'));
    expect(onChange).toHaveBeenCalledWith(['loc-1']);
  });

  it('re-picking the already-selected item clears the selection', () => {
    const onChange = vi.fn();
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={['npc-1']} onChange={onChange} mode="single" />);
    fireEvent.click(screen.getByText('Sister Aldous'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('is not aria-multiselectable', () => {
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={[]} onChange={() => {}} mode="single" />);
    expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('false');
  });
});

describe('PullFromCampaignPicker — search', () => {
  it('filters by name, kind, or hint, case-insensitively', () => {
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={[]} onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ashfen' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('The Ashfen')).toBeDefined();
  });

  it('an empty query returns everything', () => {
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={[]} onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'reward' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '' } });
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });
});

describe('PullFromCampaignPicker — the two empty states', () => {
  it('a query with no matches shows "No matches." and no listbox', () => {
    render(<PullFromCampaignPicker items={ITEMS} selectedIds={[]} onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'nonexistent' } });
    expect(screen.getByText('No matches.')).toBeDefined();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('a fresh campaign (no items at all) shows the caller emptyLabel, never "No matches."', () => {
    render(<PullFromCampaignPicker items={[]} selectedIds={[]} onChange={() => {}} emptyLabel="No rewards defined in this campaign yet." />);
    expect(screen.getByText('No rewards defined in this campaign yet.')).toBeDefined();
    expect(screen.queryByText('No matches.')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('defaults the empty label when the caller supplies none', () => {
    render(<PullFromCampaignPicker items={[]} selectedIds={[]} onChange={() => {}} />);
    expect(screen.getByText('Nothing in the campaign to pull from yet.')).toBeDefined();
  });
});
