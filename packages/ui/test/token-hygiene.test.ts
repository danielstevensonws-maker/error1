/**
 * Token hygiene (ADR-0014).
 *
 * The contract is: drop a new token set into @questra/theme and the whole app
 * re-themes with NO component edits. That only holds if components never bake
 * in a literal colour, font, or duration. This suite reads every component
 * source and fails on a hardcoded value.
 *
 * It is deliberately a source-text test rather than a render test: the point is
 * to catch the literal at authoring time, in any component, without needing to
 * mount it.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const files = sourceFiles(srcRoot).map((path) => ({
  path: path.slice(srcRoot.length + 1).replace(/\\/g, '/'),
  text: readFileSync(path, 'utf8'),
}));

/** Strip block/line comments so prose examples don't trip the scanners. */
const codeOf = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('components hardcode no design values', () => {
  it('finds component sources to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no hex colours', () => {
    for (const { path, text } of files) {
      const hits = codeOf(text).match(/#[0-9a-fA-F]{3,8}\b/g);
      expect(hits, `${path} hardcodes a hex colour: ${hits?.join(', ')}`).toBeNull();
    }
  });

  it('no rgb()/rgba()/hsl() literals', () => {
    for (const { path, text } of files) {
      const hits = codeOf(text).match(/\b(rgba?|hsla?)\s*\(/g);
      expect(hits, `${path} hardcodes a colour function: ${hits?.join(', ')}`).toBeNull();
    }
  });

  it('no literal transition/animation durations', () => {
    for (const { path, text } of files) {
      // A bare `220ms` or `0.2s` in a style value; var(--qa-dur) is the only way.
      const hits = codeOf(text).match(/\b\d+(\.\d+)?m?s\b/g);
      expect(hits, `${path} hardcodes a duration: ${hits?.join(', ')}`).toBeNull();
    }
  });

  it('no hardcoded font families', () => {
    for (const { path, text } of files) {
      const hits = codeOf(text).match(/\b(serif|sans-serif|monospace|IM Fell|EB Garamond|IBM Plex)\b/g);
      expect(hits, `${path} hardcodes a font family: ${hits?.join(', ')}`).toBeNull();
    }
  });
});

describe('components read the token layer', () => {
  it('every component that styles anything uses var(--qa-*)', () => {
    const styled = files.filter(({ text }) => /style\s*[=:]/.test(codeOf(text)));
    expect(styled.length).toBeGreaterThan(0);
    for (const { path, text } of styled) {
      expect(text, `${path} styles without reading a --qa-* token`).toMatch(/var\(--qa-/);
    }
  });

  it('no component pins itself to a specific theme', () => {
    // Reading [data-qa-theme="ghost"] in a component would defeat the switch:
    // slate/ivory could never override it. Themes are selected by the host.
    for (const { path, text } of files) {
      expect(codeOf(text), `${path} pins a named theme`).not.toMatch(/data-qa-theme\s*=\s*["']\w/);
    }
  });
});
