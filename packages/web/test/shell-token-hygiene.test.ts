/**
 * Shell token hygiene — the shell's equivalent of hud-type-hygiene.
 *
 * WHY THE SHELL NEEDS ITS OWN GUARD RATHER THAN THE EXISTING ONE. The play
 * screen and the eight primitives are built on @questra/theme's --qa-* tokens,
 * which are byte-identity-guarded against the upstream Claude Design set
 * (ADR-0014), and hud-type-hygiene enforces that nothing in those files names a
 * colour, a font or a duration directly. The shell was on that list until the
 * account/campaign screens were given a deliberately different register — the
 * escalate-at-the-door decision, where the front door is cinematic and the
 * table stays quiet. It now has its own scoped --rd-* layer, so scanning it for
 * --qa-* compliance would fail on every line by design.
 *
 * The DISCIPLINE is unchanged even though the palette is not: define the
 * vocabulary in exactly one place, and let every screen spend it rather than
 * mint its own. That is what this file checks.
 *
 * Two files are allowed to name raw values, and only two:
 *   road/RoadStyles.tsx — the token definitions and the shared chrome
 *   road/Road.tsx       — the world's renderer; SVG gradient stops are colours
 *                         by nature, and routing them through CSS variables
 *                         buys indirection without buying discipline
 * Everything else — the six screens, the shared states, the scene machinery —
 * must read var(--rd-*) or a shared class and nothing else.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../src');

/** The two files that own the vocabulary. */
const LANGUAGE = ['shell/road/RoadStyles.tsx', 'shell/road/Road.tsx'];

/** Everything that must only ever spend it. */
const SCREENS = [
  'shell/Landing.tsx',
  'shell/JoinFlow.tsx',
  'shell/Home.tsx',
  'shell/CreateCampaign.tsx',
  'shell/Nav.tsx',
  'shell/ShellStates.tsx',
  'shell/road/Scene.tsx',
  'shell/Lobby.tsx',
  'play/PlayRoute.tsx',
];

/** The stylesheets, whose CSS lives in a template literal (see the backtick test). */
const STYLESHEETS = ['shell/road/RoadStyles.tsx', 'shell/ShellStyles.tsx'];

const read = (name: string): string => readFileSync(join(src, name), 'utf8');

/** Strip comments so prose examples ("a 56px bar") don't trip the scanners. */
const codeOf = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the shell spends its design language rather than minting more of it', () => {
  it('finds every shell source', () => {
    for (const name of [...LANGUAGE, ...SCREENS, 'shell/ShellStyles.tsx']) {
      expect(read(name).length, `${name} is empty or missing`).toBeGreaterThan(0);
    }
  });

  it('no screen hardcodes a colour — the tokens live in RoadStyles', () => {
    for (const name of SCREENS) {
      const code = codeOf(read(name));
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g), `${name} hardcodes a hex colour`).toBeNull();
      expect(code.match(/\b(rgba?|hsla?)\s*\(/g), `${name} hardcodes a colour function`).toBeNull();
    }
  });

  it('no screen names a font family or a font size', () => {
    for (const name of SCREENS) {
      const code = codeOf(read(name));
      expect(code.match(/font-family|fontFamily/g), `${name} names a font family; use a shared class`).toBeNull();
      expect(code.match(/fontSize:\s*['"\d]/g), `${name} names a font size; use a shared class`).toBeNull();
    }
  });

  /**
   * THE COHESION RULE, and the reason this suite exists in its current form.
   *
   * The shell was briefly given its own cold palette and it read as a different
   * product from the play screen (owner review, 2026-08-20). Every --rd-* name
   * is now an ALIAS onto a --qa-* token rather than a value of its own, so the
   * shell cannot drift away from the table again without this failing.
   *
   * A bare hex or rgb() on the right of an --rd-* declaration means somebody
   * has reintroduced an independent palette.
   */
  it('every shell token aliases a play-screen token rather than inventing a value', () => {
    const sheet = codeOf(read('shell/road/RoadStyles.tsx'));
    const declarations = sheet.match(/--rd-[\w-]+\s*:[^;]+;/g) ?? [];
    expect(declarations.length, 'RoadStyles should define the shell alias block').toBeGreaterThan(4);

    for (const decl of declarations) {
      expect(
        /var\(--qa-[\w-]+\)/.test(decl),
        `${decl.trim()} does not alias a --qa-* token; the shell must not hold an independent palette`,
      ).toBe(true);
    }
  });

  /** No screen may mint its own --rd-* value either. */
  it('no screen redefines a shell token', () => {
    for (const name of [...SCREENS, 'shell/ShellStyles.tsx']) {
      expect(codeOf(read(name)).match(/--rd-[\w-]+\s*:/g), `${name} redefines a shell token`).toBeNull();
    }
  });

  /**
   * The typed-answer ritual is confined to the two screens a person meets once
   * as a stranger. If it ever spreads to Home or the nav, the drama stops
   * meaning anything and a daily screen starts costing four seconds a visit.
   */
  it('only Landing and Join hold a conversation', () => {
    /* Scene.tsx is excluded because it DEFINES the mechanic rather than using
       it — the check is about which screens import the conversation, not about
       where it lives. */
    const consumers = SCREENS.filter((name) => name !== 'shell/road/Scene.tsx');
    const talkers = consumers.filter((name) => /useSpokenText|<Turn\b/.test(codeOf(read(name))));
    expect(talkers.sort()).toEqual(['shell/JoinFlow.tsx', 'shell/Landing.tsx']);
  });

  /**
   * A backtick inside a CSS comment — quoting a class name, the natural thing
   * to write — silently closes the template literal and the file stops parsing.
   * Two backticks is exactly the pair that opens and closes it; a third means
   * one has been written inside. This has bitten this repo repeatedly.
   */
  it.each(STYLESHEETS)('%s has no backtick inside its template literal', (name) => {
    const text = read(name);
    const body = text.slice(text.indexOf('const CSS ='));
    const count = (body.match(/`/g) ?? []).length;
    expect(count, 'a backtick inside the CSS closes the literal — write class names bare in CSS comments').toBe(2);
  });
});
