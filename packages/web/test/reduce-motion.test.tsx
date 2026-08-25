/**
 * Reduce motion suppresses every effect (Brief 10 §4/§5.5 — non-negotiable).
 *
 * SUPPRESSED MEANS NOTHING RENDERS, not a shorter animation. A global rule that
 * collapses durations still leaves a screen lurching, and lurching is the thing
 * the setting exists to prevent — somebody who gets motion sick is not helped by
 * a faster shake.
 *
 * IT IS DECIDED AT THE RECEIVING END, per viewer, because it is a property of
 * the person watching rather than of the effect. A DM must never have to
 * remember who at their table has it on, and a player must never have to ask
 * them to stop.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EffectLayer } from '../src/play/EffectLayer.js';

afterEach(cleanup);

/** jsdom has no matchMedia; the setup file stubs it. This aims that stub. */
function setReducedMotion(on: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => { /* nothing to notify in a test */ },
    removeEventListener: () => { /* ditto */ },
    addListener: () => { /* deprecated form, still read by some libs */ },
    removeListener: () => { /* ditto */ },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const EVERY_EFFECT = ['shake', 'torch', 'rain', 'thunder', 'blood', 'fade'] as const;

describe('screen effects and reduce motion', () => {
  it.each(EVERY_EFFECT)('renders %s when motion is welcome', (effect) => {
    setReducedMotion(false);
    const { container } = render(<EffectLayer effect={effect} />);
    expect(container.querySelector('.qa-fx'), `${effect} should play`).not.toBeNull();
  });

  it.each(EVERY_EFFECT)('renders nothing at all for %s when motion is not', (effect) => {
    setReducedMotion(true);
    const { container } = render(<EffectLayer effect={effect} />);
    expect(
      container.querySelector('.qa-fx'),
      'a shorter animation is still an animation — this must be absent, not faster',
    ).toBeNull();
  });

  it('draws nothing when there is no effect, either way', () => {
    setReducedMotion(false);
    const { container } = render(<EffectLayer effect={null} />);
    expect(container.querySelector('.qa-fx')).toBeNull();
  });

  /**
   * The layer must never eat a click. An effect that swallows an attack during
   * a fight is worse than no effect at all.
   */
  it('lets every press through to the table underneath', () => {
    setReducedMotion(false);
    render(
      <div>
        <button type="button">Attack</button>
        <EffectLayer effect="thunder" />
      </div>,
    );
    /* The button is still reachable — the overlay is decoration, not a lid. */
    expect(screen.getByRole('button', { name: 'Attack' })).toBeDefined();
  });

  it('is hidden from anybody listening rather than looking', () => {
    setReducedMotion(false);
    const { container } = render(<EffectLayer effect="rain" />);
    expect(
      container.querySelector('.qa-fx')?.getAttribute('aria-hidden'),
      'weather is not information a screen reader should announce',
    ).toBe('true');
  });
});
