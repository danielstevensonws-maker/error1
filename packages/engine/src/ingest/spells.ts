/**
 * Spell splitter + parser — Brief 01 §7. Parses the SRD "Spell Descriptions"
 * section into draft spell entities whose `meta` conforms to the contracts
 * SpellMetaSchema and whose `srd_text` is the verbatim body.
 *
 * Each printed spell is a fixed header block followed by prose:
 *   <Name>
 *   "Level N <School> (<class list>)"  |  "<School> Cantrip (<class list>)"
 *   Casting Time: <...>
 *   Range: <...>
 *   Components: V, S, M (materials)
 *   Duration: <...>
 *   <body …>
 *
 * The parser fills the structured meta the pipeline CAN derive (level, school,
 * casting time, range, components, duration, concentration, ritual, class list)
 * and the verbatim srd_text. It does NOT author `plain` or `effects[]` — those
 * are the rules-lawyer pass (Brief 01 §1 rule 1); spells ship as qa:draft here
 * and are promoted to verified in a curated pass.
 */
import { reflow, isPageNoise } from './conditions.js';

const SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
] as const;
type SchoolTitle = (typeof SCHOOLS)[number];
const SCHOOL_SET = new Set<string>(SCHOOLS);

export interface SpellMeta {
  level: number;
  school: string;
  castingTime: string;
  rangeFt: number | 'self' | 'touch' | 'sight' | 'unlimited';
  components: ('v' | 's' | 'm')[];
  materials?: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  classLists: string[];
}

export interface SpellDraft {
  id: string;
  name: string;
  meta: SpellMeta;
  srdText: string;
}

/** "Fireball" → "spell.fireball"; keeps the contracts lowercase-dotted-slug rule. */
export function spellId(name: string): string {
  return 'spell.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** The header "Level 3 Evocation (Sorcerer, Wizard)" / "Cantrip Evocation (Wizard)".
 *  The parenthesised class list can wrap across the following line(s), so the
 *  parser accepts a window of lines and reports how many it consumed. */
interface Header {
  level: number;
  school: SchoolTitle;
  ritual: boolean;
  classLists: string[];
  linesUsed: number; // 1 if the header fit on one line, 2+ if the class list wrapped
}
function parseHeader(window: string[]): Header | null {
  const first = (window[0] ?? '').trim();

  // SRD 5.2.1 prints two shapes, and they order school and level differently:
  //   "Level 3 Evocation (Sorcerer, Wizard)"  — levelled spells lead with the level
  //   "Evocation Cantrip (Sorcerer, Wizard)"  — cantrips lead with the SCHOOL
  // Reading only the first shape is what left the dataset with no cantrips.
  const levelled = first.match(/^Level ([1-9])\s+([A-Za-z]+)(\s*\(Ritual\))?\s*\((.*)$/);
  const cantrip = levelled ? null : first.match(/^([A-Za-z]+)\s+Cantrip(\s*\(Ritual\))?\s*\((.*)$/);
  if (!levelled && !cantrip) return null;

  const level = levelled ? Number(levelled[1]) : 0;
  const school = levelled ? levelled[2]! : cantrip![1]!;
  const ritual = (levelled ? levelled[3] : cantrip![2]) !== undefined;
  if (!SCHOOL_SET.has(school)) return null;

  // gather the class list until we hit the closing ')', across up to 3 lines
  let list = levelled ? levelled[4]! : cantrip![3]!;
  let used = 1;
  while (!list.includes(')') && used < 3 && window[used] !== undefined) {
    list += ' ' + window[used]!.trim();
    used++;
  }
  const close = list.indexOf(')');
  if (close === -1) return null;
  const classText = list.slice(0, close);

  return {
    level,
    school: school as SchoolTitle,
    ritual,
    classLists: classText.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    linesUsed: used,
  };
}

/** SRD casting-time string → contracts castingTime enum. Ritual/trigger prose is dropped (ritual is its own flag). */
function mapCastingTime(raw: string): { castingTime: string; ritual: boolean } {
  const ritual = /\bRitual\b/i.test(raw);
  const t = raw.replace(/\s+or Ritual.*$/i, '').replace(/,.*$/, '').trim();
  const map: Record<string, string> = {
    'Action': 'action',
    'Bonus Action': 'bonus_action',
    'Reaction': 'reaction',
    '1 minute': 'minute_1',
    '10 minutes': 'minute_10',
    '1 hour': 'hour_1',
    '8 hours': 'hour_8',
    '12 hours': 'hour_12',
    '24 hours': 'hour_24',
  };
  // "Action (Overgrowth)" and "Reaction, which you take …" reduce to their base verb.
  const base = t.replace(/\s*\(.*$/, '').trim();
  return { castingTime: map[t] ?? map[base] ?? 'action', ritual };
}

/** SRD range string → contracts rangeFt (feet number, or a special literal). Miles convert to feet. */
function mapRange(raw: string): SpellMeta['rangeFt'] {
  const t = raw.trim();
  if (/^Self/i.test(t)) return 'self';
  if (/^Touch/i.test(t)) return 'touch';
  if (/^Sight/i.test(t)) return 'sight';
  if (/^Unlimited/i.test(t)) return 'unlimited';
  if (/^Special/i.test(t)) return 'sight'; // "Special" has no numeric range; nearest non-numeric bucket
  const feet = t.match(/^([\d,]+)\s*feet/i);
  if (feet) return Number(feet[1]!.replace(/,/g, ''));
  const miles = t.match(/^([\d,]+)\s*miles?/i);
  if (miles) return Number(miles[1]!.replace(/,/g, '')) * 5280;
  return 'sight';
}

/** "V, S, M (a ball of bat guano and sulfur)" → components + optional materials. */
function parseComponents(raw: string): { components: ('v' | 's' | 'm')[]; materials?: string } {
  const matM = raw.match(/\(([^)]*)\)\s*$/);
  const materials = matM?.[1];
  const letters = raw.replace(/\([^)]*\)/g, '');
  const components = (['v', 's', 'm'] as const).filter((c) => new RegExp(`\\b${c.toUpperCase()}\\b`).test(letters));
  return materials ? { components, materials } : { components };
}

// The SRD uses both "Components:" and (for single-component spells) "Component:".
const HEADER_KEYS = ['Casting Time:', 'Range:', 'Components:', 'Component:', 'Duration:'] as const;

/**
 * Walk the spell-descriptions line range and emit one draft per spell. A spell
 * starts where a Name line is immediately followed by a valid header line.
 */
/** True when the line at `idx` is a spell Name whose header follows it. */
function isSpellStart(lines: string[], idx: number): Header | null {
  const name = (lines[idx] ?? '').trim();
  if (!name || name.length > 60 || !/^[A-Z]/.test(name)) return null;
  return parseHeader(lines.slice(idx + 1, idx + 4));
}

/** True when line `idx` begins an inline creature stat block (a summoned-creature
 *  block printed inside a spell description). Marker: a Name line followed by a
 *  "Size Type…, Alignment" subheader, then an "AC …" line shortly after. */
const SIZE_RE = /^(Tiny|Small|Medium|Large|Huge|Gargantuan)\b.*,/;
function isStatBlockStart(lines: string[], idx: number): boolean {
  const sub = (lines[idx + 1] ?? '').trim();
  if (!SIZE_RE.test(sub)) return false;
  // confirm with an AC line within the next few lines (avoids false hits on prose)
  for (let k = idx + 2; k < Math.min(idx + 5, lines.length); k++) {
    if (/^AC \d/.test(lines[k]!.trim())) return true;
  }
  return false;
}

export function extractSpells(lines: string[]): SpellDraft[] {
  const out: SpellDraft[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const header = isSpellStart(lines, i);
    if (!header) continue;
    const name = lines[i]!.trim();

    // collect the four labelled lines (after the header, which spans header.linesUsed lines)
    const fields: Record<string, string> = {};
    let j = i + 1 + header.linesUsed;
    for (; j < lines.length; j++) {
      const l = lines[j]!.trim();
      if (isPageNoise(l)) continue; // page footer injected mid-header block
      const key = HEADER_KEYS.find((k) => l.startsWith(k));
      if (key) {
        // a labelled value can itself wrap; append continuation lines until the next label/blank
        let val = l.slice(key.length).trim();
        while (j + 1 < lines.length) {
          const nxt = lines[j + 1]!.trim();
          if (nxt === '' || HEADER_KEYS.some((k) => nxt.startsWith(k))) break;
          // Components/Casting Time wrap onto continuation lines; stop if body clearly begins
          if (key === 'Components:' || key === 'Casting Time:') { val += ' ' + nxt; j++; } else break;
        }
        fields[key] = val;
      } else break;
    }

    // body runs until the next spell start OR an embedded creature stat block
    // (some spells that summon a creature print its stat block inline — that block
    // is not part of the spell's printed description text).
    const body: string[] = [];
    for (; j < lines.length; j++) {
      if (isSpellStart(lines, j)) break;
      if (isStatBlockStart(lines, j)) break;
      body.push(lines[j]!);
    }

    if (!fields['Casting Time:'] || !fields['Duration:']) continue; // not a real spell block
    const ct = mapCastingTime(fields['Casting Time:']!);
    const duration = fields['Duration:']!;
    const comps = parseComponents(fields['Components:'] ?? fields['Component:'] ?? '');

    out.push({
      id: spellId(name),
      name,
      meta: {
        level: header.level,
        school: header.school.toLowerCase(),
        castingTime: ct.castingTime,
        rangeFt: mapRange(fields['Range:'] ?? 'Self'),
        components: comps.components.length ? comps.components : ['v'],
        ...(comps.materials ? { materials: comps.materials } : {}),
        duration,
        concentration: /Concentration/i.test(duration),
        ritual: header.ritual || ct.ritual,
        classLists: header.classLists,
      },
      srdText: reflow(body),
    });
    i = j - 1;
  }
  return out;
}
