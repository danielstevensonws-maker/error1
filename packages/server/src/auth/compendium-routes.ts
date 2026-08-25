/**
 * The compendium — looking a rule up without leaving the table (GAP-AUDIT B4).
 *
 * WHY THIS EXISTS AT ALL, given the product's whole premise is that you should
 * not have to read the rules first: because "you learn while playing" is not
 * "you may never look anything up". A player who has just been Frightened wants
 * to know what that means, right now, in one sentence — and the alternative to
 * this is a browser tab open on a PDF, which is exactly the spreadsheet
 * fallback M3's exit bar forbids.
 *
 * TWO LAYERS, NOT ONE. Every entry carries `plain` (a sentence written for
 * somebody who has never played) and `srd_text` (the printed rule, verbatim).
 * The list gives you the first; opening an entry gives you both. Collapsing
 * them into one field would force a choice between being understandable and
 * being correct, and the product needs both — the plain line is what teaches,
 * the verbatim text is what settles an argument.
 *
 * PUBLIC ON PURPOSE. The SRD is published under CC-BY-4.0 (ADR-0010) and none
 * of it is anybody's private information: it is the same text in every
 * campaign. Requiring a login to read a rule would be friction with nothing on
 * the other side of it. Homebrew, when it lands in M5, is a different question
 * and will need its own answer.
 */
import type { FastifyInstance } from 'fastify';
import { VERIFIED_DATASET } from '@questra/engine';
import type { RulesEntity } from '@questra/contracts';

/** What the list returns: enough to choose, not enough to weigh the payload down. */
interface CompendiumRow {
  id: string;
  name: string;
  entityType: string;
  plain: string;
}

const row = (e: RulesEntity): CompendiumRow => ({
  id: e.id,
  name: e.name,
  entityType: e.entityType,
  plain: e.plain,
});

/**
 * Search across name and plain text.
 *
 * Substring rather than fuzzy, and deliberately so: somebody looking up
 * "frightened" mid-fight types the word they just read on their own screen.
 * Matching the plain sentence too means "can't see" finds Blinded, which is how
 * a person who does not know the vocabulary actually searches.
 */
function matches(e: RulesEntity, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return e.name.toLowerCase().includes(needle) || e.plain.toLowerCase().includes(needle);
}

export function registerCompendiumRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { q?: string; type?: string } }>('/compendium', async (req) => {
    const { q = '', type } = req.query;
    const entries = VERIFIED_DATASET
      .filter((e) => (type ? e.entityType === type : true))
      .filter((e) => matches(e, q))
      .map(row)
      .sort((a, b) => a.name.localeCompare(b.name));

    /* The type list comes from the data rather than a hardcoded array, so a
       dataset that grows a new kind of thing does not need this file edited. */
    const types = [...new Set(VERIFIED_DATASET.map((e) => e.entityType))].sort();
    return { entries, types };
  });

  app.get<{ Params: { id: string } }>('/compendium/:id', async (req, reply) => {
    const entry = VERIFIED_DATASET.find((e) => e.id === req.params.id);
    if (!entry) {
      reply.code(404);
      return { error: 'not_found', reason: 'There is no such entry.' };
    }
    /* The whole entity: the plain line, the verbatim rule, and the structured
       meta the screens use to show what ends a condition. */
    return entry;
  });
}
