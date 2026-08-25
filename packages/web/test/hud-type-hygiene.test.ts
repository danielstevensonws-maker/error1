/**
 * HUD type hygiene.
 *
 * WHY THIS EXISTS. `packages/ui` has had a token-hygiene suite since ADR-0014,
 * but it scans only `packages/ui/src` — and every Player HUD surface lives
 * here in `packages/web/src/primitives`, so it was never covered. The original
 * hub duly drifted: 8.5px, 9px, 9.5px and `--qa-text-whisper` (10px) were all
 * rendering the same "small mono caps label", plus one-off 13px and 22px.
 * Nothing failed, because nothing was looking.
 *
 * That hub is gone now (the v1 play surface was deleted once Player View v2
 * was chosen), but the lesson it paid for is exactly why this file still
 * exists and why v2 was put under the guard on day one rather than after its
 * own drift had set in.
 *
 * The scope has since widened past the HUD. The eight primitives were rebuilt
 * on the shared design layer — the drift there was worse than the hub's (104
 * style objects, 55 numeric font sizes, 17 hardcoded font families across
 * eight files) precisely because nothing was looking at them either. They are
 * on the list now, so the rebuild cannot quietly come undone.
 *
 * What remains outside is the wizard/lobby surfaces, which have their own
 * cleanup ahead of them; failing on them here would just get this suite
 * skipped. Widen `HUD_FILES` as each is brought onto the ramp.
 *
 * The rule: a component may not name a font size at all. It asks the type ramp
 * for a ROLE (`eyebrow`, `statValue`, …) and the role owns the token. See
 * v2/type.ts for why roles rather than sizes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../src');

/**
 * Everything built from the shared design language: the layer itself, plus
 * every surface composed from it. Stylesheets are scanned as well as
 * components — a hex colour in a template literal is exactly as much of a leak
 * as one in a style object.
 *
 * Paths are relative to `src/`, so a file's home is visible in the list: the
 * `design/` entries are the language, the rest are surfaces speaking it.
 */
const HUD_FILES = [
  // the shared design layer
  'design/glyphs.tsx',
  'design/parts.tsx',
  'design/styles.tsx',
  'design/type.ts',
  // the play screen
  'primitives/v2/ActionRows.tsx',
  'primitives/v2/JournalRail.tsx',
  'primitives/v2/NearEdge.tsx',
  'primitives/v2/Overlays.tsx',
  'primitives/v2/PlayerViewV2.tsx',
  'primitives/v2/RoundSpine.tsx',
  'primitives/v2/SceneRail.tsx',
  'primitives/v2/ScreenStyles.tsx',
  // the DM screen, rebuilt on the same language rather than beside it. It was
  // OUTSIDE this list until 2026-08-25, which is the whole reason it drifted:
  // its CSS lived inside ScreenStyles (scanned) while its components did not,
  // so a hardcoded size in a component was invisible and a design-layer button
  // reset silently overrode every control's type for weeks with nothing failing.
  'play/DirectorBar.tsx',
  'play/DmScreen.tsx',
  'play/AskForCheck.tsx',
  'play/RulingDock.tsx',
  'play/PromptDock.tsx',
  // the primitives, now built from the same language as the play screen
  'primitives/AcceptTweakRejectCard.tsx',
  'primitives/CardSequencer.tsx',
  'primitives/InfoPanel.tsx',
  'primitives/MapCanvas.tsx',
  'primitives/PresetsAboveFreeForm.tsx',
  'primitives/PromptHolderCard.tsx',
  'primitives/PublicSecretField.tsx',
  'primitives/PullFromCampaignPicker.tsx',
  // NOTE: shell/ is deliberately NOT on this list any more. It moved to its own
  // token layer (src/shell/road) when the shell was given a register distinct
  // from the play screen, so scanning it for --qa-* compliance would fail on
  // every line by design. Its equivalent guard is test/shell-token-hygiene.test.ts.
];

/** The modules allowed to name a font family — the type ramp and the sheets. */
const TYPE_MODULES = new Set(['design/type.ts', 'design/styles.tsx', 'primitives/v2/ScreenStyles.tsx']);

/** The stylesheets, whose CSS lives in a template literal (see the backtick test). */
const STYLESHEETS = ['design/styles.tsx', 'primitives/v2/ScreenStyles.tsx'];

const files = HUD_FILES.map((name) => ({ name, text: readFileSync(join(src, name), 'utf8') }));

/** Strip comments so prose examples ("8.5px") don't trip the scanners. */
const codeOf = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the HUD reads its type from the token ramp', () => {
  it('finds the HUD sources', () => {
    expect(files.length).toBe(HUD_FILES.length);
    for (const f of files) expect(f.text.length, `${f.name} is empty`).toBeGreaterThan(0);
  });

  it('no numeric fontSize — only var(--qa-text-*) via a hudType role', () => {
    for (const { name, text } of files) {
      const hits = codeOf(text).match(/fontSize:\s*[\d.]+/g);
      expect(hits, `${name} hardcodes a font size: ${hits?.join(', ')}. Use a role from hudType.ts.`).toBeNull();
    }
  });

  it('only a type module names a font family', () => {
    for (const { name, text } of files) {
      if (TYPE_MODULES.has(name)) continue;
      const hits = codeOf(text).match(/var\(--qa-font-(display|body|mono)\)/g);
      expect(hits, `${name} names a font family directly: ${hits?.join(', ')}. Use a role from hudType.ts.`).toBeNull();
    }
  });

  it('no hex / rgb colour literals', () => {
    for (const { name, text } of files) {
      const code = codeOf(text);
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g), `${name} hardcodes a hex colour`).toBeNull();
      expect(code.match(/\b(rgba?|hsla?)\s*\(/g), `${name} hardcodes a colour function`).toBeNull();
    }
  });

  it('no literal animation durations', () => {
    for (const { name, text } of files) {
      const hits = codeOf(text).match(/\b\d+(\.\d+)?m?s\b/g);
      expect(hits, `${name} hardcodes a duration: ${hits?.join(', ')}`).toBeNull();
    }
  });

  /**
   * The stylesheets keep their CSS in a template literal, which has bitten
   * repeatedly: a backtick inside a CSS comment (quoting a class name, the
   * natural thing to write) silently closes the string and the file stops
   * parsing. Two backticks is exactly the pair that opens and closes the
   * literal; a third means one has been written inside it.
   */
  it.each(STYLESHEETS)('%s has no backtick inside its template literal', (name) => {
    const sheet = files.find((f) => f.name === name);
    expect(sheet, `${name} is not in HUD_FILES`).toBeDefined();
    // Everything from the declaration onward: the file's own JSDoc header may
    // quote class names freely, since it sits outside the literal.
    const body = sheet!.text.slice(sheet!.text.indexOf('const CSS ='));
    const count = (body.match(/`/g) ?? []).length;
    expect(count, 'a backtick inside the CSS closes the template literal — write class names bare in CSS comments').toBe(2);
  });
});
