/**
 * theme/fonts — the three typefaces @questra/theme names, actually loaded.
 *
 * WHY THIS EXISTS. `packages/theme/src/tokens.css` has always declared
 * `--qa-font-display: 'IM Fell English'`, `--qa-font-body: 'EB Garamond'` and
 * `--qa-font-mono: 'IBM Plex Mono'`, and until 2026-08-19 nothing in the repo
 * ever loaded any of them — no @font-face rule, no link tag, nothing in the
 * Storybook preview. Every surface built before then rendered in Georgia and
 * the system mono, which means the type ramp's central rule (prose is a serif,
 * data is mono) was never actually visible and the display/body distinction did
 * not exist on screen at all.
 *
 * WHY IT IS HERE AND NOT IN @questra/theme. That package is byte-identity
 * guarded against the upstream Claude Design token set (ADR-0014), so it takes
 * variable DECLARATIONS and nothing else. Font delivery is an app concern:
 * the token names what to use, this module makes it available.
 *
 * Self-hosted rather than a CDN link: latin-subset woff2 imported as Vite
 * assets, so they are content-hashed, work offline, cost no third-party
 * request, and screenshot deterministically. `font-display: block` because
 * these resolve in a single frame from disk, and block removes the fallback
 * flash that would otherwise land in every screenshot.
 */
import type { ReactElement } from 'react';
import imFell from './fonts/im-fell-english.woff2';
import imFellItalic from './fonts/im-fell-english-italic.woff2';
import garamond from './fonts/eb-garamond.woff2';
import garamondItalic from './fonts/eb-garamond-italic.woff2';
import plex400 from './fonts/plex-mono-400.woff2';
import plex600 from './fonts/plex-mono-600.woff2';

const CSS = `
@font-face { font-family: 'IM Fell English'; src: url(${imFell}) format('woff2'); font-weight: 400; font-style: normal; font-display: block; }
@font-face { font-family: 'IM Fell English'; src: url(${imFellItalic}) format('woff2'); font-weight: 400; font-style: italic; font-display: block; }
@font-face { font-family: 'EB Garamond'; src: url(${garamond}) format('woff2'); font-weight: 400 800; font-style: normal; font-display: block; }
@font-face { font-family: 'EB Garamond'; src: url(${garamondItalic}) format('woff2'); font-weight: 400 800; font-style: italic; font-display: block; }
@font-face { font-family: 'IBM Plex Mono'; src: url(${plex400}) format('woff2'); font-weight: 400; font-style: normal; font-display: block; }
@font-face { font-family: 'IBM Plex Mono'; src: url(${plex600}) format('woff2'); font-weight: 600; font-style: normal; font-display: block; }
`;

/** Mount once per surface. Duplicate style tags are harmless. */
export function ThemeFonts(): ReactElement {
  return <style>{CSS}</style>;
}
