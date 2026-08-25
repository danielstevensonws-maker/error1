/**
 * Render tests for the shared components.
 *
 * These assert behaviour that the design depends on — chiefly that a disabled
 * control stays visible and explains itself (the greying rule), and that tones
 * map to the right token rather than a literal.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Panel, Chip, Button, Label } from '../src/index.js';

// Each test mounts fresh; without this, a name like "Choose" used in two tests
// matches twice and the query throws.
afterEach(cleanup);

describe('Panel', () => {
  it('renders its children', () => {
    render(<Panel>vault door</Panel>);
    expect(screen.getByText('vault door')).toBeDefined();
  });

  it('reads glass tokens, not literals', () => {
    const { container } = render(<Panel>x</Panel>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.background).toContain('--qa-glass');
    expect(el.style.borderRadius).toContain('--qa-radius');
  });

  it('solid tone swaps to the solid surface token', () => {
    const { container } = render(<Panel tone="solid">x</Panel>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.background).toContain('--qa-glass-solid');
  });
});

describe('Chip', () => {
  it('accent tone carries provenance, not warning', () => {
    const { container } = render(<Chip tone="accent">Homebrew</Chip>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.color).toContain('--qa-accent');
  });

  it('mono renders numbers in the mono face', () => {
    const { container } = render(<Chip mono>18</Chip>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.fontFamily).toContain('--qa-font-mono');
  });
});

describe('Button', () => {
  it('a disabled button stays visible and dimmed — greying, never hiding', () => {
    render(
      <Button disabled title="It isn't your turn">
        Attack
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Attack' });
    expect(btn.hasAttribute('disabled')).toBe(true);
    // Present in the tree and dimmed rather than removed.
    expect(btn.style.opacity).toBe('0.5');
    expect(btn.getAttribute('title')).toBe("It isn't your turn");
  });

  it('an enabled button is at full strength', () => {
    render(<Button>Choose</Button>);
    expect(screen.getByRole('button', { name: 'Choose' }).style.opacity).toBe('1');
  });

  it('primary uses the accent token', () => {
    render(<Button variant="primary">Choose</Button>);
    expect(screen.getByRole('button', { name: 'Choose' }).style.background).toContain('--qa-accent');
  });
});

describe('Label', () => {
  it('associates with a field when given htmlFor', () => {
    render(
      <>
        <Label htmlFor="hp">Hit points</Label>
        <input id="hp" defaultValue="12" />
      </>,
    );
    expect(screen.getByLabelText('Hit points')).toBeDefined();
  });
});
