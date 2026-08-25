/**
 * The SRD attribution statement is a licence CONDITION, not copy.
 *
 * Questra ships SRD 5.2.1 content — 339 spells, 330 monsters, twelve full class
 * tables — and CC-BY-4.0 permits that only if the required attribution appears
 * in the work. ADR-0010 accepts this and requires the statement to render on an
 * accessible screen from the first release.
 *
 * The failure mode this guards is not someone deleting the screen; it is
 * someone TIDYING it. A well-meaning copy pass that fixes the quotation marks,
 * shortens a URL, splits a sentence or swaps "available at" for "at" silently
 * puts the build out of compliance, and nothing else in the suite would notice.
 *
 * IT ASSERTS ON THE RENDERED DOM, not on the source file. A first attempt
 * scraped the JSX with regexes and was quietly wrong: stripping tags also ate
 * the {' '} expressions and the anchor text, so the required URLs vanished from
 * the string being checked and the test failed for reasons that had nothing to
 * do with the licence. Rendering the component is both simpler and a truer
 * check — it verifies what a reader actually sees.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Attribution } from '../src/shell/Attribution.js';

const here = dirname(fileURLToPath(import.meta.url));

afterEach(cleanup);

/**
 * The visible text of the screen, whitespace-normalised.
 *
 * Scoped to <main> deliberately: the shell mounts its stylesheets as inline
 * <style> tags, so container.textContent returns several thousand characters of
 * CSS with the page's actual words buried in it. Reading the main landmark is
 * both accurate and closer to what a screen reader would announce.
 */
function visibleText(): string {
  render(<Attribution onBack={() => {}} />);
  return normalise(screen.getByRole('main').textContent ?? '');
}

/**
 * Curly quotes fold to straight ones before comparing. The screen sets the
 * statement with real typographic quotes (via &ldquo;/&rdquo;), which is
 * correct typesetting and not a change to the wording — the SRD's own PDF sets
 * them the same way, and its plain-text extraction renders them straight. This
 * suite is checking the words, not the glyphs.
 */
const normalise = (s: string): string =>
  s.replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/**
 * The load-bearing fragments of the required statement. Split into pieces only
 * because the screen interleaves real anchor elements with the text; each
 * fragment must survive verbatim.
 */
const REQUIRED = [
  'This work includes material from the System Reference Document 5.2.1',
  '("SRD 5.2.1") by Wizards of the Coast LLC, available at',
  'https://www.dndbeyond.com/srd',
  'The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at',
  'https://creativecommons.org/licenses/by/4.0/legalcode',
];

describe('the SRD attribution renders exactly as the licence requires', () => {
  it.each(REQUIRED)('carries the required fragment: %s', (fragment) => {
    expect(visibleText()).toContain(fragment);
  });

  /** Both licence URLs must be reachable, not merely printed. */
  it('links the SRD and the licence deed', () => {
    render(<Attribution onBack={() => {}} />);
    expect(screen.getByRole('link', { name: 'https://www.dndbeyond.com/srd' }))
      .toHaveProperty('href', 'https://www.dndbeyond.com/srd');
    expect(screen.getByRole('link', { name: 'https://creativecommons.org/licenses/by/4.0/legalcode' }))
      .toHaveProperty('href', 'https://creativecommons.org/licenses/by/4.0/legalcode');
  });

  /**
   * The SRD's Legal Information page instructs: "Please do not include any
   * other attribution to Wizards or its parent or affiliates other than that
   * provided above." One mention, and no more.
   */
  it('names Wizards exactly once, as the statement requires', () => {
    const mentions = visibleText().match(/Wizards/g) ?? [];
    expect(mentions.length, 'the licence asks for no attribution to Wizards beyond the required statement').toBe(1);
  });

  /** The permitted compatibility phrasing is the only claim allowed alongside. */
  it('uses only the permitted compatibility wording', () => {
    const text = visibleText();
    expect(text).toContain('compatible with fifth edition');
    expect(text, 'must not imply endorsement').not.toMatch(/official|endorsed by|licensed by Wizards/i);
  });

  /**
   * Cross-check the fragments against the SRD extraction so they can never
   * drift from the source they were transcribed from. Skipped rather than
   * failed when the extraction is absent — it is a build artefact of the engine
   * package, not a committed fixture the web suite can rely on.
   */
  it('matches the SRD source text', () => {
    const raw = join(here, '../../engine/ingest/.extracted/srd-raw.txt');
    if (!existsSync(raw)) return;
    /* The PDF extraction wraps lines mid-token two ways, both artefacts of page
       layout rather than differences in wording: a hyphen before the break
       ("pro-\nvided"), and a plain break after a URL's slash
       (".../by/4.0/\nlegalcode"). Undo both, or this fails on typesetting. */
    const source = readFileSync(raw, 'utf8')
      .replace(/-\n/g, '')
      .replace(/\/\s*\n\s*/g, '/')
      .replace(/\s+/g, ' ');
    for (const fragment of REQUIRED) {
      expect(source, `the SRD source does not contain: ${fragment}`).toContain(fragment);
    }
  });
});
