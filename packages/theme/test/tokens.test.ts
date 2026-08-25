/**
 * Token guard (ADR-0014).
 *
 * The token set is TRANSCRIBED from Claude Design, not authored here. This
 * suite pins the values so a later hand-edit can't silently drift the design,
 * and pins the [data-qa-theme] switching structure so the slate/ivory themes
 * can drop in later with zero component edits.
 *
 * If the design genuinely changes: re-sync tokens.css from the Design project
 * and update the expectations here in the same commit — deliberately, never as
 * a side effect of feature work.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../src/tokens.css'), 'utf8');

/** Pull a `--name:value;` declaration out of a given selector block. */
function tokenIn(selector: string, name: string): string | undefined {
  const block = css.split(selector)[1]?.split('}')[0];
  if (block === undefined) return undefined;
  const match = block.match(new RegExp(`${name}\\s*:\\s*([^;]+)[;\\s]`));
  return match?.[1]?.trim();
}

const base = (name: string) => tokenIn('[data-qa-theme]{', name);
const ghost = (name: string) => tokenIn('[data-qa-theme="ghost"]{', name);
const slate = (name: string) => tokenIn('[data-qa-theme="slate"]{', name);
const ivory = (name: string) => tokenIn('[data-qa-theme="ivory"]{', name);

/** Every per-theme token. A theme block is complete only if it defines all of them. */
const THEMED = [
  '--qa-glass',
  '--qa-glass-solid',
  '--qa-glass-border',
  '--qa-glass-blur',
  '--qa-chip',
  '--qa-scrim',
  '--qa-ink',
  '--qa-ink-dim',
  '--qa-ink-faint',
] as const;

describe('the switching pattern is intact', () => {
  it('declares a theme-independent base block', () => {
    expect(css).toContain('[data-qa-theme]{');
  });

  it('declares each theme as a named block, not as the base', () => {
    expect(css).toContain('[data-qa-theme="ghost"]{');
    expect(css).toContain('[data-qa-theme="slate"]{');
    expect(css).toContain('[data-qa-theme="ivory"]{');
  });

  it('keeps per-theme values OUT of the base block', () => {
    // These are what a theme redefines; in base, slate/ivory could never
    // override them cleanly and the switch would be decorative.
    for (const name of THEMED) {
      expect(base(name), `${name} must live in a theme block, not base`).toBeUndefined();
    }
  });

  it('every theme defines the complete set — no partial theme can half-apply', () => {
    for (const [themeName, read] of [
      ['ghost', ghost],
      ['slate', slate],
      ['ivory', ivory],
    ] as const) {
      for (const name of THEMED) {
        expect(read(name), `${themeName} is missing ${name}`).toBeDefined();
      }
    }
  });
});

describe('base tokens — theme-independent', () => {
  it('accent set', () => {
    expect(base('--qa-accent')).toBe('#C05B41');
    expect(base('--qa-accent-ink')).toBe('#FBEEE6');
    expect(base('--qa-accent-soft')).toBe('rgba(192,91,65,.22)');
    expect(base('--qa-accent-line')).toBe('rgba(192,91,65,.55)');
    expect(base('--qa-accent-glow')).toBe('rgba(192,91,65,.45)');
  });

  it('status colours, each with its soft variant', () => {
    expect(base('--qa-danger')).toBe('#C8453A');
    expect(base('--qa-danger-soft')).toBe('rgba(200,69,58,.20)');
    expect(base('--qa-success')).toBe('#6F9463');
    expect(base('--qa-success-soft')).toBe('rgba(111,148,99,.20)');
    expect(base('--qa-gold')).toBe('#C79A47');
    expect(base('--qa-gold-soft')).toBe('rgba(199,154,71,.20)');
  });

  it('map ground tri-tone plus the grid line', () => {
    expect(base('--qa-map-hi')).toBe('#2A2115');
    expect(base('--qa-map-mid')).toBe('#1B1610');
    expect(base('--qa-map-lo')).toBe('#12100A');
    expect(base('--qa-map-grid')).toBe('rgba(230,220,196,.05)');
  });

  it('the three typefaces — prose is a serif, data is mono', () => {
    expect(base('--qa-font-display')).toBe("'IM Fell English',Georgia,serif");
    expect(base('--qa-font-body')).toBe("'EB Garamond',Georgia,serif");
    expect(base('--qa-font-mono')).toBe("'IBM Plex Mono',ui-monospace,monospace");
    expect(base('--qa-tracking-caps')).toBe('.16em');
  });

  it('the type scale — whisper caps up to the display heading', () => {
    expect(base('--qa-text-whisper')).toBe('10px');
    expect(base('--qa-text-label')).toBe('12px');
    expect(base('--qa-text-body')).toBe('16px');
    expect(base('--qa-text-lg')).toBe('20px');
    expect(base('--qa-text-title')).toBe('28px');
    expect(base('--qa-text-display')).toBe('40px');
  });

  it('the spacing scale is complete — no gaps for a component to guess at', () => {
    expect(base('--qa-s1')).toBe('4px');
    expect(base('--qa-s2')).toBe('8px');
    expect(base('--qa-s3')).toBe('12px');
    expect(base('--qa-s4')).toBe('16px');
    expect(base('--qa-s5')).toBe('24px');
    expect(base('--qa-s6')).toBe('32px');
    expect(base('--qa-s7')).toBe('48px');
    expect(base('--qa-s8')).toBe('64px');
    expect(base('--qa-hud-inset')).toBe('24px');
  });

  it('radii and hairline', () => {
    expect(base('--qa-radius-sm')).toBe('3px');
    expect(base('--qa-radius')).toBe('6px');
    expect(base('--qa-radius-lg')).toBe('10px');
    expect(base('--qa-radius-round')).toBe('999px');
    expect(base('--qa-hairline')).toBe('1px');
  });

  it('motion — including the dice settle the roll choreography depends on', () => {
    expect(base('--qa-dur-fast')).toBe('120ms');
    expect(base('--qa-dur')).toBe('220ms');
    expect(base('--qa-dur-slow')).toBe('420ms');
    expect(base('--qa-dice-settle')).toBe('840ms');
    expect(base('--qa-ease')).toBe('cubic-bezier(.2,.7,.2,1)');
    expect(base('--qa-ease-out')).toBe('cubic-bezier(.16,1,.3,1)');
  });

  it('elevation', () => {
    expect(base('--qa-shadow')).toContain('18px 48px');
    expect(base('--qa-shadow-pop')).toContain('30px 70px');
  });
});

describe('ghost theme — the only theme BUILT in v1', () => {
  it('glass surfaces', () => {
    expect(ghost('--qa-glass')).toBe('rgba(19,16,9,.55)');
    expect(ghost('--qa-glass-solid')).toBe('rgba(28,24,15,.94)');
    expect(ghost('--qa-glass-border')).toBe('rgba(230,220,196,.14)');
    expect(ghost('--qa-glass-blur')).toBe('14px');
  });

  it('chip fill and scrim', () => {
    expect(ghost('--qa-chip')).toBe('rgba(230,220,196,.08)');
    expect(ghost('--qa-scrim')).toBe('rgba(10,8,4,.55)');
  });

  it('the ink triple', () => {
    expect(ghost('--qa-ink')).toBe('#E6DCC4');
    expect(ghost('--qa-ink-dim')).toBe('rgba(230,220,196,.62)');
    expect(ghost('--qa-ink-faint')).toBe('rgba(230,220,196,.34)');
  });
});

describe('slate + ivory — transcribed for later, deliberately not built for v1', () => {
  it('slate is a cool dark', () => {
    expect(slate('--qa-glass')).toBe('rgba(17,21,29,.68)');
    expect(slate('--qa-glass-blur')).toBe('20px');
    expect(slate('--qa-ink')).toBe('#E9EDF4');
  });

  it('ivory is a light theme — dark ink on light glass', () => {
    expect(ivory('--qa-glass')).toBe('rgba(243,240,233,.6)');
    expect(ivory('--qa-glass-blur')).toBe('16px');
    expect(ivory('--qa-ink')).toBe('#201D18');
  });
});

describe('tokens Claude Design has NOT supplied yet', () => {
  // Guard against a well-meaning session inventing a value. If a primitive
  // needs one of these, it gets raised — not fabricated. Delete a line here
  // when the real token arrives with the design.
  it.each([
    ['--qa-grain', 'atmosphere overlay (TableBackdrop)'],
    ['--qa-vignette', 'atmosphere overlay (TableBackdrop)'],
    ['--qa-secret', "PublicSecretField's DM-only tint"],
  ])('%s is still absent — %s', (name) => {
    expect(css).not.toContain(`${name}:`);
  });
});
