/**
 * PublicSecretField. The critical property under test is NOT anything visual —
 * it's that `VISIBILITY_FOR` maps the two halves onto the exact contracts
 * `Visibility` values a caller would emit, so a mapping bug can't mislabel a
 * secret as public. See the component's own doc comment: this is authoring
 * UI, not the security filter.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PublicSecretField, VISIBILITY_FOR } from './PublicSecretField.js';
import type { PublicSecretValue } from './PublicSecretField.js';

afterEach(cleanup);

describe('VISIBILITY_FOR — the contracts seam', () => {
  it('maps public -> "public" and secret -> "dm_only", the real Visibility values', () => {
    expect(VISIBILITY_FOR.public).toBe('public');
    expect(VISIBILITY_FOR.secret).toBe('dm_only');
  });
});

const empty: PublicSecretValue = { public: '', secret: '' };

describe('PublicSecretField — controlled input', () => {
  it('renders both halves with their default audience placeholders', () => {
    render(<PublicSecretField value={empty} onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Everyone at the table sees this')).toBeDefined();
    expect(screen.getByPlaceholderText('Only you (the DM) see this')).toBeDefined();
  });

  it('typing in the public half fires onChange with the WHOLE next value, secret untouched', () => {
    const onChange = vi.fn();
    render(<PublicSecretField value={{ public: '', secret: 'hidden' }} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Everyone at the table sees this'), { target: { value: 'A guard at the gate.' } });
    expect(onChange).toHaveBeenCalledWith({ public: 'A guard at the gate.', secret: 'hidden' });
  });

  it('typing in the secret half fires onChange with the WHOLE next value, public untouched', () => {
    const onChange = vi.fn();
    render(<PublicSecretField value={{ public: 'visible', secret: '' }} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Only you (the DM) see this'), { target: { value: 'She is lying.' } });
    expect(onChange).toHaveBeenCalledWith({ public: 'visible', secret: 'She is lying.' });
  });

  it('is fully controlled — the DOM reflects the value prop, not internal state', () => {
    render(<PublicSecretField value={{ public: 'A', secret: 'B' }} onChange={() => {}} />);
    expect((screen.getByPlaceholderText('Everyone at the table sees this') as HTMLInputElement).value).toBe('A');
    expect((screen.getByPlaceholderText('Only you (the DM) see this') as HTMLInputElement).value).toBe('B');
  });
});

describe('PublicSecretField — single-line vs multiline', () => {
  it('renders <input> for both halves by default', () => {
    render(<PublicSecretField value={empty} onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Everyone at the table sees this').tagName).toBe('INPUT');
    expect(screen.getByPlaceholderText('Only you (the DM) see this').tagName).toBe('INPUT');
  });

  it('renders <textarea> for both halves when multiline', () => {
    render(<PublicSecretField value={empty} onChange={() => {}} multiline />);
    expect(screen.getByPlaceholderText('Everyone at the table sees this').tagName).toBe('TEXTAREA');
    expect(screen.getByPlaceholderText('Only you (the DM) see this').tagName).toBe('TEXTAREA');
  });
});

describe('PublicSecretField — labels and accessibility', () => {
  it('associates each badge label with its field via htmlFor/id', () => {
    render(<PublicSecretField value={empty} onChange={() => {}} />);
    expect(screen.getByLabelText('Public')).toBeDefined();
    expect(screen.getByLabelText(/Secret · DM only/)).toBeDefined();
  });

  /**
   * The lock is a drawn glyph, not the 🔒 emoji it used to be: emoji carry
   * their own palette and their own era, and this one sat beside mono caps in
   * a warm-dark frame looking like it had wandered in from another product.
   */
  it('the secret badge carries the lock mark; the public badge does not', () => {
    const { container } = render(<PublicSecretField value={empty} onChange={() => {}} />);
    const [publicBox, secretBox] = [...container.querySelectorAll('.qa2-field-box')];
    expect(publicBox?.querySelector('svg')).toBeNull();
    expect(secretBox?.querySelector('svg')).not.toBeNull();
    expect(secretBox?.className).toContain('is-secret');
  });
});

describe('PublicSecretField — help text and custom placeholders', () => {
  it('renders help text when supplied, omits it when not', () => {
    const { rerender } = render(<PublicSecretField value={empty} onChange={() => {}} />);
    expect(screen.queryByText(/stays with you/)).toBeNull();

    rerender(
      <PublicSecretField
        value={empty}
        onChange={() => {}}
        help="The table meets the public face; the truth stays with you."
      />,
    );
    expect(screen.getByText(/stays with you/)).toBeDefined();
  });

  it('accepts custom placeholders in place of the audience defaults', () => {
    render(
      <PublicSecretField
        value={empty}
        onChange={() => {}}
        publicPlaceholder="Read-aloud text"
        secretPlaceholder="DM staging notes"
      />,
    );
    expect(screen.getByPlaceholderText('Read-aloud text')).toBeDefined();
    expect(screen.getByPlaceholderText('DM staging notes')).toBeDefined();
  });
});
