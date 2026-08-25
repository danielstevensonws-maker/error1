/**
 * The compendium — the alternative to a browser tab open on a PDF.
 *
 * The assertions that matter are about the TWO LAYERS. Every entry owes a
 * player a sentence they can read mid-fight and the printed rule underneath it;
 * an entry with only one of those is either unreadable or unciteable, and the
 * product needs both.
 *
 * The last test is the one worth keeping honest: the plain line is what a
 * first-timer reads, so it is exactly where jargon does the most damage.
 */
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { violatesPlainLanguage } from '@questra/contracts';
import { registerCompendiumRoutes } from '../src/auth/compendium-routes.js';

async function server() {
  const app = Fastify();
  registerCompendiumRoutes(app);
  await app.ready();
  return app;
}

describe('looking a rule up', () => {
  it('lists entries with the sentence that explains them', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/compendium' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as { entries: { name: string; plain: string }[]; types: string[] };
    expect(body.entries.length).toBeGreaterThan(0);
    for (const e of body.entries) {
      expect(e.plain, `${e.name} has no plain sentence`).toBeTruthy();
    }
    await app.close();
  });

  /**
   * Somebody who does not know the vocabulary searches by what happened to
   * them, not by the word for it. Matching the plain line is what makes that
   * work.
   */
  it('finds an entry by what it does, not only by its name', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/compendium?q=see' });
    const body = res.json() as { entries: { name: string }[] };
    expect(body.entries.map((e) => e.name)).toContain('Blinded');
    await app.close();
  });

  it('filters to one kind of thing', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/compendium?type=condition' });
    const body = res.json() as { entries: { entityType: string }[] };
    expect(body.entries.length).toBeGreaterThan(0);
    for (const e of body.entries) expect(e.entityType).toBe('condition');
    await app.close();
  });

  it('gives both layers when an entry is opened', async () => {
    const app = await server();
    const list = (await app.inject({ method: 'GET', url: '/compendium?type=condition' }))
      .json() as { entries: { id: string }[] };
    const id = list.entries[0]!.id;

    const res = await app.inject({ method: 'GET', url: `/compendium/${id}` });
    expect(res.statusCode).toBe(200);
    const entry = res.json() as { plain: string; srd_text: string };
    expect(entry.plain, 'the sentence that teaches').toBeTruthy();
    expect(entry.srd_text, 'the printed rule that settles an argument').toBeTruthy();
    await app.close();
  });

  it('says so plainly when there is no such entry', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/compendium/nope' });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { reason: string }).reason).toBe('There is no such entry.');
    await app.close();
  });

  /**
   * THE PLAIN LINE IS WHERE JARGON DOES THE MOST DAMAGE, because it is what a
   * first-time player reads instead of the rule. Brief 10 §1 requires every
   * user-facing string to pass this; here it is enforced on the ones that
   * matter most.
   */
  it('keeps jargon out of the line a first-timer reads', async () => {
    const app = await server();
    const body = (await app.inject({ method: 'GET', url: '/compendium' }))
      .json() as { entries: { name: string; plain: string }[] };

    for (const e of body.entries) {
      expect(violatesPlainLanguage(e.plain), `${e.name}: "${e.plain}"`).toBeNull();
    }
    await app.close();
  });
});
