/**
 * PresetsAboveFreeForm. The property that matters most: presets never trap
 * the user. In pick mode, editing the text after a pick must leave every
 * chip unselected with NO extra state to get out of sync. In tags mode, the
 * free-form path must land in the exact same array as the preset path.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PresetsAboveFreeForm } from './PresetsAboveFreeForm.js';

afterEach(cleanup);

const PRESETS = [{ label: 'Heist' }, { label: 'Haunted town' }];

describe('PresetsAboveFreeForm — pick mode (default)', () => {
  it('renders presets and an empty free-text field', () => {
    render(<PresetsAboveFreeForm label="Premise" presets={PRESETS} value="" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Heist' })).toBeDefined();
    expect((screen.getByPlaceholderText('Or write your own…') as HTMLInputElement).value).toBe('');
  });

  it('tapping a preset replaces the value with its label', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm label="Premise" presets={PRESETS} value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heist' }));
    expect(onChange).toHaveBeenCalledWith('Heist');
  });

  it('re-tapping the ACTIVE chip clears the field', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm label="Premise" presets={PRESETS} value="Heist" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heist' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('the active chip is DERIVED from value — only the matching preset shows pressed', () => {
    render(<PresetsAboveFreeForm label="Premise" presets={PRESETS} value="Heist" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Heist', pressed: true })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Haunted town', pressed: false })).toBeDefined();
  });

  it('editing the text after a pick leaves every chip unselected — no stored "which chip" state', () => {
    render(<PresetsAboveFreeForm label="Premise" presets={PRESETS} value="Heist, but with dragons" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Heist', pressed: false })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Haunted town', pressed: false })).toBeDefined();
  });

  it('typing in the free-text field fires onChange with the typed text', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm label="Premise" presets={PRESETS} value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Or write your own…'), { target: { value: 'A prison break' } });
    expect(onChange).toHaveBeenCalledWith('A prison break');
  });
});

describe('PresetsAboveFreeForm — tags mode', () => {
  it('clicking an unselected preset chip adds it to the array', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heist' }));
    expect(onChange).toHaveBeenCalledWith(['Heist']);
  });

  it('clicking a selected preset chip removes only that one', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={['Heist', 'Haunted town']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heist' }));
    expect(onChange).toHaveBeenCalledWith(['Haunted town']);
  });

  it('pressing Enter in the free-text field adds it as a tag and clears the draft', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add your own — press Enter') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Scarred' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Scarred']);
    expect(input.value).toBe('');
  });

  it('blurring the free-text field also commits the draft', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add your own — press Enter');
    fireEvent.change(input, { target: { value: 'Regal' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(['Regal']);
  });

  it('rejects a duplicate — typing a tag that already exists does not add a second copy', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={['Scarred']} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add your own — press Enter');
    fireEvent.change(input, { target: { value: 'Scarred' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores an empty/whitespace-only draft', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Add your own — press Enter');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a custom (non-preset) tag renders as a removable chip, distinct from preset chips', () => {
    const onChange = vi.fn();
    render(<PresetsAboveFreeForm mode="tags" label="Traits" presets={PRESETS} value={['Scarred']} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Scarred' })).toBeNull(); // not a toggle button
    fireEvent.click(screen.getByRole('button', { name: 'Remove Scarred' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
