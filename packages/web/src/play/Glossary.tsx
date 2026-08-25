/**
 * Glossary — what the words mean, sitting where the DM can see them.
 *
 * WHY IT IS THE DEFAULT AND NOT A TOOL. The left column below the turn order is
 * where every tool opens, which means it is empty whenever no tool is open —
 * and an empty column on the screen somebody runs a three-hour session from is
 * a waste of the best real estate they have. So the resting state of that space
 * teaches the game.
 *
 * WHO IT IS FOR. The product's whole premise is that nobody at the table has
 * played before, and the DM is the one who has to answer "what does bloodied
 * mean" out loud, mid-scene, while five people wait. Anything that turns that
 * into a glance instead of a search is worth the column.
 *
 * IT NARRATES THE REAL TERM, IT DOES NOT REPLACE IT. "Armour Class" stays
 * Armour Class; the entry explains it. Inventing friendlier synonyms would mean
 * a DM learns one vocabulary here and meets a different one in every rulebook,
 * video and table they ever encounter — which is the opposite of learning the
 * game. Say the real word, then say what it means.
 *
 * IT IS NOT THE COMPENDIUM. The compendium is the SRD: every monster, spell and
 * condition, searched off the server. This is sixteen words a new DM trips over
 * in their first session, held locally so it is instant and works with the
 * network down. When somebody wants the whole rule, the Rules tile is one tap
 * away and says so at the bottom.
 */
import { useState, type ReactElement } from 'react';
import { Eyebrow, prose } from '../design/index.js';

interface Term {
  term: string;
  says: string;
  /** The thing a DM most often gets wrong about it, when there is one. */
  note?: string;
}

interface Group {
  heading: string;
  terms: Term[];
}

/**
 * Grouped by WHEN A DM REACHES FOR THEM rather than alphabetically. Sorted by
 * name, "Advantage" leads and "Saving Throw" is twelfth; grouped by moment, the
 * words you need while somebody is swinging are together and the words you need
 * between scenes are together. The compendium is the place for a list.
 */
const GROUPS: Group[] = [
  {
    heading: 'Numbers on a sheet',
    terms: [
      {
        term: 'Armour Class',
        says: 'The number an attack has to meet or beat to hit somebody. Plate armour and a shield make it high; a robe makes it low.',
      },
      {
        term: 'Hit Points',
        says: 'How much damage somebody can take before they drop. They come back on a rest, not on their own.',
      },
      {
        term: 'Ability Modifier',
        says: 'The bonus a score gives. It is added to rolls that use that ability — a Strength of 16 adds +3 to swinging a sword.',
      },
      {
        term: 'Proficiency Bonus',
        says: 'What somebody adds for being trained at a thing. It grows with level, and it applies to whatever their sheet says they are proficient in.',
      },
    ],
  },
  {
    heading: 'While somebody is swinging',
    terms: [
      {
        term: 'Advantage',
        says: 'Roll two dice and take the higher. Given when circumstances genuinely favour somebody.',
        note: 'Two sources of advantage are still just advantage. It does not stack.',
      },
      {
        term: 'Disadvantage',
        says: 'Roll two dice and take the lower.',
        note: 'One of each cancels out entirely, however many of each there are.',
      },
      {
        term: 'Saving Throw',
        says: 'A roll to avoid or reduce something happening TO somebody — a fireball, a poison, a shove.',
        note: 'An attack rolls against Armour Class; a save rolls against a difficulty. Different directions.',
      },
      {
        term: 'Difficulty',
        says: 'The number a check or a save has to reach. Easy is about 10, medium 15, hard 20.',
        note: 'You are allowed to decide it after hearing what they are trying. Often better.',
      },
      {
        term: 'Bloodied',
        says: 'At or below half hit points. Not a rule with an effect — a word for the table, so everyone can tell a fight is turning.',
      },
      {
        term: 'Reaction',
        says: 'One thing somebody can do when it is not their turn, once per round, in answer to a trigger.',
      },
      {
        term: 'Bonus Action',
        says: 'A second, smaller thing on their own turn — but only if something specifically grants it. It is not a free extra action.',
      },
      {
        term: 'Concentration',
        says: 'Some spells only keep working while the caster holds them. Taking damage risks dropping it, and casting a second one drops the first.',
      },
    ],
  },
  {
    heading: 'Between the swinging',
    terms: [
      {
        term: 'Initiative',
        says: 'The running order of a fight. Everybody rolls once, and the round runs from highest to lowest until the fight ends.',
      },
      {
        term: 'Short Rest',
        says: 'About an hour. Hit dice can be spent to heal, and some abilities come back.',
      },
      {
        term: 'Long Rest',
        says: 'A night. Hit points, spell slots and nearly everything else come back.',
      },
      {
        term: 'Death Saves',
        says: 'Made at zero hit points, once a turn. Three successes and they stabilise; three failures and they die.',
        note: 'A natural 20 puts them back up with one hit point. A natural 1 counts as two failures.',
      },
    ],
  },
];

export interface GlossaryProps {
  /** Open the full rules. The glossary is a reminder; the compendium is the text. */
  onOpenRules?: () => void;
}

export function Glossary({ onOpenRules }: GlossaryProps): ReactElement {
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const groups = needle.length === 0
    ? GROUPS
    : GROUPS
      .map((g) => ({
        ...g,
        /* Matched on the EXPLANATION as well as the name, because a DM who has
           forgotten the word is exactly the person who needs this — searching
           "half" should find Bloodied. */
        terms: g.terms.filter(
          (t) => t.term.toLowerCase().includes(needle)
            || t.says.toLowerCase().includes(needle)
            || (t.note?.toLowerCase().includes(needle) ?? false),
        ),
      }))
      .filter((g) => g.terms.length > 0);

  return (
    <div className="qa2-gloss">
      <span className="qa2-open qa2-gloss-find">
        <input
          className="qa2-input"
          value={query}
          placeholder="What does it mean?"
          aria-label="Search the glossary"
          onChange={(e) => { setQuery(e.target.value); }}
        />
      </span>

      <div className="qa2-gloss-list">
        {groups.map((g) => (
          <section key={g.heading} className="qa2-gloss-group">
            <Eyebrow>{g.heading}</Eyebrow>
            {g.terms.map((t) => (
              <div key={t.term} className="qa2-gloss-term">
                <span className="qa2-gloss-name">{t.term}</span>
                <p style={{ ...prose, margin: 0 }}>{t.says}</p>
                {t.note !== undefined && <p className="qa2-gloss-note">{t.note}</p>}
              </div>
            ))}
          </section>
        ))}

        {groups.length === 0 && (
          <p style={{ ...prose, margin: 0 }}>
            Nothing here matches that. The full rules have far more in them.
          </p>
        )}

        {/* The honest edge of this list: sixteen words is not the rulebook. */}
        {onOpenRules !== undefined && (
          <button type="button" className="qa2-quiet-link qa2-gloss-more" onClick={onOpenRules}>
            Look up the full rules
          </button>
        )}
      </div>
    </div>
  );
}
