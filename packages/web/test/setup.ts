/**
 * Test environment shims.
 *
 * jsdom implements no `window.matchMedia`, and every shell screen calls it via
 * `usePrefersReducedMotion` — so rendering any of them in a test throws
 * "window.matchMedia is not a function" from inside an effect, which surfaces
 * as eight unrelated-looking failures rather than one obvious one.
 *
 * Stubbed here rather than inside a single test because it is a property of the
 * environment, not of one suite: the next component test to render a shell
 * screen would otherwise rediscover it.
 *
 * It reports "no preference" by default, which is the honest default for a
 * headless run — a test that wants the reduced-motion path should override this
 * explicitly so the intent is visible in the test rather than in the harness.
 */
import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
